import { useStore } from "@nanostores/react";
import type { IFolderItem } from "@shared-types";
import { useEffect, useState } from "react";
import cloudStore from "@/lib/cloudstore";
import { $auth } from "@/state/auth";

interface BreadcrumbItem {
  id: string;
  name: string;
}

export function useFolderBreadcrumbs(folderId?: string) {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useStore($auth);

  useEffect(() => {
    if (!cloudStore || !folderId || !user) {
      setIsLoading(false);
      return;
    }

    let watchableCollection: any = null;

    const startWatching = async () => {
      try {
        setIsLoading(true);

        // First get the current folder to find all parent IDs
        const foldersCollection = cloudStore.collection("folders");
        const currentFolderQuery = cloudStore.query.where(
          "id",
          "EQUAL",
          folderId,
        );
        const currentFolderResults = (await foldersCollection.get(
          currentFolderQuery,
        )) as IFolderItem[];

        if (currentFolderResults.length === 0) {
          setBreadcrumbs([]);
          setIsLoading(false);
          return;
        }

        const currentFolder = currentFolderResults[0];
        const allFolderIds = [folderId, ...(currentFolder.parents || [])];

        // Watch all folders in the breadcrumb chain at once
        const query = cloudStore.query.where("id", "ARRAY.IN", allFolderIds);
        watchableCollection = foldersCollection.watch(
          query,
          ({ collection: folders }: { collection: IFolderItem[] }) => {
            const folderMap = new Map(folders.map((f) => [f.id, f]));

            const breadcrumbChain: BreadcrumbItem[] = [];

            // Start with "Vault" (root)
            breadcrumbChain.push({ id: user.id, name: "Vault" });

            // Build chain from parents (excluding root user id)
            if (currentFolder.parents && currentFolder.parents.length > 0) {
              for (const parentId of currentFolder.parents) {
                if (parentId !== user.id) {
                  const parentFolder = folderMap.get(parentId);
                  if (parentFolder) {
                    breadcrumbChain.push({
                      id: parentFolder.id,
                      name: parentFolder.name,
                    });
                  }
                }
              }
            }

            // Add current folder
            breadcrumbChain.push({
              id: currentFolder.id,
              name: currentFolder.name,
            });

            setBreadcrumbs(breadcrumbChain);
            setIsLoading(false);
          },
        );
      } catch (error) {
        console.error("Failed to watch folder breadcrumbs:", error);
        setBreadcrumbs([]);
        setIsLoading(false);
      }
    };

    startWatching();

    return () => {
      if (
        watchableCollection &&
        typeof watchableCollection.stop === "function"
      ) {
        watchableCollection.stop();
      }
    };
  }, [folderId, user]);

  return {
    breadcrumbs,
    isLoading,
  };
}
