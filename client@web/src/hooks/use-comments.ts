import { useStore } from "@nanostores/react";
import type {
  IComment,
  ICommentCreateInput,
  ICommentReply,
  ICommentReplyInput,
} from "@shared-types";
import { nanoid } from "nanoid";
import { useCallback } from "react";
import cloudStore from "@/lib/cloudstore";
import { $auth } from "@/state/auth";
import { $nothing, commentsWatch } from "@/state/live-queries";

const NO_COMMENTS: IComment[] = [];

export function useComments(documentId: string) {
  // One shared watch per document, however many components (header, editor) ask.
  const live = useStore(documentId ? commentsWatch(documentId) : $nothing);
  const comments = live ?? NO_COMMENTS;
  const isLoading = !!documentId && live === undefined;
  const { user } = useStore($auth);

  // Create a new comment
  const createComment = useCallback(
    async (input: ICommentCreateInput): Promise<string | null> => {
      if (!cloudStore || !user) {
        console.error("CloudStore not available or user not authenticated");
        return null;
      }

      try {
        const commentId = nanoid();
        const timestamp = new Date().toISOString();

        // Check if identical comment exists (same range, content, and author)
        const existingComments = comments.filter(
          (c) =>
            c.range.from === input.range.from &&
            c.range.to === input.range.to &&
            c.content === input.content &&
            c.author.id === user.id &&
            !c.resolved,
        );

        if (existingComments.length > 0) {
          console.log(
            "Duplicate comment detected, skipping:",
            existingComments[0].id,
          );
          return existingComments[0].id;
        }

        const newComment: IComment = {
          id: commentId,
          documentId: input.documentId,
          content: input.content,
          author: {
            id: user.id,
            name: user.displayName || user.email || "Anonymous",
            email: user.email || undefined,
            avatar: user.photoURL || undefined,
          },
          range: input.range,
          resolved: false,
          replies: [],
          timestamp: {
            createdAt: timestamp,
            updatedAt: timestamp,
          },
          suggestions: input.suggestions?.map((s) => ({
            ...s,
            id: nanoid(),
            accepted: false,
          })),
        };

        const commentsCollection = cloudStore.collection("comments");
        const result = await commentsCollection.insert(newComment);

        console.log(
          "[useComments] Comment created:",
          commentId,
          "Result:",
          result,
        );
        return commentId;
      } catch (error) {
        console.error("Failed to create comment:", error);
        return null;
      }
    },
    [user, comments],
  );

  // Add reply to a comment
  const addReply = useCallback(
    async (input: ICommentReplyInput): Promise<boolean> => {
      if (!cloudStore || !user) {
        console.error("CloudStore not available or user not authenticated");
        return false;
      }

      try {
        const replyId = nanoid();
        const timestamp = new Date().toISOString();

        const newReply: ICommentReply = {
          id: replyId,
          commentId: input.commentId,
          content: input.content,
          author: {
            id: user.id,
            name: user.displayName || user.email || "Anonymous",
            email: user.email || undefined,
            avatar: user.photoURL || undefined,
          },
          timestamp: {
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        };

        // Find the comment and add reply
        const comment = comments.find((c) => c.id === input.commentId);
        if (!comment) {
          console.error("Comment not found:", input.commentId);
          return false;
        }

        const updatedReplies = [...(comment.replies || []), newReply];

        const commentsCollection = cloudStore.collection("comments");
        const query = cloudStore.query.where("id", "EQUAL", input.commentId);

        await commentsCollection.update(query, {
          replies: updatedReplies,
          timestamp: {
            ...comment.timestamp,
            updatedAt: timestamp,
          },
        });

        console.log("Reply added to comment:", input.commentId);
        return true;
      } catch (error) {
        console.error("Failed to add reply:", error);
        return false;
      }
    },
    [user, comments],
  );

  // Update comment content
  const updateComment = useCallback(
    async (commentId: string, content: string): Promise<boolean> => {
      if (!cloudStore) {
        console.error("CloudStore not available");
        return false;
      }

      try {
        const commentsCollection = cloudStore.collection("comments");
        const query = cloudStore.query.where("id", "EQUAL", commentId);

        await commentsCollection.update(query, {
          content,
          timestamp: {
            createdAt:
              comments.find((c) => c.id === commentId)?.timestamp.createdAt ||
              new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });

        console.log("Comment updated:", commentId);
        return true;
      } catch (error) {
        console.error("Failed to update comment:", error);
        return false;
      }
    },
    [comments],
  );

  // Resolve a comment
  const resolveComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      if (!cloudStore) {
        console.error("CloudStore not available");
        return false;
      }

      try {
        const comment = comments.find((c) => c.id === commentId);
        if (!comment) {
          console.error("Comment not found:", commentId);
          return false;
        }

        const commentsCollection = cloudStore.collection("comments");
        const query = cloudStore.query.where("id", "EQUAL", commentId);

        const result = await commentsCollection.update(query, {
          resolved: true,
          timestamp: {
            createdAt: comment.timestamp.createdAt,
            updatedAt: new Date().toISOString(),
          },
        });

        console.log(
          "[useComments] Comment resolved:",
          commentId,
          "Result:",
          result,
        );
        return true;
      } catch (error) {
        console.error("Failed to resolve comment:", error);
        return false;
      }
    },
    [comments],
  );

  // Delete a comment
  const deleteComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      if (!cloudStore) {
        console.error("CloudStore not available");
        return false;
      }

      try {
        const commentsCollection = cloudStore.collection("comments");
        const query = cloudStore.query.where("id", "EQUAL", commentId);

        const result = await commentsCollection.remove(query);

        console.log(
          "[useComments] Comment deleted:",
          commentId,
          "Result:",
          result,
        );
        return true;
      } catch (error) {
        console.error("Failed to delete comment:", error);
        return false;
      }
    },
    [],
  );

  // Get a specific comment by ID
  const getComment = useCallback(
    (commentId: string): IComment | null => {
      return comments.find((c) => c.id === commentId) || null;
    },
    [comments],
  );

  return {
    comments,
    isLoading,
    createComment,
    addReply,
    updateComment,
    resolveComment,
    deleteComment,
    getComment,
  };
}
