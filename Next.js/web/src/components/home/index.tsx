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
  // Use larger header only for home page
  const isHomePage = pathname === "/home";
  const headerHeight = isHomePage
    ? "calc(var(--spacing) * 14)"
    : "calc(var(--spacing) * 12)";

  return (
    <SidebarProvider
      defaultOpen={!isEditorPage}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": headerHeight,
        } as React.CSSProperties
      }
    >
      <AppSidebar pathname={pathname} {...props} variant="inset" />
      <SidebarInset className="overflow-hidden border">
        <SiteHeader
          hideSearch={hideSearch}
          isEditorPage={isEditorPage}
          editorHeaderContent={editorHeaderContent}
        />
        <div className="w-full h-[calc(100vh-var(--header-height))] overflow-y-auto scrollbar-hide">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
