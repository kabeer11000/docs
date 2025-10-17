import type { IAuthTokens, IUser } from "@shared-types";
import { getAuthFromRequest, serverCookies } from "./cookies";

/**
 * Server-side authentication utilities for SSR, middleware, and API routes
 */

export interface ServerAuthState {
  isAuthenticated: boolean;
  user: IUser | null;
  tokens: IAuthTokens | null;
}

/**
 * Get authentication state from request cookies (for SSR)
 */
export function getServerAuthState(request?: Request): ServerAuthState {
  const { tokens, user } = getAuthFromRequest(request);

  if (!tokens || !user) {
    return {
      isAuthenticated: false,
      user: null,
      tokens: null,
    };
  }

  // Check if access token is expired
  try {
    const tokenPayload = JSON.parse(atob(tokens.accessToken.split(".")[1]));
    const now = Date.now() / 1000;

    const isAuthenticated = tokenPayload.exp > now;

    return {
      isAuthenticated,
      user: isAuthenticated ? user : null,
      tokens: isAuthenticated ? tokens : null,
    };
  } catch (error) {
    console.error("Failed to parse access token:", error);
    return {
      isAuthenticated: false,
      user: null,
      tokens: null,
    };
  }
}

/**
 * Create response with auth cookies set
 */
export function createAuthResponse(
  response: Response,
  tokens: IAuthTokens,
  user: IUser,
): Response {
  const headers = new Headers(response.headers);
  serverCookies.setAuthCookies(tokens, user, headers);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Create response with auth cookies cleared
 */
export function createLogoutResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  serverCookies.clearAuthCookies(headers);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Middleware helper to check if user is authenticated
 */
export function requireAuth(request: Request): {
  isAuthenticated: boolean;
  authState: ServerAuthState;
} {
  const authState = getServerAuthState(request);
  return {
    isAuthenticated: authState.isAuthenticated,
    authState,
  };
}

/**
 * Extract bearer token from Authorization header (fallback for API routes)
 */
export function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Get auth token from either cookies or Authorization header
 */
export function getAuthToken(request: Request): string | null {
  // First try to get from cookies
  const { tokens } = getAuthFromRequest(request);
  if (tokens?.accessToken) {
    return tokens.accessToken;
  }

  // Fallback to Authorization header
  return getBearerToken(request);
}
