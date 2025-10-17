import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AUTH_COOKIES } from "@/lib/auth/cookies";

// Define route patterns
const AUTH_ROUTES = ["/auth/login", "/auth/signup"];
const PROTECTED_ROUTE_PATTERNS = [
  "/home",
  "/vault",
  "/folder",
  "/document",
  "/chat",
  "/shared",
  "/templates",
  "/settings",
];

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname.startsWith(route));
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTE_PATTERNS.some((pattern) =>
    pathname.startsWith(pattern),
  );
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Handle CORS for API requests
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": getAllowedOrigin(request),
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Requested-With",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400", // 24 hours
      },
    });
  }

  // Auth check for protected routes
  const accessToken = request.cookies.get(AUTH_COOKIES.ACCESS_TOKEN)?.value;
  const hasValidAuth = !!accessToken;

  // Redirect to login if accessing protected route without authentication
  if (isProtectedRoute(pathname) && !hasValidAuth) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to home if accessing auth pages while already authenticated
  if (isAuthRoute(pathname) && hasValidAuth) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  // Create response
  const response = NextResponse.next();

  // Only set CORS headers if this is an API route or needs CORS
  if (
    request.nextUrl.pathname.startsWith("/api/") ||
    shouldAllowCORS(request)
  ) {
    response.headers.set(
      "Access-Control-Allow-Origin",
      getAllowedOrigin(request),
    );
    response.headers.set("Access-Control-Allow-Credentials", "true");

    // Set security headers for production
    const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || "development";
    if (environment === "production") {
      response.headers.set("X-Content-Type-Options", "nosniff");
      response.headers.set("X-Frame-Options", "DENY");
      response.headers.set("X-XSS-Protection", "1; mode=block");
      response.headers.set(
        "Referrer-Policy",
        "strict-origin-when-cross-origin",
      );

      // Basic CSP header - should be customized based on your needs
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "";
      const aiUrl = process.env.NEXT_PUBLIC_AI_BASE_URL || "";
      const backendWs = (process.env.NEXT_PUBLIC_BACKEND_WEBSOCKET_URL || "")
        .replace("ws://", "wss://")
        .replace("ws:", "wss:");
      const aiWs = (process.env.NEXT_PUBLIC_AI_WEBSOCKET_URL || "")
        .replace("ws://", "wss://")
        .replace("ws:", "wss:");

      response.headers.set(
        "Content-Security-Policy",
        `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' ${backendUrl} ${aiUrl} ${backendWs} ${aiWs};`,
      );
    }
  }

  return response;
}

function getAllowedOrigin(request: NextRequest): string {
  const origin = request.headers.get("origin");
  const allowedOriginsString = process.env.NEXT_PUBLIC_ALLOWED_ORIGINS || "";
  const allowedOrigins = allowedOriginsString.split(",").map((o) => o.trim());
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || "development";

  // For development, allow localhost origins
  if (environment === "development") {
    if (
      origin &&
      (origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        allowedOrigins.includes(origin))
    ) {
      return origin;
    }
  }

  // For production/staging, only allow explicitly configured origins
  if (origin && allowedOrigins.includes(origin)) {
    return origin;
  }

  // Fallback to first allowed origin or '*' for development
  return allowedOrigins[0] || (environment === "development" ? "*" : "null");
}

function shouldAllowCORS(request: NextRequest): boolean {
  // Add logic to determine if CORS headers should be set
  // For now, allow CORS for requests with Origin header
  return !!request.headers.get("origin");
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm)$).*)",
  ],
};
