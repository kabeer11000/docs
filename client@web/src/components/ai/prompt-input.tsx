"use client";

import { useStore } from "@nanostores/react";
import { cn } from "@repo/shadcn-ui/lib/utils";
import { memo, useCallback } from "react";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ui/shadcn-io/ai/prompt-input";
import {
  $inputValue,
  $isStreaming,
  $isTyping,
  aiChatActions,
} from "@/state/ai-chat";

interface IsolatedPromptInputProps {
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  className?: string;
}

// Isolated input component that won't cause parent re-renders
const IsolatedPromptInput = memo(
  ({ onSubmit, className }: IsolatedPromptInputProps) => {
    const inputValue = useStore($inputValue);
    const isTyping = useStore($isTyping);
    const isStreaming = useStore($isStreaming);

    // Memoized handlers to prevent re-renders
    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        aiChatActions.setInputValue(e.target.value);
      },
      [],
    );

    const handleSubmit = useCallback(
      async (event: React.FormEvent<HTMLFormElement>) => {
        await onSubmit(event);
      },
      [onSubmit],
    );

    return (
      <div className={cn(`fixed bottom-0 left-72 right-80 z-10`, className)}>
        <div className="bg-background pt-2 pb-4">
          <div className="max-w-3xl mx-auto px-4">
            <PromptInput
              onSubmit={handleSubmit}
              className="relative rounded-none border-0 border-b border-border bg-transparent shadow-none focus-within:border-primary"
            >
              <PromptInputTextarea
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Message Lexa AI..."
                disabled={isTyping || isStreaming}
                className="min-h-[44px] resize-none px-0 pr-12 bg-transparent border-0 focus:ring-0 focus:outline-none"
              />
              <div className="absolute right-0 bottom-1.5">
                <PromptInputSubmit
                  className="size-8 rounded-md"
                  disabled={!inputValue.trim() || isTyping || isStreaming}
                  variant={"default"}
                  status={isTyping || isStreaming ? "streaming" : "ready"}
                  size="sm"
                />
              </div>
            </PromptInput>
            <p className="text-center text-xs text-muted-foreground mt-2">
              Lexa AI can make mistakes. Check important info.
            </p>
          </div>
        </div>
      </div>
    );
  },
);

IsolatedPromptInput.displayName = "IsolatedPromptInput";

export { IsolatedPromptInput };
