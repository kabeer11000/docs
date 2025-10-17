import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface CommentDialogProps {
  isOpen: boolean;
  selectedText: string;
  onClose: () => void;
  onSubmit: (content: string) => void;
  isSubmitting?: boolean;
}

export const CommentDialog: React.FC<CommentDialogProps> = ({
  isOpen,
  selectedText,
  onClose,
  onSubmit,
  isSubmitting = false,
}) => {
  const [content, setContent] = useState("");

  const handleSubmit = () => {
    if (content.trim() && !isSubmitting) {
      onSubmit(content.trim());
      setContent("");
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setContent("");
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Cmd/Ctrl + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !isSubmitting) {
      e.preventDefault();
      handleSubmit();
    }
    // Close on Escape
    if (e.key === "Escape" && !isSubmitting) {
      e.preventDefault();
      handleClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-background">
        <DialogHeader>
          <DialogTitle>Add Comment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Selected text preview */}
          {selectedText && (
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg border-l-4 border-primary">
              <div className="font-medium text-foreground mb-1">
                Selected text:
              </div>
              <div className="italic line-clamp-3">"{selectedText}"</div>
            </div>
          )}

          {/* Comment input */}
          <div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write your comment... (Ctrl+Enter to submit)"
              className="min-h-[120px] resize-none"
              autoFocus
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!content.trim() || isSubmitting}
            >
              {isSubmitting ? "Adding..." : "Add Comment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
