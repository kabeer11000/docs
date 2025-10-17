import { useStore } from "@nanostores/react";
import { useMemo } from "react";
import { $auth } from "@/state/auth";
import { useDocuments } from "./use-documents";
import { useSharedFolders } from "./use-shared-folders";

export interface SearchableItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  type: "file" | "folder";
  tags?: string[];
  category?: string;
  path: string;
  meta?: any;
}

/**
 * Hook to get searchable data from user's files and folders
 * Follows established patterns using shared hooks
 */
export function useSearchData(currentPage: string = "home") {
  const { user } = useStore($auth);
  const { folders, isLoading: foldersLoading } = useSharedFolders();
  const { documents, isLoading: documentsLoading } = useDocuments(
    undefined,
    "recent-files",
  );

  // Transform folders and documents into searchable format
  const searchableItems = useMemo(() => {
    const items: SearchableItem[] = [];

    // Add folders (except on templates page)
    if (currentPage !== "templates") {
      folders.forEach((folder) => {
        items.push({
          id: folder.id,
          title: folder.name,
          subtitle: `${folder.meta?.fileCount || 0} files • ${folder.category || "folder"}`,
          description: folder.tags?.join(", "),
          type: "folder",
          tags: folder.tags,
          category: folder.category,
          path: `/home/${folder.id}`,
          meta: folder,
        });
      });
    }

    // Add documents (except on templates page)
    if (currentPage !== "templates") {
      documents.forEach((doc) => {
        if (doc.itemType === "file") {
          items.push({
            id: doc.id,
            title: doc.name,
            subtitle: `${doc.tags?.join(", ") || ""} • ${new Date(doc.timestamp.createdAt).toLocaleDateString()}`,
            description: `File in ${doc.location || "root"}`,
            type: "file",
            tags: doc.tags,
            category: doc.meta?.type?.mime,
            path: `/document/${doc.id}`,
            meta: doc,
          });
        }
      });
    }

    return items;
  }, [folders, documents, currentPage]);

  // Client-side fuzzy search function
  const performSearch = (query: string): SearchableItem[] => {
    if (!query.trim()) {
      // Return empty for empty query (quick actions handled elsewhere)
      return [];
    }

    const lowerQuery = query.toLowerCase();

    // Simple fuzzy search - can be replaced with Fuse.js if needed
    const results = searchableItems.filter((item) => {
      const titleMatch = item.title?.toLowerCase().includes(lowerQuery);
      const tagsMatch = item.tags?.some((tag) =>
        tag.toLowerCase().includes(lowerQuery),
      );
      const categoryMatch = item.category?.toLowerCase().includes(lowerQuery);
      const descriptionMatch = item.description
        ?.toLowerCase()
        .includes(lowerQuery);

      return titleMatch || tagsMatch || categoryMatch || descriptionMatch;
    });

    // Sort by relevance (title matches first)
    return results.sort((a, b) => {
      const aInTitle = a.title?.toLowerCase().includes(lowerQuery) ? 1 : 0;
      const bInTitle = b.title?.toLowerCase().includes(lowerQuery) ? 1 : 0;
      return bInTitle - aInTitle;
    });
  };

  return {
    searchableItems,
    performSearch,
    isLoading: foldersLoading || documentsLoading,
  };
}
