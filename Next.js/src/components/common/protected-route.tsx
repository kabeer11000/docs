import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
  loadingComponent?: ReactNode;
}

/**
 * Wrapper component for protecting routes that require authentication
 */
export function ProtectedRoute({
  children,
  fallback,
  redirectTo = "/auth/login",
  loadingComponent,
}: ProtectedRouteProps) {
  return (
    <AuthGuard
      requireAuth={true}
      fallback={fallback}
      redirectTo={redirectTo}
      loadingComponent={loadingComponent}
    >
      {children}
    </AuthGuard>
  );
}

/**
 * Wrapper component for guest-only routes (redirect authenticated users)
 */
export function GuestRoute({
  children,
  redirectTo = "/home",
  loadingComponent,
}: {
  children: ReactNode;
  redirectTo?: string;
  loadingComponent?: ReactNode;
}) {
  return (
    <AuthGuard
      requireAuth={false}
      redirectTo={redirectTo}
      loadingComponent={loadingComponent}
    >
      {children}
    </AuthGuard>
  );
}
