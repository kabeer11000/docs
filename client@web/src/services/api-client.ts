import { auth, getAuthHeader } from "@/state/auth";

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
  errorCode: string;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${this.baseUrl}${endpoint}`;

    // Get auth header if available
    const authHeader = getAuthHeader();

    const config: RequestInit = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        // Handle 401 Unauthorized - try to refresh token
        if (response.status === 401 && authHeader) {
          const refreshSuccess = await auth.refreshToken();

          if (refreshSuccess) {
            // Retry request with new token
            const newAuthHeader = getAuthHeader();
            const retryConfig = {
              ...config,
              headers: {
                ...config.headers,
                Authorization: newAuthHeader || "",
              },
            };

            const retryResponse = await fetch(url, retryConfig);
            const retryData = await retryResponse.json();

            if (!retryResponse.ok) {
              throw new ApiError(
                retryData.message || `HTTP ${retryResponse.status}`,
                retryResponse.status,
                retryData.error || "request_failed",
              );
            }

            return retryData;
          } else {
            // Refresh failed, redirect to login (auth already cleared in refreshToken)
            if (typeof window !== "undefined") {
              window.location.href = "/auth/login";
            }
          }
        }

        throw new ApiError(
          data.message || `HTTP ${response.status}`,
          response.status,
          data.error || "request_failed",
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof Error) {
        throw new ApiError(error.message, 0, "network_error");
      }

      throw new ApiError("Unknown error occurred", 0, "unknown_error");
    }
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  async post<T>(
    endpoint: string,
    data?: any,
    options?: RequestInit,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(
    endpoint: string,
    data?: any,
    options?: RequestInit,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  async patch<T>(
    endpoint: string,
    data?: any,
    options?: RequestInit,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // Upload files with multipart/form-data
  async upload<T>(
    endpoint: string,
    formData: FormData,
    options?: Omit<RequestInit, "body">,
  ): Promise<T> {
    const authHeader = getAuthHeader();

    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: formData,
      headers: {
        // Don't set Content-Type for FormData - browser will set it with boundary
        ...options?.headers,
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });
  }
}

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode: string,
  ) {
    super(message);
    this.name = "ApiError";
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

  get isUnauthorized() {
    return this.statusCode === 401;
  }

  get isForbidden() {
    return this.statusCode === 403;
  }

  get isNotFound() {
    return this.statusCode === 404;
  }
}

// Create API clients for different services
export const backendApi = new ApiClient(
  process.env.PUBLIC_BACKEND_BASE_URL || "http://localhost:5000",
);
export const aiApi = new ApiClient(
  process.env.PUBLIC_AI_BASE_URL || "http://localhost:8000",
);
export const authApi = new ApiClient(
  process.env.NEXT_PUBLIC_AUTH_BASE_URL || "http://localhost:8081",
);

// Export the main API client (backend by default)
export const api = backendApi;
