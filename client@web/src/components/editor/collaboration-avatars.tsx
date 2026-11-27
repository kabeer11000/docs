import type { HocuspocusProvider } from "@hocuspocus/provider";
import { useStore } from "@nanostores/react";
import { atom } from "nanostores";
import { useEffect, useState } from "react";
import { UserAvatar } from "@/components/avatar/user-avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { $auth } from "@/state/auth";

/** The open document's live provider; set by the editor, read by the header avatars. */
export const $collabProvider = atom<HocuspocusProvider | null>(null);

interface Peer {
  id?: string;
  name?: string;
  email?: string;
  photoURL?: string;
  color?: string;
}

/** People in the document now, each with a ring in their caret colour. */
export function CollaborationAvatars() {
  const provider = useStore($collabProvider);
  const [peers, setPeers] = useState<Peer[]>([]);
  const { user: currentUser } = useStore($auth);

  useEffect(() => {
    const awareness = provider?.awareness;
    if (!awareness) return setPeers([]);
    const update = () => {
      const users = Array.from(awareness.getStates().values())
        .map((state) => state.user as Peer | undefined)
        .filter((u): u is Peer => !!u && u.id !== currentUser?.id);
      setPeers(users);
    };
    awareness.on("change", update);
    update();
    return () => awareness.off("change", update);
  }, [provider, currentUser?.id]);

  if (peers.length === 0) return null;
  const visible = peers.slice(0, 4);
  const overflow = peers.length - visible.length;

  return (
    <div className="hidden shrink-0 items-center gap-2 px-1.5 sm:flex">
      {visible.map((user, index) => (
        <Tooltip key={user.id || index} delayDuration={300}>
          <TooltipTrigger asChild>
            <span className="studio-pop flex cursor-default">
              <UserAvatar
                id={user.id}
                name={user.name || "Anonymous"}
                email={user.email}
                photoURL={user.photoURL}
                size="sm"
                ring={user.color || "var(--muted-foreground)"}
              />
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">{user.name || "Anonymous"} is here</TooltipContent>
        </Tooltip>
      ))}
      {overflow > 0 && (
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <div
              role="img"
              aria-label={`${overflow} more`}
              className="flex size-6 cursor-default items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-border ring-offset-2 ring-offset-background"
            >
              +{overflow}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">{overflow} more</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
