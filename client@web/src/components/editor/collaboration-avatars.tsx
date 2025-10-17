import type { HocuspocusProvider } from "@hocuspocus/provider";
import { useStore } from "@nanostores/react";
import { computed } from "nanostores";
import { useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { $auth } from "@/state/auth";
import { editorUIState } from "@/state/editor";

interface CollaborationAvatarsProps {
  provider: HocuspocusProvider | null;
}

export function CollaborationAvatars({ provider }: CollaborationAvatarsProps) {
  const [connectedUsers, setConnectedUsers] = useState<any[]>([]);
  const { user: currentUser } = useStore($auth);
  const isAIPanelOpen = useStore(
    computed(editorUIState, (state) => state.isAIPanelOpen),
  );
  const isCommentsSidebarOpen = useStore(
    computed(editorUIState, (state) => state.isCommentsSidebarOpen),
  );

  useEffect(() => {
    if (!provider?.awareness) return;

    const updateUsers = () => {
      if (!provider.awareness) return;
      const states = Array.from(provider.awareness.getStates().values());
      const users = states
        .filter((state) => state.user && state.user.id !== currentUser?.id)
        .map((state) => state.user);
      setConnectedUsers(users);
    };

    provider.awareness.on("change", updateUsers);
    updateUsers();

    return () => {
      if (provider.awareness) {
        provider.awareness.off("change", updateUsers);
      }
    };
  }, [provider, currentUser?.id]);

  if (connectedUsers.length === 0) return null;

  return (
    <div
      className="fixed top-1/2 -translate-y-1/2 z-20 space-y-2 transition-all duration-300"
      style={{
        right:
          isAIPanelOpen && isCommentsSidebarOpen
            ? "calc(640px + 1rem)"
            : isAIPanelOpen
              ? "calc(320px + 1rem)"
              : isCommentsSidebarOpen
                ? "calc(320px + 1rem)"
                : "1rem",
      }}
    >
      <TooltipProvider>
        {connectedUsers.slice(0, 5).map((user, index) => (
          <Tooltip key={user.id || index}>
            <TooltipTrigger asChild>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white shadow-lg border-2 border-white hover:scale-110 transition-transform cursor-pointer"
                style={{ backgroundColor: user.color || "#666" }}
              >
                {user.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>{user.name || "Anonymous"}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        {connectedUsers.length > 5 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium shadow-lg border-2 border-white hover:scale-110 transition-transform cursor-pointer">
                +{connectedUsers.length - 5}
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>{connectedUsers.length - 5} more users</p>
            </TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </div>
  );
}
