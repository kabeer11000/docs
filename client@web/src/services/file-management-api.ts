import {
  API_CONFIG,
  type ApiResponse,
  DEFAULT_HEADERS,
  getAuthHeaders,
} from "../lib/api-config";

// File Upload Types
export interface FileUploadResponse {
  success: boolean;
  message?: string;
  file_id?: string;
  filename?: string;
  processed?: boolean;
  vectors_created?: number;
}

// Delete Operations Types
export interface DeleteVectorStoreResponse {
  success: boolean;
  message?: string;
  deleted_count?: number;
}

export interface DeleteFileResponse {
  success: boolean;
  message?: string;
  file_id?: string;
  deleted_from_vector_store?: boolean;
  deleted_from_s3?: boolean;
}

// Text Summarization Types
export interface SummarizeRequest {
  text: string;
  max_length?: number;
  summary_type?: "extractive" | "abstractive";
}

export interface SummarizeResponse {
  success: boolean;
  original_length?: number;
  summary?: string;
  summary_length?: number;
  summary_type?: string;
  error?: string;
}

// File Management API Service
export class FileManagementAPIService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.AI.BASE_URL;
  }

  // Upload file (stateless) - multipart/form-data
  async uploadFile(file: File): Promise<ApiResponse<FileUploadResponse>> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${this.baseUrl}${API_CONFIG.AI.ENDPOINTS.UPLOAD}`,
        {
          method: "POST",
          headers: {
            // Don't set Content-Type for FormData - browser will set it with boundary
            ...getAuthHeaders(),
          },
          body: formData,
        },
      );

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.detail || result.message || "File upload failed",
        };
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to upload file",
      };
    }
  }

  // Delete entire vector store
  async deleteVectorStore(): Promise<ApiResponse<DeleteVectorStoreResponse>> {
    try {
      const response = await fetch(
        `${this.baseUrl}${API_CONFIG.AI.ENDPOINTS.DELETE_VECTOR}`,
        {
          method: "DELETE",
          headers: {
            ...DEFAULT_HEADERS,
            ...getAuthHeaders(),
          },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error:
            result.detail || result.message || "Failed to delete vector store",
        };
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete vector store",
      };
    }
  }

  // Delete specific file by ID
  async deleteFileById(
    fileId: string,
  ): Promise<ApiResponse<DeleteFileResponse>> {
    try {
      const response = await fetch(
        `${this.baseUrl}${API_CONFIG.AI.ENDPOINTS.DELETE_FILE_BY_ID}/${fileId}`,
        {
          method: "DELETE",
          headers: {
            ...DEFAULT_HEADERS,
            ...getAuthHeaders(),
          },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.detail || result.message || "Failed to delete file",
        };
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete file",
      };
    }
  }

  // Summarize text using AI
  async summarizeText(
    request: SummarizeRequest,
  ): Promise<ApiResponse<SummarizeResponse>> {
    try {
      const response = await fetch(
        `${this.baseUrl}${API_CONFIG.AI.ENDPOINTS.SUMMARIZE}`,
        {
          method: "POST",
          headers: {
            ...DEFAULT_HEADERS,
            ...getAuthHeaders(),
          },
          body: JSON.stringify(request),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.detail || result.message || "Text summarization failed",
        };
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to summarize text",
      };
    }
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}${API_CONFIG.AI.ENDPOINTS.HEALTH}`,
      );
      const result = await response.json();
      return {
        success: response.ok,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "AI service unavailable",
      };
    }
  }

  // Bulk file operations helper methods

  // Upload multiple files sequentially
  async uploadMultipleFiles(
    files: File[],
  ): Promise<ApiResponse<FileUploadResponse[]>> {
    const results: FileUploadResponse[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const result = await this.uploadFile(file);
      if (result.success && result.data) {
        results.push(result.data);
      } else {
        errors.push(`${file.name}: ${result.error}`);
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: `Some uploads failed: ${errors.join(", ")}`,
        data: results,
      };
    }

    return {
      success: true,
      data: results,
    };
  }

  // Delete multiple files by ID
  async deleteMultipleFiles(
    fileIds: string[],
  ): Promise<ApiResponse<DeleteFileResponse[]>> {
    const results: DeleteFileResponse[] = [];
    const errors: string[] = [];

    for (const fileId of fileIds) {
      const result = await this.deleteFileById(fileId);
      if (result.success && result.data) {
        results.push(result.data);
      } else {
        errors.push(`${fileId}: ${result.error}`);
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: `Some deletions failed: ${errors.join(", ")}`,
        data: results,
      };
    }

    return {
      success: true,
      data: results,
    };
  }
}

// Singleton instance
export const fileManagementAPI = new FileManagementAPIService();
