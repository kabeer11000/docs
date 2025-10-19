import { Briefcase, Clock, Edit3, FileCheck, Loader2 } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
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
      <div className="w-full md:px-2 md:mt-0 mt-1">
        <div className="relative w-full h-6 md:h-auto">
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
            className={cn(
              "h-full text-sm font-semibold border-none border-input bg-background md:px-3 md:py-1 rounded-none w-full",
              "focus:ring-0 focus-visible:ring-0 focus-visible:outline-none focus:border-none",
              "focus:bg-background focus:border-none transition-all duration-150",
              "placeholder:text-muted-foreground/70 truncate",
              error && "text-destructive bg-destructive/10 border-destructive",
              isLoading && "opacity-60",
            )}
            placeholder="Enter document title..."
            maxLength={100}
          />
          {isLoading && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <p className="text-xs text-destructive absolute top-full left-0 mt-1 whitespace-nowrap">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full md:px-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex items-center sm:gap-x-2 md:gap-2 md:px-3 md:py-1 rounded-md transition-all duration-200 w-full md:h-8 pt-1",
                "bg-transparent border border-transparent",
                (canRename) &&
                  "hover:bg-accent hover:border-border cursor-pointer group",
                !(canRename) && "cursor-default",
              )}
              onClick={() => canRename && setIsEditing(true)}
            >
              <h2 className="text-sm font-semibold truncate flex-1 text-foreground">
                {title}
              </h2>
              {canRename && (
                <Edit3 className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-200 flex-shrink-0" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {canRename ? title : `${title} (read-only)`}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
