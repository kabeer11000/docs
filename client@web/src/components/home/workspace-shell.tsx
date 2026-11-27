"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { TopBar } from "@/components/home/navigation/top-bar";
import { FilesHost } from "@/components/shared/files/files-host";

/** Top bar + scrolling content. Rendered once per layout so it survives page switches. */
/** Warm the editor routes while the user browses, so New and opening a file never wait for code. */
function usePrefetchEditors() {
  const router = useRouter();
  useEffect(() => {
    const run = () => {
      for (const route of ["document", "sheet", "slides", "pdf"]) router.prefetch(`/${route}/_`);
    };
    // Safari has no requestIdleCallback; fall back to a short timeout.
    if ("requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(run);
      return () => window.cancelIdleCallback(handle);
    }
    const handle = setTimeout(run, 1500);
    return () => clearTimeout(handle);
  }, [router]);
}

export function WorkspaceShell({ children }: { children: ReactNode }) {
  usePrefetchEditors();
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  // The content pane is the scroller, so the browser's own scroll reset does not reach it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs on every route change by design
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
    setScrolled(false);
  }, [pathname]);

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background">
      <TopBar scrolled={scrolled} />
      <FilesHost scroller={scrollRef}>
        <div
          ref={scrollRef}
          onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 4)}
          className="min-h-0 w-full flex-1 overflow-y-auto scrollbar-hide outline-none"
        >
          {children}
        </div>
      </FilesHost>
    </div>
  );
}
