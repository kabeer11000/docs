"use client";
import { AuthInitializer } from "@/components/common/auth-init";
import { SettingsDialog } from "@/components/common/setting-dialog";
import { Toaster } from "@/components/ui/sonner";
import { PWASupport } from "@/components/PWASupport";

// Initialize global CloudStore watchers (subscription starts automatically)
import "@/state/cloudstore-data";

export function Providers({ children }: { children: React.ReactNode }) {
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
