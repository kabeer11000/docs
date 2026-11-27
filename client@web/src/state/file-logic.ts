// Pure helpers behind Home file management (no stores, no DOM), so they can be unit tested.

export const TRASH_DAYS = 30;
const DAY_MS = 86_400_000;

type Trashable = { trashedAt?: string | null };
type FolderLike = Trashable & { id: string; name?: string; parents?: string[] };
type DocLike = Trashable & {
  id: string;
  parents?: string[];
  location?: string;
};

export const isTrashed = (row: Trashable) => !!row.trashedAt;

export const parentOf = (row: { parents?: string[]; location?: string }) =>
  row.parents?.at(-1) || row.location;

/**
 * Rows that should be listed: not trashed and not inside a trashed folder. Trashing a folder only marks the
 * folder, so its contents disappear and come back with it.
 */
export function visibleTree<F extends FolderLike, D extends DocLike>(
  folders: F[],
  docs: D[],
) {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const hidden = new Map<string, boolean>();
  const folderHidden = (id: string | undefined, depth = 0): boolean => {
    if (!id) return false;
    const cached = hidden.get(id);
    if (cached !== undefined) return cached;
    const f = byId.get(id);
    // Unknown ids (the root, folders past the query limit) count as visible; depth guards against cycles.
    const result =
      !!f &&
      depth < 64 &&
      (isTrashed(f) || folderHidden(parentOf(f), depth + 1));
    hidden.set(id, result);
    return result;
  };
  return {
    folders: folders.filter((f) => !folderHidden(f.id)),
    docs: docs.filter((d) => !isTrashed(d) && !folderHidden(parentOf(d))),
  };
}

/** Trashed rows older than `days` (deleted forever when the Trash view opens). */
export function expiredTrash<T extends Trashable>(
  rows: T[],
  now = Date.now(),
  days = TRASH_DAYS,
): T[] {
  return rows.filter(
    (r) => r.trashedAt && now - new Date(r.trashedAt).getTime() > days * DAY_MS,
  );
}

export type Patch = Record<string, unknown>;

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Applies optimistic patches (by id) over server rows. */
export function applyPatches<T extends { id: string }>(
  rows: T[],
  patches: Record<string, Patch>,
): T[] {
  if (!Object.keys(patches).length) return rows;
  return rows.map((r) => (patches[r.id] ? { ...r, ...patches[r.id] } : r));
}

/** Ids whose patch the server rows now reflect, so the patch can be dropped. */
export function settledPatches(
  rows: { id: string }[],
  patches: Record<string, Patch>,
): string[] {
  const byId = new Map(rows.map((r) => [r.id, r as Record<string, unknown>]));
  return Object.entries(patches)
    .filter(([id, patch]) => {
      const row = byId.get(id);
      return row && Object.entries(patch).every(([k, v]) => same(row[k], v));
    })
    .map(([id]) => id);
}

/** The given folders and every folder below them. */
export function withDescendants(
  folders: FolderLike[],
  ids: string[],
): Set<string> {
  const out = new Set(ids);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of folders) {
      if (!out.has(f.id) && f.parents?.some((p) => out.has(p))) {
        out.add(f.id);
        grew = true;
      }
    }
  }
  return out;
}

/** Folder tree under `rootId` flattened in display order (children sorted by name), with depth. */
export function flattenTree<F extends FolderLike>(
  folders: F[],
  rootId: string,
): { folder: F; depth: number }[] {
  const children = new Map<string, F[]>();
  for (const f of folders) {
    const p = parentOf(f) ?? rootId;
    children.set(p, [...(children.get(p) ?? []), f]);
  }
  const out: { folder: F; depth: number }[] = [];
  const seen = new Set<string>();
  const walk = (id: string, depth: number) => {
    const kids = [...(children.get(id) ?? [])].sort((a, b) =>
      (a.name ?? "").localeCompare(b.name ?? ""),
    );
    for (const f of kids) {
      if (seen.has(f.id)) continue;
      seen.add(f.id);
      out.push({ folder: f, depth });
      walk(f.id, depth + 1);
    }
  };
  walk(rootId, 0);
  return out;
}

/** Ids from the anchor to the target (inclusive) in display order; just the target when the anchor is gone. */
export function rangeIds(
  order: string[],
  anchor: string | null,
  target: string,
): string[] {
  const to = order.indexOf(target);
  if (to < 0) return [];
  const from = anchor ? order.indexOf(anchor) : -1;
  if (from < 0) return [target];
  const [a, b] = from < to ? [from, to] : [to, from];
  return order.slice(a, b + 1);
}

export type Box = { left: number; top: number; width: number; height: number };
export type NavKey =
  | "ArrowLeft"
  | "ArrowRight"
  | "ArrowUp"
  | "ArrowDown"
  | "Home"
  | "End";

/**
 * Index to focus after an arrow key, from the items' boxes in reading order. Left/right step through the
 * order; up/down pick the nearest row above/below and the item closest in x, so it works across grids with
 * different column counts and in lists.
 */
export function nextIndex(boxes: Box[], from: number, key: NavKey): number {
  const n = boxes.length;
  if (!n) return -1;
  if (from < 0 || from >= n) return 0;
  if (key === "Home") return 0;
  if (key === "End") return n - 1;
  if (key === "ArrowLeft") return Math.max(0, from - 1);
  if (key === "ArrowRight") return Math.min(n - 1, from + 1);
  const cur = boxes[from];
  const cx = cur.left + cur.width / 2;
  const down = key === "ArrowDown";
  const EPS = 2;
  let rowTop: number | null = null;
  let best = from;
  let bestDx = Number.POSITIVE_INFINITY;
  for (let i = 0; i < n; i++) {
    const b = boxes[i];
    const beyond = down
      ? b.top >= cur.top + cur.height - EPS
      : b.top + b.height <= cur.top + EPS;
    if (!beyond || i === from) continue;
    // Nearest row first, then nearest centre within it.
    const closer =
      rowTop === null || (down ? b.top < rowTop - EPS : b.top > rowTop + EPS);
    const sameRow = rowTop !== null && Math.abs(b.top - rowTop) <= EPS;
    if (!closer && !sameRow) continue;
    const dx = Math.abs(b.left + b.width / 2 - cx);
    if (closer) {
      rowTop = b.top;
      best = i;
      bestDx = dx;
    } else if (dx < bestDx) {
      best = i;
      bestDx = dx;
    }
  }
  return best;
}

export const intersects = (a: Box, b: Box) =>
  a.left < b.left + b.width &&
  b.left < a.left + a.width &&
  a.top < b.top + b.height &&
  b.top < a.top + a.height;

/** Normalised box between two pointer positions. */
export const boxBetween = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): Box => ({
  left: Math.min(x1, x2),
  top: Math.min(y1, y2),
  width: Math.abs(x2 - x1),
  height: Math.abs(y2 - y1),
});
