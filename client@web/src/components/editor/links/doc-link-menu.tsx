"use client";
import type { Document } from "@shared-types";
import type { SuggestionProps } from "@tiptap/suggestion";
import { FileText, Plus, Presentation, Sheet } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { menuItem, menuSurface } from "@/components/ui/menu-styles";
import { fileKind } from "@/lib/files";
import { cn } from "@/lib/utils";
import type { MenuHandle } from "../extensions/slash-command";

export type DocLinkItem = { type: "file"; file: Document } | { type: "create"; title: string };

const KIND_ICON = { doc: FileText, sheet: Sheet, slides: Presentation } as const;

export const DocLinkMenu = forwardRef<MenuHandle, SuggestionProps<DocLinkItem>>(function DocLinkMenu({ items, command }, ref) {
  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (!items.length) return false;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        const step = event.key === "ArrowDown" ? 1 : -1;
        setActive((i) => (i + step + items.length) % items.length);
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        command(items[active]);
        return true;
      }
      return false;
    },
  }));

  if (!items.length) {
    return <div className={cn(menuSurface, "w-64 px-3 py-2 text-[13px] text-muted-foreground")}>Type a title to create a document</div>;
  }
  return (
    <div role="listbox" aria-label="Link to file" className={cn(menuSurface, "w-64")}>
      {items.map((item, i) => {
        const Icon = item.type === "file" ? KIND_ICON[fileKind(item.file)] : Plus;
        return (
          <button
            key={item.type === "file" ? item.file.id : "create"}
            type="button"
            role="option"
            aria-selected={i === active}
            data-selected={i === active}
            onMouseEnter={() => setActive(i)}
            onMouseDown={(e) => {
              e.preventDefault();
              command(item);
            }}
            className={cn(menuItem, "text-left")}
          >
            <Icon />
            {item.type === "file" ? (
              <span className="truncate font-serif">{item.file.title || "Untitled"}</span>
            ) : (
              <span className="truncate">
                Create <span className="font-serif">{item.title}</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
});
