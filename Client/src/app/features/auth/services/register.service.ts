import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { Api } from "../../../core/models/api.model";
import { RegisterRequest, RegisterResponse } from "../models/register.model";
import { API_ENDPOINTS } from "../../../core/constants";

@Injectable({
  providedIn: "root",
})
export class RegisterService {
  private readonly http = inject(HttpClient);

  register(request: RegisterRequest): Observable<Api<RegisterResponse>> {
    return this.http.post<Api<RegisterResponse>>(API_ENDPOINTS.register, request);
  }
}
