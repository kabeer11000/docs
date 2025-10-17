/**
 * Core File System types - shared across all services
 * Includes files, folders, and related structures
 */

import type { ISharedWithItem, IUserPermissions } from "./user";

export interface ITimestamp {
  createdAt: Date | string | number;
  updatedAt: Date | string | number;
}

export interface IFolderMetadata {
  fileCount: number;
  color: string;
  icon?: string;
}

export interface IFolderPermissions extends IUserPermissions {
  owner: string;
  sharedWith?: ISharedWithItem[];
}

export interface IFolderItem {
  id: string;
  name: string;
  tags: string[];
  category: string;
  parents: string[];
  meta: IFolderMetadata;
  permissions: IFolderPermissions;
  timestamp: ITimestamp;
}

export interface IFilePreview {
  type: "image" | "icon";
  src?: string;
  srcset?: string[];
  color?: string;
  icon?: string;
}

export interface IFileMetadata {
  showPreview?: boolean;
  preview: IFilePreview;
  type: {
    mime: string;
    extension: string;
  };
}

export interface IFileSharing {
  isShared: boolean;
  sharedWith: Array<{
    id: string;
    access: "viewer" | "editor" | "owner";
  }>;
}

export interface IFileItem {
  id: string;
  name: string;
  tags: string[];
  owner: string;
  sharing?: IFileSharing;
  location: string; // Folder ID
  parents: string[];
  timestamp: ITimestamp;
  permissions: IUserPermissions;
  size?: number; // in bytes
  meta: IFileMetadata;
}

export interface ICollection {
  name: string;
  icon: string;
  color: string;
  itemCount: number;
  category: string;
}

export interface IQuickAccessCollections {
  title: string;
  items: ICollection[];
}

// Navigation and breadcrumb types
export interface IBreadcrumbItem {
  id: string;
  name: string;
  url?: string;
}

// Search and filtering
export type SortField = "name" | "modified" | "owner" | "location";
export type SortDirection = "asc" | "desc";

export interface ISortConfig {
  field: SortField;
  direction: SortDirection;
}
