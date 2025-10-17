import type { IComment } from "@shared-types";
import { Check, MessagesSquare, Trash, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface CommentsSidebarProps {
  comments: IComment[];
  isOpen: boolean;
  onClose: () => void;
  onCommentClick: (commentId: string) => void;
  onResolve: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onEdit: (commentId: string, content: string) => void;
  onReply: (commentId: string, content: string) => void;
  currentUserId: string;
  activeCommentId: string | null;
}

export const CommentsSidebar: React.FC<CommentsSidebarProps> = ({
  comments,
  isOpen,
  onClose,
  onCommentClick,
  onResolve,
  onDelete,
  onEdit,
  onReply,
  currentUserId,
  activeCommentId,
}) => {
  const [showResolved, setShowResolved] = useState(false);
  const [showDeleteResolved, setShowDeleteResolved] = useState(false);

  const filteredComments = showResolved
    ? comments.filter((c) => c.resolved)
    : comments.filter((c) => !c.resolved);

  const unresolvedCount = comments.filter((c) => !c.resolved).length;
  const resolvedCount = comments.filter((c) => c.resolved).length;

  // Add functionality to delete all resolved comments
  const handleDeleteAllResolved = () => {
    comments
      .filter((c) => c.resolved && c.author.id === currentUserId)
      .forEach((comment) => onDelete(comment.id));
    setShowDeleteResolved(false);
  };

  return (
    <div
      className={cn(
        "fixed top-0 right-0 h-full w-80 bg-background border-l border-border transition-transform duration-300 ease-in-out z-50",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-500">
            <MessagesSquare className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">Comments</h3>
            <p className="text-xs text-muted-foreground">
              {unresolvedCount} open
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0 rounded-full"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center gap-1 px-3 py-2 border-b bg-muted/30">
        <button
          onClick={() => setShowResolved(false)}
          className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-sm transition-colors ${
            !showResolved
              ? "bg-primary text-primary-foreground"
              : "text-foreground hover:bg-accent"
          }`}
        >
          Open ({unresolvedCount})
        </button>
        <button
          onClick={() => setShowResolved(true)}
          className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-sm transition-colors ${
            showResolved
              ? "bg-primary text-primary-foreground"
              : "text-foreground hover:bg-accent"
          }`}
        >
          Resolved ({resolvedCount})
        </button>
      </div>

      {/* Comments List */}
      <ScrollArea className="h-[calc(100%-8rem)]">
        <div className="p-3 space-y-3">
          {filteredComments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <MessagesSquare className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                {showResolved ? "No resolved comments" : "No open comments"}
              </p>
              <p className="text-xs text-muted-foreground">
                Select text to add a comment
              </p>
            </div>
          ) : (
            filteredComments.map((comment) => (
              <div
                key={comment.id}
                className={cn(
                  "rounded-lg border p-3 transition-all cursor-pointer",
                  comment.resolved 
                    ? "border-border bg-muted/30"
                    : "border-border hover:bg-accent",
                  activeCommentId === comment.id
                    ? comment.resolved 
                      ? "border-primary bg-primary/5"
                      : "border-primary bg-primary/5"
                    : ""
                )}
                onClick={() => onCommentClick(comment.id)}
              >
                {/* Author and timestamp */}
                <div className="flex items-start gap-2.5 mb-2">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium flex-shrink-0">
                    {comment.author.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-medium text-foreground truncate">
                        {comment.author.name}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(
                          comment.timestamp.createdAt
                        ).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric"
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Comment content */}
                <div className="text-sm text-foreground leading-relaxed mb-2.5">
                  {comment.content}
                </div>

                {/* Actions */}
                {!comment.resolved ? (
                  <div className="flex items-center gap-1.5 pt-2 border-t border-border/50">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onResolve(comment.id);
                      }}
                      className="h-7 w-7 p-0 border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    {comment.author.id === currentUserId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(comment.id);
                        }}
                        className="h-7 w-7 p-0 border-destructive text-destructive hover:bg-destructive/10"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    )}
                    {comment.replies && comment.replies.length > 0 && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {comment.replies.length}{" "}
                        {comment.replies.length === 1 ? "reply" : "replies"}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 pt-2 border-t border-border/50">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-700 border border-green-500/30">
                      Resolved
                    </span>
                    {comment.author.id === currentUserId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(comment.id);
                        }}
                        className="h-6 px-2 text-xs border-destructive text-destructive hover:bg-destructive/10 ml-auto"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Delete Resolved Confirmation Dialog */}
      {showDeleteResolved && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg p-6 max-w-sm w-full border">
            <h3 className="font-medium text-foreground mb-2">Delete Resolved Comments</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to delete all resolved comments? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteResolved(false)}
                className="h-8"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteAllResolved}
                className="h-8"
              >
                Delete All
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Footer actions for resolved comments */}
      {showResolved && resolvedCount > 0 && (
        <div className="absolute bottom-0 w-full p-3 border-t bg-background">
          <Button
            variant="outline"
            className="w-full h-8 text-xs font-medium text-destructive border-destructive hover:bg-destructive/10"
            onClick={() => setShowDeleteResolved(true)}
          >
            Delete All Resolved
          </Button>
        </div>
      )}
    </div>
  );
};
