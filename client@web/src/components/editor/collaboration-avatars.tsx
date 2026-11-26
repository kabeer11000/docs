import type { HocuspocusProvider } from "@hocuspocus/provider";
import { useStore } from "@nanostores/react";
import { useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { $auth } from "@/state/auth";

interface CollaborationAvatarsProps {
  provider: HocuspocusProvider | null;
}

export function CollaborationAvatars({ provider }: CollaborationAvatarsProps) {
  const [connectedUsers, setConnectedUsers] = useState<any[]>([]);
  const { user: currentUser } = useStore($auth);

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

  const visible = connectedUsers.slice(0, 4);
  const overflow = connectedUsers.length - visible.length;

  return (
    <div className="hidden shrink-0 items-center -space-x-1.5 px-1 sm:flex">
      {visible.map((user, index) => (
        <Tooltip key={user.id || index} delayDuration={300}>
          <TooltipTrigger asChild>
            <div
              className="flex size-7 cursor-default items-center justify-center rounded-full text-xs font-medium text-white ring-2 ring-background"
              style={{ backgroundColor: user.color || "var(--muted-foreground)" }}
              aria-label={user.name || "Anonymous"}
            >
              {user.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">{user.name || "Anonymous"}</TooltipContent>
        </Tooltip>
      ))}
      {overflow > 0 && (
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <div className="flex size-7 cursor-default items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground ring-2 ring-background">
              +{overflow}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">{overflow} more</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
