"use client";
import { useStore } from "@nanostores/react";
import {
  editorActions,
  editorInstance,
  editorUIState,
} from "@repo/shadcn-ui/state/editor";
import {
  File,
  MessageSquare,
  Scale,
  Send,
  X,
} from "lucide-react";
import { nanoid } from "nanoid";
import { computed } from "nanostores";
import {
  type FormEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { MessageItem } from "@/components/ai/message-item";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/state/ai-chat";
import { $auth } from "@/state/auth";

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

interface EditorAIChatPanelProps {
  chatId?: string | number;
}

export function EditorAIChatPanel({
  chatId = "editor-chat",
}: EditorAIChatPanelProps) {
  const messages = useStore($messages);
  const isOpen = useStore(
    computed(editorUIState, (state) => state.isAIPanelOpen),
  );
  const inputValue = useStore($inputValue);
  const isTyping = useStore($isTyping);
  const isStreaming = useStore($isStreaming);
  const { user: currentUser } = useStore($auth);
  const [adapter, setAdapter] = useState<AIAdapter | null>(null);
  const [currentAssistantMessageId, setCurrentAssistantMessageId] = useState<
    string | null
  >(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleCloseAIPanel = () => editorActions.setAIPanelOpen(false);

  // Initialize AI WebSocket connection on component mount
  useEffect(() => {
    let adapterInstance: AIAdapter | null = null;
    let mounted = true;

    const initializeAdapter = async () => {
      try {
        // Use currentUser from hook
        // TODO: Use real user ID when API is ready - for now using hash-based numeric ID
        const userIdString = currentUser?.id || "anonymous";
        const userId = hex2dec(hashString(userIdString));

        if (!mounted) return;

        adapterInstance = new AIAdapter(userId, chatId);
        await adapterInstance.connect();

        if (mounted) {
          setAdapter(adapterInstance);
        } else {
          adapterInstance.disconnect();
        }
      } catch (_error) {
        if (mounted) {
          aiChatActions.setIsTyping(false);
          aiChatActions.setIsStreaming(false);
        }
      }
    };

    initializeAdapter();

    return () => {
      mounted = false;
      if (adapterInstance) {
        try {
          adapterInstance.disconnect();
        } catch (_error) {
          // Silent fail
        } finally {
          setAdapter(null);
        }
      }
    };
  }, [chatId, currentUser?.id]);

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
  }, [adapter, currentAssistantMessageId]);

  const handleSubmit = useCallback(
    async (e: FormEventHandler<HTMLFormElement> | React.FormEvent) => {
      if ("preventDefault" in e) e.preventDefault();

      if (
        !adapter ||
        !API_CONFIG.FEATURES.AI_CHAT_ENABLED ||
        isStreaming ||
        isTyping
      ) {
        return;
      }

      const messageContent = inputValue.trim();
      if (!messageContent) return;

      // Get uploaded files to send with message
      const currentUploadedFiles = $uploadedFiles.get();
      const fileIds = currentUploadedFiles.map((f) => f.id).filter(Boolean);

      // Convert uploaded files to attachments for display
      const attachments = currentUploadedFiles.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
      }));

      // Create user message
      const userMessage: ChatMessage = {
        id: nanoid(),
        content: messageContent,
        role: "user",
        timestamp: new Date(),
        attachments: attachments.length > 0 ? attachments : undefined,
      };

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
      aiChatActions.addMessage(userMessage);
      aiChatActions.addMessage(assistantMessage);
      aiChatActions.setInputValue("");
      aiChatActions.setIsTyping(true);
      setCurrentAssistantMessageId(assistantMessageId);

      try {
        // Send message with file IDs if any files are uploaded
        await adapter.message({
          id: assistantMessageId,
          content: messageContent,
          fileIds: fileIds.length > 0 ? fileIds : undefined,
        });
        aiChatActions.setIsStreaming(true);

        // Clear uploaded files after sending
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
    [inputValue, isTyping, isStreaming, adapter],
  );

  const handleInsert = useCallback((content: string) => {
    const editor = editorInstance.get();
    if (editor) {
      // Convert markdown to HTML for proper formatting
      const html = content
        // Bold: **text** or __text__
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/__(.+?)__/g, "<strong>$1</strong>")
        // Italic: *text* or _text_
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/_(.+?)_/g, "<em>$1</em>")
        // Code: `text`
        .replace(/`(.+?)`/g, "<code>$1</code>")
        // Line breaks
        .replace(/\n/g, "<br>");

      editor.chain().focus().insertContent(html).run();

      // Close AI panel on mobile after inserting
      if (window.innerWidth < 768) {
        editorActions.setAIPanelOpen(false);
      }
    }
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={handleCloseAIPanel}
        />
      )}
      <aside
        aria-label="Ask AI"
        inert={!isOpen}
        className={cn(
          "fixed top-0 right-0 z-50 flex h-full w-full flex-col border-l border-border bg-background transition-transform duration-150 ease-out md:w-80",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex h-12 shrink-0 items-center justify-between pl-4 pr-2">
          <h3 className="text-[13px] font-medium text-foreground">Ask AI</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCloseAIPanel}
            aria-label="Close Ask AI"
          >
            <X />
          </Button>
        </div>

        <div className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div
              className="space-y-6 p-4"
              role="log"
              aria-live="polite"
              aria-label="Chat conversation"
            >
              {messages.length === 0 ? (
                <div className="pt-6">
                  <p className="mb-1 font-serif text-base font-medium text-foreground">
                    Ask about this document
                  </p>
                  <p className="mb-4 text-[13px] text-muted-foreground">
                    Get a summary, rewrite a passage, or check the wording.
                  </p>
                  <div className="space-y-1">
                    {[
                      { icon: File, prompt: "Summarize this document" },
                      { icon: MessageSquare, prompt: "Improve writing style" },
                    ].map((suggestion) => (
                      <button
                        type="button"
                        key={suggestion.prompt}
                        onClick={() =>
                          aiChatActions.setInputValue(suggestion.prompt)
                        }
                        className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13px] text-foreground transition-colors duration-150 hover:bg-accent"
                      >
                        <suggestion.icon className="size-4 shrink-0 text-muted-foreground" />
                        {suggestion.prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <div key={message.id} className="text-sm">
                      <MessageItem message={message} onInsert={handleInsert} />
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="shrink-0 p-3">
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => aiChatActions.setInputValue(e.target.value)}
                placeholder="Ask about this document..."
                disabled={isTyping || isStreaming}
                className="max-h-32 min-h-[72px] resize-none rounded-md border-border bg-paper py-2.5 pl-3 pr-11 text-[13px] placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as any);
                  }
                }}
                aria-label="Message"
              />
              <Button
                type="submit"
                size="icon-sm"
                disabled={!inputValue.trim() || isTyping || isStreaming}
                className="absolute right-2 bottom-2"
                aria-label="Send message"
                title="Send (Enter). Shift+Enter for a new line"
              >
                <Send />
              </Button>
            </div>
          </form>
        </div>
      </aside>
    </>
  );
}
