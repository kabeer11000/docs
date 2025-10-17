import { auth } from "@/state/auth";

let authInitialized = false;

export function initializeAuth(): void {
  if (typeof window === "undefined") return;

  try {
    auth.init();
    authInitialized = true;
  } catch (error) {
    console.error("Failed to initialize auth:", error);
  }
}

export function isAuthInitialized(): boolean {
  return authInitialized;
}

export function cleanupAuth(): void {
  // Cleanup is now handled by auth.cleanup()
  auth.cleanup();
}
