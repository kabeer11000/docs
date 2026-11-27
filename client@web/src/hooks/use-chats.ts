import { useStore } from "@nanostores/react";
import { $auth } from "@/state/auth";
import { $nothing, chatsWatch } from "@/state/live-queries";
import type { ChatConversation } from "./use-cloudstore";

const NO_CHATS: ChatConversation[] = [];

/** The user's chats, from one shared watch (stopped when nothing shows them). */
export function useChats() {
  const { user } = useStore($auth);
  const live = useStore(user ? chatsWatch(user.id) : $nothing);
  const chats = live ?? NO_CHATS;

  return {
    chats,
    isLoading: !!user && live === undefined,
    error: null as string | null,
    hasChats: chats.length > 0,
  };
}
