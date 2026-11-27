"use client";

import { useStore } from "@nanostores/react";
import { Lock, Sheet, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { fileHref } from "@/lib/files";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { downloadSheet, fileToSnapshot, SHEET_IMPORT_ACCEPT } from "./sheet-files";
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
  const router = useRouter();
  const { updateDocument, createDocument } = useCloudStore();
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

  const importFile = async (file: File) => {
    try {
      const { title, data } = await fileToSnapshot(file);
      const id = await createDocument({ kind: "sheet", title, data });
      if (!id) throw new Error("Could not create the spreadsheet");
      showToast.success(`Imported as "${title}"`);
      router.push(fileHref(id, "sheet"));
    } catch (error) {
      showToast.error("Import failed", error instanceof Error ? error.message : undefined);
    }
  };

  const download = async (kind: "csv" | "xlsx") => {
    if (!engine) return;
    try {
      await downloadSheet(kind, doc.title, engine.activeSheet());
    } catch (error) {
      showToast.error("Download failed", error instanceof Error ? error.message : undefined);
    }
  };

  return (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <Link
          href="/home"
          aria-label="Back to files"
          className="hidden size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:flex"
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
            <DropdownMenuItem onSelect={() => fileInput.current?.click()}>Import .xlsx or .csv...</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={!engine || !permissions.canDownload} onSelect={() => download("xlsx")}>
              Download sheet as Excel
              <span className="ml-auto pl-4 text-xs text-muted-foreground">.xlsx</span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!engine || !permissions.canDownload} onSelect={() => download("csv")}>
              Download sheet as CSV
              <span className="ml-auto pl-4 text-xs text-muted-foreground">.csv</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {!permissions.canEdit && <span className="ml-1 hidden shrink-0 text-xs text-muted-foreground md:inline">View only</span>}
        <SaveIndicator />
      </div>

      {permissions.canShare && (
        <Button onClick={() => setShare({ mounted: true, open: true })} className="ml-1 shrink-0 px-3">
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
        accept={SHEET_IMPORT_ACCEPT}
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

const statusClass = "ml-1 hidden shrink-0 text-xs sm:inline";

function SaveIndicator() {
  const { status, error } = useStore($sheetSave);
  if (status === "saving") return <span className={cn(statusClass, "text-muted-foreground")}>Saving...</span>;
  if (status === "saved") return <span className={cn(statusClass, "text-muted-foreground")}>Saved</span>;
  if (status === "error") {
    return (
      <span className={cn(statusClass, "text-destructive")} title={error ?? undefined}>
        Save failed, retrying
      </span>
    );
  }
  return null;
}
