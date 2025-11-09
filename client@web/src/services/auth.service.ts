import type {
  IAuthResponse,
  IAuthTokens,
  IBackendAuthResponse,
  IRegisterRequest,
} from "@shared-types";
import { transformBackendUserToUser } from "@shared-types";
import { AUTH_ENDPOINTS } from "@/lib/endpoints";

// =============================================================================
// TYPES
// =============================================================================
export type {
  IApiError as ApiError,
  IAuthResponse as AuthResponse,
  IRegisterRequest as RegisterRequest,
} from "@shared-types";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenRefreshRequest {
  refreshToken: string;
}

// =============================================================================
// HTTP CLIENT
// =============================================================================
class HttpClient {
  private baseTimeout = 8000; // 8 seconds
  private maxRetries = 2;

  async request<T>(
    url: string,
    options: RequestInit & { timeout?: number; retries?: number } = {},
  ): Promise<T> {
    const {
      timeout = this.baseTimeout,
      retries = this.maxRetries,
      ...fetchOptions
    } = options;

    return this.requestWithRetry(url, fetchOptions, timeout, retries);
  }

  private async requestWithRetry<T>(
    url: string,
    options: RequestInit,
    timeout: number,
    retries: number,
  ): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            ...options.headers,
          },
        });

        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok) {
          throw new HttpError(
            data.message || `HTTP ${response.status}`,
            response.status,
            data.error || "request_failed",
          );
        }

        return data;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof HttpError) {
          // Don't retry client errors (4xx) or auth errors
          if (error.isClientError || error.isUnauthorized) {
            throw error;
          }
        }

        // Only retry on network errors or server errors, and if we have retries left
        if (attempt < retries) {
          const delay = Math.min(1000 * 2 ** attempt, 5000); // Exponential backoff, max 5s
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // Final attempt failed, throw the error
        if (error instanceof HttpError) {
          throw error;
        }

        if (error instanceof Error) {
          if (error.name === "AbortError") {
            throw new HttpError("Request timeout", 408, "timeout");
          }
          throw new HttpError(error.message, 0, "network_error");
        }

        throw new HttpError("Unknown error occurred", 0, "unknown_error");
      }
    }

    throw new HttpError("Max retries exceeded", 0, "max_retries_exceeded");
  }

  async get<T>(
    url: string,
    options: RequestInit & { timeout?: number; retries?: number } = {},
  ): Promise<T> {
    return this.request<T>(url, { ...options, method: "GET" });
  }

  async post<T>(
    url: string,
    body?: any,
    options: RequestInit & { timeout?: number; retries?: number } = {},
  ): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(
    url: string,
    body?: any,
    options: RequestInit & { timeout?: number; retries?: number } = {},
  ): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(
    url: string,
    options: RequestInit & { timeout?: number; retries?: number } = {},
  ): Promise<T> {
    return this.request<T>(url, { ...options, method: "DELETE" });
  }
}

// =============================================================================
// CUSTOM ERROR CLASS
// =============================================================================
export class HttpError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode: string,
  ) {
    super(message);
    this.name = "HttpError";
  }

  get isNetworkError() {
    return this.statusCode === 0;
  }

  get isClientError() {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  get isServerError() {
    return this.statusCode >= 500;
  }

  get isTimeout() {
    return this.statusCode === 408;
  }

  get isUnauthorized() {
    return this.statusCode === 401;
  }

  get isForbidden() {
    return this.statusCode === 403;
  }
}

// =============================================================================
// AUTH SERVICE CLASS
// =============================================================================
export class AuthService {
  private http = new HttpClient();

  /**
   * Login with email and password
   */
  async login(credentials: LoginRequest): Promise<IAuthResponse> {
    try {
      const backendResponse = await this.http.post<IBackendAuthResponse>(
        AUTH_ENDPOINTS.LOGIN,
        {...credentials, tenant_id: "1234"},
        { timeout: 8000, retries: 0 }, // 8 seconds for auth requests, no retries (fail fast)
      );

      // Transform backend response to frontend format
      return {
        user: transformBackendUserToUser(backendResponse.user),
        accessToken: backendResponse.access_token, // Convert snake_case to camelCase
        refreshToken: backendResponse.refresh_token,
        idToken: backendResponse.id_token,
        expiresIn: backendResponse.expires_in,
        tokenType: backendResponse.token_type,
      };
    } catch (error) {
      if (error instanceof HttpError) {
        // Map common auth errors to user-friendly messages
        if (error.isUnauthorized) {
          throw new HttpError(
            "Invalid email or password",
            401,
            "invalid_credentials",
          );
        }
        if (error.errorCode === "auth_method_not_available") {
          throw new HttpError(
            "Password login is not enabled for this account",
            403,
            "auth_method_disabled",
          );
        }
      }
      throw error;
    }
  }

  /**
   * Register new user
   */
  async register(userData: IRegisterRequest): Promise<IAuthResponse> {
    try {
      const backendResponse = await this.http.post<IBackendAuthResponse>(
        AUTH_ENDPOINTS.REGISTER,
        {...userData, tenant_id: "1234"},
        { timeout: 8000, retries: 0 }, // No retries for auth requests
      );

      // Transform backend response to frontend format
      return {
        user: transformBackendUserToUser(backendResponse.user),
        accessToken: backendResponse.access_token, // Convert snake_case to camelCase
        refreshToken: backendResponse.refresh_token,
        idToken: backendResponse.id_token,
        expiresIn: backendResponse.expires_in,
        tokenType: backendResponse.token_type,
      };
    } catch (error) {
      if (error instanceof HttpError) {
        // Map common registration errors
        if (error.errorCode === "user_exists") {
          throw new HttpError(
            "An account with this email already exists",
            409,
            "user_exists",
          );
        }
        if (error.errorCode === "validation_failed") {
          throw new HttpError(
            "Please check your input and try again",
            400,
            "validation_failed",
          );
        }
      }
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<IAuthResponse> {
    const backendResponse = await this.http.post<IBackendAuthResponse>(
      AUTH_ENDPOINTS.REFRESH_TOKEN,
      { refresh_token: refreshToken }, // Send snake_case to match Go service
      { timeout: 8000, retries: 0 }, // No retries for token refresh
    );

    // Transform backend response to frontend format
    return {
      user: transformBackendUserToUser(backendResponse.user),
      accessToken: backendResponse.access_token, // Convert snake_case to camelCase
      refreshToken: backendResponse.refresh_token,
      idToken: backendResponse.id_token,
      expiresIn: backendResponse.expires_in,
      tokenType: backendResponse.token_type,
    };
  }

  /**
   * Logout user (revoke tokens)
   */
  async logout(accessToken: string): Promise<void> {
    try {
      await this.http.post(
        AUTH_ENDPOINTS.LOGOUT,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          timeout: 5000, // Short timeout for logout
        },
      );
    } catch (error) {
      // Don't throw on logout errors - just log them
      console.warn("Logout request failed:", error);
    }
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    await this.http.post(
      AUTH_ENDPOINTS.REVOKE_TOKEN,
      { refresh_token: refreshToken }, // Send snake_case to match Go service
      { timeout: 5000 },
    );
  }

  /**
   * Get current user profile
   */
  async getProfile(accessToken: string): Promise<IAuthResponse["user"]> {
    const response = await this.http.get<{ user: IAuthResponse["user"] }>(
      AUTH_ENDPOINTS.PROFILE,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    return response.user;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    accessToken: string,
    updates: Partial<IAuthResponse["user"]>,
  ): Promise<IAuthResponse["user"]> {
    const response = await this.http.put<{ user: IAuthResponse["user"] }>(
      AUTH_ENDPOINTS.UPDATE_PROFILE,
      updates,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    return response.user;
  }

  /**
   * Change password
   */
  async changePassword(
    accessToken: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    await this.http.post(
      AUTH_ENDPOINTS.CHANGE_PASSWORD,
      {
        oldPassword,
        newPassword,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    await this.http.post(AUTH_ENDPOINTS.FORGOT_PASSWORD, { email });
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.http.post(AUTH_ENDPOINTS.RESET_PASSWORD, {
      token,
      newPassword,
    });
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<void> {
    await this.http.post(AUTH_ENDPOINTS.VERIFY_EMAIL, { token });
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification(accessToken: string): Promise<void> {
    await this.http.post(
      AUTH_ENDPOINTS.RESEND_VERIFICATION,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
  }

  /**
   * Check if token is about to expire (within 2 minutes)
   */
  isTokenNearExpiry(tokens: IAuthTokens): boolean {
    const payload = this.decodeToken(tokens.accessToken);
    if (!payload?.exp) return true;

    const now = Date.now() / 1000;
    const twoMinutes = 2 * 60; // Reduced from 5 minutes to reduce refresh frequency

    return payload.exp - now < twoMinutes;
  }

  /**
   * Decode JWT token payload
   */
  decodeToken(token: string): any {
    try {
      const payload = token.split(".")[1];
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    const payload = this.decodeToken(token);
    if (!payload?.exp) return true;

    const now = Date.now() / 1000;
    return payload.exp < now;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================
export const authService = new AuthService();
