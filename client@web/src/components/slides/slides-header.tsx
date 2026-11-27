"use client";

import { useStore } from "@nanostores/react";
import { Lock, Presentation } from "lucide-react";
import { atom } from "nanostores";
import Link from "next/link";
import { lazy, Suspense, useEffect, useState } from "react";
import { useLiveDocument } from "@/components/editor/core/use-document-loader";
import { EditableTitle } from "@/components/editor/editable-title";
import { Button } from "@/components/ui/button";
import { useDocumentPermissions } from "@/hooks/use-document-permissions";

const ShareDialog = lazy(() => import("@/components/editor/share-dialog").then((m) => ({ default: m.ShareDialog })));

export type SlidesSaveStatus = "idle" | "saving" | "saved" | "error";
export const $slidesSave = atom<SlidesSaveStatus>("idle");

const SAVE_LABEL: Record<SlidesSaveStatus, string> = { idle: "", saving: "Saving...", saved: "Saved", error: "Save failed" };
const noop = () => {};

export function SlidesHeader({ documentId }: { documentId: string }) {
  const { document: doc } = useLiveDocument(documentId);
  const permissions = useDocumentPermissions(doc);
  const save = useStore($slidesSave);
  const [share, setShare] = useState<"closed" | "open" | "mounted">("closed");

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

  return (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <Link
          href="/home"
          aria-label="Back to documents"
          className="hidden size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:flex"
        >
          <Presentation className="size-[18px]" />
        </Link>
        <div className="min-w-0 max-w-[min(28rem,40vw)]">
          <EditableTitle title={doc.title} onTitleChange={noop} documentId={doc.id} canRename={permissions.canRename} />
        </div>
        {!permissions.canEdit && <span className="ml-1 hidden text-xs text-muted-foreground md:inline">View only</span>}
        <span className={save === "error" ? "ml-1 text-xs text-destructive" : "ml-1 hidden text-xs text-muted-foreground sm:inline"}>
          {SAVE_LABEL[save]}
        </span>
      </div>
      {permissions.canShare && (
        <Button onClick={() => setShare("open")} className="ml-1 shrink-0 px-3">
          <Lock className="hidden sm:block" />
          Share
        </Button>
      )}
      {share !== "closed" && (
        <Suspense fallback={null}>
          <ShareDialog open={share === "open"} onOpenChange={(o) => setShare(o ? "open" : "mounted")} document={doc} />
        </Suspense>
      )}
    </>
  );
}
