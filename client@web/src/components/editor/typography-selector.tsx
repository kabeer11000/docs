"use client";
import type { ChainedCommands, Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type StyleId = "normal" | "title" | "h1" | "h2" | "h3" | "quote" | "code";

/** Leaves quotes and code blocks first, so each style replaces the block's current one. */
const plain = (e: Editor) => {
  const c = e.chain().focus();
  return e.isActive("blockquote") ? c.unsetBlockquote() : c;
};

const STYLES: {
  id: StyleId;
  label: string;
  preview: string;
  apply: (e: Editor) => ChainedCommands;
}[] = [
  {
    id: "normal",
    label: "Normal text",
    preview: "text-[14px]",
    apply: (e) => plain(e).setParagraph(),
  },
  {
    id: "title",
    label: "Title",
    preview: "text-[24px] font-semibold tracking-[-0.025em]",
    apply: (e) =>
      plain(e)
        .setHeading({ level: 1 })
        .updateAttributes("heading", { class: "title" }),
  },
  {
    id: "h1",
    label: "Heading 1",
    preview: "text-[20px] font-semibold tracking-[-0.02em]",
    apply: (e) =>
      plain(e)
        .setHeading({ level: 1 })
        .updateAttributes("heading", { class: null }),
  },
  {
    id: "h2",
    label: "Heading 2",
    preview: "text-[17px] font-semibold tracking-[-0.015em]",
    apply: (e) =>
      plain(e)
        .setHeading({ level: 2 })
        .updateAttributes("heading", { class: null }),
  },
  {
    id: "h3",
    label: "Heading 3",
    preview: "text-[15px] font-semibold",
    apply: (e) =>
      plain(e)
        .setHeading({ level: 3 })
        .updateAttributes("heading", { class: null }),
  },
  {
    id: "quote",
    label: "Quote",
    preview:
      "border-l-[3px] border-app pl-2 text-[14px] italic text-muted-foreground",
    apply: (e) => plain(e).setParagraph().setBlockquote(),
  },
  {
    id: "code",
    label: "Code",
    preview: "font-mono text-[13px]",
    apply: (e) => plain(e).setCodeBlock(),
  },
];

function currentStyle(e: Editor): StyleId {
  if (e.isActive("codeBlock")) return "code";
  if (e.isActive("heading", { level: 1 }))
    return e.getAttributes("heading").class === "title" ? "title" : "h1";
  if (e.isActive("heading", { level: 2 })) return "h2";
  if (e.isActive("heading", { level: 3 })) return "h3";
  if (e.isActive("blockquote")) return "quote";
  return "normal";
}

export function TypographySelector({
  editor,
  disabled = false,
}: {
  editor: Editor | null;
  disabled?: boolean;
}) {
  const current =
    useEditorState({
      editor,
      selector: ({ editor: e }) => (e ? currentStyle(e) : "normal"),
    }) ?? "normal";
  const label = STYLES.find((s) => s.id === current)?.label ?? "Normal text";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          disabled={disabled || !editor}
          aria-label={`Text style: ${label}`}
          className="h-8 w-[118px] shrink-0 justify-between gap-1 rounded-full px-3 text-[13px] font-medium text-foreground data-[state=open]:bg-accent"
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="w-60"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {STYLES.map((s) => (
          <DropdownMenuItem
            key={s.id}
            onSelect={() => editor && s.apply(editor).run()}
            className={cn(
              "h-auto min-h-9 py-1.5",
              s.id === current && "text-app",
            )}
          >
            <span className={cn("flex-1 truncate leading-tight", s.preview)}>
              {s.label}
            </span>
            {s.id === current && <Check className="text-app" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
