import { computed, inject, Injectable, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, EMPTY, finalize, map, Observable, switchMap, tap, throwError } from "rxjs";
import { TokenService } from "../../../core/services/token.service";
import { Api } from "../../../core/models/api.model";
import { AuthResponse, LoginRequest } from "../models/auth.model";
import { AuthUser } from "../models/auth-user.model";
import { API_ENDPOINTS } from "../../../core/constants";

export type AuthStatus = "checking" | "authenticated" | "guest";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenService = inject(TokenService);

  private readonly _authStatus = signal<AuthStatus>("checking");
  private readonly _currentUser = signal<AuthUser | null>(null);

  readonly authStatus = computed(() => this._authStatus());
  readonly currentUser = computed(() => this._currentUser());
  readonly isLoggedIn = computed(() => this._authStatus() === "authenticated");

  constructor() {
    this.restoreSession();
  }

  login(request: LoginRequest): Observable<Api<AuthResponse>> {
    return this.http.post<Api<AuthResponse>>(API_ENDPOINTS.login, request).pipe(
      tap((response) => {
        this.tokenService.setTokens(response.data.accessToken, response.data.refreshToken);
        this._currentUser.set(this.tokenService.getUserData() ?? this.createFallbackUser(request.username));
        this._authStatus.set("authenticated");
      })
    );
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.tokenService.getRefreshToken();

    if (!refreshToken) {
      this.clearLocalSession();
      return throwError(() => new Error("No refresh token"));
    }

    return this.http
      .post<AuthResponse | Api<AuthResponse>>(`${API_ENDPOINTS.login}/refresh`, { refreshToken })
      .pipe(
        map((response) => this.normalizeAuthResponse(response)),
        tap((response) => {
          this.tokenService.setTokens(response.accessToken, response.refreshToken);
          this._currentUser.set(this.tokenService.getUserData());
          this._authStatus.set("authenticated");
        }),
        catchError((error) => {
          this.clearLocalSession();
          return throwError(() => error);
        })
      );
  }

  logout(): void {
    const refreshToken = this.tokenService.getRefreshToken();

    if (!refreshToken) {
      this.clearLocalSession();
      return;
    }

    const logoutRequest$ = this.tokenService.isAccessTokenExpired()
      ? this.refreshToken().pipe(
          switchMap((response) =>
            this.http.post(`${API_ENDPOINTS.login}/logout`, { refreshToken: response.refreshToken })
          )
        )
      : this.http.post(`${API_ENDPOINTS.login}/logout`, { refreshToken });

    logoutRequest$
      .pipe(
        catchError(() => EMPTY),
        finalize(() => this.clearLocalSession())
      )
      .subscribe();
  }

  private restoreSession(): void {
    const accessToken = this.tokenService.getAccessToken();
    const refreshToken = this.tokenService.getRefreshToken();
    const user = this.tokenService.getUserData();

    if (user) {
      this._currentUser.set(user);
    }

    if (accessToken && !this.tokenService.isAccessTokenExpired()) {
      this._authStatus.set("authenticated");
      return;
    }

    if (refreshToken) {
      this.refreshToken().subscribe({
        next: () => this._authStatus.set("authenticated"),
        error: () => this.clearLocalSession(),
      });
      return;
    }

    this.clearLocalSession();
  }

  private clearLocalSession(): void {
    this.tokenService.clearTokens();
    this._currentUser.set(null);
    this._authStatus.set("guest");
  }

  private normalizeAuthResponse(response: AuthResponse | Api<AuthResponse>): AuthResponse {
    if ("data" in response) {
      return response.data;
    }

    return response;
  }

  private createFallbackUser(username: string): AuthUser {
    return {
      id: "",
      username,
      email: "",
      fullName: "",
      jobPosition: "",
      jobPositionId: "",
      avatarUrl: "",
      phoneNumber: "",
      roles: [],
    };
  }
}
