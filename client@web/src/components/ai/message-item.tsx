"use client";
import {
  AlertCircle,
  Check,
  Copy,
  RefreshCw,
  SquareArrowUpLeft,
} from "lucide-react";
import { memo, useState } from "react";
import { PiFile, PiFileImage, PiFilePdf, PiFileText } from "react-icons/pi";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/shadcn-io/ai/loader";
import { Response } from "@/components/ui/shadcn-io/ai/response";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ui/shadcn-io/ai/source";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/state/ai-chat";

interface MessageItemProps {
  message: ChatMessage;
  userAvatarUrl?: string;
  userInitials?: string;
  onRetry?: () => void;
  onInsert?: (content: string) => void;
}

// Helper function to get the appropriate Phosphor icon for file type
const getFileIcon = (fileType: string) => {
  if (fileType.startsWith("image/")) {
    return PiFileImage;
  }
  if (fileType === "application/pdf") {
    return PiFilePdf;
  }
  if (fileType.includes("word") || fileType.includes("document")) {
    return PiFileText;
  }
  if (
    fileType.includes("text") ||
    fileType === "text/plain" ||
    fileType === "text/markdown"
  ) {
    return PiFileText;
  }
  return PiFile; // Default icon for other file types
};

export const MessageItem = memo<MessageItemProps>(
  ({ message, userAvatarUrl, userInitials, onRetry, onInsert }) => {
    const [copied, setCopied] = useState(false);
    const [inserted, setInserted] = useState(false);

    const handleCopy = async () => {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    const handleInsert = () => {
      if (onInsert) {
        onInsert(message.content);
        setInserted(true);
        setTimeout(() => setInserted(false), 2000);
      }
    };

    return (
      <div
        className={cn(
          "group my-2 px-3 py-2.5 text-sm leading-relaxed text-foreground",
          message.role === "user" ? "rounded-lg bg-accent" : "",
        )}
      >
        <div className="flex gap-3">
          {message.role === "user" && (
            <div className="flex-shrink-0">
              <Avatar className="size-6 bg-muted">
                <AvatarImage src={userAvatarUrl || "/avatars/avatar-3.png"} />
                <AvatarFallback className="text-[10px]">
                  {userInitials || "U"}
                </AvatarFallback>
              </Avatar>
            </div>
          )}
          <div className="flex-1 min-w-0">
            {message.isThinking && message.content === "" ? (
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <Loader size={14} />
                <span>Thinking...</span>
              </div>
            ) : (
              <>
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <Response>{message.content}</Response>
                </div>
                {message.role === "assistant" && message.content && (
                  <div className="mt-1.5 -ml-1.5 flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCopy}
                      className="size-7 text-muted-foreground hover:text-foreground"
                      title="Copy"
                      aria-label="Copy"
                    >
                      {copied ? (
                        <Check className="size-3.5 text-green-600 dark:text-green-400" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </Button>
                    {onInsert && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleInsert}
                        className="size-7 text-muted-foreground hover:text-foreground"
                        title="Insert to Document"
                        aria-label="Insert to Document"
                      >
                        {inserted ? (
                          <Check className="size-3.5 text-green-600 dark:text-green-400" />
                        ) : (
                          <SquareArrowUpLeft className="size-3.5" />
                        )}
                      </Button>
                    )}
                    {onRetry && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onRetry}
                        className="size-7 text-muted-foreground hover:text-foreground"
                        title="Retry"
                        aria-label="Retry"
                      >
                        <RefreshCw className="size-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-3">
                {message.attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-2.5 py-2 text-[13px]",
                      attachment.hasError
                        ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
                        : "border-border bg-background",
                    )}
                  >
                    <div className="flex-shrink-0">
                      {attachment.hasError ? (
                        <AlertCircle className="size-4" />
                      ) : attachment.isUploading ? (
                        <Loader size={16} />
                      ) : (
                        (() => {
                          const FileIcon = getFileIcon(attachment.type);
                          return (
                            <FileIcon
                              className="w-4 h-4 text-muted-foreground"
                              size={16}
                            />
                          );
                        })()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">
                        {attachment.name}
                      </div>
                      <div className="text-xs opacity-70">
                        {attachment.hasError
                          ? "Upload failed"
                          : attachment.isUploading
                            ? "Uploading..."
                            : attachment.size < 1024 * 1024
                              ? `${(attachment.size / 1024).toFixed(1)} KB`
                              : `${(attachment.size / 1024 / 1024).toFixed(1)} MB`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sources */}
            {message.sources && message.sources.length > 0 && (
              <div className="mt-4">
                <Sources>
                  <SourcesTrigger count={message.sources.length} />
                  <SourcesContent>
                    {message.sources.map((source, index) => (
                      <Source
                        key={index}
                        href={source.url}
                        title={source.title}
                      />
                    ))}
                  </SourcesContent>
                </Sources>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function to prevent unnecessary re-renders
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.content === nextProps.message.content &&
      prevProps.message.isThinking === nextProps.message.isThinking &&
      prevProps.message.sources?.length === nextProps.message.sources?.length &&
      prevProps.message.attachments?.length ===
        nextProps.message.attachments?.length &&
      JSON.stringify(prevProps.message.attachments) ===
        JSON.stringify(nextProps.message.attachments) &&
      prevProps.userAvatarUrl === nextProps.userAvatarUrl &&
      prevProps.userInitials === nextProps.userInitials
    );
  },
);

MessageItem.displayName = "MessageItem";
