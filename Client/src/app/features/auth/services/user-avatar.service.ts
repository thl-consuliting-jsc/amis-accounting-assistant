import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { API_ENDPOINTS } from "../../../core/constants";

@Injectable({
  providedIn: "root",
})
export class UserAvatarService {
  private readonly http = inject(HttpClient);

  uploadAvatar(file: File): Observable<unknown> {
    const formData = new FormData();
    formData.append("file", file);

    return this.http.put(API_ENDPOINTS.userAvatar, formData);
  }
}
