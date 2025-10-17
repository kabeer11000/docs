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
        <div className="bg-gradient-to-t from-background to-background/0 pt-8 pb-4">
          <div className="max-w-3xl mx-auto px-4">
            <PromptInput
              onSubmit={handleSubmit}
              className="bg-background border border-input rounded-xl shadow-sm"
            >
              <PromptInputTextarea
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Message Lexa AI..."
                disabled={isTyping || isStreaming}
                className="min-h-[56px] resize-none pr-16 bg-transparent border-0 focus:ring-0 focus:outline-none"
              />
              <div className="absolute right-2 bottom-2">
                <PromptInputSubmit
                  className="rounded-lg"
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
