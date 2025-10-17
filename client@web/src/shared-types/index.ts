/**
 * Centralized type exports for the entire application
 * Import from here to access all shared types
 */

// API types
export type {
  IApiError,
  IAuthResponse,
  IAuthState,
  IAuthTokens,
  IBackendAuthResponse,
  IBackendTokenRefreshRequest,
  IEmailVerificationRequest,
  ILoginCredentials,
  IPasswordChangeRequest,
  IPasswordResetRequest,
  IRegisterRequest,
  ISignUpData,
  ITokenRefreshRequest,
} from "./api/auth";
export type {
  IDocumentCollaborationEvent,
  IDocumentCreateRequest,
  IDocumentPage,
  IDocumentShareRequest,
  IDocumentUpdateRequest,
  IDocumentVersion,
  ILegalDocument,
} from "./api/document";
export type {
  IAnalysis,
  IAnalysisCreateInput,
  IGreenFlag,
  IRedFlag,
} from "./core/analysis";
export type {
  IComment,
  ICommentCreateInput,
  ICommentEvent,
  ICommentReply,
  ICommentReplyInput,
  ICommentSelection,
  ICommentSuggestion,
  ICommentThread,
  ICommentUpdateInput,
} from "./core/comments";
export type {
  IBreadcrumbItem,
  ICollection,
  IFileItem,
  IFileMetadata,
  IFilePreview,
  IFileSharing,
  IFolderItem,
  IFolderMetadata,
  IFolderPermissions,
  IQuickAccessCollections,
  ISortConfig,
  ITimestamp,
  SortDirection,
  SortField,
} from "./core/file-system";
// Core types
export type {
  IBackendSubscription,
  IBackendUser,
  IMongoUser,
  ISharedWithItem,
  IUser,
  IUserOrganization,
  IUserPermissions,
  IUserPreferences,
  IUserProfile,
  IUserStats,
  IUserSubscription,
} from "./core/user";

// CloudStore Document type
export interface Document {
  _id: string;
  title: string;
  pages: Array<{
    id: string;
    content: any;
    format: string;
    pageNumber: number;
  }>;
  currentPage: number;
  wordCount: number;
  owner: string;
  sharing: {
    isShared: boolean;
    sharedWith: Array<{
      email: string;
      userId?: string;
      displayName?: string | null;
      access: "viewer" | "editor" | "signer" | "owner";
      status: "active" | "pending";
      invitedAt: Date | string;
    }>;
    settings: {
      allowEditorsShare: boolean;
      editorsCanDownload: boolean;
      viewersCanDownload: boolean;
    };
  };
  permissions: {
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
    canShare: boolean;
  };
  location: string;
  parents: string[];
  tags: string[];
  meta: {
    type: {
      mime: string;
      extension: string;
    };
    size: number;
  };
  pageSettings?: any;
  signatures?: Array<{
    id: string;
    dataUrl: string;
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    signedBy: {
      userId: string;
      name: string;
      email?: string;
    };
    signedAt: Date | string;
    status: "placed" | "verified";
  }>;
  signatureRequests?: Array<{
    id: string;
    email: string;
    userId?: string;
    requestedBy: string;
    status: "pending" | "signed" | "declined";
    requestedAt: Date | string;
    message?: string;
  }>;
  createdAt: Date | string;
  updatedAt: Date | string;
  lastSaved: Date | string;
}

export interface DocumentCreateInput {
  title?: string;
  initialContent?: any;
  format?: string;
  folderId?: string;
  pageSettings?: any;
}

// UI types
export type {
  IConfirmationDialog,
  ICyclingTextState,
  IDialogState,
  IErrorState,
  ILanguage,
  ILoadingState,
  IMenuAction,
  IModalState,
  INotification,
  IPaginationConfig,
  ISearchConfig,
  ISearchResult,
  ISearchState,
  ISettingsState,
  IToast,
  SearchResultType,
  SettingsSection,
} from "./ui/common";

// Utility functions
export {
  extractDateString,
  extractObjectId,
  transformBackendSubscription,
  transformBackendUserToUser,
  transformBackendUserToUserProfile,
} from "./utils/transforms";
