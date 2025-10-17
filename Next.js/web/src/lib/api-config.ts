// API Configuration for Lexa Backend and AI Services
import { env } from "./env";

export const API_CONFIG = {
  // Lexa Backend (Document Management)
  BACKEND: {
    BASE_URL: env.NEXT_PUBLIC_BACKEND_BASE_URL,
    WEBSOCKET_URL: env.NEXT_PUBLIC_BACKEND_WEBSOCKET_URL,
    ENDPOINTS: {
      HEALTH: "/health",
      USERS: "/api/users",
      DOCUMENTS: "/api/documents",
      FOLDERS: "/api/folders",
    },
  },

  // AI Chat API (Legal Assistant)
  AI: {
    BASE_URL: env.NEXT_PUBLIC_AI_BASE_URL,
    WEBSOCKET_URL: env.NEXT_PUBLIC_AI_WEBSOCKET_URL,
    ENDPOINTS: {
      HEALTH: "/health",
      CHATS: "/chat/chats",
      MESSAGES: "/chat/messages",
      FILES: "/files",
      FILES_BY_MESSAGE: "/files/message",
      FILES_BY_CHAT: "/files/chat",
      DELETE_VECTOR: "/delete/vector-store",
      DELETE_FILES: "/delete/aws-userfiles",
      DELETE_FILE_BY_ID: "/delete/file",
      UPLOAD: "/upload/file",
      SUMMARIZE: "/summarize",
    },
  },

  // Feature Flags
  FEATURES: {
    AI_CHAT_ENABLED: env.NEXT_PUBLIC_ENABLE_AI_CHAT ?? true,
    COLLABORATION_ENABLED: env.NEXT_PUBLIC_ENABLE_COLLABORATION ?? true,
    FILE_UPLOAD_ENABLED: env.NEXT_PUBLIC_ENABLE_FILE_UPLOAD ?? true,
    DEBUG_MODE: env.NEXT_PUBLIC_DEBUG_MODE,
    REACT_SCAN_ENABLED: env.NEXT_PUBLIC_ENABLE_REACT_SCAN,
  },

  // Environment Info
  ENVIRONMENT: env.NEXT_PUBLIC_ENVIRONMENT,
  IS_PRODUCTION: env.NEXT_PUBLIC_ENVIRONMENT === "production",
  IS_DEVELOPMENT: env.NEXT_PUBLIC_ENVIRONMENT === "development",
  IS_STAGING: env.NEXT_PUBLIC_ENVIRONMENT === "staging",
} as const;

// Default headers for API requests
export const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

// User ID for API requests (in production, this would come from auth)
export const getCurrentUserId = (): string => {
  // Check if we're in browser environment
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    const userId = localStorage.getItem("lexa-user-id");
    if (userId) {
      return userId;
    }
  }

  // Server-side fallback or unauthenticated user
  return "anonymous-user";
};

// Get authentication headers for API requests
export const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {};

  if (typeof window !== "undefined") {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const trimmed = cookie.trim();
      if (trimmed.startsWith("lexa_access_token=")) {
        const token = trimmed.substring("lexa_access_token=".length);
        headers.Authorization = `Bearer ${token}`;
        break;
      }
    }
  }

  return headers;
};

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
