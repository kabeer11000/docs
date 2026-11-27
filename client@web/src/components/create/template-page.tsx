import Color from "@tiptap/extension-color";
import ListItem from "@tiptap/extension-list-item";
import TextAlign from "@tiptap/extension-text-align";
import { FontSize, TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  TableCellPlus,
  TableHeaderPlus,
  TablePlus,
  TableRowPlus,
} from "tiptap-pagination-plus";
import { cn } from "@/lib/utils";

type TemplateContent = string | { type: string; content: any[] };

export const PAGE_WIDTH = 816;
export const PAGE_HEIGHT = 1056;

/**
 * Read-only render of template content laid out like a document page
 * (fixed width, page margins, paper colors).
 */
export function TemplateDocument({
  content,
  className,
}: {
  content: TemplateContent;
  className?: string;
}) {
  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit,
        Underline,
        TextStyle,
        FontSize,
        Color,
        ListItem,
        TextAlign.configure({
          types: ["heading", "paragraph"],
          alignments: ["left", "center", "right", "justify"],
          defaultAlignment: "left",
        }),
        TablePlus,
        TableRowPlus,
        TableCellPlus,
        TableHeaderPlus,
      ],
      content: content || "",
      editable: false,
    },
    [content],
  );

  return (
    <div
      className={cn(
        "bg-paper text-paper-foreground px-[72px] py-[72px] text-[15px] [&_h1]:text-paper-foreground [&_h2]:text-paper-foreground [&_h3]:text-paper-foreground",
        className,
      )}
      style={{ width: PAGE_WIDTH }}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
