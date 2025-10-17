import { useStore } from "@nanostores/react";
import { useMemo } from "react";
import { $auth } from "../state/auth";
import { useSharedFolders } from "./use-shared-folders";

export function useFolders(
  parent?: string,
  mode: "recent-folders" | "folder-contents" = "folder-contents",
) {
  const { folders, isLoading, getFoldersByParent, getRecentFolders } =
    useSharedFolders();
  const { user } = useStore($auth);

  const filteredFolders = useMemo(() => {
    if (mode === "recent-folders") {
      return getRecentFolders(50);
    } else {
      const rootFolder = user?.id;
      const targetFolder = parent || rootFolder;
      return getFoldersByParent(targetFolder);
    }
  }, [mode, parent, user, getFoldersByParent, getRecentFolders]);

  return {
    folders: filteredFolders,
    isLoading,
  };
}
