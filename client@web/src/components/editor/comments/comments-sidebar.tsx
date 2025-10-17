import type { IComment } from "@shared-types";
import { MessagesSquare, X } from "lucide-react";
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
  currentUserId,
  activeCommentId,
}) => {
  const [showResolved, setShowResolved] = useState(false);

  const filteredComments = showResolved
    ? comments.filter((c) => c.resolved)
    : comments.filter((c) => !c.resolved);

  const unresolvedCount = comments.filter((c) => !c.resolved).length;
  const resolvedCount = comments.filter((c) => c.resolved).length;

  return (
    <div
      className={cn(
        "fixed top-0 right-0 h-full w-80 bg-background border-l border-border shadow-lg transition-transform duration-300 ease-in-out z-50 flex flex-col",
        isOpen ? "translate-x-0" : "translate-x-full",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <MessagesSquare className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Comments</h3>
            <p className="text-xs text-muted-foreground">
              {unresolvedCount} open
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
        <Button
          variant={!showResolved ? "default" : "ghost"}
          size="sm"
          onClick={() => setShowResolved(false)}
          className="flex-1 h-8 text-xs"
        >
          Open ({unresolvedCount})
        </Button>
        <Button
          variant={showResolved ? "default" : "ghost"}
          size="sm"
          onClick={() => setShowResolved(true)}
          className="flex-1 h-8 text-xs"
        >
          Resolved ({resolvedCount})
        </Button>
      </div>

      {/* Comments List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {filteredComments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <MessagesSquare className="w-8 h-8 text-muted-foreground" />
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
                  "group rounded-lg border transition-all cursor-pointer",
                  activeCommentId === comment.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-card hover:border-primary/50 hover:bg-accent/50",
                )}
                onClick={() => onCommentClick(comment.id)}
              >
                <div className="p-3">
                  {/* Author and timestamp */}
                  <div className="flex items-start gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium flex-shrink-0">
                      {comment.author.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="text-xs font-medium text-foreground truncate">
                          {comment.author.name}
                        </span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(
                            comment.timestamp.createdAt,
                          ).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Comment content */}
                  <div className="text-sm text-foreground leading-relaxed mb-2 line-clamp-3">
                    {comment.content}
                  </div>

                  {/* Actions */}
                  {!comment.resolved && (
                    <div className="flex items-center gap-1 pt-2 border-t border-border/50">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onResolve(comment.id);
                        }}
                        className="h-6 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-500/10"
                      >
                        Resolve
                      </Button>
                      {comment.author.id === currentUserId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(comment.id);
                          }}
                          className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          Delete
                        </Button>
                      )}
                      {comment.replies && comment.replies.length > 0 && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {comment.replies.length}{" "}
                          {comment.replies.length === 1 ? "reply" : "replies"}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
