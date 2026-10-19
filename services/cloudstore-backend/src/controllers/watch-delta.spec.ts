import { expect, test } from "bun:test";
import { computeWindow, diffWindows, toWindowMap } from "./watch-delta";

const doc = (id: string, n: number) => ({ _id: id, n });

test("window sorts with _id tie-break and applies limit", () => {
    const docs = [doc("c", 1), doc("a", 2), doc("b", 1)];
    expect(computeWindow(docs, { field: "n", direction: "ASCENDING" }, 2).map(d => d._id)).toEqual(["b", "c"]);
    expect(computeWindow(docs, { field: "n", direction: "DESCENDING" }).map(d => d._id)).toEqual(["a", "b", "c"]);
});

test("diff sends only replaced, entering and leaving docs", () => {
    const a = doc("a", 1), b = doc("b", 2), c = doc("c", 3);
    const prev = toWindowMap([a, b]);
    expect(diffWindows(prev, [a, b])).toEqual({ upsert: [], remove: [] });

    const b2 = doc("b", 5);
    expect(diffWindows(prev, [a, b2])).toEqual({ upsert: [b2], remove: [] });

    // a deleted, c slides into a limited window
    expect(diffWindows(prev, [b, c])).toEqual({ upsert: [c], remove: ["a"] });
});

test("change outside a limited window produces no delta", () => {
    const a = doc("a", 1), b = doc("b", 2), c = doc("c", 3);
    const orderBy = { field: "n", direction: "ASCENDING" as const };
    const prev = toWindowMap(computeWindow([a, b, c], orderBy, 2));
    const next = computeWindow([a, b, doc("c", 4)], orderBy, 2);
    expect(diffWindows(prev, next)).toEqual({ upsert: [], remove: [] });
});
