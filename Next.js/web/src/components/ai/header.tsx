import { useStore } from "@nanostores/react";
import {
  ChevronDown,
  Edit,
  PanelRightClose,
  PanelRightOpen,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NotificationsPopover } from "@/components/home/notifications-popover"; // TEMP DISABLED: Returns null, see component file
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { useIsMobile } from "@/hooks/use-mobile";
import { $isRightSidebarOpen, aiChatActions } from "@/state/ai-chat";
import { $auth, getUserInitials } from "@/state/auth";
import { Button } from "../ui/button";

interface SiteHeaderProps {
  chatId?: string | number;
}

// Helper function to truncate title to max 3 words
const truncateToThreeWords = (title: string): string => {
  const words = title.trim().split(/\s+/);
  if (words.length <= 3) return title.trim();
  return `${words.slice(0, 3).join(" ")}...`;
};

export function SiteHeader({ chatId }: SiteHeaderProps) {
  const _isMobile = useIsMobile();
  const { user: currentUser } = useStore($auth);
  const _userInitials = getUserInitials(currentUser);
  const isRightSidebarOpen = useStore($isRightSidebarOpen);
  const { getChat, updateChat, deleteChat } = useCloudStore();
  const [chatTitle, setChatTitle] = useState<string>("New Chat");
  const [isRenaming, setIsRenaming] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");

  // Load and watch chat title for real-time updates
  useEffect(() => {
    if (!chatId || typeof chatId !== "string") {
      setChatTitle("New Chat");
      return;
    }

    // Initial load
    const loadChatTitle = async () => {
      try {
        const chat = await getChat(chatId);
        if (chat?.title) {
          setChatTitle(truncateToThreeWords(chat.title));
        } else {
          setChatTitle("New Chat");
        }
      } catch (_error) {
        setChatTitle("New Chat");
      }
    };

    loadChatTitle();

    // Watch for title changes (CloudStore will update when chat metadata changes)
    const checkInterval = setInterval(async () => {
      try {
        const chat = await getChat(chatId);
        if (chat?.title) {
          setChatTitle(truncateToThreeWords(chat.title));
        }
      } catch (_error) {
        // Silent fail
      }
    }, 2000); // Check every 2 seconds for title updates

    return () => {
      clearInterval(checkInterval);
    };
  }, [chatId, getChat]);

  const handleRename = async () => {
    if (!chatId || typeof chatId !== "string") return;

    setIsRenaming(true);
    setEditedTitle(chatTitle);
  };

  const handleSaveRename = async () => {
    if (!chatId || typeof chatId !== "string" || !editedTitle.trim()) {
      setIsRenaming(false);
      return;
    }

    try {
      const newTitle = editedTitle.trim();
      await updateChat(chatId, { title: newTitle });
      setChatTitle(truncateToThreeWords(newTitle));
      setIsRenaming(false);
    } catch (_error) {
      setIsRenaming(false);
    }
  };

  const handleCancelRename = () => {
    setIsRenaming(false);
    setEditedTitle("");
  };

  const handleDelete = async () => {
    if (!chatId || typeof chatId !== "string") return;

    if (
      confirm(
        "Are you sure you want to delete this chat? This action cannot be undone.",
      )
    ) {
      try {
        await deleteChat(chatId);
        window.location.href = "/chat";
      } catch (_error) {
        alert("Failed to delete chat");
      }
    }
  };

  return (
    <header className="justify-between flex h-(--header-height) shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="px-4 lg:px-4 flex w-full items-center gap-4">
        <SidebarTrigger className="transition-opacity duration-200 opacity-100" />

        {/* Chat Title with Dropdown */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {isRenaming ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveRename();
                  if (e.key === "Escape") handleCancelRename();
                }}
                className="flex-1 px-2 py-1 text-sm border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSaveRename}
                className="h-7 px-2"
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancelRename}
                className="h-7 px-2"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 px-2 py-1 h-auto font-semibold text-base hover:bg-accent"
                >
                  <span className="truncate max-w-[400px]">{chatTitle}</span>
                  <ChevronDown className="w-4 h-4 flex-shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem onClick={handleRename}>
                  <Edit className="w-4 h-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Right side actions */}
        <div className="items-center ml-auto gap-3 transition-opacity duration-200">
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => aiChatActions.toggleRightSidebar()}
              className="h-8 w-8"
            >
              {isRightSidebarOpen ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
            </Button>
            <NotificationsPopover />{" "}
            {/* TEMP DISABLED: Returns null, see component file */}
            {/* <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{currentUser?.displayName || 'User'}</span>
              <Avatar className="cursor-pointer bg-neutral-200" onClick={() => openSettingsDialog()}>
                <AvatarImage src="/avatars/avatar-3.png" />
                <AvatarFallback>{userInitials || 'U'}</AvatarFallback>
              </Avatar>
            </div> */}
          </div>
          <div className="md:hidden flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => aiChatActions.toggleRightSidebar()}
              className="h-8 w-8"
            >
              {isRightSidebarOpen ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
            </Button>
            <NotificationsPopover />{" "}
            {/* TEMP DISABLED: Returns null, see component file */}
            {/* <Avatar
              className="cursor-pointer bg-neutral-200"
              onClick={() => openSettingsDialog()}
            >
              <AvatarImage src="/avatars/avatar-3.png" />
              <AvatarFallback>{userInitials || 'U'}</AvatarFallback>
            </Avatar> */}
          </div>
        </div>
      </div>
    </header>
  );
}
