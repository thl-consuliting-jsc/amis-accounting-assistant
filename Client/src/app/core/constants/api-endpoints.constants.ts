import { environment } from "../../../environments/environment";

export const API_ENDPOINTS = {
  login: `${environment.apiUrl}/login`,
  register: `${environment.apiUrl}/register`,
  contact: `${environment.apiUrl}/contact`,
  user: `${environment.apiUrl}/user`,
  userMe: `${environment.apiUrl}/user/me`,
  userAvatar: `${environment.apiUrl}/user/me/avatar`,
  stickerPacks: `${environment.apiUrl}/sticker/packs`,
} as const;

export const API_ASSET_BASE_URL = environment.domainApi + "/assets";
