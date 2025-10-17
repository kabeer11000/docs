// Environment variables configuration for Next.js
// This file provides type-safe access to environment variables

// Helper to get environment variable with fallback
function getEnvVar(key: string, fallback?: string): string {
  const value = process.env[key];
  if (value === undefined || value === "") {
    // Only warn if there's no fallback and it's a required variable
    if (fallback === undefined && process.env.NODE_ENV === "development") {
      console.warn(`Environment variable ${key} is not defined`);
    }
    return fallback || "";
  }
  return value;
}

// Helper to get boolean environment variable
function getBoolEnvVar(key: string, fallback: boolean = false): boolean {
  const value = process.env[key];
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1";
}

// Export environment configuration object
export const env = {
  // Public environment variables (accessible on client-side)
  NEXT_PUBLIC_BACKEND_BASE_URL: getEnvVar(
    "NEXT_PUBLIC_BACKEND_BASE_URL",
    "http://localhost:5000",
  ),
  NEXT_PUBLIC_BACKEND_WEBSOCKET_URL: getEnvVar(
    "NEXT_PUBLIC_BACKEND_WEBSOCKET_URL",
    "ws://localhost:1235",
  ),
  NEXT_PUBLIC_AI_BASE_URL: getEnvVar(
    "NEXT_PUBLIC_AI_BASE_URL",
    "https://lexa-ai-983624625569.europe-west1.run.app",
  ),
  NEXT_PUBLIC_AI_WEBSOCKET_URL: getEnvVar(
    "NEXT_PUBLIC_AI_WEBSOCKET_URL",
    "wss://lexa-ai-983624625569.europe-west1.run.app/ws/chat",
  ),
  NEXT_PUBLIC_ENVIRONMENT: getEnvVar(
    "NEXT_PUBLIC_ENVIRONMENT",
    "development",
  ) as "development" | "staging" | "production",
  NEXT_PUBLIC_ENABLE_AI_CHAT: getBoolEnvVar("NEXT_PUBLIC_ENABLE_AI_CHAT", true),
  NEXT_PUBLIC_ENABLE_COLLABORATION: getBoolEnvVar(
    "NEXT_PUBLIC_ENABLE_COLLABORATION",
    true,
  ),
  NEXT_PUBLIC_ENABLE_FILE_UPLOAD: getBoolEnvVar(
    "NEXT_PUBLIC_ENABLE_FILE_UPLOAD",
    true,
  ),
  NEXT_PUBLIC_DEBUG_MODE: getBoolEnvVar("NEXT_PUBLIC_DEBUG_MODE", false),
  NEXT_PUBLIC_ENABLE_REACT_SCAN: getBoolEnvVar(
    "NEXT_PUBLIC_ENABLE_REACT_SCAN",
    false,
  ),
  NEXT_PUBLIC_AUTH_GOOGLE_CLIENT_ID: getEnvVar(
    "NEXT_PUBLIC_AUTH_GOOGLE_CLIENT_ID",
    "",
  ),
  NEXT_PUBLIC_API_URL: getEnvVar(
    "NEXT_PUBLIC_API_URL",
    "http://localhost:3000",
  ),
  NEXT_PUBLIC_ALLOWED_ORIGINS: getEnvVar(
    "NEXT_PUBLIC_ALLOWED_ORIGINS",
    "http://localhost:4321,http://localhost:3000",
  ),
  NEXT_PUBLIC_CDN_URL: getEnvVar("NEXT_PUBLIC_CDN_URL", ""),
  NEXT_PUBLIC_SENTRY_DSN: getEnvVar("NEXT_PUBLIC_SENTRY_DSN", ""),
  NEXT_PUBLIC_CLOUDSTORE_SERVER_URL: getEnvVar(
    "NEXT_PUBLIC_CLOUDSTORE_SERVER_URL",
    "http://localhost:8080",
  ),
  NEXT_PUBLIC_UPLIFT_ASSISTANT_ID: getEnvVar(
    "NEXT_PUBLIC_UPLIFT_ASSISTANT_ID",
    "",
  ),
  NEXT_PUBLIC_AUTH_BASE_URL: getEnvVar(
    "NEXT_PUBLIC_AUTH_BASE_URL",
    "https://lxauthentication.deployments.otherdev.com",
  ),

  // Server-side only environment variables
  JWT_SECRET: getEnvVar("JWT_SECRET", ""),
  AUTH_GOOGLE_CLIENT_SECRET: getEnvVar("AUTH_GOOGLE_CLIENT_SECRET", ""),
  SESSION_SECRET: getEnvVar("SESSION_SECRET", ""),
  MONGODB_URI: getEnvVar("MONGODB_URI", ""),
  MONGODB_DB_NAME: getEnvVar("MONGODB_DB_NAME", ""),
  NODE_ENV: (process.env.NODE_ENV || "development") as
    | "development"
    | "staging"
    | "production",
} as const;

export type Env = typeof env;

// Helper function to get server-side only config (throws on client-side)
export const getSecureConfig = () => {
  if (typeof window !== "undefined") {
    throw new Error("Secure config cannot be accessed on client side");
  }

  return {
    JWT_SECRET: env.JWT_SECRET,
    SESSION_SECRET: env.SESSION_SECRET,
    AUTH_GOOGLE_CLIENT_SECRET: env.AUTH_GOOGLE_CLIENT_SECRET,
    MONGODB_URI: env.MONGODB_URI,
    MONGODB_DB_NAME: env.MONGODB_DB_NAME,
  };
};
