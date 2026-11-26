"use client";

import { useStore } from "@nanostores/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { WorkspaceShell } from "@/components/home/workspace-shell";
import { $auth } from "@/state/auth";

/**
 * Home, Vault, Shared, folders and templates share this shell, so it mounts once
 * and stays put while pages switch. Auth is gated here, once.
 */
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isInitialized, isLoading } = useStore($auth);
  const signedOut = isInitialized && !isLoading && !user;

  useEffect(() => {
    if (signedOut) router.replace("/auth/login");
  }, [signedOut, router]);

  return <WorkspaceShell>{user ? children : <ContentPlaceholder />}</WorkspaceShell>;
}

/** Quiet stand-in for page content while auth initialises; never a blank screen. */
function ContentPlaceholder() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pt-5 md:px-10 md:pt-10" aria-hidden="true">
      <div className="mb-8 h-8 w-48 rounded bg-muted/70" />
    </div>
  );
}
