"use client";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { editorInstance } from "@/state/editor";

const fontFamilies = [
  { value: "Inter", label: "Inter", category: "Sans Serif" },
  { value: "Arial", label: "Arial", category: "Sans Serif" },
  { value: "Helvetica", label: "Helvetica", category: "Sans Serif" },
  { value: "Georgia", label: "Georgia", category: "Serif" },
  { value: "Times New Roman", label: "Times New Roman", category: "Serif" },
  { value: "Playfair Display", label: "Playfair Display", category: "Serif" },
  { value: "Roboto", label: "Roboto", category: "Sans Serif" },
  { value: "Open Sans", label: "Open Sans", category: "Sans Serif" },
  { value: "Lato", label: "Lato", category: "Sans Serif" },
  { value: "Montserrat", label: "Montserrat", category: "Sans Serif" },
  {
    value: "Source Sans Pro",
    label: "Source Sans Pro",
    category: "Sans Serif",
  },
  { value: "Roboto Mono", label: "Roboto Mono", category: "Monospace" },
  { value: "Monaco", label: "Monaco", category: "Monospace" },
  { value: "Courier New", label: "Courier New", category: "Monospace" },
];

export function FontSelector({ disabled = false }: { disabled?: boolean }) {
  const [currentFont, setCurrentFont] = useState("Inter");

  const handleFontChange = (fontFamily: string) => {
    const editor = editorInstance.get();
    if (!editor) return;

    setCurrentFont(fontFamily);

    // Apply font family to selection or entire document
    try {
      editor.chain().focus().setFontFamily(fontFamily).run();
    } catch (error) {
      console.warn("Error setting font family:", error);
    }
  };

  const groupedFonts = fontFamilies.reduce(
    (acc, font) => {
      if (!acc[font.category]) {
        acc[font.category] = [];
      }
      acc[font.category].push(font);
      return acc;
    },
    {} as Record<string, typeof fontFamilies>,
  );

  return (
    <Select
      value={currentFont}
      onValueChange={handleFontChange}
      disabled={disabled}
    >
      <SelectTrigger
        className="w-32 sm:w-36 h-7 sm:h-8 text-xs sm:text-sm border-input bg-background hover:bg-muted/50 transition-colors"
        disabled={disabled}
      >
        <SelectValue>
          <span className="truncate">{currentFont}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-64 overflow-y-auto min-w-[220px] sm:min-w-[240px]">
        {Object.entries(groupedFonts).map(([category, fonts]) => (
          <div key={category}>
            <div className="px-3 py-1.5 sm:py-2 text-xs font-medium text-muted-foreground border-b bg-muted/30">
              {category}
            </div>
            {fonts.map((font) => (
              <SelectItem
                key={font.value}
                value={font.value}
                className="cursor-pointer hover:bg-accent transition-colors py-2 sm:py-3 px-2 sm:px-3 min-h-[40px] sm:min-h-[44px] flex items-center"
              >
                <span
                  style={{ fontFamily: font.value }}
                  className="text-xs sm:text-sm truncate"
                >
                  {font.label}
                </span>
              </SelectItem>
            ))}
          </div>
        ))}
      </SelectContent>
    </Select>
  );
}
