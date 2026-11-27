import type { FileKind } from "@/lib/files";

/** The template gallery, opened on one kind's tab, creating new files in `folderId` (default: the user's root). */
export function templatesHref(
  kind: FileKind = "doc",
  folderId?: string | null,
): string {
  const params = new URLSearchParams({ kind });
  if (folderId) params.set("folderId", folderId);
  return `/templates?${params}`;
}
