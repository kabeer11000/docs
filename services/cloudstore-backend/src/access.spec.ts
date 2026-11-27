import { expect, test } from "bun:test";
import { authorizeInsert, authorizeRead, authorizeWrite, DOCS_DB, type Claims, type Ctx } from "./access";
import { matches } from "./query";

// Rows filtered with the Mongo-verified matcher stand in for the database.
const share = (who: object, access: string, status = "active") => ({ ...who, access, status });
const db: Record<string, any[]> = {
    documents: [
        { id: "mine", owner: "u1", sharing: { isShared: false, sharedWith: [share({ userId: "u1", email: "ann@x.com" }, "owner")] } },
        { id: "viewer-by-email", owner: "u2", sharing: { isShared: true, sharedWith: [share({ userId: "u2" }, "owner"), share({ email: "ann@x.com" }, "viewer")] } },
        { id: "editor-by-id", owner: "u2", sharing: { isShared: true, sharedWith: [share({ userId: "u1", email: "old@x.com" }, "editor")] } },
        { id: "pending", owner: "u2", sharing: { isShared: true, sharedWith: [share({ email: "ann@x.com" }, "editor", "pending")] } },
        { id: "others", owner: "u2", sharing: { isShared: true, sharedWith: [share({ email: "bob@x.com" }, "editor")] } },
        { id: "private", owner: "u3" },
    ],
    folders: [
        { id: "f-mine", permissions: { owner: "u1" }, parents: ["u1"] },
        { id: "f-other", permissions: { owner: "u2" }, parents: ["u2"] },
    ],
    chats: [{ id: "c-mine", owner: "u1" }, { id: "c-other", owner: "u2" }],
    comments: [
        { id: "k1", documentId: "viewer-by-email", author: { id: "u2" } },
        { id: "k2", documentId: "private", author: { id: "u3" } },
    ],
    users: [{ id: "u2", email: "bob@x.com", displayName: "Bob", passwordHash: "x" }],
};
const find = async (collection: string, query: object) => (db[collection] || []).filter(d => matches(d, query));
const ann: Claims = { user_id: "u1", email: "Ann@X.com" };
const ctx = (collection: string, claims: Claims = ann, database = DOCS_DB): Ctx => ({ claims, database, collection, find });
const ids = async (collection: string, query: object) => (await find(collection, query)).map(d => d.id);
const read = async (collection: string, where: any[] = [], claims: Claims = ann) =>
    ids(collection, (await authorizeRead(ctx(collection, claims), where)).query);
const write = async (collection: string, op: "update" | "delete", where: any[], data?: any) =>
    ids(collection, await authorizeWrite(ctx(collection), op, where, data));
const byId = (id: string) => [{ field: "id", op: "EQUAL", value: id }];

test("documents: owner and active sharees only, email case-insensitive from the token", async () => {
    expect(await read("documents")).toEqual(["mine", "viewer-by-email", "editor-by-id"]);
    expect(await read("documents", [], { user_id: "u9" })).toEqual([]);
    expect(await read("documents", [], { user_id: "u9", email: "bob@x.com" })).toEqual(["others"]);
});

test("documents: the old 'every shared doc' query only returns the caller's", async () => {
    expect(await read("documents", [{ field: "sharing.isShared", op: "EQUAL", value: true }])).toEqual(["viewer-by-email", "editor-by-id"]);
});

test("documents: shared-with-me by email and open by id", async () => {
    expect(await read("documents", [{ field: "sharing.sharedWith.email", op: "EQUAL", value: "ann@x.com" }])).toEqual(["mine", "viewer-by-email"]);
    expect(await read("documents", byId("private"))).toEqual([]);
    expect(await read("documents", byId("editor-by-id"))).toEqual(["editor-by-id"]);
});

test("documents: owner or active editor update; sharing and delete stay with the owner", async () => {
    expect(await write("documents", "update", [], { pages: [] })).toEqual(["mine", "editor-by-id"]);
    expect(await write("documents", "update", byId("viewer-by-email"), { pages: [] })).toEqual([]);
    expect(await write("documents", "update", byId("editor-by-id"), { sharing: {} })).toEqual([]);
    expect(await write("documents", "update", byId("editor-by-id"), { "sharing.isShared": true })).toEqual([]);
    expect(await write("documents", "update", byId("mine"), { sharing: {} })).toEqual(["mine"]);
    expect(await write("documents", "delete", [])).toEqual(["mine"]);
});

test("documents: the owner cannot be reassigned", async () => {
    await expect(authorizeWrite(ctx("documents"), "update", byId("mine"), { owner: "u2" })).rejects.toThrow("owner");
    expect(await write("documents", "update", byId("mine"), { owner: "u1" })).toEqual(["mine"]);
    await expect(authorizeWrite(ctx("documents"), "update", [], null)).rejects.toThrow();
});

test("folders and chats are owner-only", async () => {
    expect(await read("folders")).toEqual(["f-mine"]);
    expect(await read("folders", byId("f-other"))).toEqual([]);
    expect(await write("folders", "update", [], { name: "x" })).toEqual(["f-mine"]);
    expect(await write("folders", "delete", [{ field: "parents", op: "EQUAL", value: "u2" }])).toEqual([]);
    await expect(authorizeWrite(ctx("folders"), "update", [], { permissions: { canRead: true } })).rejects.toThrow("owner");
    await expect(authorizeWrite(ctx("folders"), "update", [], { "permissions.owner": "u2" })).rejects.toThrow("owner");
    expect(await read("chats")).toEqual(["c-mine"]);
    expect(await write("chats", "update", byId("c-other"), { title: "x" })).toEqual([]);
});

test("inserts must belong to the caller", async () => {
    await authorizeInsert(ctx("documents"), [{ id: "n", owner: "u1" }]);
    await expect(authorizeInsert(ctx("documents"), [{ id: "n", owner: "u1" }, { id: "m", owner: "u2" }])).rejects.toThrow();
    await authorizeInsert(ctx("folders"), [{ id: "n", permissions: { owner: "u1" } }]);
    await expect(authorizeInsert(ctx("folders"), [{ id: "n", owner: "u1" }])).rejects.toThrow();
    await expect(authorizeInsert(ctx("chats"), [{ owner: "u2" }])).rejects.toThrow();
    await expect(authorizeInsert(ctx("documents"), [])).rejects.toThrow();
});

test("comments follow their document", async () => {
    const scoped = (id: string) => [{ field: "documentId", op: "EQUAL", value: id }];
    expect(await read("comments", scoped("viewer-by-email"))).toEqual(["k1"]);
    await expect(authorizeRead(ctx("comments"), scoped("private"))).rejects.toThrow();
    await expect(authorizeRead(ctx("comments"), [])).rejects.toThrow("documentId");
    expect(await write("comments", "update", byId("k1"), { resolved: true })).toEqual(["k1"]);
    await expect(authorizeWrite(ctx("comments"), "delete", byId("k2"))).rejects.toThrow();
    await expect(authorizeWrite(ctx("comments"), "update", byId("k1"), { documentId: "private" })).rejects.toThrow();
    await authorizeInsert(ctx("comments"), [{ documentId: "editor-by-id", author: { id: "u1" } }]);
    await expect(authorizeInsert(ctx("comments"), [{ documentId: "private", author: { id: "u1" } }])).rejects.toThrow();
    await expect(authorizeInsert(ctx("comments"), [{ documentId: "mine", author: { id: "u2" } }])).rejects.toThrow();
});

test("users: exact email lookups with a public projection, nothing else", async () => {
    const r = await authorizeRead(ctx("users"), [{ field: "email", op: "EQUAL", value: " Bob@x.com " }]);
    expect(r.query).toEqual({ email: "bob@x.com" });
    expect(r.projection).toEqual({ _id: 0, id: 1, email: 1, displayName: 1, name: 1 });
    for (const where of [[], [{ field: "email", op: "CONTAINS", value: "bob" }], [{ field: "email", op: "EQUAL", value: "bob" }],
        [{ field: "id", op: "EQUAL", value: "u2" }], [{ field: "email", op: "EQUAL", value: "a@x.com" }, { field: "id", op: "EQUAL", value: "u2" }]]) {
        await expect(authorizeRead(ctx("users"), where)).rejects.toThrow();
    }
    await expect(authorizeRead(ctx("users"), [{ field: "email", op: "EQUAL", value: "bob@x.com" }], { watch: true })).rejects.toThrow();
    await expect(authorizeWrite(ctx("users"), "update", [], { x: 1 })).rejects.toThrow();
});

test("other databases and collections are refused", async () => {
    await expect(authorizeRead(ctx("documents", ann, "admin"), [])).rejects.toThrow("database");
    await expect(authorizeRead(ctx("api_keys"), [])).rejects.toThrow("collection");
    await expect(authorizeInsert(ctx("api_keys"), [{ owner: "u1" }])).rejects.toThrow();
    await expect(authorizeRead(ctx("documents", { user_id: "" }), [])).rejects.toThrow();
});
