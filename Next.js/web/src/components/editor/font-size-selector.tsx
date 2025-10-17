"use client";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { editorInstance } from "@/state/editor";

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
    <div className="flex items-center">
      {isCustomInput ? (
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={decrementSize}
            disabled={disabled || currentSize <= 8}
            className="h-7 w-5 sm:h-8 sm:w-6 p-0 transition-all hover:bg-muted disabled:opacity-50"
            aria-label="Decrease font size"
          >
            <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          </Button>
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
            className="w-12 sm:w-16 h-7 sm:h-8 text-xs sm:text-sm text-center border-input"
            disabled={disabled}
            autoFocus
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={incrementSize}
            disabled={disabled || currentSize >= 72}
            className="h-7 w-5 sm:h-8 sm:w-6 p-0 transition-all hover:bg-muted disabled:opacity-50"
            aria-label="Increase font size"
          >
            <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={decrementSize}
            disabled={disabled || currentSize <= 8}
            className="h-7 w-5 sm:h-8 sm:w-6 p-0 transition-all hover:bg-muted disabled:opacity-50"
            aria-label="Decrease font size"
          >
            <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCustomInput(true)}
            disabled={disabled}
            className="h-7 w-10 sm:h-8 sm:w-12 px-1 sm:px-2 text-xs sm:text-sm font-mono bg-muted/30 hover:bg-muted border border-input transition-all"
            aria-label={`Font size ${currentSize}px`}
          >
            {currentSize}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={incrementSize}
            disabled={disabled || currentSize >= 72}
            className="h-7 w-5 sm:h-8 sm:w-6 p-0 transition-all hover:bg-muted disabled:opacity-50"
            aria-label="Increase font size"
          >
            <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
