/**
 * Document API types - shared with document service
 */

import type { ITimestamp } from "../core/file-system";
import type { IUser } from "../core/user";

export interface IDocumentPage {
  id: string;
  content: string;
  pageNumber: number;
  metadata?: Record<string, any>;
}

export interface ILegalDocument {
  id: string;
  title: string;
  content: string;
  pages: IDocumentPage[];
  author: IUser;
  collaborators: IUser[];
  status: "draft" | "review" | "published" | "archived";
  tags: string[];
  category: string;
  permissions: {
    canRead: string[];
    canWrite: string[];
    canShare: string[];
  };
  metadata: {
    wordCount: number;
    pageCount: number;
    language: string;
    version: number;
  };
  timestamps: ITimestamp;
}

export interface IDocumentCreateRequest {
  title: string;
  content?: string;
  category?: string;
  tags?: string[];
  templateId?: string;
}

export interface IDocumentUpdateRequest {
  title?: string;
  content?: string;
  status?: ILegalDocument["status"];
  tags?: string[];
}

export interface IDocumentShareRequest {
  documentId: string;
  userIds: string[];
  permission: "read" | "write" | "share";
}

export interface IDocumentCollaborationEvent {
  type: "cursor" | "selection" | "edit" | "comment";
  userId: string;
  documentId: string;
  timestamp: string;
  data: Record<string, any>;
}

export interface IDocumentVersion {
  id: string;
  documentId: string;
  version: number;
  content: string;
  author: IUser;
  createdAt: string;
  changes?: {
    added: number;
    removed: number;
    modified: number;
  };
}
