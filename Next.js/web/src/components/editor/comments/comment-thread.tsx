import type { IComment } from "@shared-types";
import {
  Check,
  Edit2,
  MessageSquare,
  MoreHorizontal,
  Reply,
  Trash2,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface CommentThreadProps {
  comment: IComment;
  position: { x: number; y: number };
  isActive?: boolean;
  onResolve: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onEdit: (commentId: string, content: string) => void;
  onReply: (commentId: string, content: string) => void;
  onClose: () => void;
  currentUserId: string;
}

export const CommentThread: React.FC<CommentThreadProps> = ({
  comment,
  position,
  isActive = false,
  onResolve,
  onDelete,
  onEdit,
  onReply,
  onClose,
  currentUserId,
}) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isReplying && replyTextareaRef.current) {
      replyTextareaRef.current.focus();
    }
  }, [isReplying]);

  useEffect(() => {
    if (editingCommentId && editTextareaRef.current) {
      editTextareaRef.current.focus();
    }
  }, [editingCommentId]);

  const handleReply = () => {
    if (replyContent.trim()) {
      onReply(comment.id, replyContent.trim());
      setReplyContent("");
      setIsReplying(false);
    }
  };

  const handleEdit = (id: string, content: string) => {
    if (content.trim()) {
      onEdit(id, content.trim());
      setEditingCommentId(null);
      setEditContent("");
    }
  };

  const startEdit = (id: string, currentContent: string) => {
    setEditingCommentId(id);
    setEditContent(currentContent);
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setEditContent("");
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div
      className={cn(
        "fixed z-50 w-80 bg-white border border-gray-200 rounded-lg shadow-lg",
        "transition-all duration-200 ease-in-out",
        isActive ? "shadow-xl border-blue-300" : "shadow-lg",
        comment.resolved && "opacity-75",
      )}
      style={{
        left: position.x,
        top: position.y,
        maxHeight: "400px",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-700">
            {comment.resolved ? "Resolved" : "Comment"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!comment.resolved && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onResolve(comment.id)}
              className="h-6 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <Check className="w-3 h-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 px-2 text-gray-500 hover:text-gray-700"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Main Comment */}
      <div className="p-3 space-y-3">
        <div className="flex items-start gap-2">
          <Avatar className="w-6 h-6">
            <AvatarImage src={comment.author.avatar} />
            <AvatarFallback className="text-xs">
              {getUserInitials(comment.author.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">
                {comment.author.name}
              </span>
              <span className="text-xs text-gray-500">
                {formatTimestamp(comment.timestamp.createdAt)}
              </span>

              {comment.author.id === currentUserId && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                      <MoreHorizontal className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-32">
                    <DropdownMenuItem
                      onClick={() => startEdit(comment.id, comment.content)}
                    >
                      <Edit2 className="w-3 h-3 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(comment.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-3 h-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {editingCommentId === comment.id ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  ref={editTextareaRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[60px] text-sm resize-none"
                  placeholder="Edit your comment..."
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleEdit(comment.id, editContent)}
                    disabled={!editContent.trim()}
                  >
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-1 text-sm text-gray-700 leading-relaxed">
                {comment.content}
              </div>
            )}
          </div>
        </div>

        {/* Suggestions */}
        {comment.suggestions && comment.suggestions.length > 0 && (
          <div className="mt-3 p-2 bg-blue-50 rounded border-l-4 border-blue-200">
            <div className="text-xs font-medium text-blue-800 mb-1">
              Suggested Changes:
            </div>
            {comment.suggestions.map((suggestion) => (
              <div key={suggestion.id} className="text-xs text-blue-700">
                <span className="line-through">{suggestion.originalText}</span>
                {" → "}
                <span className="font-medium">{suggestion.suggestedText}</span>
              </div>
            ))}
          </div>
        )}

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-2 border-l-2 border-gray-100 pl-3 ml-3">
            {comment.replies.map((reply) => (
              <div key={reply.id} className="flex items-start gap-2">
                <Avatar className="w-5 h-5">
                  <AvatarImage src={reply.author.avatar} />
                  <AvatarFallback className="text-xs">
                    {getUserInitials(reply.author.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-900">
                      {reply.author.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(reply.timestamp.createdAt)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-700 mt-1">
                    {reply.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reply Input */}
        {!comment.resolved && (
          <div className="pt-2 border-t border-gray-100">
            {isReplying ? (
              <div className="space-y-2">
                <Textarea
                  ref={replyTextareaRef}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="min-h-[60px] text-sm resize-none"
                  placeholder="Write a reply..."
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleReply}
                    disabled={!replyContent.trim()}
                  >
                    Reply
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsReplying(false);
                      setReplyContent("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReplying(true)}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <Reply className="w-3 h-3 mr-1" />
                Reply
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
