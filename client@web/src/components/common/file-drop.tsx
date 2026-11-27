"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { importKind } from "@/lib/import/kinds";
import { useImportFiles } from "@/lib/import/use-import-files";
import { fileHref } from "@/lib/files";
import { showToast } from "@/lib/toast";

const EDITOR_PATH = /^\/(document|sheet|slides|pdf)\/[^/]+$/;
const isImage = (f: File) => f.type.startsWith("image/");
const hasFiles = (e: DragEvent) => !!e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files");

/** Images dropped onto a document page or a slide belong to that editor (they insert the image). */
function editorTakesIt(e: DragEvent, files: File[] | null) {
  const target = e.target as Element | null;
  const overCanvas = !!target?.closest(".ProseMirror, [data-slide-canvas]");
  if (!overCanvas) return false;
  // During dragover the file list is not readable; item types are.
  if (!files) return Array.from(e.dataTransfer?.items ?? []).every((i) => i.kind === "file" && i.type.startsWith("image/"));
  return files.length > 0 && files.every(isImage);
}

/**
 * In any editor, dropping a file that is not an image for the page opens it as a new file
 * (document, spreadsheet, presentation or PDF) in a new tab.
 */
export function EditorFileDrop() {
  const pathname = usePathname() ?? "";
  const active = EDITOR_PATH.test(pathname);
  const { importFiles } = useImportFiles();
  const [over, setOver] = useState(false);
  const depth = useRef(0);

  useEffect(() => {
    if (!active) return;
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e) || editorTakesIt(e, null)) return;
      depth.current++;
      setOver(true);
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setOver(false);
    };
    const onOver = (e: DragEvent) => {
      if (!hasFiles(e) || editorTakesIt(e, null)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const onDrop = (e: DragEvent) => {
      depth.current = 0;
      setOver(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (!files.length || editorTakesIt(e, files)) return;
      e.preventDefault();
      e.stopPropagation();
      const supported = files.filter((f) => importKind(f.name));
      if (!supported.length) {
        showToast.error("This file type can't be opened", "Docs opens documents, spreadsheets, presentations and PDFs.");
        return;
      }
      // Open the tab now, inside the drop gesture, so popup blockers allow it; point it at the
      // new file once it exists.
      const tab = window.open("", "_blank");
      void importFiles(supported, undefined, { navigate: false }).then((created) => {
        const first = created[0];
        if (!first) {
          tab?.close();
          return;
        }
        const href = fileHref(first.id, first.kind);
        if (tab && !tab.closed) tab.location.href = href;
        else window.open(href, "_blank");
        if (created.length > 1) showToast.success(`${created.length} files imported`, "The others are on Home.");
      });
    };
    window.addEventListener("dragenter", onEnter, true);
    window.addEventListener("dragleave", onLeave, true);
    window.addEventListener("dragover", onOver, true);
    window.addEventListener("drop", onDrop, true);
    return () => {
      window.removeEventListener("dragenter", onEnter, true);
      window.removeEventListener("dragleave", onLeave, true);
      window.removeEventListener("dragover", onOver, true);
      window.removeEventListener("drop", onDrop, true);
    };
  }, [active, importFiles]);

  if (!active || !over) return null;
  return (
    <div className="pointer-events-none fixed inset-3 z-[60] flex items-center justify-center rounded-[18px] border-2 border-dashed border-foreground/25 bg-background/70">
      <div className="rounded-[14px] bg-card px-5 py-3 text-center shadow-float">
        <p className="font-display text-[15px] font-semibold text-foreground">Drop to open in a new tab</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Documents, spreadsheets, presentations and PDFs</p>
      </div>
    </div>
  );
}
