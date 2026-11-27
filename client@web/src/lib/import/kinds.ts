export const IMPORT_ACCEPT = ".docx,.pdf,.md,.markdown,.html,.htm,.txt,.xlsx,.csv,.pptx";

export const MAX_IMPORT_BYTES = 25 * 1024 * 1024;

export type ImportKind = "doc" | "pdf" | "sheet" | "slides";

const KINDS: Record<string, ImportKind> = {
  docx: "doc",
  md: "doc",
  markdown: "doc",
  html: "doc",
  htm: "doc",
  txt: "doc",
  pdf: "pdf",
  xlsx: "sheet",
  csv: "sheet",
  pptx: "slides",
};

/** Which importer handles a file, by extension (null when unsupported). */
export function importKind(name: string): ImportKind | null {
  const ext = name.includes(".") ? (name.split(".").pop() ?? "").toLowerCase() : "";
  return KINDS[ext] ?? null;
}
