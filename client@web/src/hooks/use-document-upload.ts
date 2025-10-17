import { useStore } from "@nanostores/react";
import { nanoid } from "nanoid";
import { useCallback, useState } from "react";
import { $auth } from "@/state/auth";
import { useCloudStore } from "./use-cloudstore";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB for documents
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export interface DocumentUploadState {
  isUploading: boolean;
  uploadingFiles: Map<string, { name: string; size: number; progress: number }>;
  errors: Map<string, string>;
}

export interface DocumentUploadResult {
  success: boolean;
  documentId?: string;
  error?: string;
}

export function useDocumentUpload() {
  const { user } = useStore($auth);
  const { createDocument } = useCloudStore();
  const [uploadState, setUploadState] = useState<DocumentUploadState>({
    isUploading: false,
    uploadingFiles: new Map(),
    errors: new Map(),
  });

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `File type '${file.type}' is not supported. Please upload PDF or Word documents.`;
    }

    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return `File size (${sizeMB}MB) exceeds the 50MB limit.`;
    }

    return null;
  }, []);

  const uploadSingleFile = useCallback(
    async (file: File, folderId?: string): Promise<DocumentUploadResult> => {
      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        return { success: false, error: validationError };
      }

      const tempId = nanoid();
      const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension

      try {
        // Add to uploading map
        setUploadState((prev) => {
          const newUploadingFiles = new Map(prev.uploadingFiles);
          newUploadingFiles.set(tempId, {
            name: file.name,
            size: file.size,
            progress: 0,
          });
          return {
            ...prev,
            isUploading: true,
            uploadingFiles: newUploadingFiles,
          };
        });

        // Step 1: Convert document using API route
        const formData = new FormData();
        formData.append("file", file);

        const convertResponse = await fetch("/api/convert-document", {
          method: "POST",
          body: formData,
        });

        if (!convertResponse.ok) {
          throw new Error("Failed to convert document");
        }

        const convertResult = await convertResponse.json();

        if (!convertResult.success) {
          throw new Error(convertResult.error || "Document conversion failed");
        }

        // Update progress
        setUploadState((prev) => {
          const newUploadingFiles = new Map(prev.uploadingFiles);
          const fileInfo = newUploadingFiles.get(tempId);
          if (fileInfo) {
            newUploadingFiles.set(tempId, { ...fileInfo, progress: 50 });
          }
          return { ...prev, uploadingFiles: newUploadingFiles };
        });

        // Step 2: Create document in CloudStore with converted content
        const documentId = await createDocument({
          title: fileName,
          initialContent: convertResult.data.tiptapContent,
          folderId: folderId || undefined,
        });

        if (!documentId) {
          throw new Error("Failed to create document in CloudStore");
        }

        // Update progress
        setUploadState((prev) => {
          const newUploadingFiles = new Map(prev.uploadingFiles);
          const fileInfo = newUploadingFiles.get(tempId);
          if (fileInfo) {
            newUploadingFiles.set(tempId, { ...fileInfo, progress: 100 });
          }
          return { ...prev, uploadingFiles: newUploadingFiles };
        });

        return { success: true, documentId };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Upload failed";

        // Add error to state
        setUploadState((prev) => ({
          ...prev,
          errors: new Map(prev.errors).set(tempId, errorMessage),
        }));

        return { success: false, error: errorMessage };
      } finally {
        // Remove from uploading map after a delay
        setTimeout(() => {
          setUploadState((prev) => {
            const newUploadingFiles = new Map(prev.uploadingFiles);
            newUploadingFiles.delete(tempId);
            return {
              ...prev,
              isUploading: newUploadingFiles.size > 0,
              uploadingFiles: newUploadingFiles,
            };
          });
        }, 1000);
      }
    },
    [user, validateFile, createDocument],
  );

  const uploadFiles = useCallback(
    async (
      files: FileList | File[],
      folderId?: string,
    ): Promise<DocumentUploadResult[]> => {
      const fileArray = Array.from(files);
      const results = await Promise.all(
        fileArray.map((file) => uploadSingleFile(file, folderId)),
      );
      return results;
    },
    [uploadSingleFile],
  );

  const clearError = useCallback((fileId: string) => {
    setUploadState((prev) => {
      const newErrors = new Map(prev.errors);
      newErrors.delete(fileId);
      return { ...prev, errors: newErrors };
    });
  }, []);

  return {
    // State
    isUploading: uploadState.isUploading,
    uploadingFiles: uploadState.uploadingFiles,
    errors: uploadState.errors,

    // Actions
    uploadFiles,
    uploadSingleFile,
    clearError,
    validateFile,

    // Computed
    canUpload: !!user,
  };
}
