import { useStore } from "@nanostores/react";
import { SiteHeader } from "@/components/ai/header";
import { AppSidebar } from "@/components/home/navigation/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { $isRightSidebarOpen } from "@/state/ai-chat";
import { AIPanel } from "./navigation/ai-panel";

interface PageProps {
  children: React.ReactNode | React.ReactNode[];
  hideSearch?: boolean;
  pathname: string;
  chatId?: string | number;
}

export default function HomePage({
  children,
  pathname,
  hideSearch = false,
  chatId,
}: PageProps) {
  const isRightSidebarOpen = useStore($isRightSidebarOpen);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar pathname={pathname} variant="inset" />
      <SidebarInset className="overflow-hidden border flex flex-col h-screen">
        <div className="flex flex-1 min-h-0">
          {/* Main Chat Area with Header */}
          <div className="flex-1 h-full flex flex-col min-w-0">
            <SiteHeader chatId={chatId} />
            <div className="flex-1 min-h-0">{children}</div>
          </div>
          {/* Right Panel */}
          {isRightSidebarOpen && (
            <div className="flex-shrink-0 w-80 h-full border-l-2 border-border/60 bg-muted/10 rounded-tl-lg transition-all duration-300">
              <AIPanel chatId={chatId} />
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
