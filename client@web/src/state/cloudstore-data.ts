import type { Document, IFolderItem } from "@shared-types";
import { atom, computed } from "nanostores";
import { watchQuery } from "@/lib/cloudstore";
import { persist, readPersisted } from "@/lib/swr-watch";
import { $auth } from "./auth";
import {
  applyPatches,
  type Patch,
  settledPatches,
  visibleTree,
} from "./file-logic";

// ============================================================================
// GLOBAL DATA ATOMS
// ============================================================================

/** Rows per Home list query. */
export const HOME_LIST_LIMIT = 100;

/**
 * What the watchers return for the user. Folders include trashed ones (trashing a folder only marks
 * the folder, so its contents are hidden through it); documents exclude Trash on the server.
 */
export const $rawFolders = atom<IFolderItem[]>([]);
export const $rawDocuments = atom<Document[]>([]);
export const $foldersLoading = atom(true);
export const $documentsLoading = atom(true);
/**
 * False while the lists show rows saved on an earlier visit (IndexedDB) and the server has not
 * answered yet. Those rows are for display only: never seed an editor or a write from them.
 */
export const $documentsLive = atom(false);

/**
 * Optimistic edits by row id (trash, restore, move, rename, star), shown before the server echoes them.
 * A patch is dropped once the watched rows match it, or by the action when its write fails.
 */
export const $patches = atom<Record<string, Patch>>({});

export function patchRows(ids: string[], patch: Patch) {
  const next = { ...$patches.get() };
  for (const id of ids) next[id] = { ...next[id], ...patch };
  $patches.set(next);
}

export function dropPatches(ids: string[]) {
  const next = { ...$patches.get() };
  for (const id of ids) delete next[id];
  $patches.set(next);
}

const $tree = computed(
  [$rawFolders, $rawDocuments, $patches],
  (folders, docs, patches) =>
    visibleTree(applyPatches(folders, patches), applyPatches(docs, patches)),
);

/** Listed folders and files: not in Trash and not inside a trashed folder, optimistic edits applied. */
export const $folders = computed($tree, (t) => t.folders);
export const $documents = computed($tree, (t) => t.docs);

const settle = (rows: { id: string }[]) => {
  const done = settledPatches(rows, $patches.get());
  if (done.length) dropPatches(done);
};

// Trashed documents leave the (server-filtered) list instead of echoing trashedAt back, so their
// patch settles when they leave it. Left behind, it would hide the file after a restore elsewhere.
const settleTrashed = (before: { id: string }[], after: { id: string }[]) => {
  const now = new Set(after.map((r) => r.id));
  const patches = $patches.get();
  const left = before
    .map((r) => r.id)
    .filter((id) => !now.has(id) && patches[id]?.trashedAt);
  if (left.length) dropPatches(left);
};

// ============================================================================
// WATCHER MANAGEMENT
// ============================================================================

let stopWatchers: (() => void) | null = null;

function startGlobalWatchers(userId: string) {
  stopGlobalWatchers();
  const foldersKey = `home-folders:${userId}`;
  const documentsKey = `home-documents:${userId}`;

  // Last visit's rows paint at once; the watchers replace them when the server answers.
  readPersisted<IFolderItem[]>(foldersKey).then((rows) => {
    if (rows && activeUser === userId && $foldersLoading.get()) {
      $rawFolders.set(rows);
      $foldersLoading.set(false);
    }
  });
  readPersisted<Document[]>(documentsKey).then((rows) => {
    if (rows && activeUser === userId && !$documentsLive.get()) {
      $rawDocuments.set(rows);
      $documentsLoading.set(false);
    }
  });

  const stopFolders = watchQuery<IFolderItem>(
    "folders",
    (q) =>
      q
        .limit(HOME_LIST_LIMIT)
        .orderBy("timestamp.createdAt", "DESCENDING")
        .where("permissions.owner", "EQUAL", userId),
    (rows) => {
      $rawFolders.set(rows);
      settle(rows);
      $foldersLoading.set(false);
      persist(foldersKey, rows);
    },
  );
  const stopDocuments = watchQuery<Document>(
    "documents",
    (q) =>
      q
        .limit(HOME_LIST_LIMIT)
        .orderBy("createdAt", "DESCENDING")
        .where("owner", "EQUAL", userId)
        .where("trashedAt", "EQUAL", null),
    (rows) => {
      const before = $rawDocuments.get();
      $rawDocuments.set(rows);
      $documentsLive.set(true);
      settle(rows);
      settleTrashed(before, rows);
      $documentsLoading.set(false);
      persist(documentsKey, rows);
    },
  );
  stopWatchers = () => {
    stopFolders();
    stopDocuments();
  };
}

function stopGlobalWatchers() {
  stopWatchers?.();
  stopWatchers = null;
}

// ============================================================================
// AUTH SUBSCRIPTION - START/STOP WATCHERS
// ============================================================================

// $auth is set for every loading/profile tweak and token refresh; only another user needs new
// watchers (lib/cloudstore keeps its client, and the watches, across token refreshes).
let activeUser: string | null = null;

$auth.subscribe((authState) => {
  const user = authState.isAuthenticated && authState.user ? authState.user.id : null;
  if (user === activeUser) return;
  activeUser = user;
  stopGlobalWatchers();
  $rawFolders.set([]);
  $rawDocuments.set([]);
  $patches.set({});
  $foldersLoading.set(true);
  $documentsLoading.set(true);
  $documentsLive.set(false);
  if (user) startGlobalWatchers(user);
});
