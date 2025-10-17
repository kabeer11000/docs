import { useStore } from "@nanostores/react";
import { useMemo } from "react";
import { $documents } from "@/state/cloudstore-data";

interface FileCounts {
  [folderId: string]: number;
}

export function useFolderFileCounts() {
  const documents = useStore($documents);

  // Calculate file counts per folder
  const fileCounts = useMemo(() => {
    const counts: FileCounts = {};

    documents.forEach((doc) => {
      const parentFolder = doc.parents?.at(-1) || doc.location;
      if (parentFolder) {
        counts[parentFolder] = (counts[parentFolder] || 0) + 1;
      }
    });

    return counts;
  }, [documents]);

  const getFileCount = (folderId: string): number => {
    return fileCounts[folderId] || 0;
  };

  return { getFileCount, fileCounts };
}
