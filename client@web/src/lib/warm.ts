import type { FileKind } from "@/lib/files";

// Intent warm-up for opening a file (hover / focus on its card). Kept tiny: the live-room code
// (provider, Yjs) loads on first use, so callers like Home do not ship it up front.

/** Pre-opens the file's live room so its editor starts already connected. Safe to call repeatedly. */
export function warmFile(id: string, kind: FileKind) {
  if (kind !== "doc" && kind !== "slides") return;
  void import("./collab-room").then((m) => m.warmRoom(id)).catch(() => {});
}
