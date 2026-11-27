"use client";
import { AuthInitializer } from "@/components/common/auth-init";
import { SettingsDialog } from "@/components/common/setting-dialog";
import { StaleBuildReload } from "@/components/common/stale-build-reload";
import { Toaster } from "@/components/ui/sonner";
import { PWASupport } from "@/components/PWASupport";
import { ThemeProvider } from "next-themes";
import { ProductTour } from "@/components/onboarding/product-tour";

// Initialize global CloudStore watchers (subscription starts automatically)
import "@/state/cloudstore-data";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <StaleBuildReload />
      <PWASupport />
      <AuthInitializer />
      <SettingsDialog />
      <Toaster />
      <ProductTour />
      {children}
    </ThemeProvider>
  );
}
