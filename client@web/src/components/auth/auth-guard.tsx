import { useStore } from "@nanostores/react";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { isAuthInitialized } from "@/lib/auth-init";
import { $auth } from "@/state/auth";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
  loadingComponent?: React.ReactNode;
}

export function AuthGuard({
  children,
  fallback,
  redirectTo = "/auth/login",
  requireAuth = true,
  loadingComponent,
}: AuthGuardProps) {
  const { isAuthenticated, isLoading: authLoading } = useStore($auth);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setIsInitialized(isAuthInitialized());
  }, []);

  useEffect(() => {
    // Handle redirects after component mounts
    if (typeof window === "undefined") return;

    if (requireAuth && !isAuthenticated && !authLoading && isInitialized) {
      const currentPath =
        pathname +
        (searchParams.toString() ? `?${searchParams.toString()}` : "");
      const redirectUrl = `${redirectTo}?redirect=${encodeURIComponent(currentPath)}`;
      router.push(redirectUrl);
    }

    if (!requireAuth && isAuthenticated && !authLoading) {
      router.push("/home");
    }
  }, [
    requireAuth,
    isAuthenticated,
    authLoading,
    isInitialized,
    redirectTo,
    router,
    pathname,
    searchParams,
  ]);

  // Show loading while initializing or during auth operations
  if (!isInitialized || authLoading) {
    return loadingComponent || <AuthLoadingSpinner />;
  }

  // If auth is required and user is not authenticated
  if (requireAuth && !isAuthenticated) {
    // If fallback is provided, render it
    if (fallback) {
      return <>{fallback}</>;
    }

    return <AuthLoadingSpinner />;
  }

  // If auth is NOT required and user IS authenticated, redirect to home
  if (!requireAuth && isAuthenticated) {
    return <AuthLoadingSpinner />;
  }

  // Render children if all conditions are met
  return <>{children}</>;
}

// Default loading component
function AuthLoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// Higher-order component for protecting pages
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<AuthGuardProps, "children"> = {},
) {
  return function ProtectedComponent(props: P) {
    return (
      <AuthGuard {...options}>
        <Component {...props} />
      </AuthGuard>
    );
  };
}

// Component for conditionally rendering content based on auth state
interface AuthStateProps {
  authenticated?: React.ReactNode;
  unauthenticated?: React.ReactNode;
  loading?: React.ReactNode;
}

export function AuthState({
  authenticated,
  unauthenticated,
  loading,
}: AuthStateProps) {
  const { isAuthenticated, isLoading: authLoading } = useStore($auth);

  if (authLoading) {
    return <>{loading || <AuthLoadingSpinner />}</>;
  }

  if (isAuthenticated) {
    return <>{authenticated}</>;
  }

  return <>{unauthenticated}</>;
}
