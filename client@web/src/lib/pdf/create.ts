// New PDF files: the row (kind "pdf", small JSON model) plus the bytes in the blob store.
import type { DocumentCreateInput } from "@shared-types";
import { createFile } from "@/hooks/use-cloudstore";
import { $auth } from "@/state/auth";
import { deleteForever } from "@/state/file-actions";
import { openPdf, sha256Hex, uploadPdfBytes } from "./client";
import { initialData, isPdfBytes, MAX_PDF_BYTES } from "./model";

/** Reads a PDF the user picked, checks it and counts its pages. */
export async function readPdfFile(
  file: File,
): Promise<{ bytes: Uint8Array; pageCount: number }> {
  if (file.size > MAX_PDF_BYTES)
    throw new Error("PDFs up to 15 MB are supported");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isPdfBytes(bytes)) throw new Error("This is not a PDF file");
  let pdf: Awaited<ReturnType<typeof openPdf>>;
  try {
    pdf = await openPdf(bytes);
  } catch (e) {
    const name = (e as { name?: string } | null)?.name;
    throw new Error(
      name === "PasswordException"
        ? "Password-protected PDFs are not supported yet"
        : "This PDF could not be read",
    );
  }
  const pageCount = pdf.numPages;
  void pdf.destroy();
  return { bytes, pageCount };
}

/**
 * Creates a PDF file from `file` in `folderId` (default: the user's root) and returns its id.
 * Throws with a readable message when the file is not a usable PDF or the upload fails.
 */
export async function createPdfFile(
  file: File,
  folderId?: string,
): Promise<string> {
  const user = $auth.get().user;
  if (!user) throw new Error("Sign in to upload files");
  const { bytes, pageCount } = await readPdfFile(file);
  const sha256 = await sha256Hex(bytes);
  const data = initialData({ sha256, size: bytes.length, pageCount });
  const title = file.name.replace(/\.pdf$/i, "").trim() || "Untitled PDF";
  // kind "pdf" is not in the shared Document type yet; the row format is the same as sheets/slides.
  const id = await createFile(user, {
    kind: "pdf" as DocumentCreateInput["kind"],
    title,
    folderId: folderId || user.id,
    data,
  });
  try {
    await uploadPdfBytes(id, bytes);
  } catch (e) {
    await deleteForever([{ id, type: "file" }], { quiet: true }).catch(
      () => {},
    );
    throw e;
  }
  return id;
}
