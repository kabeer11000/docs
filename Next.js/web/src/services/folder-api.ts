import {
  API_CONFIG,
  type ApiResponse,
  DEFAULT_HEADERS,
  getAuthHeaders,
} from "../lib/api-config";

// Folder API Service
export class FolderAPIService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.BACKEND.BASE_URL;
  }

  // Get all folders for the current user
  async getFolders(
    parentId?: string,
    page = 1,
    limit = 10,
  ): Promise<ApiResponse<any[]>> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(parentId && { parentId }),
      });

      const response = await fetch(
        `${this.baseUrl}${API_CONFIG.BACKEND.ENDPOINTS.FOLDERS}?${params}`,
        {
          method: "GET",
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
        error: error instanceof Error ? error.message : "Failed to get folders",
      };
    }
  }

  // Create a new folder
  async createFolder(
    name: string,
    parentId?: string,
  ): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(
        `${this.baseUrl}${API_CONFIG.BACKEND.ENDPOINTS.FOLDERS}`,
        {
          method: "POST",
          headers: {
            ...DEFAULT_HEADERS,
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            name,
            parentId,
          }),
        },
      );

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create folder",
      };
    }
  }

  // Update folder
  async updateFolder(
    folderId: string,
    updates: { name?: string; description?: string },
  ): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(
        `${this.baseUrl}${API_CONFIG.BACKEND.ENDPOINTS.FOLDERS}/${folderId}`,
        {
          method: "PUT",
          headers: {
            ...DEFAULT_HEADERS,
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            ...updates,
          }),
        },
      );

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update folder",
      };
    }
  }

  // Delete folder
  async deleteFolder(folderId: string): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(
        `${this.baseUrl}${API_CONFIG.BACKEND.ENDPOINTS.FOLDERS}/${folderId}`,
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
          error instanceof Error ? error.message : "Failed to delete folder",
      };
    }
  }

  // Share folder
  async shareFolder(
    folderId: string,
    userIds: string[],
    access: "viewer" | "editor" = "viewer",
  ): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(
        `${this.baseUrl}${API_CONFIG.BACKEND.ENDPOINTS.FOLDERS}/${folderId}/share`,
        {
          method: "POST",
          headers: {
            ...DEFAULT_HEADERS,
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            userIds,
            access,
          }),
        },
      );

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to share folder",
      };
    }
  }
}

export const folderAPI = new FolderAPIService();
