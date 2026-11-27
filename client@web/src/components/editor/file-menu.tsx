"use client";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { showToast } from "@/lib/toast";
import { $pageSetupOpen, $shortcutsOpen } from "./dialogs-state";
import { copyDocumentAs, type DownloadKind, downloadDocument, printDocument } from "./document-actions";
import { toggleFocusMode } from "./focus-mode";
import { $outlineOpen, toggleOutline } from "./outline/outline-state";

const mod = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "Cmd" : "Ctrl";

const DOWNLOADS: { kind: DownloadKind; label: string; ext: string }[] = [
  { kind: "pdf", label: "PDF", ext: ".pdf" },
  { kind: "docx", label: "Word", ext: ".docx" },
  { kind: "md", label: "Markdown", ext: ".md" },
  { kind: "html", label: "Web page", ext: ".html" },
  { kind: "txt", label: "Plain text", ext: ".txt" },
];

const ext = "ml-auto pl-4 text-xs text-muted-foreground";

export function FileMenu({ title, canEdit, onCopy }: { title: string; canEdit: boolean; onCopy: () => void }) {
  const router = useRouter();
  const { createDocument } = useCloudStore();
  const fileInput = useRef<HTMLInputElement>(null);

  const importFile = async (file: File) => {
    const id = showToast.loading(`Importing ${file.name}`);
    const { toast } = await import("sonner");
    try {
      const { fileToHtml } = await import("@/lib/export/import");
      const { title: newTitle, html } = await fileToHtml(file);
      const docId = await createDocument({ title: newTitle, initialContent: html });
      toast.dismiss(id);
      if (!docId) throw new Error("Could not create the document");
      showToast.success(`Imported as "${newTitle}"`);
      router.push(`/document/${docId}`);
    } catch (error) {
      toast.dismiss(id);
      showToast.error("Import failed", error instanceof Error ? error.message : undefined);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 shrink-0 px-2 text-[13px] font-normal text-muted-foreground" data-testid="file-menu">
            File
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuItem onSelect={() => fileInput.current?.click()}>Import file...</DropdownMenuItem>
          <DropdownMenuItem onSelect={onCopy} disabled={!canEdit}>
            Make a copy
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Download</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-48">
              {DOWNLOADS.map((d) => (
                <DropdownMenuItem key={d.kind} onSelect={() => downloadDocument(d.kind, title)}>
                  {d.label}
                  <span className={ext}>{d.ext}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem onSelect={() => copyDocumentAs("md")}>Copy as Markdown</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => copyDocumentAs("html")}>Copy as HTML</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => $pageSetupOpen.set(true)}>Page setup...</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => printDocument(title)}>
            Print
            <DropdownMenuShortcut>{mod} P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={toggleOutline}>
            {$outlineOpen.get() ? "Hide outline" : "Show outline"}
            <DropdownMenuShortcut>{mod} Shift O</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={toggleFocusMode}>
            Focus mode
            <DropdownMenuShortcut>{mod} Shift F</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => $shortcutsOpen.set(true)}>
            Keyboard shortcuts
            <DropdownMenuShortcut>{mod} /</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileInput}
        type="file"
        accept=".md,.markdown,.html,.htm,.txt,.docx"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) importFile(file);
        }}
      />
    </>
  );
}
