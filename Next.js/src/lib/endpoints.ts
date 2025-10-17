// =============================================================================
// API ENDPOINTS CONFIGURATION
// =============================================================================

// Helper to ensure secure WebSocket protocol
function getSecureWebSocketURL(url: string | undefined): string {
  if (!url) return "";

  const isProduction = process.env.NEXT_PUBLIC_ENVIRONMENT === "production" ||
                       process.env.NEXT_PUBLIC_ENVIRONMENT === "staging";
  const isLocalhost = url.includes("localhost") || url.includes("127.0.0.1");

  // In production, always use wss:// for non-localhost
  if (isProduction && !isLocalhost && url.startsWith("ws://")) {
    return url.replace("ws://", "wss://");
  }

  // In development, use wss:// for non-localhost
  if (!isProduction && !isLocalhost && url.startsWith("ws://")) {
    return url.replace("ws://", "wss://");
  }

  return url;
}

// Environment variables with fallbacks
const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://localhost:5000";
const BACKEND_WEBSOCKET_URL = getSecureWebSocketURL(
  process.env.NEXT_PUBLIC_BACKEND_WEBSOCKET_URL || "ws://localhost:1235"
);
const AI_BASE_URL =
  process.env.NEXT_PUBLIC_AI_BASE_URL || "http://localhost:8000";
const AI_WEBSOCKET_URL = getSecureWebSocketURL(
  process.env.NEXT_PUBLIC_AI_WEBSOCKET_URL || "ws://localhost:8001"
);
const AUTH_BASE_URL =
  process.env.NEXT_PUBLIC_AUTH_BASE_URL || "http://localhost:8081"; // Go auth service

// =============================================================================
// BASE URLS
// =============================================================================
export const BASE_URLS = {
  BACKEND: BACKEND_BASE_URL,
  BACKEND_WS: BACKEND_WEBSOCKET_URL,
  AI: AI_BASE_URL,
  AI_WS: AI_WEBSOCKET_URL,
  AUTH: AUTH_BASE_URL,
} as const;

// =============================================================================
// AUTHENTICATION ENDPOINTS
// =============================================================================
export const AUTH_ENDPOINTS = {
  // User Authentication
  REGISTER: `${AUTH_BASE_URL}/api/v1/auth/register`,
  LOGIN: `${AUTH_BASE_URL}/api/v1/auth/login`,
  LOGOUT: `${AUTH_BASE_URL}/api/v1/auth/logout`,
  REFRESH_TOKEN: `${AUTH_BASE_URL}/api/v1/auth/refresh`,
  REVOKE_TOKEN: `${AUTH_BASE_URL}/api/v1/auth/revoke`,

  // User Profile
  PROFILE: `${AUTH_BASE_URL}/api/v1/profile`,
  UPDATE_PROFILE: `${AUTH_BASE_URL}/api/v1/profile`,

  // Password Management
  CHANGE_PASSWORD: `${AUTH_BASE_URL}/api/auth/change-password`,
  FORGOT_PASSWORD: `${AUTH_BASE_URL}/api/auth/forgot-password`,
  RESET_PASSWORD: `${AUTH_BASE_URL}/api/auth/reset-password`,

  // Account Verification
  VERIFY_EMAIL: `${AUTH_BASE_URL}/api/auth/verify-email`,
  RESEND_VERIFICATION: `${AUTH_BASE_URL}/api/auth/resend-verification`,
} as const;

// =============================================================================
// BACKEND API ENDPOINTS
// =============================================================================
export const API_ENDPOINTS = {
  // Document Management
  DOCUMENTS: {
    LIST: `${BACKEND_BASE_URL}/api/documents`,
    CREATE: `${BACKEND_BASE_URL}/api/documents`,
    GET: (id: string) => `${BACKEND_BASE_URL}/api/documents/${id}`,
    UPDATE: (id: string) => `${BACKEND_BASE_URL}/api/documents/${id}`,
    DELETE: (id: string) => `${BACKEND_BASE_URL}/api/documents/${id}`,
    SHARE: (id: string) => `${BACKEND_BASE_URL}/api/documents/${id}/share`,
    COLLABORATE: (id: string) =>
      `${BACKEND_BASE_URL}/api/documents/${id}/collaborate`,
  },

  // Folder Management
  FOLDERS: {
    LIST: `${BACKEND_BASE_URL}/api/folders`,
    CREATE: `${BACKEND_BASE_URL}/api/folders`,
    GET: (id: string) => `${BACKEND_BASE_URL}/api/folders/${id}`,
    UPDATE: (id: string) => `${BACKEND_BASE_URL}/api/folders/${id}`,
    DELETE: (id: string) => `${BACKEND_BASE_URL}/api/folders/${id}`,
    MOVE: (id: string) => `${BACKEND_BASE_URL}/api/folders/${id}/move`,
  },

  // File Upload & Storage
  FILES: {
    UPLOAD: `${BACKEND_BASE_URL}/api/files/upload`,
    DOWNLOAD: (id: string) => `${BACKEND_BASE_URL}/api/files/${id}/download`,
    DELETE: (id: string) => `${BACKEND_BASE_URL}/api/files/${id}`,
    PREVIEW: (id: string) => `${BACKEND_BASE_URL}/api/files/${id}/preview`,
    METADATA: (id: string) => `${BACKEND_BASE_URL}/api/files/${id}/metadata`,
  },

  // Search
  SEARCH: {
    GLOBAL: `${BACKEND_BASE_URL}/api/search`,
    DOCUMENTS: `${BACKEND_BASE_URL}/api/search/documents`,
    FOLDERS: `${BACKEND_BASE_URL}/api/search/folders`,
    FILES: `${BACKEND_BASE_URL}/api/search/files`,
  },

  // Templates
  TEMPLATES: {
    LIST: `${BACKEND_BASE_URL}/api/templates`,
    GET: (id: string) => `${BACKEND_BASE_URL}/api/templates/${id}`,
    CREATE: `${BACKEND_BASE_URL}/api/templates`,
    UPDATE: (id: string) => `${BACKEND_BASE_URL}/api/templates/${id}`,
    DELETE: (id: string) => `${BACKEND_BASE_URL}/api/templates/${id}`,
  },

  // Organization & Teams
  ORGANIZATION: {
    DETAILS: `${BACKEND_BASE_URL}/api/organization`,
    MEMBERS: `${BACKEND_BASE_URL}/api/organization/members`,
    INVITE: `${BACKEND_BASE_URL}/api/organization/invite`,
    REMOVE_MEMBER: (id: string) =>
      `${BACKEND_BASE_URL}/api/organization/members/${id}`,
    UPDATE_ROLE: (id: string) =>
      `${BACKEND_BASE_URL}/api/organization/members/${id}/role`,
  },

  // Notifications
  NOTIFICATIONS: {
    LIST: `${BACKEND_BASE_URL}/api/notifications`,
    MARK_READ: (id: string) =>
      `${BACKEND_BASE_URL}/api/notifications/${id}/read`,
    MARK_ALL_READ: `${BACKEND_BASE_URL}/api/notifications/read-all`,
    DELETE: (id: string) => `${BACKEND_BASE_URL}/api/notifications/${id}`,
    SETTINGS: `${BACKEND_BASE_URL}/api/notifications/settings`,
  },

  // Analytics & Usage
  ANALYTICS: {
    DASHBOARD: `${BACKEND_BASE_URL}/api/analytics/dashboard`,
    USAGE: `${BACKEND_BASE_URL}/api/analytics/usage`,
    ACTIVITY: `${BACKEND_BASE_URL}/api/analytics/activity`,
    REPORTS: `${BACKEND_BASE_URL}/api/analytics/reports`,
  },
} as const;

// =============================================================================
// AI SERVICE ENDPOINTS
// =============================================================================
export const AI_ENDPOINTS = {
  // Chat & Conversations
  CHAT: {
    SEND_MESSAGE: `${AI_BASE_URL}/api/chat/message`,
    START_SESSION: `${AI_BASE_URL}/api/chat/session`,
    END_SESSION: (sessionId: string) =>
      `${AI_BASE_URL}/api/chat/session/${sessionId}/end`,
    HISTORY: `${AI_BASE_URL}/api/chat/history`,
    WEBSOCKET: AI_WEBSOCKET_URL,
  },

  // Document Analysis
  ANALYSIS: {
    ANALYZE_DOCUMENT: `${AI_BASE_URL}/api/analysis/document`,
    EXTRACT_ENTITIES: `${AI_BASE_URL}/api/analysis/entities`,
    SUMMARIZE: `${AI_BASE_URL}/api/analysis/summarize`,
    CLASSIFY: `${AI_BASE_URL}/api/analysis/classify`,
  },

  // AI Assistance
  ASSISTANCE: {
    LEGAL_ADVICE: `${AI_BASE_URL}/api/assistance/legal`,
    DOCUMENT_DRAFT: `${AI_BASE_URL}/api/assistance/draft`,
    RESEARCH: `${AI_BASE_URL}/api/assistance/research`,
    REVIEW: `${AI_BASE_URL}/api/assistance/review`,
  },
} as const;

// =============================================================================
// WEBSOCKET ENDPOINTS
// =============================================================================
export const WEBSOCKET_ENDPOINTS = {
  // Real-time Collaboration
  COLLABORATION: `${BACKEND_WEBSOCKET_URL}/collaboration`,

  // Real-time Notifications
  NOTIFICATIONS: `${BACKEND_WEBSOCKET_URL}/notifications`,

  // Document Sync
  DOCUMENT_SYNC: (documentId: string) =>
    `${BACKEND_WEBSOCKET_URL}/documents/${documentId}/sync`,

  // AI Chat
  AI_CHAT: AI_WEBSOCKET_URL,

  // Live Cursors
  CURSORS: (documentId: string) =>
    `${BACKEND_WEBSOCKET_URL}/documents/${documentId}/cursors`,
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Build URL with query parameters
 */
export function buildUrlWithParams(
  baseUrl: string,
  params: Record<string, any>,
): string {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });
  return url.toString();
}

/**
 * Get paginated endpoint URL
 */
export function getPaginatedUrl(
  baseUrl: string,
  page = 1,
  limit = 10,
  filters?: Record<string, any>,
): string {
  const params = { page, limit, ...filters };
  return buildUrlWithParams(baseUrl, params);
}

/**
 * Get search endpoint URL with query
 */
export function getSearchUrl(
  baseUrl: string,
  query: string,
  filters?: Record<string, any>,
): string {
  const params = { q: query, ...filters };
  return buildUrlWithParams(baseUrl, params);
}

// =============================================================================
// API CONFIGURATION
// =============================================================================
export const API_CONFIG = {
  // Request timeouts (in milliseconds)
  TIMEOUT: {
    DEFAULT: 10000, // 10 seconds
    UPLOAD: 300000, // 5 minutes
    DOWNLOAD: 60000, // 1 minute
    AI_CHAT: 30000, // 30 seconds
  },

  // Retry configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY: 1000, // 1 second
    BACKOFF_MULTIPLIER: 2,
  },

  // Headers
  HEADERS: {
    DEFAULT: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    MULTIPART: {
      // Content-Type will be set automatically for FormData
      Accept: "application/json",
    },
  },
} as const;

// =============================================================================
// ENDPOINT VALIDATION
// =============================================================================

/**
 * Validate if endpoint is available
 */
export async function validateEndpoint(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT.DEFAULT),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Health check for all services
 */
export async function healthCheck(): Promise<{
  auth: boolean;
  backend: boolean;
  ai: boolean;
}> {
  const [auth, backend, ai] = await Promise.all([
    validateEndpoint(`${AUTH_BASE_URL}/health`),
    validateEndpoint(`${BACKEND_BASE_URL}/health`),
    validateEndpoint(`${AI_BASE_URL}/health`),
  ]);

  return { auth, backend, ai };
}
