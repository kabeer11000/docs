"use client";
import { useStore } from "@nanostores/react";
import {
  editorActions,
  editorInstance,
  editorUIState,
} from "@repo/shadcn-ui/state/editor";
import { MessageSquare, Send, Sparkles, X } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
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
    <div
      className={cn(
        "fixed top-0 right-0 h-full w-80 bg-background border-l border-border shadow-lg transition-transform duration-300 ease-in-out z-50 flex flex-col",
        isOpen ? "translate-x-0" : "translate-x-full",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center">
            <img
              src="/assets/ai-button-bg.png"
              className="flex-1 group-hover:scale-110"
              loading="lazy"
              alt="AI Assistant"
            />
            <Sparkles className="h-4 w-4 text-white absolute" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Ask Lexa</h3>
            <p className="text-xs text-muted-foreground">Ready to help!</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCloseAIPanel}
            className="h-8 w-8 p-0"
            aria-label="Close AI Assistant"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div
            className="px-4 py-4 space-y-6"
            role="log"
            aria-live="polite"
            aria-label="Chat conversation"
          >
            {messages.length === 0 ? (
              <div className="text-center py-12 px-4 text-muted-foreground">
                <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h4 className="font-medium text-sm text-foreground mb-2">
                  Ready to help!
                </h4>
                <p className="text-sm leading-relaxed">
                  Ask me anything about your document. I can help with:
                </p>
                <ul className="text-xs mt-3 space-y-1 text-left max-w-48 mx-auto">
                  <li>• Writing and editing</li>
                  <li>• Grammar and style</li>
                  <li>• Document structure</li>
                  <li>• Content suggestions</li>
                </ul>
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

      <Separator />

      {/* Input Area */}
      <div className="px-4 py-4 bg-muted/10">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => aiChatActions.setInputValue(e.target.value)}
              placeholder="Ask about your document..."
              disabled={isTyping || isStreaming}
              className="min-h-[60px] max-h-32 resize-none pr-12 text-sm focus:ring-2 focus:ring-primary/20 border-border/50"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
              aria-label="Type your message to AI Assistant"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!inputValue.trim() || isTyping || isStreaming}
              className="absolute right-2 bottom-2 h-8 w-8 p-0 shadow-sm"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
}
