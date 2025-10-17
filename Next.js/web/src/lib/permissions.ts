import type { IFileItem, IFolderItem } from "@shared-types";

// Mock current user - in a real app this would come from auth
export const CURRENT_USER = "user-a";

export interface UserPermissions {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canShare: boolean;
  isOwner: boolean;
}

export function getFolderPermissions(
  folder: IFolderItem,
  userId: string = CURRENT_USER,
): UserPermissions {
  const isOwner = folder.permissions.owner === userId;

  if (isOwner) {
    return {
      canRead: true,
      canWrite: true,
      canDelete: true,
      canShare: true,
      isOwner: true,
    };
  }

  // Check if user is in shared list
  const sharedWith = folder.permissions.sharedWith?.find(
    (user) => user.id === userId,
  );

  if (sharedWith) {
    return {
      canRead: true,
      canWrite: sharedWith.access === "editor" || sharedWith.access === "admin",
      canDelete: sharedWith.access === "admin",
      canShare: sharedWith.access === "admin",
      isOwner: false,
    };
  }

  // Default permissions (no access)
  return {
    canRead: false,
    canWrite: false,
    canDelete: false,
    canShare: false,
    isOwner: false,
  };
}

export function getFilePermissions(
  file: IFileItem,
  userId: string = CURRENT_USER,
): UserPermissions {
  const isOwner = file.owner === userId;

  if (isOwner) {
    return {
      canRead: true,
      canWrite: true,
      canDelete: true,
      canShare: true,
      isOwner: true,
    };
  }

  // Check if user is in shared list
  const sharedWith = file.sharing?.sharedWith?.find(
    (user) => user.id === userId,
  );

  if (sharedWith) {
    return {
      canRead: true,
      canWrite: sharedWith.access === "editor",
      canDelete: false, // Files can only be deleted by owner
      canShare: false, // Files can only be shared by owner
      isOwner: false,
    };
  }

  // Default permissions (no access)
  return {
    canRead: false,
    canWrite: false,
    canDelete: false,
    canShare: false,
    isOwner: false,
  };
}

export function getUserDisplayName(userId: string): string {
  const userMap: Record<string, string> = {
    "user-a": "John Doe",
    "user-b": "Jane Smith",
    "user-c": "Mike Johnson",
    "user-d": "Sarah Wilson",
    "user-family": "Family Members",
  };

  return userMap[userId] || userId;
}

export function getAccessLevelDisplay(access: string): string {
  const accessMap: Record<string, string> = {
    viewer: "Can View",
    editor: "Can Edit",
    admin: "Admin",
  };

  return accessMap[access] || access;
}

export function getPermissionSummary(permissions: UserPermissions): string {
  if (permissions.isOwner) return "Owner";
  if (permissions.canWrite) return "Editor";
  if (permissions.canRead) return "Viewer";
  return "No Access";
}
