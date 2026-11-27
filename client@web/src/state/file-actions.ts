import type { Document, IFolderItem } from "@shared-types";
import { nanoid } from "nanoid";
import { atom } from "nanostores";
import { toast } from "sonner";
import cloudStore from "@/lib/cloudstore";
import { hrefForId } from "@/lib/files";
import { $auth } from "./auth";
import {
  $documentsLive,
  $folders,
  $rawDocuments,
  $rawFolders,
  dropPatches,
  patchRows,
} from "./cloudstore-data";
import { type Patch, parentOf, withDescendants } from "./file-logic";
import { offerUndo } from "./undo";

// One place for what Home can do to files and folders, usable from menus, keyboard, drag and drop and
// the selection bar alike. Edits are optimistic (patched into the stores first) and reverted on failure.

export type ItemType = "file" | "folder";
export interface ItemRef {
  id: string;
  type: ItemType;
}

// ---------------------------------------------------------------------------
// UI state shared by every file surface on the page
// ---------------------------------------------------------------------------

export const $selection = atom<string[]>([]);
/** Where Shift+click / Shift+arrow ranges start. */
export const $anchor = atom<string | null>(null);
/** Item whose name is being edited inline. */
export const $renaming = atom<string | null>(null);
/** Items that just appeared (new folder, copy), briefly highlighted. */
export const $fresh = atom<string[]>([]);
export const $moveRefs = atom<ItemRef[] | null>(null);
export const $shareId = atom<string | null>(null);
export const $shortcutsOpen = atom(false);
export const $newMenuOpen = atom(false);

export function select(
  ids: string[],
  anchor: string | null = ids.at(-1) ?? null,
) {
  $selection.set(ids);
  $anchor.set(anchor);
}

export function toggleSelected(id: string) {
  const sel = $selection.get();
  $selection.set(sel.includes(id) ? sel.filter((s) => s !== id) : [...sel, id]);
  $anchor.set(id);
}

export const clearSelection = () => select([], null);

export function markFresh(id: string) {
  $fresh.set([...$fresh.get(), id]);
  setTimeout(() => $fresh.set($fresh.get().filter((f) => f !== id)), 4000);
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

const folderRow = (id: string) => $rawFolders.get().find((f) => f.id === id);
const docRow = (id: string) => $rawDocuments.get().find((d) => d.id === id);
/** For actions that copy or export content: rows restored from the IndexedDB cache may be stale. */
const liveDocRow = (id: string) => ($documentsLive.get() ? docRow(id) : undefined);

/** Folder when it is one of the user's folders, otherwise a file. */
export const refFor = (id: string): ItemRef => ({
  id,
  type: folderRow(id) ? "folder" : "file",
});

/** The user's own rows are the ones the owner watchers loaded; shared files are not theirs to move or trash. */
export const isOwned = (ref: ItemRef) =>
  !!(ref.type === "folder" ? folderRow(ref.id) : docRow(ref.id));

export const itemHref = (ref: ItemRef) =>
  ref.type === "folder" ? `/folder/${ref.id}` : hrefForId(ref.id);

const rootId = () => $auth.get().user?.id ?? "";

export function folderName(id: string) {
  if (id === rootId()) return "Vault";
  return folderRow(id)?.name ?? "folder";
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

const collectionOf = (type: ItemType) =>
  type === "folder" ? "folders" : "documents";

async function write(ref: ItemRef, data: Record<string, unknown>) {
  await cloudStore
    .collection(collectionOf(ref.type))
    .update(cloudStore.query.where("id", "EQUAL", ref.id), data);
}

/**
 * Patches the stores right away, then writes. Failed items get their patch dropped (so they snap back).
 * Returns whether every write succeeded.
 */
async function optimistic(
  refs: ItemRef[],
  patchFor: (ref: ItemRef) => Patch,
  extra: (ref: ItemRef) => Patch = () => ({}),
) {
  const patches = new Map(refs.map((r) => [r.id, patchFor(r)]));
  for (const r of refs) patchRows([r.id], patches.get(r.id) ?? {});
  const results = await Promise.allSettled(
    refs.map((r) => write(r, { ...patches.get(r.id), ...extra(r) })),
  );
  const failed = refs.filter((_, i) => results[i].status === "rejected");
  if (failed.length) {
    console.error("[files] write failed", results);
    dropPatches(failed.map((r) => r.id));
  }
  return failed.length === 0;
}

const touched = (ref: ItemRef): Patch =>
  ref.type === "folder"
    ? { "timestamp.updatedAt": new Date().toISOString() }
    : { updatedAt: new Date().toISOString() };

const parentFor = (ref: ItemRef) => {
  const row = ref.type === "folder" ? folderRow(ref.id) : docRow(ref.id);
  return (row && parentOf(row)) || rootId();
};

/** Moves items to Trash with an Undo toast. */
export async function trash(refs: ItemRef[]) {
  const own = refs.filter(isOwned);
  if (!own.length) {
    if (refs.length) toast.error("Only your own files can be moved to Trash");
    return;
  }
  const ids = new Set(own.map((r) => r.id));
  $selection.set($selection.get().filter((id) => !ids.has(id)));
  const parents = new Map(own.map((r) => [r.id, parentFor(r)]));
  const trashedAt = new Date().toISOString();
  offerUndo(
    own.length === 1 ? "Moved to Trash" : `${own.length} items moved to Trash`,
    () =>
      restore(
        own.map((r) => ({ ...r, parent: parents.get(r.id) })),
        { quiet: true },
      ),
  );
  const ok = await optimistic(own, (r) => ({
    trashedAt,
    trashedFrom: parents.get(r.id),
  }));
  if (!ok) toast.error("Some items could not be moved to Trash");
}

export type RestoreItem = ItemRef & { parent?: string };

/** Takes items out of Trash, back to their folder, or to the Vault when that folder is gone. */
export async function restore(items: RestoreItem[], { quiet = false } = {}) {
  if (!items.length) return;
  const root = rootId();
  // ponytail: "gone" means not among the loaded folders (limit 100); a deeper folder sends items to the Vault.
  const alive = new Set([root, ...$folders.get().map((f) => f.id)]);
  const gone = (i: RestoreItem) => !!i.parent && !alive.has(i.parent);
  const ok = await optimistic(items, (i) => {
    const item = i as RestoreItem;
    if (!gone(item)) return { trashedAt: null };
    return item.type === "folder"
      ? { trashedAt: null, parents: [root] }
      : { trashedAt: null, parents: [root], location: root };
  });
  if (!ok) toast.error("Some items could not be restored");
  else if (!quiet)
    toast(items.length === 1 ? "Restored" : `${items.length} items restored`);
}

async function removeFolderTree(id: string) {
  const folders = cloudStore.collection("folders");
  // EQUAL on an array field matches any element (Mongo semantics).
  const children = (await folders.get(
    cloudStore.query.where("parents", "EQUAL", id),
  )) as IFolderItem[];
  for (const child of children) await removeFolderTree(child.id);
  await cloudStore
    .collection("documents")
    .remove(cloudStore.query.where("parents", "EQUAL", id));
  await folders.remove(cloudStore.query.where("id", "EQUAL", id));
}

/** Hard delete of one file. */
export const removeFile = (id: string) =>
  cloudStore
    .collection("documents")
    .remove(cloudStore.query.where("id", "EQUAL", id));

/** Hard delete, folders with everything inside them. Callers confirm first. */
export async function deleteForever(refs: ItemRef[], { quiet = false } = {}) {
  if (!refs.length) return true;
  const results = await Promise.allSettled(
    refs.map((r) =>
      r.type === "folder" ? removeFolderTree(r.id) : removeFile(r.id),
    ),
  );
  dropPatches(refs.map((r) => r.id));
  const ok = results.every((r) => r.status === "fulfilled");
  if (!ok) toast.error("Some items could not be deleted");
  else if (!quiet)
    toast(
      refs.length === 1
        ? "Deleted forever"
        : `${refs.length} items deleted forever`,
    );
  return ok;
}

/** Moves items into a folder (or the Vault root) with an Undo toast. Folders never go inside themselves. */
export async function moveTo(
  refs: ItemRef[],
  target: string,
  { quiet = false } = {},
) {
  const blocked = withDescendants(
    $rawFolders.get(),
    refs.filter((r) => r.type === "folder").map((r) => r.id),
  );
  const moving = refs.filter(
    (r) => isOwned(r) && !blocked.has(target) && parentFor(r) !== target,
  );
  if (!moving.length) {
    if (blocked.has(target)) toast.error("A folder cannot go inside itself");
    return;
  }
  const from = new Map(moving.map((r) => [r.id, parentFor(r)]));
  const ok = await optimistic(moving, (r) =>
    r.type === "folder"
      ? { parents: [target] }
      : { parents: [target], location: target },
  );
  if (!ok) {
    toast.error("Some items could not be moved");
    return;
  }
  if (quiet) return;
  offerUndo(`Moved to ${folderName(target)}`, async () => {
    const byParent = new Map<string, ItemRef[]>();
    for (const r of moving)
      byParent.set(from.get(r.id) ?? "", [
        ...(byParent.get(from.get(r.id) ?? "") ?? []),
        r,
      ]);
    for (const [parent, group] of byParent)
      if (parent) await moveTo(group, parent, { quiet: true });
  });
}

export async function rename(ref: ItemRef, name: string) {
  const next = name.trim();
  if (!next) return;
  const field = ref.type === "folder" ? "name" : "title";
  const row = ref.type === "folder" ? folderRow(ref.id) : docRow(ref.id);
  if (row && (row as unknown as Record<string, unknown>)[field] === next)
    return;
  const ok = await optimistic([ref], () => ({ [field]: next }), touched);
  if (!ok) toast.error("Could not rename");
}

export async function setStarred(refs: ItemRef[], starred: boolean) {
  const own = refs.filter(isOwned);
  if (!own.length) return;
  const ok = await optimistic(own, () => ({ isStarred: starred }));
  if (!ok) toast.error("Could not update Starred");
  else toast(starred ? "Added to Starred" : "Removed from Starred");
}

/** Every given item is starred (so the action is "Unstar"). */
export const allStarred = (refs: ItemRef[]) =>
  refs.length > 0 &&
  refs.every(
    (r) => !!(r.type === "folder" ? folderRow(r.id) : docRow(r.id))?.isStarred,
  );

/** Builds and inserts an empty folder. */
export async function insertFolder(
  parent: string,
  name = "Untitled folder",
): Promise<string> {
  const owner = rootId();
  const now = new Date().toISOString();
  const folder: IFolderItem = {
    id: nanoid(),
    name,
    tags: [],
    category: "general",
    parents: [parent || owner],
    meta: { fileCount: 0, color: "hsl(142.1 76.2% 36.3%)", icon: "folder" },
    permissions: {
      owner,
      canRead: true,
      canWrite: true,
      canDelete: true,
      sharedWith: [],
    },
    timestamp: { createdAt: now, updatedAt: now },
    isStarred: false,
  };
  await cloudStore.collection("folders").insert(folder);
  return folder.id;
}

/** New folder that lands highlighted with its name ready to type. */
export async function newFolder(parent: string) {
  try {
    const id = await insertFolder(parent);
    markFresh(id);
    $renaming.set(id);
    select([id]);
    return id;
  } catch (error) {
    console.error("[files] create folder", error);
    toast.error("Could not create the folder");
    return null;
  }
}

/** Copy of a file next to the original. */
export async function duplicate(ref: ItemRef) {
  const original = liveDocRow(ref.id);
  if (ref.type !== "file" || !original) return;
  const {
    _id,
    published: _published,
    ...rest
  } = original as Document & { _id?: unknown };
  const now = new Date().toISOString();
  const copy: Document = {
    ...rest,
    id: nanoid(),
    title: `Copy of ${original.title || "Untitled"}`,
    isStarred: false,
    trashedAt: null,
    createdAt: now,
    updatedAt: now,
    lastSaved: now,
  };
  try {
    await cloudStore.collection("documents").insert(copy);
    markFresh(copy.id);
    toast("Copy created");
  } catch (error) {
    console.error("[files] copy", error);
    toast.error("Could not make a copy");
  }
}

/** Whether Download works from Home (docs saved as HTML, spreadsheets); presentations download inside the app. */
export function canDownload(ref: ItemRef) {
  const doc = ref.type === "file" ? liveDocRow(ref.id) : undefined;
  if (!doc) return false;
  if (doc.kind === "sheet") return !!doc.data;
  return !doc.kind || doc.kind === "doc"
    ? typeof doc.pages?.[0]?.content === "string"
    : false;
}

const safeName = (title: string) =>
  title
    .replace(/[\\/:*?"<>|]+/g, " ")
    .trim()
    .slice(0, 120) || "Untitled";

export async function download(ref: ItemRef) {
  const doc = liveDocRow(ref.id);
  if (!doc || !canDownload(ref)) return;
  const { saveBlob } = await import("@/components/sheet/sheet-files");
  try {
    if (doc.kind === "sheet") {
      const [{ isWorkbookSnapshot, snapshotToGrid }, { gridToXlsx }] =
        await Promise.all([
          import("@/lib/sheet/grid"),
          import("@/lib/sheet/xlsx"),
        ]);
      if (!isWorkbookSnapshot(doc.data))
        throw new Error("Open the spreadsheet once, then download it");
      saveBlob(
        await gridToXlsx(snapshotToGrid(doc.data)),
        `${safeName(doc.title)}.xlsx`,
      );
      return;
    }
    const [{ htmlToDocx }, { fromStored }] = await Promise.all([
      import("@/lib/export/docx"),
      import("@/lib/paper"),
    ]);
    const paper = fromStored(doc.pageSettings);
    const blob = await htmlToDocx({
      html: doc.pages[0].content as string,
      title: doc.title,
      paper,
    });
    saveBlob(blob, `${safeName(doc.title)}.docx`);
  } catch (error) {
    toast.error("Download failed", {
      description: error instanceof Error ? error.message : undefined,
    });
  }
}
