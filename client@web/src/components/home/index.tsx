import { SiteHeader } from "@/components/home/header";
import { AppSidebar } from "@/components/home/navigation/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

interface PageProps {
  children: React.ReactNode | React.ReactNode[];
  hideSearch?: boolean;
  pathname: string;
  folderId?: string;
  isEditorPage?: boolean;
  editorHeaderContent?: React.ReactNode; // For editor page: title row content
}

export default function HomePage({
  children,
  pathname,
  hideSearch = false,
  isEditorPage = false,
  editorHeaderContent,
  ...props
}: PageProps) {
  return (
    <SidebarProvider
      defaultOpen={!isEditorPage}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 60)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar pathname={pathname} {...props} variant="inset" />
      <SidebarInset className="h-svh overflow-hidden bg-background md:peer-data-[variant=inset]:rounded-none md:peer-data-[variant=inset]:shadow-none">
        <SiteHeader
          hideSearch={hideSearch}
          isEditorPage={isEditorPage}
          editorHeaderContent={editorHeaderContent}
        />
        <div className="min-h-0 w-full flex-1 overflow-y-auto scrollbar-hide">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
