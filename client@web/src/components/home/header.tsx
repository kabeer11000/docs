import { useStore } from "@nanostores/react";
import { AccountPopover } from "@/components/home/navigation/account-popover";
import { AppSearch } from "@/components/home/navigation/app-search";
import { NotificationsPopover } from "@/components/home/notifications-popover"; // TEMP DISABLED: Returns null, see component file
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { $isSearching, $searchOpen } from "@/state/search";

interface SiteHeaderProps {
  hideSearch?: boolean;
  isEditorPage?: boolean;
  editorHeaderContent?: React.ReactNode;
}

export function SiteHeader({
  hideSearch = false,
  isEditorPage = false,
  editorHeaderContent,
}: SiteHeaderProps) {
  const searchOpen = useStore($searchOpen);
  const isSearching = useStore($isSearching);
  const isMobile = useIsMobile();

  // Hide sidebar trigger and account on mobile while searching
  const compact = (searchOpen || isSearching) && isMobile;

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-3 px-3 md:px-4">
      {!compact && (
        <SidebarTrigger
          className="text-muted-foreground"
          aria-label="Toggle sidebar"
        />
      )}

      {isEditorPage && editorHeaderContent ? (
        <div className="flex flex-1 items-center justify-between">
          {editorHeaderContent}
        </div>
      ) : hideSearch ? (
        <div className="flex-1" />
      ) : (
        <div className="mx-auto w-full max-w-xl flex-1" data-tour="search">
          <AppSearch placeholder="Search documents, folders, templates" />
        </div>
      )}

      {!compact && (
        <div className="flex items-center gap-1">
          <NotificationsPopover />
          <AccountPopover />
        </div>
      )}
    </header>
  );
}
