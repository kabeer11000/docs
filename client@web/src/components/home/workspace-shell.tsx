"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { CommandPalette } from "@/components/home/navigation/command-palette";
import { TopBar } from "@/components/home/navigation/top-bar";

/** Top bar + scrolling content. Rendered once per layout so it survives page switches. */
export function WorkspaceShell({ children }: { children: ReactNode }) {
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
      <div
        ref={scrollRef}
        onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 4)}
        className="min-h-0 w-full flex-1 overflow-y-auto scrollbar-hide"
      >
        {children}
      </div>
      <CommandPalette />
    </div>
  );
}
