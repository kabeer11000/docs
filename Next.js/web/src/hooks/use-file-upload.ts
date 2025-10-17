import { useStore } from "@nanostores/react";
import { nanoid } from "nanoid";
import { useCallback, useState } from "react";
import { API_CONFIG } from "@/lib/api-config";
import {
  $uploadedFiles,
  aiChatActions,
  type UploadedFile,
} from "@/state/ai-chat";
import { $auth } from "@/state/auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "image/jpeg",
  "image/png",
];

export interface FileUploadState {
  isUploading: boolean;
  uploadingFiles: Map<string, { name: string; size: number }>;
  errors: Map<string, string>;
}

export interface FileUploadResult {
  success: boolean;
  fileId?: string;
  error?: string;
}

export function useFileUpload() {
  const { user } = useStore($auth);
  const uploadedFiles = useStore($uploadedFiles);
  const [uploadState, setUploadState] = useState<FileUploadState>({
    isUploading: false,
    uploadingFiles: new Map(),
    errors: new Map(),
  });

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `File type '${file.type}' is not supported. Please upload PDF, DOC, DOCX, TXT, MD, or image files.`;
    }

    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return `File size (${sizeMB}MB) exceeds the 10MB limit.`;
    }

    return null;
  }, []);

  const uploadSingleFile = useCallback(
    async (file: File): Promise<FileUploadResult> => {
      if (!API_CONFIG.FEATURES.FILE_UPLOAD_ENABLED) {
        return { success: false, error: "File upload is disabled" };
      }

      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        return { success: false, error: validationError };
      }

      const fileId = nanoid();

      try {
        // Add to uploading map with file info
        setUploadState((prev) => {
          const newUploadingFiles = new Map(prev.uploadingFiles);
          newUploadingFiles.set(fileId, { name: file.name, size: file.size });
          return {
            ...prev,
            isUploading: true,
            uploadingFiles: newUploadingFiles,
            errors: new Map(prev.errors),
          };
        });

        // Create FormData
        const formData = new FormData();
        formData.append("file", file);

        // Make API request - using correct endpoint from OpenAPI spec
        const response = await fetch(
          `${API_CONFIG.AI.BASE_URL}${API_CONFIG.AI.ENDPOINTS.UPLOAD}`,
          {
            method: "POST",
            body: formData,
          },
        );

        if (!response.ok) {
          throw new Error(
            `Upload failed: ${response.status} ${response.statusText}`,
          );
        }

        const result = await response.json();

        // Backend returns s3_url, not file_url
        const fileUrl = result.s3_url || result.file_url || result.url;

        // Create uploaded file object
        const uploadedFile: UploadedFile = {
          id: result.file_id || fileId,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date(),
          url: fileUrl,
        };

        // Add to uploaded files
        aiChatActions.addUploadedFile(uploadedFile);

        return { success: true, fileId };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Upload failed";

        // Add error to state
        setUploadState((prev) => ({
          ...prev,
          errors: new Map(prev.errors).set(fileId, errorMessage),
        }));

        return { success: false, error: errorMessage };
      } finally {
        // Remove from uploading map
        setUploadState((prev) => {
          const newUploadingFiles = new Map(prev.uploadingFiles);
          newUploadingFiles.delete(fileId);
          return {
            ...prev,
            isUploading: newUploadingFiles.size > 0,
            uploadingFiles: newUploadingFiles,
          };
        });
      }
    },
    [user, validateFile],
  );

  const uploadFiles = useCallback(
    async (files: FileList | File[]): Promise<FileUploadResult[]> => {
      const fileArray = Array.from(files);
      const results = await Promise.all(fileArray.map(uploadSingleFile));
      return results;
    },
    [uploadSingleFile],
  );

  const deleteFile = useCallback(
    async (fileId: string): Promise<boolean> => {
      try {
        // Find the file to get its info
        const file = uploadedFiles.find((f) => f.id === fileId);
        if (!file) {
          console.warn("File not found for deletion:", fileId);
          return false;
        }

        // Call delete API endpoint
        const response = await fetch(
          `${API_CONFIG.AI.BASE_URL}${API_CONFIG.AI.ENDPOINTS.DELETE_FILE_BY_ID}/${fileId}`,
          {
            method: "DELETE",
          },
        );

        if (!response.ok) {
          throw new Error(
            `Delete failed: ${response.status} ${response.statusText}`,
          );
        }

        // Remove from state
        aiChatActions.removeUploadedFile(fileId);

        return true;
      } catch (error) {
        console.error("Failed to delete file:", error);
        return false;
      }
    },
    [uploadedFiles],
  );

  const clearAllFiles = useCallback(async (): Promise<boolean> => {
    try {
      // Call delete all vectors endpoint
      const response = await fetch(
        `${API_CONFIG.AI.BASE_URL}${API_CONFIG.AI.ENDPOINTS.DELETE_VECTOR}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error(
          `Clear all failed: ${response.status} ${response.statusText}`,
        );
      }

      // Clear state
      uploadedFiles.forEach((file) => {
        aiChatActions.removeUploadedFile(file.id);
      });

      return true;
    } catch (error) {
      console.error("Failed to clear all files:", error);
      return false;
    }
  }, [uploadedFiles]);

  const clearError = useCallback((fileId: string) => {
    setUploadState((prev) => {
      const newErrors = new Map(prev.errors);
      newErrors.delete(fileId);
      return { ...prev, errors: newErrors };
    });
  }, []);

  return {
    // State
    uploadedFiles,
    isUploading: uploadState.isUploading,
    uploadingFiles: uploadState.uploadingFiles,
    errors: uploadState.errors,

    // Actions
    uploadFiles,
    uploadSingleFile,
    deleteFile,
    clearAllFiles,
    clearError,
    validateFile,

    // Computed
    hasFiles: uploadedFiles.length > 0,
    canUpload: API_CONFIG.FEATURES.FILE_UPLOAD_ENABLED && !!user,
  };
}
