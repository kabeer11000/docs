import { useStore } from "@nanostores/react";
import { useMemo } from "react";
import type { IListItem } from "@/components/shared/ui/list-view";
import { $auth } from "../state/auth";
import { $documents, $documentsLoading } from "../state/cloudstore-data";
import { useSharedDocuments } from "./use-shared-documents";
import { useSharedFolders } from "./use-shared-folders";

export function useDocuments(
  parent?: string,
  mode:
    | "recent-files"
    | "folder-contents"
    | "shared-with-me" = "folder-contents",
) {
  const user = useStore($auth);
  const allDocuments = useStore($documents);
  const globalLoading = useStore($documentsLoading);
  const { getFoldersByParent } = useSharedFolders();
  const { documents: sharedDocuments, isLoading: sharedLoading } =
    useSharedDocuments();

  // Filter documents based on mode and parent
  const documentsData = useMemo(() => {
    if (mode === "shared-with-me") {
      return []; // Handled by sharedDocuments
    }

    if (mode === "recent-files") {
      // Show all recent documents without parent filtering
      return allDocuments;
    }

    // folder-contents mode: filter by parent
    const rootFolder = user.user?.id;
    const targetFolder = parent || rootFolder;

    if (!targetFolder) return allDocuments;

    return allDocuments.filter((doc) => {
      const docParent = doc.parents?.at(-1) || doc.location;
      return docParent === targetFolder;
    });
  }, [allDocuments, mode, parent, user.user?.id]);

  // Combine documents and folders data
  const documents = useMemo(() => {
    // Handle shared-with-me mode
    if (mode === "shared-with-me") {
      const sharedItems: IListItem[] = sharedDocuments.map((doc) => ({
        id: doc._id,
        name: doc.title,
        location: doc.parents?.at(-1) || doc.location,
        parents: doc.parents || [],
        size: doc.meta?.size || 0,
        timestamp: {
          updatedAt: doc.updatedAt,
          createdAt: doc.createdAt,
        },
        owner: doc.owner,
        permissions: doc.permissions || {
          canRead: true,
          canWrite: false,
          canDelete: false,
        },
        itemType: "file" as const,
        meta: {
          type: doc.meta?.type || {
            mime: "application/json",
            extension: "json",
          },
          showPreview: false,
        },
        sharing: {
          isShared: doc.sharing?.isShared || false,
          sharedWith:
            doc.sharing?.sharedWith?.map((s) => ({
              id: s.userId || s.email,
              access: s.access === "signer" ? "editor" : s.access,
            })) || [],
        },
        tags: doc.tags || [],
      }));
      return sharedItems;
    }

    // Handle regular modes
    const documentItems: IListItem[] = documentsData.map((doc) => ({
      id: doc._id,
      name: doc.title,
      location: doc.parents?.at(-1) || doc.location,
      parents: doc.parents || [],
      size: doc.meta?.size || 0,
      timestamp: {
        updatedAt: doc.updatedAt,
        createdAt: doc.createdAt,
      },
      owner: doc.owner,
      permissions: doc.permissions || {
        canRead: true,
        canWrite: true,
        canDelete: true,
      },
      itemType: "file" as const,
      meta: {
        type: doc.meta?.type || { mime: "application/json", extension: "json" },
        showPreview: false,
      },
      sharing: {
        isShared: doc.sharing?.isShared || false,
        sharedWith:
          doc.sharing?.sharedWith?.map((s) => ({
            id: s.userId || s.email,
            access: s.access === "signer" ? "editor" : s.access,
          })) || [],
      },
      tags: doc.tags || [],
    }));

    // Use shared folders data
    const relevantFolders =
      mode === "folder-contents"
        ? getFoldersByParent(parent || user.user?.id)
        : [];
    const folderItems: IListItem[] = relevantFolders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      location: folder.parents?.at(-1) || "",
      parents: folder.parents || [],
      size: 0,
      category: folder.category,
      timestamp: {
        updatedAt: new Date(folder.timestamp.updatedAt),
        createdAt: new Date(folder.timestamp.createdAt),
      },
      owner: folder.permissions.owner,
      permissions: {
        canRead: folder.permissions.canRead,
        canWrite: folder.permissions.canWrite,
        canDelete: folder.permissions.canDelete,
      },
      itemType: "folder" as const,
      meta: {
        type: { mime: "folder", extension: "" },
        showPreview: false,
        fileCount: folder.meta?.fileCount || 0,
      },
      sharing: {
        isShared: (folder.permissions.sharedWith || []).length > 0,
        sharedWith: (folder.permissions.sharedWith || []).map((sw) => ({
          id: sw.id,
          access: sw.access === "admin" ? "editor" : sw.access,
        })),
      },
      tags: folder.tags || [],
    }));

    return [...folderItems, ...documentItems];
  }, [documentsData, mode, parent, user, getFoldersByParent, sharedDocuments]);

  return {
    documents,
    isLoading: mode === "shared-with-me" ? sharedLoading : globalLoading,
  };
}
