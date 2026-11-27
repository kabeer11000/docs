import { Menu, PanelLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

interface PageBodyProps {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

/** Page header row (display title, actions on the right) and content column for workspace pages. */
export function PageBody({ title, actions, children }: PageBodyProps) {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 pt-5 pb-20 md:px-10 md:pt-12">
      <div className="mb-8 flex min-h-9 items-end justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-end gap-2">
          <SidebarToggle />
          {typeof title === "string" ? (
            <h1 className="truncate font-display text-[28px] leading-[1.15] font-bold tracking-[-0.03em] md:text-[32px]">{title}</h1>
          ) : (
            <div className="min-w-0 flex-1">{title}</div>
          )}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

/** Menu button on mobile; reopen button on desktop once the sidebar is collapsed. */
function SidebarToggle() {
  const { isMobile, state, toggleSidebar } = useSidebar();
  if (!isMobile && state === "expanded") return null;
  return (
    <Button
      variant="ghost"
      size="icon"
      className="-ml-2 shrink-0 text-muted-foreground"
      onClick={toggleSidebar}
      aria-label={isMobile ? "Open menu" : "Expand sidebar"}
      title={isMobile ? undefined : "Expand sidebar (Ctrl+\\)"}
    >
      {isMobile ? <Menu /> : <PanelLeft />}
    </Button>
  );
}
