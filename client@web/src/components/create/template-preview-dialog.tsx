import Color from "@tiptap/extension-color";
import ListItem from "@tiptap/extension-list-item";
import TextAlign from "@tiptap/extension-text-align";
import { FontSize, TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { PiSpinner } from "react-icons/pi";
import {
  TableCellPlus,
  TableHeaderPlus,
  TablePlus,
  TableRowPlus,
} from "tiptap-pagination-plus";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type TemplateContent = string | { type: string; content: any[] };

interface Template {
  id: string;
  name: string;
  description: string;
  content: TemplateContent; // Support both HTML and JSON
  group: string;
  tags: string[];
  isPublic: boolean;
  createdAt: string;
}

interface TemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template | null;
  onUseTemplate: (template: Template) => Promise<void>;
  isLoading?: boolean;
}

/** Letter page at 96dpi; previews render at this size and are scaled down. */
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

export function TemplatePreviewDialog({
  open,
  onOpenChange,
  template,
  onUseTemplate,
  isLoading = false,
}: TemplatePreviewDialogProps) {
  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[920px] max-h-[90vh] flex flex-col p-0 gap-0 rounded-lg overflow-hidden bg-paper">
        <DialogHeader className="px-6 py-4 border-b border-border gap-1 text-left">
          <DialogTitle className="font-serif text-lg font-medium tracking-[-0.01em]">
            {template.name}
          </DialogTitle>
          {template.description && (
            <DialogDescription className="text-sm">
              {template.description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto bg-paper-canvas px-6 py-8">
          <TemplateDocument
            content={template.content}
            className="mx-auto min-h-[600px] rounded-[2px] shadow-paper"
          />
        </div>

        <DialogFooter className="px-6 py-3 border-t border-border">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={() => onUseTemplate(template)} disabled={isLoading}>
            {isLoading ? (
              <>
                <PiSpinner className="size-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Use template"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
