"use client";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { editorInstance } from "@/state/editor";
import { ToolbarButton } from "./toolbar-button";

const _commonFontSizes = [
  8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 44, 48, 54, 60,
  66, 72,
];

export function FontSizeSelector({ disabled = false }: { disabled?: boolean }) {
  const [currentSize, setCurrentSize] = useState(16);
  const [isCustomInput, setIsCustomInput] = useState(false);

  const handleSizeChange = (size: number) => {
    const editor = editorInstance.get();
    if (!editor) return;

    setCurrentSize(size);

    try {
      // Check if editor view is available
      if (!editor.view) {
        console.warn("Editor view not ready yet");
        return;
      }

      // Check if DOM is available - Tiptap may throw errors if not mounted
      let editorElement: HTMLElement;
      try {
        if (!editor.view.dom) {
          console.warn("Editor DOM not mounted yet");
          return;
        }
        editorElement = editor.view.dom as HTMLElement;
      } catch (_domError) {
        console.warn("Editor DOM not accessible yet");
        return;
      }

      // Apply font size to selection or entire document
      editorElement.style.fontSize = `${size}px`;

      // For future: implement proper font size extension for TipTap
      // editor.chain().focus().setFontSize(`${size}px`).run();

      editor.commands.focus();
    } catch (error) {
      console.warn("Error setting font size:", error);
    }
  };

  const handleCustomSizeSubmit = (value: string) => {
    const size = parseInt(value, 10);
    if (size >= 8 && size <= 72) {
      handleSizeChange(size);
    }
    setIsCustomInput(false);
  };

  const incrementSize = () => {
    const newSize = Math.min(currentSize + 2, 72);
    handleSizeChange(newSize);
  };

  const decrementSize = () => {
    const newSize = Math.max(currentSize - 2, 8);
    handleSizeChange(newSize);
  };

  return (
    <div className="flex items-center gap-0.5">
      <ToolbarButton
        label="Decrease font size"
        onClick={decrementSize}
        disabled={disabled || currentSize <= 8}
        className="size-7"
      >
        <Minus className="size-3.5" />
      </ToolbarButton>
      {isCustomInput ? (
        <Input
          type="number"
          min="8"
          max="72"
          value={currentSize}
          onChange={(e) => {
            const value = e.target.value;
            if (value) {
              handleCustomSizeSubmit(value);
            }
          }}
          onBlur={() => setIsCustomInput(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleCustomSizeSubmit(e.currentTarget.value);
            } else if (e.key === "Escape") {
              setIsCustomInput(false);
            }
          }}
          className="h-7 w-11 px-1 text-center text-[13px] tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          disabled={disabled}
          aria-label="Font size"
          autoFocus
        />
      ) : (
        <Button
          variant="ghost"
          onClick={() => setIsCustomInput(true)}
          disabled={disabled}
          className="h-7 w-11 rounded-md border border-border px-1 text-[13px] font-normal tabular-nums text-foreground hover:bg-accent"
          aria-label={`Font size ${currentSize}px`}
        >
          {currentSize}
        </Button>
      )}
      <ToolbarButton
        label="Increase font size"
        onClick={incrementSize}
        disabled={disabled || currentSize >= 72}
        className="size-7"
      >
        <Plus className="size-3.5" />
      </ToolbarButton>
    </div>
  );
}
