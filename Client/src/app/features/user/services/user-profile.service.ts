import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { map, Observable } from "rxjs";
import { API_ENDPOINTS } from "../../../core/constants";
import { Api } from "../../../core/models/api.model";
import { UserProfile } from "../../auth/models/user-profile.model";
import { UserProfileResponse } from "../models/user-profile-response.model";

type UserProfileApiResponse = Api<UserProfileResponse> | UserProfileResponse;

@Injectable({
  providedIn: "root",
})
export class UserProfileService {
  private readonly http = inject(HttpClient);

  getMyProfile(): Observable<UserProfile> {
    return this.http
      .get<UserProfileApiResponse>(API_ENDPOINTS.userMe)
      .pipe(map((response) => this.toUserProfile(response, true)));
  }

  getUserProfile(username: string): Observable<UserProfile> {
    return this.http
      .get<UserProfileApiResponse>(`${API_ENDPOINTS.user}/${encodeURIComponent(username)}`)
      .pipe(map((response) => this.toUserProfile(response, false)));
  }

  private toUserProfile(response: UserProfileApiResponse, isSelf: boolean): UserProfile {
    const profile = this.unwrapResponse(response);
    const username = profile.username ?? profile.Username ?? "";
    const fullName = profile.fullName ?? profile.FullName ?? "";
    const jobPosition = profile.jobPositionText ?? profile.JobPositionText ?? "";
    const avatarUrl = profile.avatarUrl ?? profile.AvatarUrl ?? "";
    const phoneNumber = profile.phoneNumber ?? profile.PhoneNumber ?? "";
    const id = profile.id ?? profile.Id ?? username;

    return {
      key: `user-${id}`,
      username,
      fullName: fullName || username,
      jobPosition: jobPosition || "—",
      avatarUrl: avatarUrl || "",
      phoneNumber: phoneNumber || "—",
      isSelf,
    };
  }

  private unwrapResponse(response: UserProfileApiResponse): UserProfileResponse {
    if (this.isApiResponse(response)) {
      return response.data;
    }

    return response;
  }

  private isApiResponse(response: UserProfileApiResponse): response is Api<UserProfileResponse> {
    return "data" in response;
  }
}
