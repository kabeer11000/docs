import type { IAuthTokens, IUser } from "@shared-types";

// Cookie names
export const AUTH_COOKIES = {
  ACCESS_TOKEN: "lexa_access_token",
  REFRESH_TOKEN: "lexa_refresh_token",
  ID_TOKEN: "lexa_id_token",
  USER_DATA: "lexa_user_data",
  TOKEN_TYPE: "lexa_token_type",
  EXPIRES_IN: "lexa_expires_in",
} as const;

// Cookie options
const COOKIE_OPTIONS = {
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 24 * 60 * 60, // 24 hours - matches typical JWT token lifetime
};

// Server-side cookie utilities (for middleware, API routes)
export const serverCookies = {
  setAuthCookies: (tokens: IAuthTokens, user: IUser, headers?: Headers) => {
    const cookieHeaders: string[] = [
      `${AUTH_COOKIES.ACCESS_TOKEN}=${tokens.accessToken}; Path=/; Max-Age=${COOKIE_OPTIONS.maxAge}; HttpOnly; ${COOKIE_OPTIONS.secure ? "Secure;" : ""} SameSite=${COOKIE_OPTIONS.sameSite}`,
      `${AUTH_COOKIES.REFRESH_TOKEN}=${tokens.refreshToken}; Path=/; Max-Age=${COOKIE_OPTIONS.maxAge}; HttpOnly; ${COOKIE_OPTIONS.secure ? "Secure;" : ""} SameSite=${COOKIE_OPTIONS.sameSite}`,
      `${AUTH_COOKIES.ID_TOKEN}=${tokens.idToken || ""}; Path=/; Max-Age=${COOKIE_OPTIONS.maxAge}; HttpOnly; ${COOKIE_OPTIONS.secure ? "Secure;" : ""} SameSite=${COOKIE_OPTIONS.sameSite}`,
      `${AUTH_COOKIES.TOKEN_TYPE}=${tokens.tokenType}; Path=/; Max-Age=${COOKIE_OPTIONS.maxAge}; HttpOnly; ${COOKIE_OPTIONS.secure ? "Secure;" : ""} SameSite=${COOKIE_OPTIONS.sameSite}`,
      `${AUTH_COOKIES.EXPIRES_IN}=${tokens.expiresIn}; Path=/; Max-Age=${COOKIE_OPTIONS.maxAge}; HttpOnly; ${COOKIE_OPTIONS.secure ? "Secure;" : ""} SameSite=${COOKIE_OPTIONS.sameSite}`,
      `${AUTH_COOKIES.USER_DATA}=${encodeURIComponent(JSON.stringify(user))}; Path=/; Max-Age=${COOKIE_OPTIONS.maxAge}; ${COOKIE_OPTIONS.secure ? "Secure;" : ""} SameSite=${COOKIE_OPTIONS.sameSite}`,
    ];

    if (headers) {
      cookieHeaders.forEach((cookie) => headers.append("Set-Cookie", cookie));
    }
    return cookieHeaders;
  },

  clearAuthCookies: (headers?: Headers) => {
    const clearCookies = Object.values(AUTH_COOKIES).map(
      (name) =>
        `${name}=; Path=/; Max-Age=0; HttpOnly; ${COOKIE_OPTIONS.secure ? "Secure;" : ""} SameSite=${COOKIE_OPTIONS.sameSite}`,
    );

    if (headers) {
      clearCookies.forEach((cookie) => headers.append("Set-Cookie", cookie));
    }
    return clearCookies;
  },

  getAuthFromCookies: (
    cookieString?: string,
  ): { tokens: IAuthTokens | null; user: IUser | null } => {
    if (!cookieString?.trim()) {
      return { tokens: null, user: null };
    }

    try {
      const cookies = Object.fromEntries(
        cookieString
          .split("; ")
          .filter((cookie) => cookie.includes("="))
          .map((cookie) => {
            const [name, ...rest] = cookie.split("=");
            return [name?.trim(), rest.join("=")];
          })
          .filter(([name]) => name), // Filter out empty names
      );

      const accessToken = cookies[AUTH_COOKIES.ACCESS_TOKEN];
      const refreshToken = cookies[AUTH_COOKIES.REFRESH_TOKEN];
      const idToken = cookies[AUTH_COOKIES.ID_TOKEN];
      const tokenType = cookies[AUTH_COOKIES.TOKEN_TYPE];
      const expiresIn = cookies[AUTH_COOKIES.EXPIRES_IN];
      const userData = cookies[AUTH_COOKIES.USER_DATA];

      // Early return if required fields are missing
      if (
        !accessToken?.trim() ||
        !refreshToken?.trim() ||
        !tokenType?.trim() ||
        !userData?.trim()
      ) {
        return { tokens: null, user: null };
      }

      const tokens: IAuthTokens = {
        accessToken,
        refreshToken,
        idToken: idToken?.trim() || undefined,
        tokenType,
        expiresIn: parseInt(expiresIn, 10) || 3600,
      };

      // Validate user data before parsing
      let user: IUser;
      try {
        const decodedUserData = decodeURIComponent(userData);
        user = JSON.parse(decodedUserData);

        // Basic user validation
        if (!user || typeof user !== "object" || !user.id || !user.email) {
          return { tokens: null, user: null };
        }
      } catch (userParseError) {
        if (process.env.NODE_ENV === "development") {
          console.error(
            "Failed to parse user data from cookies:",
            userParseError,
          );
        }
        return { tokens: null, user: null };
      }

      return { tokens, user };
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to parse auth cookies:", error);
      }
      return { tokens: null, user: null };
    }
  },
};

// Memoization cache for cookie parsing
let cookieCache: {
  cookieString: string;
  result: { tokens: IAuthTokens | null; user: IUser | null };
} | null = null;

// Client-side cookie utilities (for components)
export const clientCookies = {
  setAuthCookies: (tokens: IAuthTokens, user: IUser) => {
    if (typeof document === "undefined") return;

    const expires = new Date(
      Date.now() + COOKIE_OPTIONS.maxAge * 1000,
    ).toUTCString();
    const cookieOptions = `expires=${expires}; path=${COOKIE_OPTIONS.path}; ${COOKIE_OPTIONS.secure ? "secure;" : ""} samesite=${COOKIE_OPTIONS.sameSite}`;

    // Note: We can't set httpOnly cookies from client-side JavaScript
    // These will be regular cookies accessible from JS
    document.cookie = `${AUTH_COOKIES.ACCESS_TOKEN}=${tokens.accessToken}; ${cookieOptions}`;
    document.cookie = `${AUTH_COOKIES.REFRESH_TOKEN}=${tokens.refreshToken}; ${cookieOptions}`;
    document.cookie = `${AUTH_COOKIES.ID_TOKEN}=${tokens.idToken || ""}; ${cookieOptions}`;
    document.cookie = `${AUTH_COOKIES.TOKEN_TYPE}=${tokens.tokenType}; ${cookieOptions}`;
    document.cookie = `${AUTH_COOKIES.EXPIRES_IN}=${tokens.expiresIn}; ${cookieOptions}`;
    document.cookie = `${AUTH_COOKIES.USER_DATA}=${encodeURIComponent(JSON.stringify(user))}; ${cookieOptions}`;

    // Invalidate cache when cookies are set
    cookieCache = null;
  },

  clearAuthCookies: () => {
    if (typeof document === "undefined") return;

    Object.values(AUTH_COOKIES).forEach((name) => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });

    // Invalidate cache when cookies are cleared
    cookieCache = null;
  },

  getAuthFromCookies: (): {
    tokens: IAuthTokens | null;
    user: IUser | null;
  } => {
    if (typeof document === "undefined") {
      return { tokens: null, user: null };
    }

    const cookieString = document.cookie;
    if (!cookieString?.trim()) {
      return { tokens: null, user: null };
    }

    // Return cached result if cookie string hasn't changed
    if (cookieCache && cookieCache.cookieString === cookieString) {
      return cookieCache.result;
    }

    // Parse and cache the result
    const result = serverCookies.getAuthFromCookies(cookieString);
    cookieCache = { cookieString, result };

    return result;
  },

  getCookie: (name: string): string | null => {
    if (typeof document === "undefined") return null;

    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(";").shift() || null;
    }
    return null;
  },
};

// Universal utilities that work on both server and client
export const getAuthFromRequest = (
  request?: Request,
): { tokens: IAuthTokens | null; user: IUser | null } => {
  const cookieString =
    request?.headers.get("cookie") ||
    (typeof document !== "undefined" ? document.cookie : "");
  return serverCookies.getAuthFromCookies(cookieString);
};
