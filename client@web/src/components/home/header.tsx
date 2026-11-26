import { AccountPopover } from "@/components/home/navigation/account-popover";
import { NotificationsPopover } from "@/components/home/notifications-popover"; // TEMP DISABLED: Returns null, see component file
import { SidebarTrigger } from "@/components/ui/sidebar";

interface SiteHeaderProps {
  /** Unused; kept for callers. */
  hideSearch?: boolean;
  isEditorPage?: boolean;
  editorHeaderContent?: React.ReactNode;
}

/** Top bar for the editor shell. Workspace pages have no top bar. */
export function SiteHeader({ isEditorPage = false, editorHeaderContent }: SiteHeaderProps) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-3 px-3 md:px-4">
      <SidebarTrigger className="text-muted-foreground" aria-label="Toggle sidebar" />

      {isEditorPage && editorHeaderContent ? (
        <div className="flex flex-1 items-center justify-between">{editorHeaderContent}</div>
      ) : (
        <div className="flex-1" />
      )}

      <div className="flex items-center gap-1">
        <NotificationsPopover />
        <AccountPopover />
      </div>
    </header>
  );
}
