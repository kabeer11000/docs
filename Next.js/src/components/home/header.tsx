import { useStore } from "@nanostores/react";
import { computed } from "nanostores";
import { AppSearch } from "@/components/home/navigation/app-search";
import { NotificationsPopover } from "@/components/home/notifications-popover"; // TEMP DISABLED: Returns null, see component file
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { $auth, getUserInitials } from "@/state/auth";
import { $isSearching, $searchOpen } from "@/state/search";
import { openSettingsDialog } from "@/state/settings-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

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
  const currentUser = useStore(computed($auth, (state) => state.user));
  const userInitials = getUserInitials(currentUser);
  const isMobile = useIsMobile();

  // Hide sidebar trigger on mobile when searching
  const shouldHideSidebarTrigger = (searchOpen || isSearching) && isMobile;

  return (
    <header className="justify-between flex h-(--header-height) shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div
        className={cn(
          "px-4 lg:px-4 py-3 flex w-full items-center gap-4",
          shouldHideSidebarTrigger ? "px-2" : "",
        )}
      >
        {!shouldHideSidebarTrigger && (
          <SidebarTrigger
            className={cn("transition-opacity duration-200", "opacity-100")}
          />
        )}

        {/* Editor Page: Show document title + actions */}
        {isEditorPage && editorHeaderContent ? (
          <div className="flex-1 flex items-center justify-between">
            {editorHeaderContent}
          </div>
        ) : (
          <>
            {/* Regular Pages: Show search bar unless hideSearch prop is true */}
            {!hideSearch && (
              <div className={cn("flex-1 max-w-md lg:max-w-xl mx-auto")}>
                <AppSearch placeholder="Search documents, folders, templates..." />
              </div>
            )}
            {hideSearch && <div className="w-full"></div>}
          </>
        )}

        {!shouldHideSidebarTrigger && (
          <div
            className={cn("items-center gap-3 transition-opacity duration-200")}
          >
            <div className="hidden md:flex items-center gap-3">
              <NotificationsPopover />{" "}
              {/* TEMP DISABLED: Returns null, see component file */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  className="rounded-full p-0 h-11 w-11 min-h-[44px] min-w-[44px]"
                  onClick={() => openSettingsDialog()}
                  aria-label="Open user settings"
                >
                  <Avatar className="cursor-pointer bg-muted dark:bg-muted h-10 w-10">
                    <AvatarImage
                      src="/avatars/avatar-3.png"
                      alt={`${currentUser?.displayName || "User"} avatar`}
                    />
                    <AvatarFallback>{userInitials || "U"}</AvatarFallback>
                  </Avatar>
                </Button>
              </div>
            </div>
            <div className="md:hidden flex items-center gap-2">
              <NotificationsPopover />{" "}
              {/* TEMP DISABLED: Returns null, see component file */}
              <Button
                variant="ghost"
                className="rounded-full p-0 h-11 w-11 min-h-[44px] min-w-[44px]"
                onClick={() => openSettingsDialog()}
                aria-label="Open user settings"
              >
                <Avatar className="cursor-pointer bg-muted dark:bg-muted h-10 w-10">
                  <AvatarImage
                    src="/avatars/avatar-3.png"
                    alt={`${currentUser?.displayName || "User"} avatar`}
                  />
                  <AvatarFallback>{userInitials || "U"}</AvatarFallback>
                </Avatar>
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
