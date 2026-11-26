"use client";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { editorInstance } from "@/state/editor";
import { toolbarSelectClass } from "./toolbar-button";

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
        className={cn(toolbarSelectClass, "w-[124px]")}
        aria-label="Font"
        disabled={disabled}
      >
        <SelectValue>
          <span className="truncate">{currentFont}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-72 min-w-[220px]">
        {Object.entries(groupedFonts).map(([category, fonts]) => (
          <div key={category}>
            <div className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">
              {category}
            </div>
            {fonts.map((font) => (
              <SelectItem
                key={font.value}
                value={font.value}
                className="min-h-8 cursor-pointer"
              >
                <span
                  style={{ fontFamily: font.value }}
                  className="truncate text-sm"
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
