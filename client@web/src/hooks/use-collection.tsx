import { useEffect, useState } from "react";

interface CollectionState<T = any> {
  collection: T[];
  isLoading: boolean;
  error?: string;
}

export const useCollection = <T = any>(
  collection: any,
  query: any,
): CollectionState<T> | undefined => {
  const [state, setState] = useState<CollectionState<T> | undefined>(undefined);

  useEffect(() => {
    if (!collection || !query) return;
    const watcher = collection.watch(query, setState);
    return () => watcher?.stop?.();
  }, [collection, query]);

  return state;
};
