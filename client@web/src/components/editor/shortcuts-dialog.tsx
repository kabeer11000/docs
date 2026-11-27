"use client";
import { useStore } from "@nanostores/react";
import { $shortcutsOpen } from "./dialogs-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const mod = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "Cmd" : "Ctrl";

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: "Text",
    items: [
      ["Bold", `${mod} B`],
      ["Italic", `${mod} I`],
      ["Underline", `${mod} U`],
      ["Strikethrough", `${mod} Shift S`],
      ["Inline code", `${mod} E`],
      ["Undo", `${mod} Z`],
      ["Redo", `${mod} Shift Z`],
    ],
  },
  {
    title: "Blocks",
    items: [
      ["Insert block menu", "/"],
      ["Heading 1, 2, 3", `${mod} Alt 1-3`],
      ["Bulleted list", `${mod} Shift 8`],
      ["Numbered list", `${mod} Shift 7`],
      ["To-do list", `${mod} Shift 9`],
      ["Quote", `${mod} Shift B`],
      ["Code block", `${mod} Alt C`],
      ["Page break", `${mod} Enter`],
    ],
  },
  {
    title: "Markdown as you type",
    items: [
      ["Heading", "# , ## , ### "],
      ["Bulleted list", "- "],
      ["Numbered list", "1. "],
      ["To-do", "[ ] "],
      ["Quote", "> "],
      ["Code block", "```"],
      ["Divider", "---"],
      ["Bold, italic, code", "**b** *i* `c`"],
    ],
  },
  {
    title: "Document",
    items: [
      ["Save now", `${mod} S`],
      ["Print or save as PDF", `${mod} P`],
      ["Find, find and replace", `${mod} F, ${mod} H`],
      ["Show or hide outline", `${mod} Shift O`],
      ["Focus mode", `${mod} Shift F`],
      ["Keyboard shortcuts", `${mod} /`],
    ],
  },
];

export default function ShortcutsDialog() {
  const open = useStore($shortcutsOpen);
  return (
    <Dialog open={open} onOpenChange={$shortcutsOpen.set}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg font-medium">Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">{g.title}</h3>
              <dl className="divide-y divide-border">
                {g.items.map(([label, keys]) => (
                  <div key={label} className="flex h-8 items-center justify-between gap-4 text-[13px]">
                    <dt>{label}</dt>
                    <dd className="font-mono text-[12px] text-muted-foreground">{keys}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
