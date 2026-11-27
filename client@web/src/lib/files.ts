import type { Document } from "@shared-types";
import { $documents } from "@/state/cloudstore-data";

/** Every file is a row in the documents collection; `kind` says which app opens it. */
export type FileKind = "doc" | "sheet" | "slides";

const ROUTE: Record<FileKind, string> = { doc: "document", sheet: "sheet", slides: "slides" };

export const KIND_LABEL: Record<FileKind, string> = {
  doc: "Document",
  sheet: "Spreadsheet",
  slides: "Presentation",
};

export const fileKind = (doc?: Pick<Document, "kind"> | null): FileKind => doc?.kind ?? "doc";

export const fileHref = (id: string, kind: FileKind = "doc") => `/${ROUTE[kind]}/${id}`;

/** URL for a file id, using its kind when the file is in the loaded list (falls back to the doc editor, which redirects). */
export const hrefForId = (id: string) => fileHref(id, fileKind($documents.get().find((d) => d.id === id)));
