"use client";

import { useEffect } from "react";

const KEY = "docs.stale-build-reload";
const isChunkError = (msg: string) => /ChunkLoadError|Loading chunk [\w-]+ failed|Failed to fetch dynamically imported module|Importing a module script failed/i.test(msg);

/**
 * After a deploy, a tab still running the old build asks for chunks that no longer exist.
 * Reload once to pick up the new build instead of showing an application error.
 */
export function StaleBuildReload() {
  useEffect(() => {
    const recover = (msg: string) => {
      if (!isChunkError(msg)) return;
      const last = Number(sessionStorage.getItem(KEY) || 0);
      if (Date.now() - last < 30_000) return; // never loop
      sessionStorage.setItem(KEY, String(Date.now()));
      window.location.reload();
    };
    const onError = (e: ErrorEvent) => recover(String(e.message || e.error?.message || ""));
    const onRejection = (e: PromiseRejectionEvent) => recover(String(e.reason?.message || e.reason || ""));
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
