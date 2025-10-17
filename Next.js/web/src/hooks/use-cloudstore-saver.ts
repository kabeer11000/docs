import { debounce } from "@repo/shadcn-ui/lib/utils";
import type { Document } from "@shared-types";
import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCloudStore } from "./use-cloudstore";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface CloudStoreSaverOptions {
  saveInterval?: number; // milliseconds
  retryAttempts?: number;
  retryDelay?: number; // milliseconds
}

interface CloudStoreSaverReturn {
  saveStatus: SaveStatus;
  lastSaved: Date | null;
  forceSave: () => Promise<void>;
  errorMessage: string | null;
}

export function useCloudStoreSaver(
  editor: Editor | null,
  documentId: string,
  document: Document | null,
  options: CloudStoreSaverOptions = {},
): CloudStoreSaverReturn {
  const {
    saveInterval = 10000, // 10 seconds
    retryAttempts = 3,
    retryDelay = 2000, // 2 seconds
  } = options;

  const { updateDocument } = useCloudStore();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize lastSaved from document updatedAt
  useEffect(() => {
    if (document?.updatedAt && !lastSaved) {
      setLastSaved(new Date(document.updatedAt));
    }
  }, [document?.updatedAt, lastSaved]);
  const retryCount = useRef(0);
  const lastContent = useRef<string>("");

  // Calculate word count from HTML content
  const getWordCount = useCallback((html: string): number => {
    const text = html.replace(/<[^>]*>/g, "").trim();
    return text.length === 0 ? 0 : text.split(/\s+/).length;
  }, []);

  // Save function that updates the document in CloudStore
  const saveDocument = useCallback(
    async (htmlContent: string): Promise<boolean> => {
      if (!document || !documentId) {
        console.warn("Cannot save: missing document or documentId");
        return false;
      }

      try {
        setSaveStatus("saving");
        setErrorMessage(null);

        const wordCount = getWordCount(htmlContent);
        const now = new Date();

        // Update the document with new content
        const updates: Partial<Document> = {
          pages: [
            {
              ...document.pages[0],
              content: htmlContent, // Store as HTML
            },
          ],
          wordCount,
          updatedAt: now,
        };

        const success = await updateDocument(documentId, updates);

        if (success) {
          setSaveStatus("saved");
          setLastSaved(now);
          retryCount.current = 0;
          console.log("Document saved successfully", { documentId, wordCount });
          return true;
        } else {
          throw new Error("Update operation failed");
        }
      } catch (error) {
        console.error("Failed to save document:", error);
        setErrorMessage(
          error instanceof Error ? error.message : "Unknown error",
        );
        setSaveStatus("error");
        return false;
      }
    },
    [document, documentId, updateDocument, getWordCount],
  );

  // Retry mechanism for failed saves
  const saveWithRetry = useCallback(
    async (htmlContent: string): Promise<void> => {
      const success = await saveDocument(htmlContent);

      if (!success && retryCount.current < retryAttempts) {
        retryCount.current++;
        console.log(
          `Save failed, retrying... (${retryCount.current}/${retryAttempts})`,
        );

        setTimeout(() => {
          saveWithRetry(htmlContent);
        }, retryDelay * retryCount.current); // Exponential backoff
      }
    },
    [saveDocument, retryAttempts, retryDelay],
  );

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(async (htmlContent: string) => {
      if (htmlContent !== lastContent.current) {
        lastContent.current = htmlContent;
        await saveWithRetry(htmlContent);
      }
    }, saveInterval),
    [],
  );

  // Force save function for immediate saves
  const forceSave = useCallback(async (): Promise<void> => {
    if (!editor) return;

    const htmlContent = editor.getHTML();
    if (htmlContent && htmlContent !== lastContent.current) {
      lastContent.current = htmlContent;
      await saveWithRetry(htmlContent);
    }
  }, [editor, saveWithRetry]);

  // Listen to editor changes and trigger debounced save
  useEffect(() => {
    if (!editor || !document) return;

    const handleUpdate = () => {
      const htmlContent = editor.getHTML();
      if (htmlContent) {
        debouncedSave(htmlContent);
      }
    };

    // Listen to editor updates
    editor.on("update", handleUpdate);

    return () => {
      editor.off("update", handleUpdate);
    };
  }, [editor, document, debouncedSave]);

  // Auto-save on page unload
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (saveStatus === "saving") {
        event.preventDefault();
        event.returnValue =
          "Document is still saving. Are you sure you want to leave?";
      } else if (editor) {
        // Attempt a quick synchronous save
        forceSave();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [editor, saveStatus, forceSave]);

  // Clear saved status after a delay
  useEffect(() => {
    if (saveStatus === "saved") {
      const timer = setTimeout(() => {
        setSaveStatus("idle");
      }, 3000); // Show "saved" for 3 seconds

      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  return {
    saveStatus,
    lastSaved,
    forceSave,
    errorMessage,
  };
}
