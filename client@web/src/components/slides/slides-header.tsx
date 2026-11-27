"use client";

import { useStore } from "@nanostores/react";
import {
  ChevronDown,
  FileDown,
  FileUp,
  Globe,
  MonitorPlay,
  Play,
  Presentation,
  Printer,
  Share2,
} from "lucide-react";
import { atom } from "nanostores";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLiveDocument } from "@/components/editor/core/use-document-loader";
import { EditableTitle } from "@/components/editor/editable-title";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { useDocumentPermissions } from "@/hooks/use-document-permissions";
import { titleFromFilename } from "@/lib/export/import";
import { fileHref } from "@/lib/files";
import { showToast } from "@/lib/toast";
import { $auth } from "@/state/auth";

const ShareDialog = lazy(() =>
  import("@/components/editor/share-dialog").then((m) => ({
    default: m.ShareDialog,
  })),
);

export type SlidesSaveStatus = "idle" | "saving" | "saved" | "error";
export const $slidesSave = atom<SlidesSaveStatus>("idle");

export type PresentMode = "start" | "current" | "presenter";
/** What the open presentation offers the header (set by SlidesApp while it is mounted). */
export interface SlidesCommands {
  present: (mode: PresentMode) => void;
  print: () => void;
  html: () => void;
  pptx: () => Promise<void>;
}
export const $slidesCommands = atom<SlidesCommands | null>(null);

const SAVE_LABEL: Record<SlidesSaveStatus, string> = {
  idle: "",
  saving: "Saving...",
  saved: "Saved",
  error: "Save failed",
};
const noop = () => {};

/** Imports a .pptx file as a new presentation and opens it. */
function useImportPowerPoint() {
  const router = useRouter();
  const { createDocument } = useCloudStore();
  const { user } = useStore($auth);
  const [busy, setBusy] = useState(false);
  const run = async (file: File) => {
    if (!user || busy) return;
    setBusy(true);
    const toastId = showToast.loading("Importing presentation...");
    try {
      const { pptxToDeck } = await import("@/lib/slides/pptx-import");
      const data = await pptxToDeck(await file.arrayBuffer());
      const id = await createDocument({
        kind: "slides",
        data,
        title: titleFromFilename(file.name),
        folderId: user.id,
      });
      if (!id) throw new Error("Could not create the presentation");
      router.push(fileHref(id, "slides"));
    } catch (e) {
      showToast.error(
        "Could not import that file",
        e instanceof Error ? e.message : undefined,
      );
    } finally {
      toast.dismiss(toastId);
      setBusy(false);
    }
  };
  return { run, busy };
}

export function SlidesHeader({ documentId }: { documentId: string }) {
  const { document: doc } = useLiveDocument(documentId);
  const permissions = useDocumentPermissions(doc);
  const save = useStore($slidesSave);
  const commands = useStore($slidesCommands);
  const [share, setShare] = useState<"closed" | "open" | "mounted">("closed");
  const fileRef = useRef<HTMLInputElement>(null);
  const importer = useImportPowerPoint();

  useEffect(() => {
    if (doc?.title) document.title = `${doc.title} - Slides`;
  }, [doc?.title]);

  if (!doc) {
    return (
      <div className="flex w-full items-center gap-2">
        <div className="hidden size-8 sm:block" />
        <div className="h-5 w-48 animate-pulse rounded-sm bg-muted" />
      </div>
    );
  }

  const exportPptx = async () => {
    if (!commands) return;
    try {
      await commands.pptx();
    } catch (e) {
      console.error("[slides] pptx export failed", e);
      showToast.error("Could not create the PowerPoint file");
    }
  };

  return (
    <div data-app="slides" className="contents">
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <Tooltip delayDuration={400}>
          <TooltipTrigger asChild>
            <Link
              href="/home"
              aria-label="Back to files"
              className="press hidden size-8 shrink-0 items-center justify-center rounded-[10px] bg-app-soft text-app transition-colors hover:bg-app hover:text-app-foreground sm:flex"
            >
              <Presentation className="size-[18px]" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom">Back to files</TooltipContent>
        </Tooltip>
        <div className="min-w-0 max-w-[min(28rem,36vw)]">
          <EditableTitle
            title={doc.title}
            onTitleChange={noop}
            documentId={doc.id}
            canRename={permissions.canRename}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 gap-1 px-2.5 text-[13px] font-medium text-muted-foreground"
            >
              File
              <ChevronDown className="size-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuItem
              disabled={importer.busy}
              onSelect={() => fileRef.current?.click()}
            >
              <FileUp />
              Import PowerPoint
              <DropdownMenuShortcut>.pptx</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={!commands}
              onSelect={() => void exportPptx()}
            >
              <FileDown />
              Download as PowerPoint
              <DropdownMenuShortcut>.pptx</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!commands}
              onSelect={() => commands?.print()}
            >
              <Printer />
              Download as PDF
              <DropdownMenuShortcut>Print</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!commands}
              onSelect={() => commands?.html()}
            >
              <Globe />
              Download as web page
              <DropdownMenuShortcut>.html</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <input
          ref={fileRef}
          type="file"
          accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void importer.run(file);
          }}
        />
        {!permissions.canEdit && (
          <span className="ml-1 hidden text-xs text-muted-foreground md:inline">
            View only
          </span>
        )}
        <span
          className={
            save === "error"
              ? "ml-1 text-xs text-destructive"
              : "ml-1 hidden text-xs text-muted-foreground sm:inline"
          }
        >
          {SAVE_LABEL[save]}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="flex items-center">
          <Button
            variant="outline"
            disabled={!commands}
            onClick={() => commands?.present("current")}
            className="h-10 rounded-l-full rounded-r-none border-r-0 pr-3 pl-4 font-display text-[15px] font-semibold tracking-tight"
            title="Present (F5)"
          >
            <Play className="fill-app text-app" />
            Present
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={!commands}
                aria-label="Presenting options"
                className="h-10 rounded-l-none rounded-r-full px-2.5"
              >
                <ChevronDown className="opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuItem onSelect={() => commands?.present("start")}>
                <Play />
                From the beginning
                <DropdownMenuShortcut>F5</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => commands?.present("current")}>
                <Play />
                From this slide
                <DropdownMenuShortcut>Shift+F5</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => commands?.present("presenter")}>
                <MonitorPlay />
                Presenter view
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {permissions.canShare && (
          <Button
            variant="app"
            onClick={() => setShare("open")}
            className="h-10 rounded-full px-4"
          >
            <Share2 />
            Share
          </Button>
        )}
      </div>
      {share !== "closed" && (
        <Suspense fallback={null}>
          <ShareDialog
            open={share === "open"}
            onOpenChange={(o) => setShare(o ? "open" : "mounted")}
            document={doc}
          />
        </Suspense>
      )}
    </div>
  );
}
