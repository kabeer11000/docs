import { useEffect } from "react";
import { cleanupAuth, initializeAuth } from "@/lib/auth-init";

/**
 * Component to initialize auth when the app starts
 * Should be included in the root layout or main app component
 */
export function AuthInitializer() {
  useEffect(() => {
    // Initialize auth once on mount (not on every route change)
    initializeAuth();

    // Cleanup on unmount to prevent memory leaks
    return () => {
      cleanupAuth();
    };
  }, []); // Empty dependency array = run once on mount

  return null;
}
