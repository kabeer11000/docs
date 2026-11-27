import { v4 as uuid } from "uuid";

// Replacement for the cloudstore client's collection.watch():
// - asks the server for deltas instead of the full result set on every change
// - re-subscribes after a socket reconnect (the stock client goes silent)
// - opens one collection handle per name (the stock client asks the server whether the collection
//   exists on every collection() call) and builds queries without leaking them
// - returns stop()/close()/destroy(); callers use stop(), which the stock watcher lacked
// Callers still receive { collection, _update } with the full, ordered list.

type OrderBy = { field: string; direction?: "ASCENDING" | "DESCENDING" };
type Delta = { upsert: any[]; remove: string[] };
type WatchMessage = { collection?: any[]; delta?: Delta; _update?: unknown };
type StructuredQuery = { filters: unknown[]; orderBy?: OrderBy; limit?: number | null };

const getPath = (obj: any, path: string) =>
  path.split(".").reduce((o, k) => o?.[k], obj);
const docId = (doc: any) => String(doc._id);

// Mirrors services/cloudstore-backend/src/controllers/watch-delta.ts - keep in sync.
export function compareDocs(a: any, b: any, orderBy?: OrderBy) {
  if (orderBy) {
    const av = getPath(a, orderBy.field);
    const bv = getPath(b, orderBy.field);
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    if (cmp) return orderBy.direction === "DESCENDING" ? -cmp : cmp;
  }
  const ai = docId(a);
  const bi = docId(b);
  return ai < bi ? -1 : ai > bi ? 1 : 0;
}

export function applyDelta(
  docs: any[],
  delta: Delta,
  orderBy?: OrderBy,
  limit?: number | null,
) {
  const byId = new Map(docs.map((d) => [docId(d), d]));
  for (const id of delta.remove) byId.delete(id);
  for (const doc of delta.upsert) byId.set(docId(doc), doc);
  const next = [...byId.values()].sort((a, b) => compareDocs(a, b, orderBy));
  return limit && limit > 0 ? next.slice(0, limit) : next;
}

export function deltaWatch(
  socket: any,
  database: string,
  collection: string,
  query: StructuredQuery,
  onUpdate: (result: { collection: any[]; _update?: unknown }) => void,
) {
  const id = uuid();
  const orderBy: OrderBy = {
    field: query.orderBy?.field || "_id",
    direction: query.orderBy?.direction ?? "ASCENDING",
  };
  let docs: any[] = [];
  let stopped = false;

  const onChange = (msg: WatchMessage) => {
    if (msg.collection) docs = msg.collection;
    else if (msg.delta) docs = applyDelta(docs, msg.delta, orderBy, query.limit);
    else return;
    onUpdate({ collection: docs, _update: msg._update });
  };

  const subscribe = () =>
    socket.emit("watch", {
      delta: true,
      stream: { id },
      watchable: {
        type: "kn.cloudstore.collection",
        database: { name: database },
        collection: { name: collection },
        query: {
          structured: {
            from: { collection },
            where: query.filters,
            orderBy,
            limit: query.limit,
          },
        },
      },
    });

  socket.on(`watchable-change-${id}`, onChange);
  // "connect" fires for the first connect and every reconnect (including a manual connect after
  // the server refused an expired token), so the server always holds this watch while connected.
  socket.on("connect", subscribe);
  if (socket.connected) subscribe();

  const stop = () => {
    if (stopped) return;
    stopped = true;
    socket.off(`watchable-change-${id}`, onChange);
    socket.off("connect", subscribe);
    socket.emit(`watch:${id}:close`, { stream: { id } });
  };
  return { id, stop, close: stop, destroy: stop };
}

// Swaps watch() on every collection handle the given CloudStore instance hands out.
export function enableDeltaWatch<T>(store: T): T {
  const s = store as any;
  const collection = s.collection.bind(s);
  const handles = new Map<string, any>();
  s.collection = (name: string) => {
    const cached = handles.get(name);
    if (cached) return cached;
    const handle = collection(name);
    if (handle) {
      handle.watch = (query: { _query: StructuredQuery }, onUpdate: any) =>
        deltaWatch(
          s.info.socket,
          s.info.constructorConfig.database.name,
          name,
          query._query,
          onUpdate,
        );
      handles.set(name, handle);
    }
    return handle;
  };
  // The stock getter files every builder under internals.contexts forever; nothing reads them back.
  const query = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(s), "query")?.get;
  if (query) {
    Object.defineProperty(s, "query", {
      get() {
        const builder = query.call(s);
        delete s.info.contexts[builder._query.id];
        return builder;
      },
    });
  }
  return store;
}
