"use client";
import {
  ChevronDown,
  ClipboardCopy,
  Copy,
  Download,
  FileUp,
  History,
  Keyboard,
  ListTree,
  Maximize2,
  Presentation,
  Printer,
  Ruler,
} from "lucide-react";
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
import { $versionsOpen } from "./versions/version-history";
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

export function FileMenu({
  documentId,
  title,
  canEdit,
  onCopy,
}: {
  documentId: string;
  title: string;
  canEdit: boolean;
  onCopy: () => void;
}) {
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

  const convertToSlides = async () => {
    const id = showToast.loading("Turning headings into slides");
    const { toast } = await import("sonner");
    try {
      const { convertDocToSlides } = await import("@/lib/convert/doc-to-slides");
      const slidesId = await convertDocToSlides(documentId);
      toast.dismiss(id);
      if (!slidesId) throw new Error("Could not create the presentation");
      showToast.success("Presentation created");
      router.push(`/slides/${slidesId}`);
    } catch (error) {
      toast.dismiss(id);
      showToast.error("Conversion failed", error instanceof Error ? error.message : undefined);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="group h-8 shrink-0 gap-0.5 rounded-full pr-2 pl-3 text-[13px] text-muted-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground"
            data-testid="file-menu"
          >
            File
            <ChevronDown className="size-3.5 opacity-60 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={6} className="w-64">
          <DropdownMenuItem onSelect={() => fileInput.current?.click()}>
            <FileUp />
            Import file...
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onCopy} disabled={!canEdit}>
            <Copy />
            Make a copy
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => $versionsOpen.set(true)}>
            <History />
            Version history
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={convertToSlides}>
            <Presentation className="text-slides" />
            Convert to presentation
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Download />
              Download
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-48">
              {DOWNLOADS.map((d) => (
                <DropdownMenuItem key={d.kind} onSelect={() => downloadDocument(d.kind, title)}>
                  {d.label}
                  <span className={ext}>{d.ext}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ClipboardCopy />
              Copy as
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-44">
              <DropdownMenuItem onSelect={() => copyDocumentAs("md")}>Markdown</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => copyDocumentAs("html")}>HTML</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => $pageSetupOpen.set(true)}>
            <Ruler />
            Page setup...
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => printDocument(title)}>
            <Printer />
            Print
            <DropdownMenuShortcut>{mod} P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={toggleOutline}>
            <ListTree />
            {$outlineOpen.get() ? "Hide outline" : "Show outline"}
            <DropdownMenuShortcut>{mod} Shift O</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={toggleFocusMode}>
            <Maximize2 />
            Focus mode
            <DropdownMenuShortcut>{mod} Shift F</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => $shortcutsOpen.set(true)}>
            <Keyboard />
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
