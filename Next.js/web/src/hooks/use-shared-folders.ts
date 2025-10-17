import { useStore } from "@nanostores/react";
import { useMemo } from "react";
import { $auth } from "@/state/auth";
import { $folders, $foldersLoading } from "@/state/cloudstore-data";
import { useFolderFileCounts } from "./use-folder-file-counts";

// Shared folders data hook - now reads from global state
export function useSharedFolders() {
  const { user } = useStore($auth);
  const rawFolders = useStore($folders);
  const isLoading = useStore($foldersLoading);
  const { getFileCount } = useFolderFileCounts();

  // Memoized folders with updated file counts
  const folders = useMemo(() => {
    return rawFolders.map((folder) => ({
      ...folder,
      meta: {
        ...folder.meta,
        fileCount: getFileCount(folder.id),
      },
    }));
  }, [rawFolders, getFileCount]);

  // Memoized location map for performance
  const locationMap = useMemo(() => {
    const map: { [id: string]: string } = {};
    if (user) {
      map[user.id] = "Vault";
      folders.forEach((folder) => {
        map[folder.id] = folder.name;
      });
    }
    return map;
  }, [folders, user]);

  const getLocationName = (locationId?: string): string => {
    if (!locationId) return "Unknown";
    return locationMap[locationId] || "Unknown";
  };

  // Filter folders by parent for specific use cases
  const getFoldersByParent = (parentId?: string) => {
    if (!parentId) return folders;
    return folders.filter((folder) => folder.parents?.includes(parentId));
  };

  // Get recent folders (all folders sorted by creation)
  const getRecentFolders = (limit?: number) => {
    return limit ? folders.slice(0, limit) : folders;
  };

  return {
    folders,
    isLoading,
    locationMap,
    getLocationName,
    getFoldersByParent,
    getRecentFolders,
  };
}
