import { Injectable } from "@angular/core";
import { AuthUser } from "../../features/auth/models/auth-user.model";
import { AUTH_STORAGE_KEYS } from "../constants";

type JwtPayload = Record<string, unknown> & {
  exp?: number;
  iat?: number;
};

@Injectable({
  providedIn: "root",
})
export class TokenService {
  getAccessToken(): string | null {
    return localStorage.getItem(AUTH_STORAGE_KEYS.accessToken);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken);
  }

  getUserData(): AuthUser | null {
    const accessToken = this.getAccessToken();
    const tokenUser = accessToken ? this.getUserDataFromToken(accessToken) : null;

    if (tokenUser) {
      this.setUserData(tokenUser);
      return tokenUser;
    }

    const storedUser = localStorage.getItem(AUTH_STORAGE_KEYS.userData);

    if (storedUser) {
      try {
        return JSON.parse(storedUser) as AuthUser;
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEYS.userData);
      }
    }

    return null;
  }

  getAccessTokenPayload(): JwtPayload | null {
    const accessToken = this.getAccessToken();
    return accessToken ? this.decodeJwtPayload(accessToken) : null;
  }

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, accessToken);
    localStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, refreshToken);

    const user = this.getUserDataFromToken(accessToken);

    if (user) {
      this.setUserData(user);
    }
  }

  setUserData(user: AuthUser): void {
    localStorage.setItem(AUTH_STORAGE_KEYS.userData, JSON.stringify(user));
  }

  clearTokens(): void {
    localStorage.removeItem(AUTH_STORAGE_KEYS.accessToken);
    localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
    localStorage.removeItem(AUTH_STORAGE_KEYS.userData);
    localStorage.removeItem(AUTH_STORAGE_KEYS.legacyUsername);
  }

  isAccessTokenExpired(): boolean {
    const payload = this.getAccessTokenPayload();

    if (!payload?.exp) {
      return true;
    }

    // 60-second clock skew buffer to avoid sending a token that expires in transit
    return (payload.exp - 60) * 1000 < Date.now();
  }

  private getUserDataFromToken(token: string): AuthUser | null {
    const payload = this.decodeJwtPayload(token);

    if (!payload) {
      return null;
    }

    const id = this.readClaim(payload, [
      "nameid",
      "sub",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/nameidentifier",
    ]);

    const username = this.readClaim(payload, [
      "unique_name",
      "name",
      "username",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
    ]);

    const roles = this.readClaims(payload, [
      "role",
      "roles",
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
    ]);

    return {
      id,
      username,
      email: this.readClaim(payload, [
        "email",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
      ]),
      fullName: this.readClaim(payload, ["fullName", "fullname", "full_name"]),
      jobPosition: this.readClaim(payload, ["jobPositionText", "jobPosition", "job_position"]),
      jobPositionId: this.readClaim(payload, ["jobPositionId", "job_position_id"]),
      avatarUrl: this.readClaim(payload, ["avatar", "avatarUrl", "avatar_url"]),
      phoneNumber: this.readClaim(payload, [
        "phone",
        "phoneNumber",
        "phone_number",
        "mobile",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/mobilephone",
      ]),
      roles,
    };
  }

  private readClaim(payload: JwtPayload, keys: string[]): string {
    for (const key of keys) {
      const value = payload[key];

      if (typeof value === "string" && value.trim().length > 0) {
        return value;
      }
    }

    return "";
  }

  private readClaims(payload: JwtPayload, keys: string[]): string[] {
    for (const key of keys) {
      const value = payload[key];

      if (Array.isArray(value)) {
        return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
      }

      if (typeof value === "string" && value.trim().length > 0) {
        return [value];
      }
    }

    return [];
  }

  private decodeJwtPayload(token: string): JwtPayload | null {
    const payload = token.split(".")[1];

    if (!payload) {
      return null;
    }

    try {
      const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
      const binary = atob(padded);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      const json = new TextDecoder("utf-8").decode(bytes);

      return JSON.parse(json) as JwtPayload;
    } catch {
      return null;
    }
  }
}
