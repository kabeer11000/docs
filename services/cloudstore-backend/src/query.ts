// Client filters -> Mongo queries, and an in-memory matcher with Mongo semantics for the subset of
// query operators this server builds. The watch fanout runs every change through matches(), so a
// watcher only receives rows the database query itself would have returned (including the access
// filter): when unsure, the matcher must answer false, never true.

export type ClientFilter = { field: string; op: string; value: any };
export type MongoQuery = Record<string, any>;

const OPERATORS: Record<string, string> = {
    "EQUAL": "$eq",
    "GREATER": "$gt",
    "LESSER": "$lt",
    "GREATER_EQUAL": "$gte",
    "LESSER_EQUAL": "$lte",
    "ARRAY.IN": "$in",
    "ARRAY.NOT_IN": "$nin",
    "ARRAY.EQUALS": "$eq",
};

export function buildFilter(filter: ClientFilter): MongoQuery {
    if (!filter || typeof filter.field !== "string" || !filter.field || filter.field.startsWith("$")) {
        throw new Error("Invalid filter field");
    }
    if (filter.op === "ARRAY.ELEMENT_AT") {
        return {
            $expr: { $eq: [{ $arrayElemAt: ["$" + filter.field, filter.value?.index] }, filter.value?.value] }
        };
    }
    const op = OPERATORS[filter.op];
    if (!op) throw new Error(`Unsupported filter operator: ${filter.op}`);
    return { [filter.field]: { [op]: filter.value } };
}

export function toMongoQuery(where: ClientFilter[] | undefined): MongoQuery {
    const filters = (where || []).map(buildFilter);
    return filters.length ? { $and: filters } : {};
}

/** Both sides present: ANDs the access filter onto the client's query. */
export const and = (...queries: MongoQuery[]): MongoQuery => {
    const parts = queries.filter(q => q && Object.keys(q).length);
    return parts.length === 0 ? {} : parts.length === 1 ? parts[0] : { $and: parts };
};

// ---------------------------------------------------------------- matcher

type Candidate = { value: any; missing: boolean };

const isObject = (v: any) => v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date) && !isObjectId(v);
const isObjectId = (v: any) => v && typeof v === "object" && (v._bsontype === "ObjectId" || v._bsontype === "ObjectID");
const isOperatorObject = (v: any) => isObject(v) && Object.keys(v).length > 0 && Object.keys(v).every(k => k.startsWith("$"));

// Walks a dotted path the way Mongo does: arrays on the way are fanned out into their elements
// (and numeric segments also index into them).
function resolve(value: any, parts: string[], i = 0): Candidate[] {
    if (i === parts.length) return [{ value, missing: value === undefined }];
    if (Array.isArray(value)) {
        const out: Candidate[] = [];
        const key = parts[i];
        if (/^\d+$/.test(key) && Number(key) < value.length) out.push(...resolve(value[Number(key)], parts, i + 1));
        for (const el of value) if (isObject(el)) out.push(...resolve(el, parts, i));
        return out;
    }
    if (isObject(value)) return resolve(value[parts[i]], parts, i + 1);
    return [{ value: undefined, missing: true }];
}

// A leaf array is compared both as a whole and element by element.
const expand = (cands: Candidate[]) => cands.flatMap(c => Array.isArray(c.value) ? [c.value, ...c.value] : [c.value]);

function typeClass(v: any) {
    if (v === null || v === undefined) return "null";
    if (typeof v === "number") return "number";
    if (typeof v === "string") return "string";
    if (typeof v === "boolean") return "boolean";
    if (v instanceof Date) return "date";
    if (isObjectId(v)) return "objectId";
    if (Array.isArray(v)) return "array";
    return "object";
}

function equal(a: any, b: any): boolean {
    const ta = typeClass(a), tb = typeClass(b);
    if (ta !== tb) return false;
    switch (ta) {
        case "null": return true;
        case "date": return a.getTime() === b.getTime();
        case "objectId": return String(a) === String(b);
        case "array": return a.length === b.length && a.every((v: any, i: number) => equal(v, b[i]));
        case "object": {
            // Mongo compares embedded documents field by field, in order.
            const ka = Object.keys(a).filter(k => a[k] !== undefined), kb = Object.keys(b).filter(k => b[k] !== undefined);
            return ka.length === kb.length && ka.every((k, i) => k === kb[i] && equal(a[k], b[k]));
        }
        default: return a === b;
    }
}

// Comparison operators only match values of the same type (Mongo's type bracketing).
function compare(a: any, b: any): number | null {
    const t = typeClass(a);
    if (t !== typeClass(b) || t === "array" || t === "object" || t === "null") return null;
    const x = t === "date" ? a.getTime() : t === "objectId" ? String(a) : a;
    const y = t === "date" ? b.getTime() : t === "objectId" ? String(b) : b;
    return x < y ? -1 : x > y ? 1 : 0;
}

function eqMatches(cands: Candidate[], target: any) {
    if (target === null) return cands.some(c => c.missing || c.value === null || (Array.isArray(c.value) && c.value.includes(null)));
    return expand(cands).some(v => equal(v, target));
}

function opMatches(cands: Candidate[], op: string, arg: any): boolean {
    switch (op) {
        case "$eq": return eqMatches(cands, arg);
        case "$ne": return !eqMatches(cands, arg);
        case "$in": if (!Array.isArray(arg)) throw new Error("$in needs an array"); return arg.some(v => eqMatches(cands, v));
        case "$nin": if (!Array.isArray(arg)) throw new Error("$nin needs an array"); return !arg.some(v => eqMatches(cands, v));
        case "$gt": case "$gte": case "$lt": case "$lte": {
            if (arg === null) return (op === "$gte" || op === "$lte") && eqMatches(cands, null);
            return expand(cands).some(v => {
                const c = compare(v, arg);
                if (c === null) return false;
                return op === "$gt" ? c > 0 : op === "$gte" ? c >= 0 : op === "$lt" ? c < 0 : c <= 0;
            });
        }
        case "$exists": return cands.some(c => !c.missing) === !!arg;
        case "$elemMatch":
            return cands.some(c => Array.isArray(c.value) && c.value.some((el: any) =>
                isOperatorObject(arg) ? valueMatches([{ value: el, missing: false }], arg, false) : isObject(el) && matches(el, arg)));
        default: throw new Error(`Unsupported query operator: ${op}`);
    }
}

function valueMatches(cands: Candidate[], cond: any, allowImplicitEq = true): boolean {
    if (isOperatorObject(cond)) return Object.entries(cond).every(([op, arg]) => opMatches(cands, op, arg));
    if (!allowImplicitEq) return false;
    return eqMatches(cands, cond);
}

// Only the one $expr shape buildFilter emits: { $eq: [{ $arrayElemAt: ["$path", i] }, value] }.
function exprMatches(doc: any, expr: any): boolean {
    const [left, value] = expr?.$eq || [];
    const [path, index] = left?.$arrayElemAt || [];
    if (typeof path !== "string" || !path.startsWith("$") || typeof index !== "number") throw new Error("Unsupported $expr");
    const arr = path.slice(1).split(".").reduce((o, k) => o?.[k], doc);
    if (!Array.isArray(arr)) return false;
    const i = index < 0 ? arr.length + index : index;
    return i >= 0 && i < arr.length && equal(arr[i], value);
}

export function matches(doc: any, query: MongoQuery): boolean {
    return Object.entries(query || {}).every(([key, cond]) => {
        if (key === "$and") return (cond as MongoQuery[]).every(q => matches(doc, q));
        if (key === "$or") return (cond as MongoQuery[]).some(q => matches(doc, q));
        if (key === "$expr") return exprMatches(doc, cond);
        if (key.startsWith("$")) throw new Error(`Unsupported query operator: ${key}`);
        return valueMatches(resolve(doc, key.split(".")), cond);
    });
}
