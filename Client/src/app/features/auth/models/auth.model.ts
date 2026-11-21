export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiry: string;
}
export interface LoginRequest {
    username: string;
    password: string;
}