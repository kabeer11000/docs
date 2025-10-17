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
          "py-3 px-4 group",
          message.role === "user" ? "bg-neutral-200/60 rounded-2xl" : "",
        )}
      >
        <div className="flex gap-4">
          {message.role === "user" && (
            <div className="flex-shrink-0">
              <Avatar className="w-8 h-8 bg-neutral-200">
                <AvatarImage src={userAvatarUrl || "/avatars/avatar-3.png"} />
                <AvatarFallback>{userInitials || "U"}</AvatarFallback>
              </Avatar>
            </div>
          )}
          <div className="flex-1 min-w-0">
            {message.isThinking && message.content === "" ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader size={16} />
                <span>Judging...</span>
              </div>
            ) : (
              <>
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <Response>{message.content}</Response>
                </div>
                {message.role === "assistant" && message.content && (
                  <div className="mt-2 flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCopy}
                      className="h-7 w-7 rounded-md"
                      title="Copy"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    {onInsert && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleInsert}
                        className="h-7 w-7 rounded-md"
                        title="Insert to Document"
                      >
                        {inserted ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <SquareArrowUpLeft className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                    {onRetry && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onRetry}
                        className="h-7 w-7 rounded-md"
                        title="Retry"
                      >
                        <RefreshCw className="w-4 h-4" />
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
                      "flex items-center gap-2 p-3 rounded-lg border text-sm",
                      attachment.hasError
                        ? "bg-red-50 border-red-200 text-red-700"
                        : "bg-muted border-border",
                    )}
                  >
                    <div className="flex-shrink-0">
                      {attachment.hasError ? (
                        <AlertCircle className="w-4 h-4 text-red-500" />
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
                      <div className="text-xs text-muted-foreground">
                        {attachment.size < 1024 * 1024
                          ? `${(attachment.size / 1024).toFixed(1)} KB`
                          : `${(attachment.size / 1024 / 1024).toFixed(1)} MB`}
                        {attachment.isUploading && " • Uploading..."}
                        {attachment.hasError && " • Upload failed"}
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
