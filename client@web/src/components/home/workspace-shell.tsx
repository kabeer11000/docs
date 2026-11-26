"use client";

import { usePathname } from "next/navigation";
import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";
import { AppSidebar } from "@/components/home/navigation/app-sidebar";
import { CommandPalette } from "@/components/home/navigation/command-palette";
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar";

interface WorkspaceShellProps {
  children: ReactNode;
  /** Optional bar above the content (the editor's title row). */
  header?: ReactNode;
  defaultOpen?: boolean;
}

const shellVars = {
  "--sidebar-width": "calc(var(--spacing) * 60)",
  "--header-height": "calc(var(--spacing) * 12)",
} as CSSProperties;

/** Sidebar + content frame. Rendered once per layout so it survives page switches. */
export function WorkspaceShell({ children, header, defaultOpen = true }: WorkspaceShellProps) {
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);

  // The content pane is the scroller, so the browser's own scroll reset does not reach it.
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <SidebarProvider defaultOpen={defaultOpen} style={shellVars}>
      <AppSidebar variant="inset" />
      <SidebarInset className="h-svh overflow-hidden bg-background md:peer-data-[variant=inset]:rounded-none md:peer-data-[variant=inset]:shadow-none">
        {header}
        <div ref={scrollRef} className="min-h-0 w-full flex-1 overflow-y-auto scrollbar-hide">
          {children}
        </div>
      </SidebarInset>
      <SidebarShortcut />
      <CommandPalette />
    </SidebarProvider>
  );
}

/** Ctrl/Cmd+\ toggles the sidebar. */
function SidebarShortcut() {
  const { toggleSidebar } = useSidebar();
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "\\" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSidebar]);
  return null;
}
