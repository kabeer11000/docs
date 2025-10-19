import { useStore } from "@nanostores/react";
import type { Document, DocumentCreateInput, IFolderItem } from "@shared-types";
import { nanoid } from "nanoid";
import { useCallback } from "react";
import cloudStore from "@/lib/cloudstore";
import { $auth } from "@/state/auth";

export interface ChatConversation {
  id: string;
  title: string;
  preview: string;
  owner: string;
  messages: Array<{
    id: string;
    content: string;
    role: "user" | "assistant";
    timestamp: string;
  }>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
}

export function useCloudStore() {
  const { user } = useStore($auth);

  const createFolder = useCallback(
    async (
      input: { name?: string; folderId?: string } = {},
    ): Promise<string | null> => {
      if (!cloudStore || !user) {
        console.error("CloudStore not available or user not authenticated");
        return null;
      }

      try {
        const docId = nanoid();
        const parentFolder = input.folderId || user.id;
        const newDocument: IFolderItem = {
          id: docId,
          name: input.name ?? "Untitiled Folder",
          tags: [],
          category: "general",
          parents: [parentFolder],
          meta: {
            fileCount: 0,
            color: "hsl(142.1 76.2% 36.3%)",
            icon: "folder",
          },
          permissions: {
            owner: user.id,
            canRead: true,
            canWrite: true,
            canDelete: true,
            sharedWith: [],
          },
          timestamp: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          isStarred: false,
        };

        const folders = cloudStore.collection("folders");
        await folders.insert(newDocument);
        return docId;
      } catch (error) {
        console.error("Failed to create document:", error);
        return null;
      }
    },
    [user],
  );

  const createDocument = useCallback(
    async (
      input: Partial<DocumentCreateInput> & { _id?: string } = {},
    ): Promise<string | null> => {
      if (!cloudStore || !user) {
        console.error("CloudStore not available or user not authenticated");
        return null;
      }

      try {
        const docId = input._id || nanoid();
        const defaultPageSettings = {
          pageSize: "Letter" as const,
          orientation: "portrait" as const,
          marginTop: 72,
          marginBottom: 72,
          marginLeft: 72,
          marginRight: 72,
        };

        // Default to user.id as parent (same pattern as folders)
        const parentLocation = input.folderId || user.id;

        const newDocument: Document = {
          id: docId,
          title: input.title || "Untitled Document",
          pages: [
            {
              id: nanoid(),
              content: input.initialContent || { type: "doc", content: [] },
              format: input.format || "Letter",
              pageNumber: 1,
            },
          ],
          currentPage: 1,
          wordCount: 0,
          owner: user.id,
          sharing: {
            isShared: false,
            sharedWith: [
              {
                userId: user.id,
                email: user.email || "",
                displayName: user.displayName || user.email || null,
                access: "owner",
                status: "active",
                invitedAt: new Date().toISOString(),
              },
            ],
            settings: {
              allowEditorsShare: true,
              editorsCanDownload: true,
              viewersCanDownload: true,
            },
          },
          permissions: {
            canRead: true,
            canWrite: true,
            canDelete: true,
            canShare: true,
          },
          location: parentLocation,
          parents: [parentLocation],
          tags: [],
          meta: {
            type: {
              mime: "application/json",
              extension: "json",
            },
            size: 0,
          },
          pageSettings: { ...defaultPageSettings, ...input.pageSettings },
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSaved: new Date(),
        };

        const documentsCollection = cloudStore.collection("documents");
        await documentsCollection.insert(newDocument);
        return docId;
      } catch (error) {
        console.error("Failed to create document:", error);
        return null;
      }
    },
    [user],
  );

  const getDocument = useCallback(
    async (id: string): Promise<Document | null> => {
      if (!cloudStore) {
        console.error("CloudStore not available for getDocument");
        return null;
      }

      try {
        console.log(
          "CloudStore getDocument - Searching for document with ID:",
          id,
        );
        const documentsCollection = cloudStore.collection("documents");
        const query = cloudStore.query.where("id", "EQUAL", id);

        console.log("CloudStore getDocument - Executing query...");
        const results = (await documentsCollection.get(query)) as Document[];

        console.log("CloudStore getDocument - Query results:", results);
        console.log("CloudStore getDocument - Results length:", results.length);

        if (results.length > 0) {
          console.log("CloudStore getDocument - Document found:", results[0]);
          return results[0];
        } else {
          console.log(
            "CloudStore getDocument - No document found with ID:",
            id,
          );
          return null;
        }
      } catch (error) {
        console.error("CloudStore getDocument - Error occurred:", error);
        return null;
      }
    },
    [],
  );

  const deleteDocument = useCallback(async (id: string): Promise<boolean> => {
    if (!cloudStore) {
      console.error("CloudStore not available");
      return false;
    }

    try {
      console.log("Attempting to delete document with ID:", id);
      const documentsCollection = cloudStore.collection("documents");

      // CloudStore uses remove() with a query, not delete() with an ID
      const query = cloudStore.query.where("id", "EQUAL", id);
      const result = await documentsCollection.remove(query);

      console.log("Document delete result:", result);
      return true;
    } catch (error) {
      console.error("Failed to delete document:", error);
      console.error("Error details:", error);
      return false;
    }
  }, []);

  const deleteFolder = useCallback(async (id: string): Promise<boolean> => {
    if (!cloudStore) {
      console.error("CloudStore not available");
      return false;
    }

    try {
      console.log("Attempting to delete folder with ID:", id);
      
      // First, recursively delete all subfolders
      const foldersCollection = cloudStore.collection("folders");
      const subfoldersQuery = cloudStore.query.where("parents", "CONTAINS", id);
      const subfolders = (await foldersCollection.get(subfoldersQuery)) as IFolderItem[];
      
      // Delete each subfolder recursively
      for (const subfolder of subfolders) {
        await deleteFolder(subfolder.id); // Recursive call
      }
      
      // Next, delete all documents in this folder
      // Documents can be in a folder via location field or parents array
      const documentsCollection = cloudStore.collection("documents");
      const documentsQuery = cloudStore.query.where("parents", "CONTAINS", id);
      const documents = (await documentsCollection.get(documentsQuery)) as Document[];
      
      for (const document of documents) {
        await deleteDocument(document._id);
      }
      
      // Finally, delete the main folder
      const query = cloudStore.query.where("id", "EQUAL", id);
      const result = await foldersCollection.remove(query);

      console.log("Folder delete result:", result);
      return true;
    } catch (error) {
      console.error("Failed to delete folder:", error);
      console.error("Error details:", error);
      return false;
    }
  }, [deleteDocument]);

  const updateDocument = useCallback(
    async (id: string, updates: Partial<Document>): Promise<boolean> => {
      if (!cloudStore) {
        console.error("CloudStore not available");
        return false;
      }

      try {
        console.log(
          "Attempting to update document with ID:",
          id,
          "updates:",
          updates,
        );
        const documentsCollection = cloudStore.collection("documents");

        // CloudStore uses update() with a query, not an ID
        const query = cloudStore.query.where("id", "EQUAL", id);
        const result = await documentsCollection.update(query, {
          ...updates,
          updatedAt: new Date(),
        });

        console.log("Document update result:", result);
        return true;
      } catch (error) {
        console.error("Failed to update document:", error);
        console.error("Error details:", error);
        return false;
      }
    },
    [],
  );

  const updateFolder = useCallback(
    async (id: string, updates: Partial<IFolderItem>): Promise<boolean> => {
      if (!cloudStore) {
        console.error("CloudStore not available");
        return false;
      }

      try {
        console.log(
          "Attempting to update folder with ID:",
          id,
          "updates:",
          updates,
        );
        const foldersCollection = cloudStore.collection("folders");

        // CloudStore uses update() with a query, not an ID - use _id for database lookup
        const query = cloudStore.query.where("id", "EQUAL", id);
        const result = await foldersCollection.update(query, {
          ...updates,
          timestamp: {
            ...updates.timestamp,
            updatedAt: new Date().toISOString(),
          },
        });

        console.log("Folder update result:", result);
        return true;
      } catch (error) {
        console.error("Failed to update folder:", error);
        console.error("Error details:", error);
        return false;
      }
    },
    [],
  );

  const duplicateDocument = useCallback(
    async (originalId: string): Promise<string | null> => {
      if (!cloudStore || !user) return null;

      try {
        const original = await getDocument(originalId);
        if (!original) return null;

        const newId = nanoid();
        const duplicated: Document = {
          ...original,
          id: newId,
          title: `${original.title} (Copy)`,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSaved: new Date(),
        };

        const documentsCollection = cloudStore.collection("documents");
        await documentsCollection.insert(duplicated);
        return newId;
      } catch (error) {
        console.error("Failed to duplicate document:", error);
        return null;
      }
    },
    [user, getDocument],
  );

  const duplicateFolder = useCallback(
    async (originalId: string): Promise<string | null> => {
      if (!cloudStore || !user) return null;

      try {
        const foldersCollection = cloudStore.collection("folders");
        const query = cloudStore.query.where("id", "EQUAL", originalId);
        const results = (await foldersCollection.get(query)) as IFolderItem[];

        if (results.length === 0) return null;

        const original = results[0];
        const newId = nanoid();
        const duplicated: IFolderItem = {
          ...original,
          id: newId,
          name: `${original.name} (Copy)`,
          isStarred: false, // New duplicated folders should not be starred by default
          timestamp: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        };

        await foldersCollection.insert(duplicated);
        return newId;
      } catch (error) {
        console.error("Failed to duplicate folder:", error);
        return null;
      }
    },
    [user],
  );

  const createChat = useCallback(
    async (chatId?: string, title?: string): Promise<string | null> => {
      if (!cloudStore || !user) {
        console.error("CloudStore not available or user not authenticated");
        return null;
      }

      try {
        const finalChatId = chatId || nanoid();

        // Check if chat already exists to prevent duplicates
        const chatsCollection = cloudStore.collection("chats");
        const existingQuery = cloudStore.query.where(
          "id",
          "EQUAL",
          finalChatId,
        );
        const existingChats = (await chatsCollection.get(
          existingQuery,
        )) as ChatConversation[];

        if (existingChats.length > 0) {
          console.log("Chat already exists:", finalChatId);
          return finalChatId;
        }

        const timestamp = new Date().toISOString();

        const newChat: ChatConversation = {
          id: finalChatId,
          title: title || `New Chat ${new Date().toLocaleDateString()}`,
          preview: "Start a conversation...",
          owner: user.id,
          messages: [],
          tags: [],
          createdAt: timestamp,
          updatedAt: timestamp,
          lastMessageAt: timestamp,
        };

        await chatsCollection.insert(newChat);
        return finalChatId;
      } catch (error) {
        console.error("Failed to create chat:", error);
        return null;
      }
    },
    [user],
  );

  const getChat = useCallback(
    async (id: string): Promise<ChatConversation | null> => {
      if (!cloudStore) {
        console.error("CloudStore not available for getChat");
        return null;
      }

      try {
        const chatsCollection = cloudStore.collection("chats");
        const query = cloudStore.query.where("id", "EQUAL", id);
        const results = (await chatsCollection.get(
          query,
        )) as ChatConversation[];

        if (results.length > 0) {
          return results[0];
        } else {
          console.log("No chat found with ID:", id);
          return null;
        }
      } catch (error) {
        console.error("Failed to get chat:", error);
        return null;
      }
    },
    [],
  );

  const updateChat = useCallback(
    async (
      id: string,
      updates: Partial<ChatConversation>,
    ): Promise<boolean> => {
      if (!cloudStore) {
        console.error("CloudStore not available");
        return false;
      }

      try {
        const chatsCollection = cloudStore.collection("chats");
        const query = cloudStore.query.where("id", "EQUAL", id);
        const _result = await chatsCollection.update(query, {
          ...updates,
          updatedAt: new Date().toISOString(),
        });

        return true;
      } catch (error) {
        console.error("Failed to update chat:", error);
        return false;
      }
    },
    [],
  );

  const deleteChat = useCallback(async (id: string): Promise<boolean> => {
    if (!cloudStore) {
      console.error("CloudStore not available");
      return false;
    }

    try {
      const chatsCollection = cloudStore.collection("chats");
      const query = cloudStore.query.where("id", "EQUAL", id);
      const _result = await chatsCollection.remove(query);
      return true;
    } catch (error) {
      console.error("Failed to delete chat:", error);
      return false;
    }
  }, []);

  return {
    cloudStore,
    createDocument,
    createFolder,
    getDocument,
    deleteDocument,
    deleteFolder,
    updateDocument,
    updateFolder,
    duplicateDocument,
    duplicateFolder,
    createChat,
    getChat,
    updateChat,
    deleteChat,
    isReady: cloudStore,
  };
}
