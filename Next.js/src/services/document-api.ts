import {
  API_CONFIG,
  type ApiResponse,
  DEFAULT_HEADERS,
  getAuthHeaders,
} from "../lib/api-config";
import type { DocumentPage, LegalDocument } from "../state/document";

// Document API Service
export class DocumentAPIService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.BACKEND.BASE_URL;
  }

  // Create a new document
  async createDocument(
    title: string,
    folderId?: string,
  ): Promise<ApiResponse<LegalDocument>> {
    try {
      const response = await fetch(
        `${this.baseUrl}${API_CONFIG.BACKEND.ENDPOINTS.DOCUMENTS}`,
        {
          method: "POST",
          headers: {
            ...DEFAULT_HEADERS,
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            title,
            folderId,
            format: "A4",
            initialContent: {
              type: "doc",
              content: [],
            },
          }),
        },
      );

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create document",
      };
    }
  }

  // Get all documents for the current user
  async getDocuments(
    folderId?: string,
    page = 1,
    limit = 10,
  ): Promise<ApiResponse<LegalDocument[]>> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(folderId && { folderId }),
      });

      const response = await fetch(
        `${this.baseUrl}${API_CONFIG.BACKEND.ENDPOINTS.DOCUMENTS}?${params}`,
        {
          headers: {
            ...DEFAULT_HEADERS,
            ...getAuthHeaders(),
          },
        },
      );

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch documents",
      };
    }
  }

  // Get a specific document by ID
  async getDocument(documentId: string): Promise<ApiResponse<LegalDocument>> {
    try {
      const response = await fetch(
        `${this.baseUrl}${API_CONFIG.BACKEND.ENDPOINTS.DOCUMENTS}/${documentId}`,
        {
          headers: {
            ...DEFAULT_HEADERS,
            ...getAuthHeaders(),
          },
        },
      );

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch document",
      };
    }
  }

  // Update a document
  async updateDocument(
    documentId: string,
    updates: Partial<LegalDocument>,
  ): Promise<ApiResponse<LegalDocument>> {
    try {
      const response = await fetch(
        `${this.baseUrl}${API_CONFIG.BACKEND.ENDPOINTS.DOCUMENTS}/${documentId}`,
        {
          method: "PATCH",
          headers: {
            ...DEFAULT_HEADERS,
            ...getAuthHeaders(),
          },
          body: JSON.stringify(updates),
        },
      );

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update document",
      };
    }
  }

  // Delete a document
  async deleteDocument(documentId: string): Promise<ApiResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}${API_CONFIG.BACKEND.ENDPOINTS.DOCUMENTS}/${documentId}`,
        {
          method: "DELETE",
          headers: {
            ...DEFAULT_HEADERS,
            ...getAuthHeaders(),
          },
        },
      );

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete document",
      };
    }
  }

  // Share a document with other users
  async shareDocument(
    documentId: string,
    userIds: string[],
    access: "viewer" | "editor" = "viewer",
  ): Promise<ApiResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}${API_CONFIG.BACKEND.ENDPOINTS.DOCUMENTS}/${documentId}/share`,
        {
          method: "POST",
          headers: {
            ...DEFAULT_HEADERS,
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ userIds, access }),
        },
      );

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to share document",
      };
    }
  }

  // Auto-save document changes
  async autoSave(
    documentId: string,
    pages: DocumentPage[],
    wordCount: number,
  ): Promise<ApiResponse> {
    return this.updateDocument(documentId, {
      pages,
      wordCount,
      lastSaved: new Date(),
    });
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}${API_CONFIG.BACKEND.ENDPOINTS.HEALTH}`,
      );
      return await response.json();
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Backend service unavailable",
      };
    }
  }
}

// Singleton instance
export const documentAPI = new DocumentAPIService();
