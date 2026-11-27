import { Loader2 } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { cn } from "@/lib/utils";

interface EditableTitleProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  documentId: string;
  isNewDocument?: boolean;
  onTemplateSelect?: (templateContent: string, templateTitle: string) => void;
  canRename?: boolean;
}

interface DocumentTemplate {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: string;
  category: string;
}

export function EditableTitle({
  title,
  onTitleChange,
  documentId,
  isNewDocument = false,
  onTemplateSelect,
  canRename = true,
}: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localTitle, setLocalTitle] = useState(title);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_showTemplates, setShowTemplates] = useState(false);
  const { updateDocument } = useCloudStore();
  const inputRef = useRef<HTMLInputElement>(null);

  // Update local title when prop changes
  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const trimmed = localTitle.trim();

    // Validation
    if (!trimmed) {
      setLocalTitle(title); // Revert to original
      setIsEditing(false);
      return;
    }

    if (trimmed.length > 100) {
      setError("Title too long (max 100 characters)");
      return;
    }

    if (trimmed === title) {
      setIsEditing(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await updateDocument(documentId, { title: trimmed });
      if (success) {
        onTitleChange(trimmed);
        setIsEditing(false);
      } else {
        setError("Failed to update title");
        setLocalTitle(title); // Revert
        setTimeout(() => setIsEditing(false), 2000); // Auto-close after showing error
      }
    } catch (_err) {
      setError("Network error");
      setLocalTitle(title); // Revert
      setTimeout(() => setIsEditing(false), 2000); // Auto-close after showing error
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setLocalTitle(title);
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      e.preventDefault();
      inputRef.current?.blur(); // Trigger save via blur
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const handleBlur = () => {
    if (!isLoading) {
      handleSave();
    }
  };

  if (isEditing || isLoading) {
    return (
      <div className="relative w-full">
        <Input
          ref={inputRef}
          value={localTitle}
          onChange={(e) => {
            setLocalTitle(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={isLoading}
          aria-label="Document title"
          className={cn(
            "h-8 w-full min-w-[12rem] rounded-[10px] bg-card px-2 font-display text-[17px] font-semibold tracking-[-0.02em] focus-visible:border-app focus-visible:ring-app/25",
            error && "border-destructive text-destructive",
            isLoading && "pr-7 opacity-60",
          )}
          placeholder="Untitled document"
          maxLength={100}
        />
        {isLoading && (
          <Loader2 className="absolute right-2 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {error && (
          <p className="absolute left-0 top-full mt-1 whitespace-nowrap text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <Tooltip delayDuration={600}>
      <TooltipTrigger asChild>
        <button
          type="button"
          disabled={!canRename}
          onClick={() => canRename && setIsEditing(true)}
          aria-label={canRename ? `Rename document: ${title}` : title}
          className={cn(
            "flex h-8 w-full min-w-0 items-center rounded-[10px] border border-transparent px-2 text-left transition-colors duration-150 disabled:opacity-100",
            canRename ? "cursor-text hover:bg-accent" : "cursor-default",
          )}
        >
          <span className="truncate font-display text-[17px] font-semibold tracking-[-0.02em] text-foreground">
            {title || "Untitled document"}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {canRename ? "Rename" : `${title} (read-only)`}
      </TooltipContent>
    </Tooltip>
  );
}
