/**
 * Comment system types for Google Docs-style commenting
 */

export interface IComment {
  id: string;
  documentId: string;
  content: string;
  author: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
  };
  range: {
    from: number;
    to: number;
  };
  resolved: boolean;
  replies: ICommentReply[];
  timestamp: {
    createdAt: string;
    updatedAt: string;
  };
  suggestions?: ICommentSuggestion[];
}

export interface ICommentReply {
  id: string;
  commentId: string;
  content: string;
  author: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
  };
  timestamp: {
    createdAt: string;
    updatedAt: string;
  };
}

export interface ICommentSuggestion {
  id: string;
  type: "replace" | "insert" | "delete";
  originalText: string;
  suggestedText: string;
  accepted: boolean;
  rejectedBy?: string;
  acceptedBy?: string;
}

export interface ICommentThread {
  id: string;
  comments: IComment[];
  position: {
    x: number;
    y: number;
  };
  visible: boolean;
  resolved: boolean;
}

export interface ICommentSelection {
  from: number;
  to: number;
  text: string;
}

export interface ICommentCreateInput {
  content: string;
  range: {
    from: number;
    to: number;
  };
  documentId: string;
  suggestions?: Omit<
    ICommentSuggestion,
    "id" | "accepted" | "rejectedBy" | "acceptedBy"
  >[];
}

export interface ICommentReplyInput {
  content: string;
  commentId: string;
}

export interface ICommentUpdateInput {
  content?: string;
  resolved?: boolean;
}

// Comment events for real-time collaboration
export interface ICommentEvent {
  type:
    | "comment_added"
    | "comment_updated"
    | "comment_deleted"
    | "comment_resolved"
    | "reply_added";
  commentId: string;
  documentId: string;
  userId: string;
  data: any;
  timestamp: string;
}
