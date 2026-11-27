"use client";

import { useStore } from "@nanostores/react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { fileToSnapshot } from "@/components/sheet/sheet-files";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { fileToHtml, titleFromFilename } from "@/lib/export/import";
import { type FileKind, fileHref } from "@/lib/files";
import { showToast } from "@/lib/toast";
import { $auth } from "@/state/auth";
import { importKind, MAX_IMPORT_BYTES } from "./kinds";

export { IMPORT_ACCEPT } from "./kinds";

type CreateInput = { kind: FileKind; title: string; initialContent?: string; data?: unknown };

/** Reads one file into what a new file of its kind is created from. */
async function readFile(file: File): Promise<CreateInput> {
  const kind = importKind(file.name);
  if (!kind) throw new Error("This file type is not supported");
  if (file.size > MAX_IMPORT_BYTES) throw new Error("Files up to 25 MB can be imported");
  if (kind === "pdf") {
    const { pdfToHtml } = await import("./pdf");
    const html = await pdfToHtml(await file.arrayBuffer());
    if (!html) throw new Error("No text was found. Scanned PDFs are not supported yet.");
    return { kind: "doc", title: titleFromFilename(file.name), initialContent: html };
  }
  if (kind === "doc") {
    const { title, html } = await fileToHtml(file);
    return { kind: "doc", title, initialContent: html || "<p></p>" };
  }
  if (kind === "sheet") {
    const { title, data } = await fileToSnapshot(file);
    return { kind: "sheet", title, data };
  }
  let mod: typeof import("@/lib/slides/pptx-import");
  try {
    mod = await import("@/lib/slides/pptx-import");
  } catch {
    throw new Error("PowerPoint import is not available in this version");
  }
  const deck = await mod.pptxToDeck(await file.arrayBuffer());
  return { kind: "slides", title: titleFromFilename(file.name), data: deck };
}

// CONTRACT (owned by the import agent): import any supported file as a new file and open it.
// pdf -> PDF editor, docx/md/html/txt -> doc, xlsx/csv -> sheet, pptx -> slides.
export function useImportFiles(): { importFiles: (files: FileList | File[], folderId?: string) => Promise<void>; busy: boolean } {
  const router = useRouter();
  const { createDocument } = useCloudStore();
  const { user } = useStore($auth);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);

  const importFiles = useCallback(
    async (input: FileList | File[], folderId?: string) => {
      const files = Array.from(input);
      if (!files.length || running.current) return;
      if (!user) {
        showToast.error("Sign in to import files");
        return;
      }
      running.current = true;
      setBusy(true);
      const created: Array<{ id: string; kind: FileKind }> = [];
      const failed: string[] = [];
      const toastId = showToast.loading(files.length === 1 ? `Importing ${files[0].name}...` : `Importing ${files.length} files...`);
      try {
        for (const file of files) {
          try {
            // PDFs open in the PDF editor (bytes go to the blob store); "Convert to document" lives there.
            if (importKind(file.name) === "pdf") {
              const { createPdfFile } = await import("@/lib/pdf/create");
              created.push({ id: await createPdfFile(file, folderId || user.id), kind: "pdf" });
              continue;
            }
            const { kind, title, initialContent, data } = await readFile(file);
            const id = await createDocument({ kind, title, folderId: folderId || user.id, initialContent, data });
            if (!id) throw new Error("The file could not be created. Check your connection and try again.");
            created.push({ id, kind });
          } catch (error) {
            failed.push(file.name);
            showToast.error(`Could not import ${file.name}`, error instanceof Error ? error.message : undefined);
          }
        }
      } finally {
        toast.dismiss(toastId);
        running.current = false;
        setBusy(false);
      }
      if (files.length === 1 && created.length === 1) {
        router.push(fileHref(created[0].id, created[0].kind));
        return;
      }
      if (created.length) {
        showToast.success(
          created.length === 1 ? "Imported 1 file" : `Imported ${created.length} files`,
          failed.length ? `${failed.length} could not be imported` : undefined,
        );
      }
    },
    [user, createDocument, router],
  );

  return { importFiles, busy };
}
