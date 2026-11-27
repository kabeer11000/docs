import type { IComment } from "@shared-types";
import { Check, MessagesSquare, Trash, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { UserAvatar } from "@/components/avatar/user-avatar";
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
  const [showDeleteResolved, setShowDeleteResolved] = useState(false);

  const filteredComments = showResolved
    ? comments.filter((c) => c.resolved)
    : comments.filter((c) => !c.resolved);

  const unresolvedCount = comments.filter((c) => !c.resolved).length;
  const resolvedCount = comments.filter((c) => c.resolved).length;

  const handleDeleteAllResolved = () => {
    comments
      .filter((c) => c.resolved && c.author.id === currentUserId)
      .forEach((comment) => onDelete(comment.id));
    setShowDeleteResolved(false);
  };

  const tabClass = (active: boolean) =>
    cn(
      "flex-1 h-7 rounded-md text-xs font-medium transition-colors",
      active
        ? "bg-accent text-foreground"
        : "text-muted-foreground hover:text-foreground",
    );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        aria-label="Comments"
        inert={!isOpen}
        className={cn(
          "fixed top-0 right-0 z-50 flex h-full w-full flex-col bg-background transition-transform duration-150 ease-out md:w-80",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex h-12 shrink-0 items-center justify-between pl-4 pr-2">
          <h3 className="text-[13px] font-medium text-foreground">Comments</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close comments"
          >
            <X />
          </Button>
        </div>

        <div className="flex shrink-0 items-center gap-1 px-3 pb-1">
          <button
            type="button"
            onClick={() => setShowResolved(false)}
            className={tabClass(!showResolved)}
          >
            Open{" "}
            <span className="tabular-nums text-muted-foreground">
              {unresolvedCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShowResolved(true)}
            className={tabClass(showResolved)}
          >
            Resolved{" "}
            <span className="tabular-nums text-muted-foreground">
              {resolvedCount}
            </span>
          </button>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-2 p-3">
            {filteredComments.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <MessagesSquare className="mb-3 size-6 text-muted-foreground" />
                <p className="mb-1 text-sm font-medium text-foreground">
                  {showResolved ? "No resolved comments" : "No open comments"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Select text in the document to add a comment.
                </p>
              </div>
            ) : (
              filteredComments.map((comment) => {
                const isActive = activeCommentId === comment.id;
                const isMine = comment.author.id === currentUserId;
                const replies = comment.replies?.length ?? 0;
                return (
                  <div
                    key={comment.id}
                    className={cn(
                      "cursor-pointer rounded-[2px] border border-l-2 border-border border-l-highlight bg-paper p-3 transition-[border-color,box-shadow] duration-150",
                      isActive
                        ? "border-primary/40 shadow-paper"
                        : "hover:border-foreground/20",
                      comment.resolved && "border-l-border",
                    )}
                    onClick={() => onCommentClick(comment.id)}
                  >
                    <div className="mb-1.5 flex items-center gap-2">
                      <UserAvatar
                        id={comment.author.id}
                        name={comment.author.name}
                        email={comment.author.email}
                        photoURL={comment.author.avatar}
                        size="sm"
                        decorative
                      />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                        {comment.author.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {new Date(
                          comment.timestamp.createdAt,
                        ).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    <p className="whitespace-pre-wrap pl-8 text-[13px] leading-relaxed text-foreground">
                      {comment.content}
                    </p>

                    <div className="mt-2 flex min-h-7 items-center gap-1 pl-8">
                      {comment.resolved ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <Check className="size-3.5" />
                          Resolved
                        </span>
                      ) : (
                        replies > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {replies} {replies === 1 ? "reply" : "replies"}
                          </span>
                        )
                      )}
                      <div className="ml-auto flex items-center gap-0.5">
                        {!comment.resolved && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onResolve(comment.id);
                            }}
                            aria-label="Resolve comment"
                            title="Resolve"
                            className="text-muted-foreground hover:text-green-600 dark:hover:text-green-400"
                          >
                            <Check />
                          </Button>
                        )}
                        {isMine && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(comment.id);
                            }}
                            aria-label="Delete comment"
                            title="Delete"
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {showResolved && resolvedCount > 0 && (
          <div className="shrink-0 p-3">
            <Button
              variant="ghost"
              className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setShowDeleteResolved(true)}
            >
              Delete all resolved
            </Button>
          </div>
        )}

        {showDeleteResolved && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-lg border border-border bg-popover p-5 shadow-float">
              <h3 className="mb-1.5 font-serif text-base font-medium text-foreground">
                Delete resolved comments?
              </h3>
              <p className="mb-4 text-[13px] text-muted-foreground">
                All resolved comments you wrote will be permanently deleted.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteResolved(false)}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteAllResolved}>
                  Delete all
                </Button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
