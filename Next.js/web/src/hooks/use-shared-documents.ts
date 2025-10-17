import { useStore } from "@nanostores/react";
import type { Document } from "@shared-types";
import { useEffect, useState } from "react";
import cloudStore from "@/lib/cloudstore";
import { $auth } from "../state/auth";

export function useSharedDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useStore($auth);

  useEffect(() => {
    if (!cloudStore || !user?.email) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let watcher: any = null;

    const startWatching = () => {
      try {
        const documentsCollection = cloudStore.collection("documents");

        const query = cloudStore.query
          .where("sharing.isShared", "EQUAL", true)
          .orderBy("updatedAt", "DESCENDING")
          .limit(100);

        watcher = documentsCollection.watch(
          query,
          ({ collection: data }: { collection: Document[] }) => {
            if (!user?.email) {
              setDocuments([]);
              setIsLoading(false);
              return;
            }

            const sharedWithMe = (data || []).filter((doc) => {
              // Exclude documents owned by the current user
              if (doc.owner === user.id) return false;

              // Only include documents where user is explicitly shared with (and is not the owner)
              const isSharedWithUser = doc.sharing?.sharedWith?.some(
                (shared) =>
                  shared.status === "active" &&
                  ((shared.userId && shared.userId === user.id) ||
                    (shared.email && shared.email === user.email)),
              );

              return isSharedWithUser && doc.owner !== user.id;
            });

            console.log(
              "[useSharedDocuments] Found shared documents:",
              sharedWithMe.length,
            );
            setDocuments(sharedWithMe);
            setIsLoading(false);
          },
        );
      } catch (error) {
        console.error("Failed to watch shared documents:", error);
        setIsLoading(false);
      }
    };

    startWatching();

    return () => {
      if (watcher && typeof watcher.stop === "function") {
        watcher.stop();
      }
    };
  }, [user]);

  return {
    documents,
    isLoading,
  };
}
