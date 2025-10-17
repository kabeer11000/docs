import { useStore } from "@nanostores/react";
import { useEffect, useState } from "react";
import cloudStore from "@/lib/cloudstore";
import { $auth } from "@/state/auth";
import type { ChatConversation } from "./use-cloudstore";

export function useChats() {
  const { user } = useStore($auth);
  const [chats, setChats] = useState<ChatConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !cloudStore) {
      setIsLoading(false);
      return;
    }

    const loadChats = () => {
      try {
        setIsLoading(true);
        setError(null);

        // Watch for changes to the user's chats
        cloudStore
          .collection("chats")
          .watch(
            cloudStore.query
              .where("owner", "EQUAL", user.id)
              .orderBy("lastMessageAt", "DESCENDING"),
            (result: any) => {
              if (result.error) {
                console.error("Error watching chats:", result.error);
                setError("Failed to load chats");
                setIsLoading(false);
                return;
              }

              // Deduplicate chats by ID (keep the first occurrence)
              const seenIds = new Set<string>();
              const uniqueChats = (
                result.collection as ChatConversation[]
              ).filter((chat) => {
                if (seenIds.has(chat.id)) {
                  console.warn("Duplicate chat found:", chat.id);
                  return false;
                }
                seenIds.add(chat.id);
                return true;
              });

              setChats(uniqueChats);
              setIsLoading(false);
            },
          );
      } catch (err) {
        console.error("Failed to setup chat watching:", err);
        setError("Failed to setup chat monitoring");
        setIsLoading(false);
      }
    };

    loadChats();
  }, [user]);

  return {
    chats,
    isLoading,
    error,
    hasChats: chats.length > 0,
  };
}
