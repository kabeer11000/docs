import { useStore } from "@nanostores/react";
import type { IFolderItem } from "@shared-types";
import { useMemo } from "react";
import { $auth } from "@/state/auth";
import { $foldersLoading, $patches, $rawFolders } from "@/state/cloudstore-data";
import { applyPatches } from "@/state/file-logic";
import { $nothing, folderWatch } from "@/state/live-queries";

interface BreadcrumbItem {
  id: string;
  name: string;
}

/**
 * Vault > parent > folder for the folder page title, the top bar and the editor header.
 * Folders are owner-only, so the Home folders list (already loaded, optimistic renames applied)
 * holds the chain; only a folder past that list's limit opens a watch, shared by every caller.
 */
export function useFolderBreadcrumbs(folderId?: string) {
  const { user } = useStore($auth);
  const raw = useStore($rawFolders);
  const patches = useStore($patches);
  const listLoading = useStore($foldersLoading);
  const folders = useMemo(() => applyPatches(raw, patches), [raw, patches]);
  const listed = folderId ? folders.find((f) => f.id === folderId) : undefined;
  const fallback = useStore(
    folderId && user && !listLoading && !listed ? folderWatch(folderId) : $nothing,
  );
  const current: IFolderItem | null | undefined = listed ?? fallback;

  const breadcrumbs = useMemo(() => {
    if (!current || !user) return [];
    const byId = new Map(folders.map((f) => [f.id, f]));
    const chain: BreadcrumbItem[] = [{ id: user.id, name: "Vault" }];
    for (const parentId of current.parents ?? []) {
      const parent = parentId !== user.id ? byId.get(parentId) : undefined;
      if (parent) chain.push({ id: parent.id, name: parent.name });
    }
    chain.push({ id: current.id, name: current.name });
    return chain;
  }, [current, folders, user]);

  const isLoading =
    !!folderId && !!user && !current && (listLoading || fallback === undefined);
  return { breadcrumbs, isLoading };
}
