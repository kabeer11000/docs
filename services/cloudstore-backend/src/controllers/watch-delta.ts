// Pure helpers for computing watch windows and the deltas between them.
// Mirrored on the client in client@web/src/lib/cloudstore/delta-watch.ts - keep the comparator in sync.

export type OrderBy = { field: string; direction?: "ASCENDING" | "DESCENDING" } | undefined;
export type Delta = { upsert: any[]; remove: string[] };

const getPath = (obj: any, path: string) => path.split(".").reduce((o, k) => o?.[k], obj);
export const docId = (doc: any) => String(doc._id);

// Ties broken on _id so client and server always agree on order.
export function compareDocs(a: any, b: any, orderBy: OrderBy) {
    if (orderBy) {
        const av = getPath(a, orderBy.field), bv = getPath(b, orderBy.field);
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        if (cmp) return orderBy.direction === "DESCENDING" ? -cmp : cmp;
    }
    const ai = docId(a), bi = docId(b);
    return ai < bi ? -1 : ai > bi ? 1 : 0;
}

export function computeWindow(results: any[], orderBy: OrderBy, limit?: number | null) {
    const sorted = [...results].sort((a, b) => compareDocs(a, b, orderBy));
    return limit && limit > 0 ? sorted.slice(0, limit) : sorted;
}

// Docs are replaced (never mutated) on change, so identity tells us what changed.
export function diffWindows(prev: Map<string, any>, next: any[]): Delta {
    const nextIds = new Set<string>();
    const upsert: any[] = [];
    for (const doc of next) {
        const id = docId(doc);
        nextIds.add(id);
        if (prev.get(id) !== doc) upsert.push(doc);
    }
    const remove = [...prev.keys()].filter(id => !nextIds.has(id));
    return { upsert, remove };
}

export const toWindowMap = (docs: any[]) => new Map(docs.map(d => [docId(d), d]));
