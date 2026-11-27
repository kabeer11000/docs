import { atom } from "nanostores";
import type { SaveStatus } from "@/components/app-header/app-header";

export const $pdfSave = atom<SaveStatus>({ state: "idle" });

export type ZoomMode = "auto" | "width" | "page" | number;
export type StampKind =
  | "Approved"
  | "Draft"
  | "Rejected"
  | "Confidential"
  | "Date";
export type InsertKind =
  | "text"
  | "rect"
  | "ellipse"
  | "line"
  | "arrow"
  | "note"
  | "image"
  | "signature"
  | "initials"
  | "date";

/** What the open PDF offers the title bar (set by the editor while it is mounted). */
export interface PdfCommands {
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  thumbnails: boolean;
  outline: boolean;
  hasOutline: boolean;
  undo: () => void;
  redo: () => void;
  deleteSelection: () => void;
  find: () => void;
  zoom: (z: ZoomMode | "in" | "out") => void;
  rotateView: () => void;
  toggleThumbnails: () => void;
  toggleOutline: () => void;
  insert: (k: InsertKind) => void;
  stamp: (k: StampKind) => void;
  rotatePages: (delta: 90 | -90) => void;
  deletePages: () => void;
  duplicatePages: () => void;
  insertBlank: () => void;
  insertFromPdf: () => void;
  extractPages: () => void;
  splitAfter: () => void;
  downloadPdf: () => void;
  downloadOriginal: () => void;
  print: () => void;
  convertToDoc: () => void;
}
export const $pdfCommands = atom<PdfCommands | null>(null);
