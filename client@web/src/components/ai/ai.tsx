"use client";
import { useStore } from "@nanostores/react";
import {
  Building,
  File,
  Mic,
  Paperclip,
  Scale,
  Shield,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import {
  type FormEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ui/shadcn-io/ai/prompt-input";
import { Skeleton } from "@/components/ui/skeleton";
import { VoiceDialog } from "@/components/voice/voice-dialog";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { AIAdapter } from "@/lib/ai/ai-adapter";
import { API_CONFIG } from "@/lib/api-config";
import { cn } from "@/lib/utils";
import {
  $inputValue,
  $isStreaming,
  $isTyping,
  $messages,
  $uploadedFiles,
  aiChatActions,
  type ChatMessage,
  type UploadedFile,
} from "@/state/ai-chat";
import { $auth, getUserInitials } from "@/state/auth";
import { MessageItem } from "./message-item";

const transformSources = (sources: string[] | undefined) => {
  if (!sources?.length) return undefined;
  return sources.map((source) => ({ title: source, url: `#${source}` }));
};

// Simple hash with better distribution - still possible collisions but much lower
const hashString = (str: string): string => {
  let hash1 = 5381;
  let hash2 = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash1 = (hash1 << 5) + hash1 + char; // hash1 * 33 + char
    hash2 = char + (hash2 << 6) + (hash2 << 16) - hash2;
  }

  // Combine both hashes for better distribution
  const combined = Math.abs(hash1) + Math.abs(hash2);
  return combined.toString(16);
};

const hex2dec = (hex: string): number => {
  return parseInt(hex, 16);
};

// Loading skeleton for messages
const _MessagesSkeleton = () => (
  <div className="max-w-3xl mx-auto px-4 py-4 pb-2 space-y-6 animate-in fade-in duration-300">
    {[1, 2, 3].map((i) => (
      <div key={i} className="space-y-4">
        {/* User message skeleton */}
        <div className="flex justify-end">
          <div className="max-w-xs lg:max-w-md">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </div>
        {/* AI message skeleton */}
        <div className="flex justify-start">
          <div className="max-w-xs lg:max-w-md w-full">
            <Skeleton className="h-4 w-16 mb-2" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const AI = ({ id: chatId }: { id: string | number | undefined }) => {
  const router = useRouter();
  const messages = useStore($messages);
  const inputValue = useStore($inputValue);
  const isTyping = useStore($isTyping);
  const isStreaming = useStore($isStreaming);
  const uploadedFiles = useStore($uploadedFiles);
  const { user: currentUser } = useStore($auth);
  const userInitials = getUserInitials(currentUser) ?? undefined;
  const userAvatarUrl = currentUser?.photoURL ?? undefined;
  const [adapter, setAdapter] = useState<AIAdapter | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentAssistantMessageId, setCurrentAssistantMessageId] = useState<
    string | null
  >(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [_dragCounter, setDragCounter] = useState(0);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [previousMessages, setPreviousMessages] = useState<any[]>([]);
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const [actualChatId, setActualChatId] = useState<string | undefined>(
    typeof chatId === "string" ? chatId : undefined,
  );
  const { updateChat, getChat, createChat } = useCloudStore();

  // Sync actualChatId with chatId prop changes
  useEffect(() => {
    if (typeof chatId === "string") {
      setActualChatId(chatId);
    }
  }, [chatId]);

  // Initialize AI WebSocket connection and load chat data
  useEffect(() => {
    let adapterInstance: AIAdapter | null = null;
    let mounted = true;

    const initializeAdapter = async () => {
      try {
        // Store current messages before doing anything to prevent flash
        const currentMessages = $messages.get();

        // Only set loading if we're switching from an existing chat
        if (currentMessages.length > 0) {
          setIsLoadingChat(true);
          setPreviousMessages(currentMessages);
        }

        // Load chat data
        let newMessages: any[] = [];

        // Only load/create chat if chatId exists
        if (chatId && typeof chatId === "string" && currentUser) {
          const chat = await getChat(chatId);

          if (!chat) {
            // Chat doesn't exist, create it with the specific ID
            await createChat(chatId);
            newMessages = []; // New chat has no messages
          } else {
            // Load existing messages if any
            if (chat.messages && chat.messages.length > 0) {
              // Convert stored messages to ChatMessage format
              newMessages = chat.messages.map((msg) => ({
                ...msg,
                timestamp: new Date(msg.timestamp),
              }));
            }
          }
        } else if (!chatId) {
          // No chatId means this is a new chat - reset to empty state
          newMessages = [];
        }

        // Update messages immediately - no delays
        aiChatActions.resetChat();
        newMessages.forEach((message) => {
          aiChatActions.addMessage(message);
        });

        // Clear loading state
        setIsLoadingChat(false);
        setPreviousMessages([]);

        // TODO: Use real user ID when API is ready - for now using hash-based numeric ID
        const userIdString = currentUser?.id || "anonymous";
        const userId = hex2dec(hashString(userIdString));

        if (!mounted) return;

        // Only connect adapter if we have a chatId
        if (chatId) {
          adapterInstance = new AIAdapter(userId, chatId);
          await adapterInstance.connect();

          if (mounted) {
            setAdapter(adapterInstance);
          } else {
            adapterInstance.disconnect();
          }
        }
      } catch (_error) {
        if (mounted) {
          aiChatActions.setIsTyping(false);
          aiChatActions.setIsStreaming(false);
          setIsLoadingChat(false);
        }
      }
    };

    initializeAdapter();

    return () => {
      mounted = false;
      if (adapterInstance) {
        adapterInstance.disconnect();
      }
      setAdapter(null);
    };
  }, [chatId, currentUser, createChat, getChat]);

  // Set up event listeners when adapter changes
  useEffect(() => {
    if (!adapter) return;

    const handleStreamDelta = ({ id, content }: any) => {
      const messageId = currentAssistantMessageId || id;
      if (messageId) {
        aiChatActions.updateMessage(messageId, {
          content: content,
          isThinking: false,
        });
      }
    };

    const handleMessage = ({ id, content, data }: any) => {
      const messageId = currentAssistantMessageId || id;
      if (messageId) {
        const finalContent = content?.endsWith("```")
          ? content.slice(0, -3)
          : content;

        aiChatActions.updateMessage(messageId, {
          content: finalContent,
          isThinking: false,
          sources: data?.first_doc?.sources
            ? transformSources(data.first_doc.sources)
            : undefined,
        });

        // Save updated messages to CloudStore when assistant response is complete
        const saveUpdatedMessages = async () => {
          if (!actualChatId || typeof actualChatId !== "string") return;

          try {
            const allMessages = $messages.get();
            const messagesToSave = allMessages.map((msg) => ({
              id: msg.id,
              content: msg.content,
              role: msg.role,
              timestamp: msg.timestamp.toISOString(),
              ...(msg.attachments && msg.attachments.length > 0
                ? { attachments: msg.attachments }
                : {}),
            }));

            await updateChat(actualChatId, {
              messages: messagesToSave,
              lastMessageAt: new Date().toISOString(),
            });
          } catch (_error) {
            // Silent fail
          }
        };

        saveUpdatedMessages();
      }

      // Reset streaming states
      aiChatActions.setIsTyping(false);
      aiChatActions.setIsStreaming(false);
      setCurrentAssistantMessageId(null);
    };

    adapter.addEventListener("onstreamdelta", handleStreamDelta);
    adapter.addEventListener("onmessage", handleMessage);

    return () => {
      adapter.removeEventListener("onstreamdelta", handleStreamDelta);
      adapter.removeEventListener("onmessage", handleMessage);
    };
  }, [adapter, currentAssistantMessageId, actualChatId, updateChat]);

  // Update chat title and preview when messages change
  const updateChatMetadata = useCallback(
    async (userMessage: string) => {
      if (!actualChatId || typeof actualChatId !== "string") return;

      try {
        // Extract first 3 words for title, limit preview
        const words = userMessage.trim().split(/\s+/);
        const title =
          words.length <= 3
            ? userMessage.trim()
            : `${words.slice(0, 3).join(" ")}...`;
        const preview =
          userMessage.slice(0, 120) + (userMessage.length > 120 ? "..." : "");

        await updateChat(actualChatId, {
          title,
          preview,
          lastMessageAt: new Date().toISOString(),
        });
      } catch (_error) {
        // Silent fail
      }
    },
    [actualChatId, updateChat],
  );

  const sendMessage = useCallback(
    async (messageContent: string, skipUserMessage = false) => {
      if (!API_CONFIG.FEATURES.AI_CHAT_ENABLED || isStreaming || isTyping) {
        return;
      }

      if (!messageContent.trim()) return;

      // If no chatId exists, create one and redirect
      let currentChatId = actualChatId;
      if (!currentChatId) {
        const newChatId = nanoid();
        currentChatId = newChatId;
        setActualChatId(newChatId);

        try {
          // Create the chat in CloudStore
          await createChat(newChatId);

          // Initialize adapter for the new chat
          const userIdString = currentUser?.id || "anonymous";
          const userId = hex2dec(hashString(userIdString));
          const newAdapter = new AIAdapter(userId, newChatId);
          await newAdapter.connect();
          setAdapter(newAdapter);

          // Redirect to the new chat URL
          router.push(`/chat/${newChatId}`);
        } catch (error) {
          console.error("Failed to create new chat:", error);
          return;
        }
      }

      if (!adapter) {
        return;
      }

      // Get uploaded files to send with message
      const currentUploadedFiles = $uploadedFiles.get();
      const fileIds = currentUploadedFiles.map((f) => f.id).filter(Boolean);
      console.log("=== SEND MESSAGE DEBUG ===");
      console.log("Message:", messageContent);
      console.log("Uploaded files:", currentUploadedFiles);
      console.log("File IDs to send:", fileIds);
      console.log(
        "Will send file_id:",
        fileIds.length > 0 ? fileIds[0] : "none",
      );

      // Convert uploaded files to attachments for display
      const attachments = currentUploadedFiles.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
      }));

      let userMessage: ChatMessage | null = null;

      // Create user message only if not skipping
      if (!skipUserMessage) {
        userMessage = {
          id: nanoid(),
          content: messageContent,
          role: "user",
          timestamp: new Date(),
          attachments: attachments.length > 0 ? attachments : undefined,
        };
        aiChatActions.addMessage(userMessage);
      }

      // Create assistant message placeholder
      const assistantMessageId = nanoid();
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        content: "",
        role: "assistant",
        timestamp: new Date(),
        isThinking: true,
      };

      // Update state
      aiChatActions.addMessage(assistantMessage);
      aiChatActions.setInputValue("");
      aiChatActions.setIsTyping(true);
      setCurrentAssistantMessageId(assistantMessageId);

      // Update chat metadata if this is the first message or we want to update the preview
      const currentMessages = $messages.get();
      if (currentMessages.length <= 2) {
        // First exchange
        updateChatMetadata(messageContent);
      }

      // Save messages to CloudStore
      const saveMessagesToChat = async () => {
        if (!currentChatId || typeof currentChatId !== "string") return;

        try {
          const allMessages = userMessage
            ? [...currentMessages, userMessage, assistantMessage]
            : [...currentMessages, assistantMessage];
          const messagesToSave = allMessages.map((msg) => ({
            id: msg.id,
            content: msg.content,
            role: msg.role,
            timestamp: msg.timestamp.toISOString(),
            ...(msg.attachments && msg.attachments.length > 0
              ? { attachments: msg.attachments }
              : {}),
          }));

          await updateChat(currentChatId, {
            messages: messagesToSave,
            lastMessageAt: new Date().toISOString(),
          });
        } catch (_error) {
          // Silent fail
        }
      };

      saveMessagesToChat();

      try {
        // Send message with file IDs if any files are uploaded
        await adapter.message({
          id: assistantMessageId,
          content: messageContent,
          fileIds: fileIds.length > 0 ? fileIds : undefined,
        });
        aiChatActions.setIsStreaming(true);

        // Clear uploaded files after sending (they're now associated with this message)
        if (fileIds.length > 0) {
          fileIds.forEach((fileId) => aiChatActions.removeUploadedFile(fileId));
        }
      } catch (_error) {
        // Reset states and show error
        aiChatActions.updateMessage(assistantMessageId, {
          content: "Sorry, I encountered an error. Please try again.",
          isThinking: false,
        });
        aiChatActions.setIsTyping(false);
        aiChatActions.setIsStreaming(false);
        setCurrentAssistantMessageId(null);
      }
    },
    [
      isTyping,
      isStreaming,
      adapter,
      actualChatId,
      updateChatMetadata,
      updateChat,
      currentUser,
      router,
      createChat,
    ],
  );

  const handleSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    async (event) => {
      event.preventDefault();
      const messageContent = inputValue.trim();
      if (messageContent) {
        await sendMessage(messageContent);
        aiChatActions.setInputValue("");
      }
    },
    [inputValue, sendMessage],
  );

  const handleRetry = useCallback(
    (messageIndex: number) => {
      // Find the user message before this assistant message
      const userMessage = messages[messageIndex - 1];
      if (userMessage && userMessage.role === "user") {
        // Remove the assistant message that we're retrying
        const messagesToKeep = messages.slice(0, messageIndex);
        aiChatActions.resetChat();
        messagesToKeep.forEach((msg) => aiChatActions.addMessage(msg));
        // Send message without adding a new user message (skip duplicate)
        sendMessage(userMessage.content, true);
      }
    },
    [messages, sendMessage],
  );

  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    if (!API_CONFIG.FEATURES.FILE_UPLOAD_ENABLED) {
      alert("File upload is currently disabled");
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

    for (const file of Array.from(files)) {
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

      // Add file to uploaded files with loading state
      const tempFileId = nanoid();
      const tempFile: UploadedFile = {
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
          console.log("Upload response:", result);

          // Backend returns s3_url, not file_url
          const fileUrl = result.s3_url || result.file_url || result.url;
          const fileId = result.file_id;

          console.log("Extracted file_id:", fileId);
          console.log("Extracted file URL:", fileUrl);

          if (!fileId) {
            aiChatActions.removeUploadedFile(tempFileId);
            alert(
              `Failed to upload "${file.name}": No file_id returned from server. Response: ${JSON.stringify(result)}`,
            );
            return;
          }

          if (fileUrl) {
            // Update temp file with actual URL
            aiChatActions.removeUploadedFile(tempFileId);
            const uploadedFile: UploadedFile = {
              id: fileId, // Use the file_id from backend (critical!)
              name: file.name,
              size: file.size,
              type: file.type,
              uploadedAt: new Date(),
              url: fileUrl,
            };
            aiChatActions.addUploadedFile(uploadedFile);
            console.log("File uploaded successfully with ID:", fileId);
          } else {
            // Remove temp file if no URL returned
            aiChatActions.removeUploadedFile(tempFileId);
            alert(
              `Failed to upload "${file.name}": No file URL returned from server`,
            );
          }
        } else {
          // Remove temp file on error
          aiChatActions.removeUploadedFile(tempFileId);
          alert(
            `Failed to upload "${file.name}": ${response.status} ${response.statusText}`,
          );
        }
      } catch (error) {
        // Remove temp file on error
        aiChatActions.removeUploadedFile(tempFileId);
        alert(
          `Error uploading "${file.name}": ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => prev + 1);

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setIsDragOver(false);
      }
      return newCount;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      setIsDragOver(false);
      setDragCounter(0);

      const { files } = e.dataTransfer;
      if (files && files.length > 0) {
        handleFileUpload(files);
      }
    },
    [handleFileUpload],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { files } = e.target;
      if (files && files.length > 0) {
        handleFileUpload(files);
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [handleFileUpload],
  );

  const handleAttachmentClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div
      className={cn(
        "h-screen flex flex-col bg-background relative overflow-hidden",
        isDragOver && "bg-blue-50 border-2 border-dashed border-blue-300",
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-50/90 backdrop-blur-sm">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Drop files to upload
            </h3>
            <p className="text-blue-700 text-sm">
              Release to upload files to the chat
            </p>
          </div>
        </div>
      )}

      {/* Messages Area - flex-1 to take remaining space, with proper scrolling */}
      <ScrollArea className="flex-1 h-0">
        <div className="max-w-3xl mx-auto px-4 py-4 pb-32 min-h-full">
          {isLoadingChat && previousMessages.length > 0 ? (
            // Show previous messages with fade while loading new chat
            <div className="opacity-30 transition-opacity duration-200">
              {previousMessages.map((message) => (
                <MessageItem
                  key={message.id}
                  message={message}
                  userAvatarUrl={userAvatarUrl}
                  userInitials={userInitials}
                />
              ))}
            </div>
          ) : messages.length > 0 ? (
            // Messages list
            <div className="transition-opacity duration-200">
              {messages.map((message, index) => (
                <MessageItem
                  key={message.id}
                  message={message}
                  userAvatarUrl={userAvatarUrl}
                  userInitials={userInitials}
                  onRetry={
                    message.role === "assistant"
                      ? () => handleRetry(index)
                      : undefined
                  }
                />
              ))}
            </div>
          ) : (
            // Empty state - only shows when no messages
            <div className="min-h-[60vh] flex items-center justify-center">
              <div className="flex flex-col items-center gap-y-6">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-3 text-neutral-900">
                    Ask Lexa
                  </h3>
                  <p className="text-neutral-600 text-sm max-w-md">
                    Get expert guidance on documents, workflows, and
                    business processes
                  </p>
                </div>

                {/* Suggested Prompts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                  {[
                    {
                      icon: File,
                      title: "Document Review",
                      prompt:
                        "Help me review this document and identify key sections",
                    },
                    {
                      icon: Scale,
                      title: "Compliance",
                      prompt:
                        "What are the compliance requirements for data protection in my business?",
                    },
                    {
                      icon: Building,
                      title: "Business Processes",
                      prompt:
                        "Guide me through creating business processes for my organization",
                    },
                    {
                      icon: Shield,
                      title: "Risk Assessment",
                      prompt:
                        "Analyze potential risks in this business partnership",
                    },
                  ].map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() =>
                        aiChatActions.setInputValue(suggestion.prompt)
                      }
                      className="p-4 text-left border border-neutral-200 rounded-lg hover:border-primary/50 hover:bg-neutral-50/50 transition-all duration-200 hover:shadow-sm group"
                    >
                      <div className="flex items-start gap-3">
                        <suggestion.icon className="w-6 h-6 text-primary mt-0.5 font-medium" />
                        <div>
                          <h4 className="font-medium text-neutral-900 mb-1 group-hover:text-primary transition-colors">
                            {suggestion.title}
                          </h4>
                          <p className="text-sm text-neutral-600 leading-relaxed">
                            {suggestion.prompt}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Fixed bottom input - flex-shrink-0 ensures it doesn't shrink */}
      <div className="flex-shrink-0 absolute bottom-0 left-0 right-0 pointer-events-none">
        <div className="max-w-3xl mx-auto px-4 pb-6 group pointer-events-auto">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.md,.jpg,.jpeg,.png"
            onChange={handleFileInputChange}
          />

          {/* Uploaded files display */}
          {uploadedFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border border-border text-sm"
                >
                  <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate max-w-[200px]">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => aiChatActions.removeUploadedFile(file.id)}
                    className="h-5 w-5 rounded-full hover:bg-accent ml-1"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <PromptInput
            onSubmit={handleSubmit}
            className="relative rounded-3xl border border-border shadow-sm hover:shadow-md transition-all duration-200"
          >
            <PromptInputTextarea
              value={inputValue}
              onChange={(e) => aiChatActions.setInputValue(e.target.value)}
              placeholder="Message Lexa AI..."
              disabled={isTyping || isStreaming || isLoadingChat}
              className="min-h-[52px] resize-none pr-24 transition-colors duration-200"
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setVoiceDialogOpen(true)}
                disabled={isTyping || isStreaming || isLoadingChat}
                className="h-8 w-8 rounded-full hover:bg-accent"
                title="Voice input"
              >
                <Mic className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleAttachmentClick}
                disabled={isTyping || isStreaming || isLoadingChat}
                className="h-8 w-8 rounded-full hover:bg-accent"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <PromptInputSubmit
                className="rounded-full aspect-square hover:scale-105 transition-transform duration-150"
                disabled={
                  !inputValue.trim() || isTyping || isStreaming || isLoadingChat
                }
                variant={"ghost"}
                status={isTyping || isStreaming ? "streaming" : "ready"}
                size="sm"
              />
            </div>
          </PromptInput>
          <div className="flex items-center justify-center mt-3 mb-2 text-xs text-muted-foreground transition-opacity duration-200 group-hover:opacity-80">
            Lexa AI can make mistakes. Check important info.
          </div>
        </div>
      </div>

      {/* Voice Dialog */}
      <VoiceDialog
        open={voiceDialogOpen}
        onOpenChange={setVoiceDialogOpen}
        assistantId={
          process.env.NEXT_PUBLIC_UPLIFT_ASSISTANT_ID ||
          "514d0240-9a48-4055-aaeb-6009a7334ac0"
        }
      />
    </div>
  );
};

export default AI;
