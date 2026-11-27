"use client";
import * as cl from "cloudstore";
import { atom } from "nanostores";
import { enableDeltaWatch } from "@/lib/cloudstore/delta-watch";
import { clearPersistedWatches, type Stop } from "@/lib/swr-watch";
import { $auth } from "@/state/auth";

const { default: CloudStore, Adapters } = cl;
// biome-ignore lint/suspicious/noExplicitAny: the cloudstore client ships without types
type Store = any;

const CLOUDSTORE_CONFIG = {
  URI: process.env.NEXT_PUBLIC_CLOUDSTORE_URI || "https://lxcloudstore.deployments.otherdev.com",
  DATABASE_NAME: process.env.NEXT_PUBLIC_CLOUDSTORE_DB || "kabeers-docs-cl",
};

/**
 * The live client, or null while signed out. It is replaced only when the signed-in user changes:
 * a token refresh (every ~15 minutes) keeps the socket and its watches, and only swaps the token
 * the socket presents on its next reconnect. Watches restart when this store changes.
 */
export const $cloudStore = atom<Store | null>(null);

function createCloudStore(accessToken: string, tenantId: string): Store {
  const store = enableDeltaWatch(
    new CloudStore({
      server: {
        uri: CLOUDSTORE_CONFIG.URI,
        access: { key: accessToken, tenant_id: tenantId },
        config: { upgradeToBackgroundSync: true },
      },
      cache: {
        storage: { adapter: new Adapters.IndexedDB("cloudstore.lexa.collection:1") },
      },
      database: { name: CLOUDSTORE_CONFIG.DATABASE_NAME },
    }),
  );
  store.connect();
  return store;
}

// The server checks the token once, when the socket connects. A refreshed token only matters for
// the next (re)connect, so hand it to the socket instead of tearing every watch down.
function presentToken(store: Store, accessToken: string) {
  const socket = store.info.socket;
  if (!socket) return;
  socket.io.opts.query = { ...socket.io.opts.query, authorization: accessToken };
  socket.io.opts.extraHeaders = { ...socket.io.opts.extraHeaders, authorization: `Bearer ${accessToken}` };
  // A connect refused by the auth middleware (expired token) is not retried automatically.
  if (!socket.connected && !socket.active) socket.connect();
}

let session: { userId: string; token: string } | null = null;

$auth.subscribe(({ isAuthenticated, tokens, user }) => {
  const token = isAuthenticated ? tokens?.accessToken : undefined;
  const current = $cloudStore.get();

  if (token && user?.tenant_id && current && session?.userId === user.id) {
    if (session.token !== token) {
      session.token = token;
      presentToken(current, token);
    }
    return;
  }

  if (current) {
    try {
      current.destroy();
    } catch (error) {
      console.warn("CloudStore: error destroying instance", error);
    }
  }
  if (!token || !user?.tenant_id) {
    // Signed out: forget the cached lists too, so the next account on this browser never sees them.
    if (session) clearPersistedWatches();
    session = null;
    $cloudStore.set(null);
    return;
  }
  session = { userId: user.id, token };
  $cloudStore.set(createCloudStore(token, user.tenant_id));
});

// biome-ignore lint/suspicious/noExplicitAny: the query builder is untyped too
export type QueryBuilder = any;

/**
 * Runs one cloudstore watch until stopped, reopening it on the new client whenever the client is
 * replaced (another user signs in). Reconnects and token refreshes are handled on the same client.
 */
export function watchQuery<Row>(
  collection: string,
  build: (q: QueryBuilder) => QueryBuilder,
  onRows: (rows: Row[]) => void,
): Stop {
  let stop: Stop | undefined;
  const unsubscribe = $cloudStore.subscribe((store) => {
    stop?.();
    stop = undefined;
    if (!store) return;
    try {
      const watcher = store
        .collection(collection)
        .watch(build(store.query), (r: { collection?: Row[]; error?: unknown }) => {
          if (!r?.error && r?.collection) onRows(r.collection);
        });
      stop = () => watcher?.stop?.();
    } catch (error) {
      console.error(`Failed to watch ${collection}:`, error);
    }
  });
  return () => {
    unsubscribe();
    stop?.();
  };
}

// Always forwards to the current client, so call sites can hold on to the default export.
const cloudStoreProxy = new Proxy({} as Store, {
  get(_target, prop) {
    const store = $cloudStore.get();
    if (!store) return undefined;
    const value = store[prop];
    return typeof value === "function" ? value.bind(store) : value;
  },
  has(_target, prop) {
    const store = $cloudStore.get();
    return store ? prop in store : false;
  },
  ownKeys() {
    const store = $cloudStore.get();
    return store ? Reflect.ownKeys(store) : [];
  },
  getOwnPropertyDescriptor(_target, prop) {
    const store = $cloudStore.get();
    return store ? Reflect.getOwnPropertyDescriptor(store, prop) : undefined;
  },
});

export default cloudStoreProxy;
