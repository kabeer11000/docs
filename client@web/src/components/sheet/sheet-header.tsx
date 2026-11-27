"use client";

import { useStore } from "@nanostores/react";
import { BarChart3, Lock, Sheet, Star } from "lucide-react";
import Link from "next/link";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useLiveDocument } from "@/components/editor/core/use-document-loader";
import { EditableTitle } from "@/components/editor/editable-title";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { useDocumentPermissions } from "@/hooks/use-document-permissions";
import { IMPORT_ACCEPT, useImportFiles } from "@/lib/import/use-import-files";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { downloadSheet } from "./sheet-files";
import { $sheetEngine, $sheetSave } from "./sheet-state";

const ShareDialog = lazy(() => import("@/components/editor/share-dialog").then((m) => ({ default: m.ShareDialog })));

const noop = () => {};

export const sheetHeaderPlaceholder = (
  <div className="flex w-full items-center justify-between gap-4">
    <div className="flex items-center gap-2">
      <div className="hidden size-8 sm:block" />
      <div className="h-5 w-48 animate-pulse rounded-sm bg-muted" />
    </div>
    <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
  </div>
);

export function SheetHeader({ documentId }: { documentId: string }) {
  const { updateDocument } = useCloudStore();
  const { importFiles, busy: importing } = useImportFiles();
  const { document: doc } = useLiveDocument(documentId);
  const permissions = useDocumentPermissions(doc);
  const engine = useStore($sheetEngine);
  const [share, setShare] = useState({ mounted: false, open: false });
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (doc?.title) document.title = `${doc.title} - Sheets`;
  }, [doc?.title]);

  if (!doc) return sheetHeaderPlaceholder;

  const toggleStar = async () => {
    const starred = !doc.isStarred;
    const ok = await updateDocument(doc.id, { isStarred: starred, updatedAt: new Date().toISOString() }).catch(() => false);
    if (ok) showToast.success(starred ? "Added to starred" : "Removed from starred");
    else showToast.error("Failed to update spreadsheet");
  };

  const download = async (kind: "csv" | "xlsx" | "pdf") => {
    if (!engine) return;
    try {
      await downloadSheet(kind, doc.title, engine.activeSheet());
    } catch (error) {
      showToast.error("Download failed", error instanceof Error ? error.message : undefined);
    }
  };

  return (
    <div data-app="sheet" className="contents">
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <Link
          href="/home"
          aria-label="Back to files"
          className="press mr-1 hidden size-8 shrink-0 items-center justify-center rounded-[10px] bg-app-soft text-app sm:flex"
        >
          <Sheet className="size-[18px]" />
        </Link>
        <div className="min-w-0 max-w-[min(28rem,40vw)]">
          <EditableTitle title={doc.title} onTitleChange={noop} documentId={doc.id} canRename={permissions.canRename} />
        </div>
        <Tooltip delayDuration={400}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleStar}
              aria-label={doc.isStarred ? "Remove from starred" : "Add to starred"}
              aria-pressed={!!doc.isStarred}
              className="shrink-0 text-muted-foreground"
            >
              <Star className={cn(doc.isStarred && "fill-current text-foreground")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{doc.isStarred ? "Starred" : "Star"}</TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 shrink-0 px-2 text-[13px] font-normal text-muted-foreground">
              File
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem disabled={importing} onSelect={() => fileInput.current?.click()}>
              Import a file...
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={!engine || !permissions.canDownload} onSelect={() => download("xlsx")}>
              Download sheet as Excel
              <span className="ml-auto pl-4 text-xs text-muted-foreground">.xlsx</span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!engine || !permissions.canDownload} onSelect={() => download("csv")}>
              Download sheet as CSV
              <span className="ml-auto pl-4 text-xs text-muted-foreground">.csv</span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!engine || !permissions.canDownload} onSelect={() => download("pdf")}>
              Download sheet as PDF
              <span className="ml-auto pl-4 text-xs text-muted-foreground">.pdf</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {permissions.canEdit && (
          <Tooltip delayDuration={400}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                disabled={!engine}
                onClick={() => engine?.insertChart()}
                className="press h-8 shrink-0 gap-1.5 px-2 text-[13px] font-normal text-muted-foreground"
              >
                <BarChart3 className="size-4" />
                <span className="hidden md:inline">Chart</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Insert a chart of the selected cells</TooltipContent>
          </Tooltip>
        )}
        {!permissions.canEdit && <span className="ml-1 hidden shrink-0 text-xs text-muted-foreground md:inline">View only</span>}
        <SaveIndicator />
      </div>

      {permissions.canShare && (
        <Button variant="app" onClick={() => setShare({ mounted: true, open: true })} className="press ml-1 shrink-0 px-3">
          <Lock className="hidden sm:block" />
          Share
        </Button>
      )}

      {share.mounted && (
        <Suspense fallback={null}>
          <ShareDialog open={share.open} onOpenChange={(open) => setShare({ mounted: true, open })} document={doc} />
        </Suspense>
      )}
      <input
        ref={fileInput}
        type="file"
        multiple
        accept={IMPORT_ACCEPT}
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) void importFiles(files);
        }}
      />
    </div>
  );
}

const SAVE_LABEL = { saving: "Saving...", saved: "Saved", error: "Save failed, retrying" } as const;

/** A small dot next to the title: jade when saved, pulsing while saving, red (with text) when a save failed. */
function SaveIndicator() {
  const { status, error } = useStore($sheetSave);
  if (status === "idle") return null;
  return (
    <output title={status === "error" ? (error ?? undefined) : SAVE_LABEL[status]} className="ml-1.5 flex shrink-0 items-center gap-1.5 text-xs">
      <span
        aria-hidden="true"
        className={cn(
          "size-2 rounded-full transition-colors",
          status === "saved" && "bg-app",
          status === "saving" && "animate-pulse bg-muted-foreground/60 motion-reduce:animate-none",
          status === "error" && "bg-destructive",
        )}
      />
      <span className={status === "error" ? "text-destructive" : "sr-only"}>{SAVE_LABEL[status]}</span>
    </output>
  );
}
