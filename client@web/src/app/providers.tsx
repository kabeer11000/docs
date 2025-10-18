"use client";

import { useEffect } from "react";
import { AuthInitializer } from "@/components/common/auth-init";
import { SettingsDialog } from "@/components/common/setting-dialog";
import { Toaster } from "@/components/ui/sonner";
import { PWASupport } from "@/components/PWASupport";
// Initialize global CloudStore watchers (subscription starts automatically)
import "@/state/cloudstore-data";

export function Providers({ children }: { children: React.ReactNode }) {
  const isDevelopment = process.env.NODE_ENV === "development";
  const enableReactScan = process.env.NEXT_PUBLIC_ENABLE_REACT_SCAN === "true";
  const debugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === "true";

  useEffect(() => {
    // Console redirect for development
    if (isDevelopment && debugMode) {
      // Add console redirect logic if needed
      console.log("UI initialized in development mode");
    }

    // Load Stats.js for development
    if (isDevelopment && debugMode && typeof window !== "undefined") {
      const script = document.createElement("script");
      script.src = "/__dev/stats.js";
      script.async = true;
      document.body.appendChild(script);

      return () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    }
  }, [isDevelopment, debugMode]);

  useEffect(() => {
    // Load React Scan for development
    if (isDevelopment && enableReactScan && typeof window !== "undefined") {
      import("react-scan").then(({ scan }) => {
        scan({
          enabled: true,
          log: true,
        });
      });
    }
  }, [isDevelopment, enableReactScan]);

  return (
    <>
      <PWASupport />
      <AuthInitializer />
      <SettingsDialog />
      <Toaster />
      {children}
    </>
  );
}
