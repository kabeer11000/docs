import { atom, computed } from "nanostores";
import { v4 } from "uuid";
import type { IListItem } from "@/components/shared/ui/list-view";
import { useCollection } from "@/hooks/use-collection";
import cloudStore from "@/lib/cloudstore";
import { $auth } from "./auth";

// CloudStore document interface
interface CloudStoreDocument {
  id: string;
  name: string;
  heading?: string;
  content?: string;
  ownerId: string;
  tags?: string[];
  sharing?: {
    isShared: boolean;
    sharedWith: Array<{
      id: string;
      access: "viewer" | "editor";
    }>;
  };
  meta?: {
    type?: {
      mime: string;
      extension: string;
    };
    fileCount?: number;
    color?: string;
    icon?: string;
  };
  timestamp: {
    createdAt: string;
    updatedAt: string;
  };
  itemType: "file" | "folder";
  category?: string;
}

// State atoms
export const $documentsState = atom<{
  isLoading: boolean;
  error: string | null;
  collection: CloudStoreDocument[] | null;
}>({
  isLoading: true,
  error: null,
  collection: null,
});

// Transform CloudStore documents to ListView format
const transformDocument = (doc: CloudStoreDocument): IListItem => ({
  id: doc.id,
  name: doc.name,
  tags: doc.tags || [],
  owner: doc.ownerId,
  sharing: doc.sharing,
  location: "my-drive", // Default location
  parents: [], // CloudStore documents don't have parents array, default to empty
  permissions: {
    canRead: true,
    canWrite: true,
    canDelete: true,
  },
  timestamp: doc.timestamp,
  meta: doc.meta,
  itemType: doc.itemType,
  category: doc.category || "Document",
});

// Computed derived state for ListView
export const $transformedDocuments = computed($documentsState, (state) => {
  if (!state.collection) return [];
  return state.collection.map(transformDocument);
});

// Actions
export const documentsActions = {
  setLoading: (loading: boolean) => {
    $documentsState.set({ ...$documentsState.get(), isLoading: loading });
  },

  setError: (error: string | null) => {
    $documentsState.set({ ...$documentsState.get(), error });
  },

  setCollection: (collection: CloudStoreDocument[] | null) => {
    $documentsState.set({
      ...$documentsState.get(),
      collection,
      error: null,
    });
  },

  // CRUD Operations
  createDocument: async (
    name: string,
    itemType: "file" | "folder" = "file",
  ) => {
    const authState = $auth.get();
    if (!authState.user) {
      documentsActions.setError("User not authenticated");
      return false;
    }

    try {
      documentsActions.setLoading(true);

      const newDoc: CloudStoreDocument = {
        id: v4(),
        name,
        ownerId: authState.user.id,
        itemType,
        timestamp: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        sharing: {
          isShared: false,
          sharedWith: [],
        },
        tags: [],
        category: itemType === "folder" ? "Folder" : "Document",
      };

      await cloudStore.collection("documents").insert(newDoc);
      return true;
    } catch (error) {
      documentsActions.setError(
        error instanceof Error ? error.message : "Failed to create document",
      );
      return false;
    } finally {
      documentsActions.setLoading(false);
    }
  },

  updateDocument: async (id: string, updates: Partial<CloudStoreDocument>) => {
    try {
      documentsActions.setLoading(true);

      await cloudStore
        .collection("documents")
        .update(cloudStore.query.where("id", "EQUAL", id), {
          ...updates,
          timestamp: {
            ...updates.timestamp,
            updatedAt: new Date().toISOString(),
          },
        });
      return true;
    } catch (error) {
      documentsActions.setError(
        error instanceof Error ? error.message : "Failed to update document",
      );
      return false;
    } finally {
      documentsActions.setLoading(false);
    }
  },

  deleteDocument: async (id: string) => {
    try {
      documentsActions.setLoading(true);

      await cloudStore
        .collection("documents")
        .remove(cloudStore.query.where("id", "EQUAL", id));
      return true;
    } catch (error) {
      documentsActions.setError(
        error instanceof Error ? error.message : "Failed to delete document",
      );
      return false;
    } finally {
      documentsActions.setLoading(false);
    }
  },

  renameDocument: async (id: string, newName: string) => {
    return documentsActions.updateDocument(id, { name: newName });
  },

  shareDocument: async (
    id: string,
    sharedWith: Array<{ id: string; access: "viewer" | "editor" }>,
  ) => {
    return documentsActions.updateDocument(id, {
      sharing: {
        isShared: true,
        sharedWith,
      },
    });
  },

  clearError: () => {
    documentsActions.setError(null);
  },
};

// Hook to use CloudStore collection with reactive updates
export const getDocumentsCollection = () => {
  const authState = $auth.get();

  // Only query user's documents or shared documents
  const query = authState.user
    ? cloudStore.query
        .where("ownerId", "EQUAL", authState.user.id)
        .orderBy("timestamp.updatedAt", "DESCENDING")
    : null;

  const collection = query
    ? useCollection(cloudStore.collection("documents"), query)
    : null;

  // Update state when collection changes
  if (collection?.collection) {
    documentsActions.setCollection(collection.collection);
  }

  return collection;
};
