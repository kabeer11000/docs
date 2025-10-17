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
    if (collection && query) {
      collection.watch(query, setState);
    }
  }, [collection, query]);

  useEffect(() => {
    console.log("collection changed", state);
  }, [state]);

  return state;
};
