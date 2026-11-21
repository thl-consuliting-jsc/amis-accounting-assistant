import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from "@angular/common/http";
import { inject } from "@angular/core";
import { catchError, finalize, Observable, shareReplay, switchMap, throwError } from "rxjs";
import { AuthResponse } from "../../features/auth/models/auth.model";
import { AuthService } from "../../features/auth/services/auth.service";
import { API_ENDPOINTS } from "../constants";
import { TokenService } from "../services/token.service";

let refreshTokenRequest$: Observable<AuthResponse> | null = null;

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const tokenService = inject(TokenService);

  if (isAuthRequest(request)) {
    return next(request);
  }

  const authService = inject(AuthService);
  const accessToken = tokenService.getAccessToken();

  if (accessToken && !tokenService.isAccessTokenExpired()) {
    return next(withBearerToken(request, accessToken)).pipe(
      catchError((error) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          return refreshAndRetry(request, next, authService);
        }

        return throwError(() => error);
      })
    );
  }

  if (tokenService.getRefreshToken()) {
    return refreshAndRetry(request, next, authService);
  }

  return next(request);
};

function refreshAndRetry(
  request: HttpRequest<unknown>,
  next: Parameters<HttpInterceptorFn>[1],
  authService: AuthService
): ReturnType<HttpInterceptorFn> {
  return getRefreshTokenRequest(authService).pipe(
    switchMap((response) => next(withBearerToken(request, response.accessToken))),
    catchError((error) => throwError(() => error))
  );
}

function getRefreshTokenRequest(authService: AuthService): Observable<AuthResponse> {
  if (!refreshTokenRequest$) {
    refreshTokenRequest$ = authService.refreshToken().pipe(
      shareReplay({ bufferSize: 1, refCount: false }),
      finalize(() => {
        refreshTokenRequest$ = null;
      })
    );
  }

  return refreshTokenRequest$;
}

function withBearerToken(request: HttpRequest<unknown>, accessToken: string): HttpRequest<unknown> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

function isAuthRequest(request: HttpRequest<unknown>): boolean {
  return request.url === API_ENDPOINTS.login || request.url === `${API_ENDPOINTS.login}/refresh`;
}
