import { useStore } from "@nanostores/react";
import { useEffect, useState } from "react";
import { isAuthInitialized } from "@/lib/auth-init";
import { $auth } from "@/state/auth";

interface ProgressiveAuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
  showContentImmediately?: boolean;
}

/**
 * Progressive Auth Guard that allows content to render immediately
 * while auth initializes in the background
 */
export function ProgressiveAuthGuard({
  children,
  redirectTo = "/auth/login",
  requireAuth = true,
  showContentImmediately = true,
}: ProgressiveAuthGuardProps) {
  const { isAuthenticated, isLoading: authLoading } = useStore($auth);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    const checkInit = () => {
      const initialized = isAuthInitialized();
      setIsInitialized(initialized);
      if (initialized) {
        setHasCheckedAuth(true);
      }
    };

    checkInit();

    // Check periodically until initialized
    if (!isAuthInitialized()) {
      const interval = setInterval(() => {
        checkInit();
        if (isAuthInitialized()) {
          clearInterval(interval);
        }
      }, 50);

      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    // Handle redirects only after auth has been properly checked
    if (typeof window === "undefined") return;
    if (!hasCheckedAuth || authLoading) return;

    if (requireAuth && !isAuthenticated && isInitialized) {
      const currentPath = window.location.pathname + window.location.search;
      const loginUrl = new URL(redirectTo, window.location.origin);
      loginUrl.searchParams.set("redirect", currentPath);
      window.location.href = loginUrl.toString();
    }

    if (!requireAuth && isAuthenticated && !authLoading) {
      window.location.href = "/home";
    }
  }, [
    requireAuth,
    isAuthenticated,
    authLoading,
    isInitialized,
    hasCheckedAuth,
    redirectTo,
  ]);

  // Show content immediately if configured to do so
  if (showContentImmediately) {
    return <>{children}</>;
  }

  // Fallback to original behavior if immediate rendering is disabled
  if (!isInitialized || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If auth is required and user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <p className="text-sm text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
