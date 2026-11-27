// Server-side access control for the docs database. Every read, watch, update and delete ANDs the
// client's filter with a filter derived from the verified JWT, and inserts must belong to the caller.
// Mirrors client@web/src/lib/api/permissions.ts and services/yjs-host/access.ts: owners and active
// sharees read a document, owners and active editors write it, only owners delete it or change its
// sharing. Folders and chats are owner-only. Comments and analyses follow their document.
import { and, toMongoQuery, type ClientFilter, type MongoQuery } from "@/query";

export class AccessDenied extends Error { }
const deny = (why: string): never => { throw new AccessDenied(`Access denied: ${why}`); };

export type Claims = { user_id: string; email?: string };
export type Finder = (collection: string, query: MongoQuery, projection?: Record<string, 0 | 1>) => Promise<any[]>;
export type Ctx = { claims: Claims; database: string; collection: string; find: Finder };

export const DOCS_DB = process.env.DOCS_DB || "kabeers-docs-cl";

/** Share-dialog lookup only: an exact email in, the public profile fields out. */
export const USER_PROJECTION = { _id: 0, id: 1, email: 1, displayName: 1, name: 1 } as const;

const emailsOf = (c: Claims) => {
    const e = typeof c.email === "string" ? c.email.trim() : "";
    return e ? [...new Set([e, e.toLowerCase()])] : [];
};

function activeShare(c: Claims, extra: MongoQuery = {}): MongoQuery {
    const who: MongoQuery[] = [{ userId: c.user_id }];
    const emails = emailsOf(c);
    if (emails.length) who.push({ email: { $in: emails } });
    return { "sharing.sharedWith": { $elemMatch: { status: "active", ...extra, $or: who } } };
}

export const documentRead = (c: Claims): MongoQuery => ({ $or: [{ owner: c.user_id }, activeShare(c)] });
export const documentWrite = (c: Claims): MongoQuery => ({ $or: [{ owner: c.user_id }, activeShare(c, { access: "editor" })] });
const OWNER_FIELD = { documents: "owner", folders: "permissions.owner", chats: "owner" } as const;
const ownedBy = (collection: keyof typeof OWNER_FIELD, c: Claims): MongoQuery => ({ [OWNER_FIELD[collection]]: c.user_id });

function requireDocsDb(ctx: Ctx) {
    if (ctx.database !== DOCS_DB) deny("unknown database");
    if (typeof ctx.claims?.user_id !== "string" || !ctx.claims.user_id) deny("no user");
}

const keysOf = (data: any) => (data && typeof data === "object" ? Object.keys(data) : []);
/** Does a $set with `data` write `path` (directly, through a parent object, or below it)? */
const touches = (data: any, path: string) =>
    keysOf(data).some(k => k === path || path.startsWith(k + ".") || k.startsWith(path + "."));

// The value `path` ends up with after `$set: data`, for the keys that touch it.
function valueAfterSet(data: any, path: string) {
    for (const k of keysOf(data)) {
        if (k === path) return data[k];
        if (path.startsWith(k + ".")) return path.slice(k.length + 1).split(".").reduce((o, p) => o?.[p], data[k]);
        if (k.startsWith(path + ".")) return undefined; // writing inside a string field
    }
}

function assertOwnerKept(data: any, path: string, c: Claims) {
    if (touches(data, path) && valueAfterSet(data, path) !== c.user_id) deny("cannot change the owner");
}

async function canReadDocuments(ctx: Ctx, ids: string[]) {
    if (!ids.length) return true;
    if (ids.some(id => typeof id !== "string")) return false;
    const found = await ctx.find("documents", and({ id: { $in: ids } }, documentRead(ctx.claims)), { id: 1 });
    const readable = new Set(found.map(d => d.id));
    return ids.every(id => readable.has(id));
}

// Comments and analyses are only listed per document: the query must pin one documentId.
async function requireDocumentScope(ctx: Ctx, where: ClientFilter[] | undefined) {
    const scope = (where || []).find(f => f?.field === "documentId" && f.op === "EQUAL");
    if (typeof scope?.value !== "string") deny(`${ctx.collection} queries need a documentId`);
    if (!(await canReadDocuments(ctx, [scope!.value]))) deny("document not readable");
}

function usersQuery(where: ClientFilter[] | undefined): MongoQuery {
    const [f, ...rest] = where || [];
    if (rest.length || f?.field !== "email" || f.op !== "EQUAL" || typeof f.value !== "string" || !/^[^\s@]+@[^\s@]+$/.test(f.value.trim())) {
        deny("users can only be looked up by exact email");
    }
    return { email: f.value.trim().toLowerCase() };
}

export async function authorizeRead(ctx: Ctx, where: ClientFilter[] | undefined, opts: { watch?: boolean } = {}): Promise<{ query: MongoQuery; projection?: Record<string, 0 | 1> }> {
    requireDocsDb(ctx);
    const client = toMongoQuery(where);
    switch (ctx.collection) {
        case "documents": return { query: and(client, documentRead(ctx.claims)) };
        case "folders":
        case "chats": return { query: and(client, ownedBy(ctx.collection, ctx.claims)) };
        case "comments":
        case "analyses":
            // ponytail: checked when the query opens; a watcher keeps the document's comments until it
            // resubscribes even if its share is revoked meanwhile. Re-check on share changes if that matters.
            await requireDocumentScope(ctx, where);
            return { query: client };
        case "users":
            if (opts.watch) deny("users cannot be watched");
            return { query: usersQuery(where), projection: { ...USER_PROJECTION } };
        default: return deny("unknown collection");
    }
}

/** Fields any reader of the document may change on a comment: its replies and resolved state. */
const THREAD_FIELDS = /^(replies|resolved|resolvedAt|resolvedBy|updatedAt|timestamp)(\.|$)/;
export const onlyThreadFields = (data: any) =>
    !!data && typeof data === "object" && Object.keys(data).length > 0 && Object.keys(data).every(k => THREAD_FIELDS.test(k));

export async function authorizeWrite(ctx: Ctx, op: "update" | "delete", where: ClientFilter[] | undefined, data?: any): Promise<MongoQuery> {
    requireDocsDb(ctx);
    const client = toMongoQuery(where);
    const c = ctx.claims;
    if (op === "update" && (!data || typeof data !== "object" || Array.isArray(data))) deny("invalid update");
    switch (ctx.collection) {
        case "documents":
            if (op === "delete") return and(client, ownedBy("documents", c));
            assertOwnerKept(data, "owner", c);
            return and(client, touches(data, "sharing") ? ownedBy("documents", c) : documentWrite(c));
        case "folders":
        case "chats":
            if (op === "update") assertOwnerKept(data, OWNER_FIELD[ctx.collection], c);
            return and(client, ownedBy(ctx.collection, c));
        case "comments":
        case "analyses": {
            if (op === "update" && touches(data, "documentId")) deny("cannot move to another document");
            const rows = await ctx.find(ctx.collection, client, { documentId: 1 });
            const ids = [...new Set(rows.map(r => r.documentId))];
            if (!(await canReadDocuments(ctx, ids))) deny("document not readable");
            // Pinned to the checked documents, so rows added after the check are not touched.
            const pinned = and(client, { documentId: { $in: ids } });
            if (ctx.collection !== "comments") return pinned;
            // Any reader may reply or resolve; deleting or rewriting a comment is for its author
            // or the document's owner.
            if (op === "update" && onlyThreadFields(data)) return pinned;
            const owned = await ctx.find("documents", { id: { $in: ids }, owner: c.user_id }, { id: 1 });
            return and(pinned, { $or: [{ "author.id": c.user_id }, { documentId: { $in: owned.map(d => d.id) } }] });
        }
        default: return deny("collection is read-only");
    }
}

export async function authorizeInsert(ctx: Ctx, docs: any[]) {
    requireDocsDb(ctx);
    const c = ctx.claims;
    if (!Array.isArray(docs) || !docs.length || docs.some(d => !d || typeof d !== "object" || Array.isArray(d))) deny("invalid insert");
    switch (ctx.collection) {
        case "documents":
        case "chats":
            if (docs.some(d => d.owner !== c.user_id)) deny("owner must be the caller");
            return;
        case "folders":
            if (docs.some(d => d.permissions?.owner !== c.user_id)) deny("owner must be the caller");
            return;
        case "comments":
            if (docs.some(d => d.author?.id !== c.user_id)) deny("author must be the caller");
            break;
        case "analyses":
            if (docs.some(d => d.userId !== c.user_id)) deny("userId must be the caller");
            break;
        default: deny("collection is read-only");
    }
    if (!(await canReadDocuments(ctx, [...new Set(docs.map(d => d.documentId))]))) deny("document not readable");
}

/** Verified JWT claims stashed by the Authorization middleware. */
export const claimsOf = (socket: any): Claims => socket?.data?.claims;
