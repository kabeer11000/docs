import { useStore } from "@nanostores/react";
import { File, MessageSquare, Search, Upload, X } from "lucide-react";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChats } from "@/hooks/use-chats";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { useDebounce } from "@/hooks/use-debounce";
import { API_CONFIG } from "@/lib/api-config";
import { $uploadedFiles, aiChatActions } from "@/state/ai-chat";

export interface AIPanelProps {
  isLoading?: boolean;
  hasConversations?: boolean;
  chatId?: string | number;
}

const ConversationSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="flex items-start gap-3 p-3">
        <div className="w-4 h-4 bg-muted animate-pulse rounded flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
          <div className="h-3 bg-muted animate-pulse rounded w-1/3" />
        </div>
      </div>
    ))}
  </div>
);

const EmptyConversations = ({ onCreateChat }: { onCreateChat: () => void }) => (
  <div className="text-center py-8 px-4">
    <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
    <p className="text-sm text-muted-foreground mb-1">No conversations yet</p>
    <p className="text-xs text-muted-foreground/75 mb-4">
      Start a new chat to see it here
    </p>
    <Button
      onClick={onCreateChat}
      size="sm"
      variant="outline"
      className="text-xs"
    >
      <MessageSquare className="w-3 h-3 mr-2" />
      New Chat
    </Button>
  </div>
);

export const AIPanel = ({ chatId }: AIPanelProps) => {
  const uploadedFiles = useStore($uploadedFiles);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredChats, setFilteredChats] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Use real chat data from CloudStore
  const { chats, isLoading, hasChats } = useChats();
  const { createChat } = useCloudStore();

  const formatFileSize = useCallback((bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(0)} KB` : `${mb.toFixed(1)} MB`;
  }, []);

  const formatUploadTime = useCallback((date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }, []);

  const handleFileUpload = useCallback(
    async (files: FileList | File[]) => {
      if (!API_CONFIG.FEATURES.FILE_UPLOAD_ENABLED) {
        alert("File upload is currently disabled");
        return;
      }

      if (!chatId) {
        alert("Chat ID is required for file upload");
        return;
      }

      const MAX_FILE_SIZE = 10 * 1024 * 1024;
      const ALLOWED_TYPES = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "text/markdown",
        "image/jpeg",
        "image/png",
      ];

      const fileArray = Array.from(files);

      for (const file of fileArray) {
        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          alert(`File "${file.name}" is too large. Maximum size is 10MB.`);
          continue;
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
          alert(
            `File type not supported: "${file.name}". Please upload PDF, DOC, DOCX, TXT, MD, JPG, or PNG files.`,
          );
          continue;
        }

        // Add temp file with loading state
        const tempFileId = nanoid();
        const tempFile = {
          id: tempFileId,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date(),
          url: "uploading...",
        };
        aiChatActions.addUploadedFile(tempFile);

        const formData = new FormData();
        formData.append("file", file);

        try {
          const response = await fetch(
            `${API_CONFIG.AI.BASE_URL}${API_CONFIG.AI.ENDPOINTS.UPLOAD}`,
            {
              method: "POST",
              body: formData,
            },
          );

          if (response.ok) {
            const result = await response.json();

            // Backend returns s3_url, not file_url
            const fileUrl = result.s3_url || result.file_url || result.url;

            if (fileUrl) {
              // Replace temp file with actual uploaded file
              aiChatActions.removeUploadedFile(tempFileId);
              const uploadedFile = {
                id: result.file_id || nanoid(),
                name: file.name,
                size: file.size,
                type: file.type,
                uploadedAt: new Date(),
                url: fileUrl,
              };
              aiChatActions.addUploadedFile(uploadedFile);
            } else {
              aiChatActions.removeUploadedFile(tempFileId);
              alert(
                `Failed to upload "${file.name}": No file URL returned from server`,
              );
            }
          } else {
            aiChatActions.removeUploadedFile(tempFileId);
            alert(
              `Failed to upload "${file.name}": ${response.status} ${response.statusText}`,
            );
          }
        } catch (error) {
          aiChatActions.removeUploadedFile(tempFileId);
          alert(
            `Error uploading "${file.name}": ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }
    },
    [chatId],
  );

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileUpload(files);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleFileUpload],
  );

  // Debounced search function
  const performSearch = useCallback(
    (query: string) => {
      if (!query.trim()) {
        setFilteredChats(chats);
        return;
      }

      const filtered = chats.filter((chat) => {
        const searchTerm = query.toLowerCase();
        return (
          chat.title.toLowerCase().includes(searchTerm) ||
          chat.preview.toLowerCase().includes(searchTerm) ||
          chat.tags.some((tag) => tag.toLowerCase().includes(searchTerm))
        );
      });

      setFilteredChats(filtered);
      setSelectedIndex(0);
    },
    [chats],
  );

  const debouncedSearch = useDebounce(performSearch, 300);

  const handleCreateChat = useCallback(async () => {
    const newChatId = await createChat();
    if (newChatId) {
      // Use proper navigation instead of hard reload
      window.location.href = `/chat/${newChatId}`;
    }
  }, [createChat]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchQuery(value);
      debouncedSearch(value);
    },
    [debouncedSearch],
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        !searchInputRef.current ||
        document.activeElement !== searchInputRef.current
      ) {
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          Math.min(prev + 1, filteredChats.length - 1),
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredChats[selectedIndex]) {
          window.location.href = `/chat/${filteredChats[selectedIndex].id}`;
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setSearchQuery("");
        setFilteredChats(chats);
        searchInputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [filteredChats, selectedIndex, chats]);

  // Reset selected index when filtered chats change
  useEffect(() => {
    setSelectedIndex(0);
  }, []);

  // Update filtered chats when chats data changes
  useEffect(() => {
    if (!searchQuery) {
      setFilteredChats(chats);
    } else {
      performSearch(searchQuery);
    }
  }, [chats, searchQuery, performSearch]);

  return (
    <div className="w-80 h-full bg-background/95 backdrop-blur-sm flex flex-col rounded-tl-lg">
      {/* Header */}
      <div className="border-b bg-muted/30 py-2 px-2 rounded-tl-lg flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search conversations..."
              className="pl-9 h-8 text-sm bg-background/80"
              aria-label="Search conversations"
            />
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="w-8 h-8 hover:bg-background/80"
            aria-label="New Chat"
            onClick={handleCreateChat}
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Conversations Section */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="px-4 py-3 border-b bg-muted/20 flex-shrink-0">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Recent Conversations
          </h3>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-2">
            {isLoading ? (
              <ConversationSkeleton />
            ) : !hasChats ? (
              <EmptyConversations onCreateChat={handleCreateChat} />
            ) : filteredChats.length === 0 && searchQuery ? (
              <div className="text-center py-8 px-4">
                <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-1">
                  No conversations found
                </p>
                <p className="text-xs text-muted-foreground/75">
                  Try searching with different keywords
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredChats.map((chat, index) => {
                  const isActive = chatId === chat.id;
                  const timeAgo =
                    new Date(chat.updatedAt).toLocaleDateString() ===
                    new Date().toLocaleDateString()
                      ? new Date(chat.updatedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : new Date(chat.updatedAt).toLocaleDateString();

                  return (
                    <a
                      key={chat.id}
                      href={`/chat/${chat.id}`}
                      className={`block p-3 rounded-md hover:bg-secondary/50 transition-colors ${
                        isActive ? "bg-secondary" : ""
                      } ${
                        selectedIndex === index &&
                        typeof window !== "undefined" &&
                        document.activeElement === searchInputRef.current
                          ? "bg-accent"
                          : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate mb-1">
                            {chat.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate leading-relaxed mb-1">
                            {chat.preview}
                          </p>
                          <p className="text-xs text-muted-foreground/70">
                            {timeAgo}
                          </p>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sources Section */}
      <div className="hidden border-t bg-muted/10">
        <div className="px-4 py-3 border-b bg-muted/20">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Sources
          </h3>
        </div>
        <div className="h-80">
          <div className="p-3 space-y-4">
            {/* Upload Area - More compact */}
            <div
              className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 text-center hover:border-primary/50 hover:bg-muted/20 transition-all duration-200 cursor-pointer group"
              tabIndex={0}
              role="button"
              aria-label="Upload files"
              onClick={handleUploadClick}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleUploadClick();
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileInputChange}
                accept=".pdf,.doc,.docx,.txt,.md,.csv,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
              />
              <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2 group-hover:text-primary transition-colors" />
              <p className="text-sm font-medium text-foreground mb-0.5">
                Drop files here
              </p>
              <p className="text-xs text-muted-foreground">
                or click to browse
              </p>
            </div>

            {/* File List - Better spacing */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Uploaded Files
              </h4>
              {uploadedFiles.length === 0 ? (
                <div className="text-center py-6">
                  <File className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">
                    No files uploaded yet
                  </p>
                  <p className="text-xs text-muted-foreground/75">
                    Drop files above to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors border"
                    >
                      <File className="w-4 h-4 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)} •{" "}
                          {formatUploadTime(file.uploadedAt)}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-6 h-6 hover:bg-destructive/20 hover:text-destructive transition-colors"
                        aria-label={`Remove ${file.name}`}
                        onClick={() =>
                          aiChatActions.removeUploadedFile(file.id)
                        }
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
