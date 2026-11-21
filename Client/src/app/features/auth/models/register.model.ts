export interface RegisterRequest {
  username: string;
  email: string;
  fullName: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  jobPositionId: string;
}

export interface RegisterResponse {
  message: string;
}
