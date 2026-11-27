import { IWatchConfig } from "@/types";
import MongoDatabasePromise from "@/db-internals/mongo-client";
import { Socket } from "socket.io";
import Events from "@/events";
import * as crypto from "crypto";
import { computeWindow, diffWindows, toWindowMap, docId, OrderBy } from "@/controllers/watch-delta";
import { contextFor } from "@/controllers/crud";
import { authorizeRead } from "@/access";
import { matches, type MongoQuery } from "@/query";

// One change stream per collection, one cached result set per distinct query,
// many watchers (socket streams) per query.
type SharedStream = {
    key: string;
    dbName: string;
    collectionName: string;
    stream: any;
    ready: Promise<void>;
    entries: Set<QueryEntry>;
};
type QueryEntry = {
    hash: string;
    stream: SharedStream;
    // The client filter ANDed with the caller's access filter; both the initial find and the
    // live fanout use it, so watchers only ever see rows they may read.
    mongoQuery: MongoQuery;
    orderBy: OrderBy;
    limit?: number | null;
    results: any[];
    window: Map<string, any>;
    watchers: Set<Watcher>;
};
type Watcher = { socket: Socket<any, any>; streamId: string; delta: boolean; entry: QueryEntry };

const streams = new Map<string, SharedStream>();
const queries = new Map<string, QueryEntry>();
const pending = new Map<string, Promise<QueryEntry>>();
const STREAM_RETRY_MS = 1000;

// Applies a change event to a cached result set in place. Returns whether it changed.
function applyChange(results: any[], query: MongoQuery, change: any) {
    if (!change.documentKey) return false;
    const id = String(change.documentKey._id);
    const idx = results.findIndex(doc => docId(doc) === id);
    const doc = change.fullDocument;

    if (change.operationType === 'delete' || !doc) {
        if (idx < 0) return false;
        results.splice(idx, 1);
        return true;
    }
    let match = false;
    try { match = matches(doc, query); } catch { /* unsupported shapes never match */ }
    if (idx >= 0 && match) results[idx] = doc;
    else if (idx >= 0) results.splice(idx, 1);
    else if (match) results.push(doc);
    else return false;
    return true;
}

// Recomputes the query window and sends watchers only what changed.
// Delta-capable watchers get { delta }, legacy ones the full window as before.
function publish(entry: QueryEntry, update: any) {
    const next = computeWindow(entry.results, entry.orderBy, entry.limit);
    const delta = diffWindows(entry.window, next);
    if (!delta.upsert.length && !delta.remove.length) return;
    entry.window = toWindowMap(next);

    // Only the operation type goes out: the raw change event carries the full document even when it
    // just left this caller's readable set.
    const op = { operationType: update.operationType };
    for (const w of entry.watchers) {
        w.socket.emit(Events.server.WATCH_CALLBACK(w.streamId),
            w.delta ? { delta, _update: op } : { collection: next, _update: op });
    }
}

async function openStream(s: SharedStream) {
    const db = (await MongoDatabasePromise).db(s.dbName);
    const stream = db.collection(s.collectionName).watch([], { fullDocument: 'updateLookup' });
    s.stream = stream;
    stream.on("change", (change) => {
        for (const entry of s.entries) {
            if (applyChange(entry.results, entry.mongoQuery, change)) publish(entry, change);
        }
    });
    stream.on("error", (error) => {
        console.error(`Change stream ${s.key} failed, reopening:`, error?.message);
        reopenStream(s, stream);
    });
    // Invalidation (drop/rename) closes the stream without an error; our own closes null s.stream first.
    stream.on("close", () => reopenStream(s, stream));
}

// A dead stream used to leave every watcher silently stale. Reopen it, then
// re-query each entry so changes missed while it was down still get published.
function reopenStream(s: SharedStream, dead: any) {
    if (s.stream !== dead) return;
    s.stream = null;
    dead?.close().catch(() => { });
    setTimeout(async () => {
        if (streams.get(s.key) !== s) return;
        try {
            await openStream(s);
            const db = (await MongoDatabasePromise).db(s.dbName);
            for (const entry of s.entries) {
                entry.results = await db.collection(s.collectionName).find(entry.mongoQuery).toArray();
                publish(entry, { operationType: 'resync' });
            }
        } catch (error) {
            console.error(`Reopening change stream ${s.key} failed:`, error?.message);
            reopenStream(s, s.stream);
        }
    }, STREAM_RETRY_MS);
}

async function ensureStream(dbName: string, collectionName: string) {
    const key = `${dbName}.${collectionName}`;
    let s = streams.get(key);
    if (!s) {
        s = { key, dbName, collectionName, stream: null, ready: Promise.resolve(), entries: new Set() };
        s.ready = openStream(s);
        streams.set(key, s);
    }
    await s.ready;
    return s;
}

function dropStreamIfUnused(s: SharedStream) {
    if (s.entries.size || streams.get(s.key) !== s) return;
    streams.delete(s.key);
    const stream = s.stream;
    s.stream = null;
    stream?.close().catch(() => { });
}

type Structured = IWatchConfig["watchable"]["query"]["structured"];

async function loadEntry(hash: string, dbName: string, collectionName: string, mongoQuery: MongoQuery, structured: Structured) {
    // Stream opens before the initial find so changes during the find aren't lost.
    // ponytail: a change landing mid-find can still be missed until the next change to that doc; buffer events during load if that bites.
    const s = await ensureStream(dbName, collectionName);
    try {
        const results = await (await MongoDatabasePromise).db(dbName).collection(collectionName).find(mongoQuery).toArray();
        const entry: QueryEntry = {
            hash, stream: s, mongoQuery,
            orderBy: structured.orderBy, limit: structured.limit,
            results, window: new Map(), watchers: new Set(),
        };
        entry.window = toWindowMap(computeWindow(results, entry.orderBy, entry.limit));
        queries.set(hash, entry);
        s.entries.add(entry);
        return entry;
    } catch (error) {
        dropStreamIfUnused(s);
        throw error;
    }
}

function acquireEntry(dbName: string, collectionName: string, mongoQuery: MongoQuery, structured: Structured) {
    // Database, collection and the access-filtered query are the key: only callers allowed the same
    // rows share a result set.
    const hash = crypto.createHash('sha256').update(JSON.stringify({
        dbName, collectionName, mongoQuery, orderBy: structured.orderBy, limit: structured.limit
    })).digest('hex');
    const existing = queries.get(hash);
    if (existing) return Promise.resolve(existing);
    let load = pending.get(hash);
    if (!load) {
        load = loadEntry(hash, dbName, collectionName, mongoQuery, structured).finally(() => pending.delete(hash));
        pending.set(hash, load);
    }
    return load;
}

function watchersOf(socket: Socket<any, any>): Map<string, Watcher> {
    return socket.data.watchers ??= new Map();
}

export function releaseWatcher(socket: Socket<any, any>, streamId: string) {
    const watchers = watchersOf(socket);
    const watcher = watchers.get(streamId);
    if (!watcher) return;
    watchers.delete(streamId);
    const { entry } = watcher;
    entry.watchers.delete(watcher);
    releaseEntryIfUnused(entry);
}

function releaseEntryIfUnused(entry: QueryEntry) {
    if (entry.watchers.size || queries.get(entry.hash) !== entry) return;
    queries.delete(entry.hash);
    entry.stream.entries.delete(entry);
    dropStreamIfUnused(entry.stream);
}

export function releaseSocket(socket: Socket<any, any>) {
    for (const streamId of [...watchersOf(socket).keys()]) releaseWatcher(socket, streamId);
}

export default async function WatchController(socket: Socket<any, any>, config: IWatchConfig & { delta?: boolean }) {
    const streamId = config?.stream?.id;
    if (!streamId) return;
    try {
        const { database, collection, query } = config.watchable;
        const ctx = await contextFor(socket, database.name, collection.name);
        const { query: mongoQuery } = await authorizeRead(ctx, query.structured.where, { watch: true });
        const entry = await acquireEntry(database.name, collection.name, mongoQuery, query.structured);
        if (socket.disconnected) {
            // Socket left while we were loading; don't register a watcher nobody will release.
            // Deferred so other sockets awaiting the same load can attach first.
            setTimeout(() => releaseEntryIfUnused(entry), 0);
            return;
        }

        releaseWatcher(socket, streamId);
        const watcher: Watcher = { socket, streamId, delta: config.delta === true, entry };
        entry.watchers.add(watcher);
        watchersOf(socket).set(streamId, watcher);

        socket.removeAllListeners(`watch:${streamId}:close`);
        socket.once(`watch:${streamId}:close`, () => {
            releaseWatcher(socket, streamId);
            socket.emit("closed-stream:" + streamId, { success: true });
        });

        socket.emit(Events.server.WATCH_CALLBACK(streamId), {
            collection: [...entry.window.values()],
            _update: { operationType: 'initial' }
        });
    } catch (error) {
        releaseWatcher(socket, streamId);
        socket.emit(Events.watch.watchError(streamId), { error: error?.message || 'Watch failed' });
    }
}
