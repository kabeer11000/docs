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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Template {
  id: string;
  name: string;
  description: string;
  content: string;
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

export function TemplatePreviewDialog({
  open,
  onOpenChange,
  template,
  onUseTemplate,
  isLoading = false,
}: TemplatePreviewDialogProps) {
  const previewEditor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: false,
        }),
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
      content: template?.content || "",
      editable: false,
      editorProps: {
        attributes: {
          class:
            "prose prose-sm prose-stone dark:prose-invert max-w-none focus:outline-none",
        },
      },
    },
    [template?.content],
  );

  if (!template) return null;

  const handleUseTemplate = () => {
    onUseTemplate(template);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0 bg-background">
        <DialogHeader className="px-6 pt-6 pb-4 border-b space-y-3">
          <div className="space-y-2">
            <DialogTitle className="text-2xl">{template.name}</DialogTitle>
            <DialogDescription className="text-base">
              {template.description}
            </DialogDescription>
          </div>

          {template.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {template.tags.slice(0, 5).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-6 py-6">
            <EditorContent editor={previewEditor} />
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="border-none"
          >
            Cancel
          </Button>
          <Button onClick={handleUseTemplate} disabled={isLoading}>
            {isLoading ? (
              <>
                <PiSpinner className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              "Use Template"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
