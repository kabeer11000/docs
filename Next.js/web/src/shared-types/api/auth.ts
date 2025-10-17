/**
 * Authentication API types - shared with auth service
 */

import type { IBackendUser, IUser } from "../core/user";

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface ILoginCredentials {
  email: string;
  password: string;
}

export interface ISignUpData {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// Backend auth response structure
// Backend auth response from Go service (matches models.AuthResponse exactly)
export interface IBackendAuthResponse {
  user: IBackendUser;
  access_token: string; // Go service uses snake_case JSON tags
  refresh_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
}

// Frontend auth response (transformed for consistency)
export interface IAuthResponse {
  user: IUser; // Use base IUser, not IUserProfile
  accessToken: string; // Frontend uses camelCase
  refreshToken: string;
  idToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface IAuthState {
  isAuthenticated: boolean;
  user: IUser | null;
  tokens: IAuthTokens | null;
  isLoading: boolean;
  error: string | null;
}

export interface IPasswordResetRequest {
  email: string;
}

export interface IPasswordChangeRequest {
  oldPassword: string;
  newPassword: string;
}

export interface IEmailVerificationRequest {
  token: string;
}

// Auth service types
export interface IRegisterRequest {
  name: string;
  email: string;
  password: string;
}

// Backend token refresh request (matches Go models.TokenRefreshRequest)
export interface IBackendTokenRefreshRequest {
  refresh_token: string; // Go service expects snake_case
}

// Frontend token refresh request (for convenience)
export interface ITokenRefreshRequest {
  refreshToken: string; // Frontend uses camelCase
}

export interface IApiError {
  error: string;
  message: string;
  statusCode?: number;
}
