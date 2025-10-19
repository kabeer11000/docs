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
import { MessagesSquare } from "lucide-react";
import { showToast } from '@/lib/toast';

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
      try {
        onSubmit(content.trim());
        setContent("");
      } catch (error) {
        // Show error toast if submission fails
        showToast.error("Failed to submit comment. Please try again.");
        console.error("Comment submission error:", error);
      }
    } else if (!content.trim()) {
      // Show error toast if content is empty
      showToast.error("Comment content cannot be empty.");
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
      <DialogContent className="sm:max-w-[425px] bg-background text-left">
        <DialogHeader className="text-left">
          <DialogTitle className="text-lg font-semibold">Add Comment</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          {/* Selected text preview */}
          {selectedText && (
            <div className="text-sm bg-muted p-3 rounded-lg w-full border-l-4 border-primary overflow-hidden">
              <div className="font-medium mb-1">Selected text:</div>
              <div
                className="italic line-clamp-2 overflow-hidden text-ellipsis"
                title={selectedText}
              >
                "{selectedText}"
              </div>
            </div>
          )}
          
          {/* Comment input */}
          <div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write your comment... (Ctrl+Enter to submit)"
              className="min-h-[100px] resize-none"
              autoFocus
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 pt-2">
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
      </DialogContent>
    </Dialog>
  );
};