// Table for query.spec.ts. Each `expect` lists the indices of `docs` that MongoDB itself returns
// for `query` (every case was run with find() against a real mongod 7). Keep the expectations
// Mongo's, not the matcher's.
import { toMongoQuery, type MongoQuery } from "./query";

export type Case = { name: string; docs: any[]; query: MongoQuery; expect: number[] };

const trash = [{ trashedAt: null }, {}, { trashedAt: "2026-01-01T00:00:00.000Z" }, { trashedAt: "" }];

const shares = [
    { owner: "u1", sharing: { sharedWith: [{ userId: "u1", email: "a@x.com", access: "owner", status: "active" }] } },
    { owner: "u2", sharing: { sharedWith: [{ userId: "u2", email: "b@x.com", access: "owner", status: "active" }, { email: "a@x.com", access: "viewer", status: "active" }] } },
    { owner: "u2", sharing: { sharedWith: [{ email: "a@x.com", access: "editor", status: "pending" }] } },
    { owner: "u3", sharing: { sharedWith: [{ userId: "u1", access: "editor", status: "active" }, { email: "c@x.com", status: "active" }] } },
    { owner: "u3" },
    { owner: "u3", sharing: { sharedWith: [] } },
    { owner: "u3", sharing: { sharedWith: { email: "a@x.com", status: "active" } } },
    { owner: "u3", sharing: { sharedWith: [{ userId: "u9", email: "a@x.com", status: "removed" }, { userId: "u1", status: "pending" }] } },
];
const shareOf = (extra: object, uid: string, emails: string[]) => ({
    "sharing.sharedWith": { $elemMatch: { status: "active", ...extra, $or: [{ userId: uid }, { email: { $in: emails } }] } },
});

const parents = [{ parents: ["f1"] }, { parents: ["root", "f1"] }, { parents: "f1" }, { parents: ["f2"] }, {}, { parents: [["root", "f1"]] }];
// $arrayElemAt errors on non-arrays in Mongo, so ELEMENT_AT runs on array-or-missing rows only.
const parentArrays = [{ parents: ["f1"] }, { parents: ["root", "f1"] }, { parents: ["f2"] }, {}, { parents: [["root", "f1"]] }];
const ids = [{ id: "a" }, { id: "b" }, { id: "c" }, {}];
const nums = [{ n: 5 }, { n: "6" }, { n: null }, {}, { n: [1, 10] }, { n: new Date("2026-01-01T00:00:00Z") }];
const bools = [{ isStarred: true }, { isStarred: "true" }, { isStarred: 1 }, {}, { isStarred: false }];
const nested = [{ a: null }, { a: 1 }, { a: { b: null } }, { a: {} }, { a: [{ b: 1 }] }, { a: [{ c: 1 }] }, { a: [] }, { a: [1] }, {}, { a: { b: 2 } }, { a: [null] }];
const dates = [{ d: new Date("2026-01-01T00:00:00Z") }, { d: "2026-06-01T00:00:00Z" }, { d: new Date("2027-01-01T00:00:00Z") }];

export const cases: Case[] = [
    { name: "EQUAL null matches null and missing", docs: trash, query: toMongoQuery([{ field: "trashedAt", op: "EQUAL", value: null }]), expect: [0, 1] },
    { name: "GREATER '' matches non-empty strings only", docs: trash, query: toMongoQuery([{ field: "trashedAt", op: "GREATER", value: "" }]), expect: [2] },
    { name: "$exists true", docs: trash, query: { trashedAt: { $exists: true } }, expect: [0, 2, 3] },
    { name: "$exists false", docs: trash, query: { trashedAt: { $exists: false } }, expect: [1] },
    { name: "$ne null", docs: trash, query: { trashedAt: { $ne: null } }, expect: [2, 3] },

    { name: "EQUAL on array path matches any element", docs: shares, query: toMongoQuery([{ field: "sharing.sharedWith.email", op: "EQUAL", value: "a@x.com" }]), expect: [0, 1, 2, 6, 7] },
    { name: "EQUAL null on array path", docs: shares, query: { "sharing.sharedWith.email": null }, expect: [3, 4, 7] },
    { name: "active share by userId or email", docs: shares, query: shareOf({}, "u1", ["a@x.com"]), expect: [0, 1, 3] },
    { name: "read access: owner or active share", docs: shares, query: { $or: [{ owner: "u1" }, shareOf({}, "u1", ["a@x.com"])] }, expect: [0, 1, 3] },
    { name: "read access for a user with no email", docs: shares, query: { $or: [{ owner: "u4" }, shareOf({}, "u4", [])] }, expect: [] },
    { name: "write access: owner or active editor", docs: shares, query: { $or: [{ owner: "u2" }, shareOf({ access: "editor" }, "u2", ["a@x.com"])] }, expect: [1, 2] },
    { name: "active editor only", docs: shares, query: shareOf({ access: "editor" }, "u1", ["a@x.com"]), expect: [3] },
    { name: "client filter AND access filter", docs: shares, query: { $and: [toMongoQuery([{ field: "sharing.sharedWith.email", op: "EQUAL", value: "a@x.com" }]), { $or: [{ owner: "u1" }, shareOf({}, "u1", ["a@x.com"])] }] }, expect: [0, 1] },

    { name: "EQUAL on array field (parents contains)", docs: parents, query: toMongoQuery([{ field: "parents", op: "EQUAL", value: "f1" }]), expect: [0, 1, 2] },
    { name: "ARRAY.EQUALS whole array", docs: parents, query: toMongoQuery([{ field: "parents", op: "ARRAY.EQUALS", value: ["root", "f1"] }]), expect: [1, 5] },
    { name: "ARRAY.ELEMENT_AT last", docs: parentArrays, query: toMongoQuery([{ field: "parents", op: "ARRAY.ELEMENT_AT", value: { index: -1, value: "f1" } }]), expect: [0, 1] },
    { name: "ARRAY.ELEMENT_AT first", docs: parentArrays, query: toMongoQuery([{ field: "parents", op: "ARRAY.ELEMENT_AT", value: { index: 0, value: "root" } }]), expect: [1] },

    { name: "ARRAY.IN field value in list", docs: ids, query: toMongoQuery([{ field: "id", op: "ARRAY.IN", value: ["a", "c"] }]), expect: [0, 2] },
    { name: "ARRAY.IN with null includes missing", docs: ids, query: toMongoQuery([{ field: "id", op: "ARRAY.IN", value: ["b", null] }]), expect: [1, 3] },
    { name: "ARRAY.NOT_IN includes missing", docs: ids, query: toMongoQuery([{ field: "id", op: "ARRAY.NOT_IN", value: ["a"] }]), expect: [1, 2, 3] },
    { name: "ARRAY.IN on array field", docs: parents, query: { parents: { $in: ["f2", "zz"] } }, expect: [3] },

    { name: "GREATER is type bracketed", docs: nums, query: toMongoQuery([{ field: "n", op: "GREATER", value: 4 }]), expect: [0, 4] },
    { name: "LESSER on array any element", docs: nums, query: toMongoQuery([{ field: "n", op: "LESSER", value: 3 }]), expect: [4] },
    { name: "GREATER_EQUAL null", docs: nums, query: toMongoQuery([{ field: "n", op: "GREATER_EQUAL", value: null }]), expect: [2, 3] },
    { name: "LESSER_EQUAL null", docs: nums, query: toMongoQuery([{ field: "n", op: "LESSER_EQUAL", value: null }]), expect: [2, 3] },
    { name: "GREATER null matches nothing", docs: nums, query: toMongoQuery([{ field: "n", op: "GREATER", value: null }]), expect: [] },
    { name: "range AND on same field", docs: nums, query: toMongoQuery([{ field: "n", op: "GREATER", value: 2 }, { field: "n", op: "LESSER", value: 8 }]), expect: [0, 4] },

    { name: "EQUAL true is strict about type", docs: bools, query: toMongoQuery([{ field: "isStarred", op: "EQUAL", value: true }]), expect: [0] },
    { name: "EQUAL false", docs: bools, query: toMongoQuery([{ field: "isStarred", op: "EQUAL", value: false }]), expect: [4] },

    { name: "nested EQUAL null", docs: nested, query: { "a.b": null }, expect: [0, 1, 2, 3, 5, 8] },
    { name: "top-level EQUAL null and arrays", docs: [{ a: [null] }, { a: [1] }, { a: [] }, { a: [[null]] }, { a: [{ b: null }] }], query: { a: null }, expect: [0] },
    { name: "nested EQUAL value", docs: nested, query: { "a.b": 1 }, expect: [4] },
    { name: "nested $exists", docs: nested, query: { "a.b": { $exists: true } }, expect: [2, 4, 9] },
    { name: "empty object equality", docs: nested, query: { a: {} }, expect: [3] },
    { name: "embedded doc equality", docs: nested, query: { a: { b: 2 } }, expect: [9] },

    { name: "dates compare with dates only", docs: dates, query: { d: { $gt: new Date("2025-01-01T00:00:00Z") } }, expect: [0, 2] },
    { name: "strings compare with strings only", docs: dates, query: { d: { $gt: "2026" } }, expect: [1] },

    { name: "empty query matches all", docs: ids, query: {}, expect: [0, 1, 2, 3] },
];
