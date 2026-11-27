import type { Document, IFolderItem } from "@shared-types";
import { atom, computed } from "nanostores";
import cloudStore from "@/lib/cloudstore";
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

/** Everything the watchers return for the user, trashed rows included. */
export const $rawFolders = atom<IFolderItem[]>([]);
export const $rawDocuments = atom<Document[]>([]);
export const $foldersLoading = atom(true);
export const $documentsLoading = atom(true);

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

// ponytail: trashed rows still count toward the watchers' limit of 100; add a server-side
// "not trashed" filter once cloudstore's in-memory matcher treats a missing field as null.
/** Listed folders and files: not in Trash and not inside a trashed folder, optimistic edits applied. */
export const $folders = computed($tree, (t) => t.folders);
export const $documents = computed($tree, (t) => t.docs);

const settle = (rows: { id: string }[]) => {
  const done = settledPatches(rows, $patches.get());
  if (done.length) dropPatches(done);
};

// ============================================================================
// WATCHER MANAGEMENT
// ============================================================================

let foldersWatcher: { stop?: () => void } | null = null;
let documentsWatcher: { stop?: () => void } | null = null;

function startGlobalWatchers(userId: string) {
  stopGlobalWatchers();

  try {
    const foldersQuery = cloudStore.query
      .limit(100)
      .orderBy("timestamp.createdAt", "DESCENDING")
      .where("permissions.owner", "EQUAL", userId);

    foldersWatcher = cloudStore
      .collection("folders")
      .watch(
        foldersQuery,
        ({ collection: data }: { collection: IFolderItem[] }) => {
          $rawFolders.set(data || []);
          settle(data || []);
          $foldersLoading.set(false);
        },
      );
  } catch (error) {
    console.error("Failed to start folders watcher:", error);
    $foldersLoading.set(false);
  }

  try {
    const documentsQuery = cloudStore.query
      .limit(100)
      .orderBy("createdAt", "DESCENDING")
      .where("owner", "EQUAL", userId);

    documentsWatcher = cloudStore
      .collection("documents")
      .watch(
        documentsQuery,
        ({ collection: data }: { collection: Document[] }) => {
          $rawDocuments.set(data || []);
          settle(data || []);
          $documentsLoading.set(false);
        },
      );
  } catch (error) {
    console.error("Failed to start documents watcher:", error);
    $documentsLoading.set(false);
  }
}

function stopGlobalWatchers() {
  foldersWatcher?.stop?.();
  foldersWatcher = null;
  documentsWatcher?.stop?.();
  documentsWatcher = null;
}

// ============================================================================
// AUTH SUBSCRIPTION - START/STOP WATCHERS
// ============================================================================

// $auth is set for every loading/profile tweak; only a new user or token needs new
// watchers (lib/cloudstore swaps its client per token). Data stays on screen while
// the new watchers catch up.
let activeSession: string | null = null;

$auth.subscribe((authState) => {
  const session =
    authState.isAuthenticated && authState.user
      ? `${authState.user.id}:${authState.tokens?.accessToken}`
      : null;
  if (session === activeSession) return;
  activeSession = session;

  if (session && authState.user) {
    startGlobalWatchers(authState.user.id);
  } else {
    stopGlobalWatchers();
    $rawFolders.set([]);
    $rawDocuments.set([]);
    $patches.set({});
    $foldersLoading.set(true);
    $documentsLoading.set(true);
  }
});
