import type { Document, IFolderItem } from "@shared-types";
import { atom } from "nanostores";
import cloudStore from "@/lib/cloudstore";
import { $auth } from "./auth";

// ============================================================================
// GLOBAL DATA ATOMS
// ============================================================================

export const $folders = atom<IFolderItem[]>([]);
export const $documents = atom<Document[]>([]);
export const $foldersLoading = atom(true);
export const $documentsLoading = atom(true);

// ============================================================================
// WATCHER MANAGEMENT
// ============================================================================

let foldersWatcher: any = null;
let documentsWatcher: any = null;

function startGlobalWatchers(userId: string) {
  if (!cloudStore) {
    console.warn("CloudStore not available for global watchers");
    return;
  }

  console.log("Starting global CloudStore watchers for user:", userId);

  // Stop existing watchers if any
  stopGlobalWatchers();

  // Start folders watcher
  try {
    const foldersCollection = cloudStore.collection("folders");
    const foldersQuery = cloudStore.query
      .limit(100)
      .orderBy("timestamp.createdAt", "DESCENDING")
      .where("permissions.owner", "EQUAL", userId);

    foldersWatcher = foldersCollection.watch(
      foldersQuery,
      ({ collection: data }: { collection: IFolderItem[] }) => {
        console.log("Global folders updated:", data?.length);
        $folders.set(data || []);
        $foldersLoading.set(false);
      },
    );
  } catch (error) {
    console.error("Failed to start folders watcher:", error);
    $foldersLoading.set(false);
  }

  // Start documents watcher
  try {
    const documentsCollection = cloudStore.collection("documents");
    const documentsQuery = cloudStore.query
      .limit(100)
      .orderBy("createdAt", "DESCENDING")
      .where("owner", "EQUAL", userId);

    documentsWatcher = documentsCollection.watch(
      documentsQuery,
      ({ collection: data }: { collection: Document[] }) => {
        console.log("Global documents updated:", data?.length);
        $documents.set(data || []);
        $documentsLoading.set(false);
      },
    );
  } catch (error) {
    console.error("Failed to start documents watcher:", error);
    $documentsLoading.set(false);
  }
}

function stopGlobalWatchers() {
  console.log("Stopping global CloudStore watchers");

  if (foldersWatcher && typeof foldersWatcher.stop === "function") {
    foldersWatcher.stop();
    foldersWatcher = null;
  }

  if (documentsWatcher && typeof documentsWatcher.stop === "function") {
    documentsWatcher.stop();
    documentsWatcher = null;
  }

  // Reset loading states
  $foldersLoading.set(true);
  $documentsLoading.set(true);
}

// ============================================================================
// AUTH SUBSCRIPTION - START/STOP WATCHERS
// ============================================================================

$auth.subscribe((authState) => {
  if (authState.isAuthenticated && authState.user && cloudStore) {
    // User logged in - start watchers
    startGlobalWatchers(authState.user.id);
  } else {
    // User logged out or auth cleared - stop watchers and clear data
    stopGlobalWatchers();
    $folders.set([]);
    $documents.set([]);
  }
});
