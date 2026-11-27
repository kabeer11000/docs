import { describe, expect, it } from "vitest";
import {
  applyPatches,
  type Box,
  boxBetween,
  expiredTrash,
  flattenTree,
  intersects,
  nextIndex,
  rangeIds,
  settledPatches,
  visibleTree,
  withDescendants,
} from "./file-logic";

describe("visibleTree", () => {
  const folders = [
    { id: "a", parents: ["root"] },
    { id: "b", parents: ["a"], trashedAt: "2026-11-01T00:00:00Z" },
    { id: "c", parents: ["b"] },
    { id: "d", parents: ["root"], trashedAt: null },
  ];
  const docs = [
    { id: "1", parents: ["root"] },
    { id: "2", parents: ["c"] },
    { id: "3", parents: ["a"], trashedAt: "2026-11-02T00:00:00Z" },
    { id: "4", location: "a" },
    { id: "5", parents: ["unknown"] },
  ];

  it("hides trashed rows and everything inside a trashed folder", () => {
    const v = visibleTree(folders, docs);
    expect(v.folders.map((f) => f.id)).toEqual(["a", "d"]);
    expect(v.docs.map((d) => d.id)).toEqual(["1", "4", "5"]);
  });

  it("survives parent cycles", () => {
    const v = visibleTree(
      [
        { id: "x", parents: ["y"] },
        { id: "y", parents: ["x"] },
      ],
      [],
    );
    expect(v.folders).toHaveLength(2);
  });
});

describe("expiredTrash", () => {
  const now = Date.parse("2026-11-27T00:00:00Z");
  it("keeps items for 30 days", () => {
    const rows = [
      { id: "old", trashedAt: "2026-10-27T23:00:00Z" },
      { id: "edge", trashedAt: "2026-10-28T00:00:00Z" },
      { id: "new", trashedAt: "2026-11-26T00:00:00Z" },
      { id: "live", trashedAt: null },
    ];
    expect(expiredTrash(rows, now).map((r) => r.id)).toEqual(["old"]);
    expect(expiredTrash(rows, now, 0).map((r) => r.id)).toEqual([
      "old",
      "edge",
      "new",
    ]);
  });
});

describe("patches", () => {
  const rows = [
    { id: "a", title: "A", trashedAt: null as string | null },
    { id: "b", title: "B" },
  ];
  it("applies over rows and settles once the server matches", () => {
    const patches = {
      a: { trashedAt: "t" },
      b: { title: "B" },
      gone: { title: "x" },
    };
    expect(applyPatches(rows, patches)[0].trashedAt).toBe("t");
    expect(applyPatches(rows, {})).toBe(rows);
    expect(settledPatches(rows, patches)).toEqual(["b"]);
    // null and missing are the same "not trashed".
    expect(settledPatches([{ id: "b" }], { b: { trashedAt: null } })).toEqual([
      "b",
    ]);
  });
});

describe("folder trees", () => {
  const folders = [
    { id: "w", name: "Work", parents: ["root"] },
    { id: "a", name: "Archive", parents: ["root"] },
    { id: "w1", name: "Q1", parents: ["w"] },
    { id: "w11", name: "Jan", parents: ["w1"] },
  ];
  it("collects descendants", () => {
    expect([...withDescendants(folders, ["w"])].sort()).toEqual([
      "w",
      "w1",
      "w11",
    ]);
    expect([...withDescendants(folders, ["a"])]).toEqual(["a"]);
  });
  it("flattens in name order with depth", () => {
    expect(
      flattenTree(folders, "root").map((r) => `${r.depth}${r.folder.id}`),
    ).toEqual(["0a", "0w", "1w1", "2w11"]);
  });
});

describe("rangeIds", () => {
  const order = ["a", "b", "c", "d", "e"];
  it("selects inclusive ranges in either direction", () => {
    expect(rangeIds(order, "b", "d")).toEqual(["b", "c", "d"]);
    expect(rangeIds(order, "d", "b")).toEqual(["b", "c", "d"]);
    expect(rangeIds(order, "c", "c")).toEqual(["c"]);
  });
  it("falls back to the target", () => {
    expect(rangeIds(order, null, "c")).toEqual(["c"]);
    expect(rangeIds(order, "zz", "c")).toEqual(["c"]);
    expect(rangeIds(order, "a", "zz")).toEqual([]);
  });
});

describe("nextIndex", () => {
  // Two folder rows of 4 columns, then a file grid of 3 columns (wider cards).
  const grid = (
    cols: number,
    count: number,
    top: number,
    w: number,
    h: number,
  ): Box[] =>
    Array.from({ length: count }, (_, i) => ({
      left: (i % cols) * (w + 10),
      top: top + Math.floor(i / cols) * (h + 10),
      width: w,
      height: h,
    }));
  const boxes = [...grid(4, 6, 0, 100, 40), ...grid(3, 5, 200, 140, 120)];

  it("steps left and right in reading order and clamps", () => {
    expect(nextIndex(boxes, 0, "ArrowLeft")).toBe(0);
    expect(nextIndex(boxes, 3, "ArrowRight")).toBe(4);
    expect(nextIndex(boxes, 10, "ArrowRight")).toBe(10);
    expect(nextIndex(boxes, 5, "Home")).toBe(0);
    expect(nextIndex(boxes, 5, "End")).toBe(10);
  });

  it("moves down within a grid, keeping the column", () => {
    expect(nextIndex(boxes, 1, "ArrowDown")).toBe(5);
    expect(nextIndex(boxes, 5, "ArrowUp")).toBe(1);
  });

  it("moves down into the next grid to the nearest column", () => {
    // Folder row 2 has only two items: column 4 goes to the nearest of them.
    expect(nextIndex(boxes, 3, "ArrowDown")).toBe(5);
    // From there into the 3-column file grid, to the card nearest in x (centre 160 -> file 1 at 220).
    expect(nextIndex(boxes, 5, "ArrowDown")).toBe(7);
    expect(nextIndex(boxes, 6, "ArrowUp")).toBe(4);
  });

  it("stays put at the edges and starts at 0 without focus", () => {
    expect(nextIndex(boxes, 0, "ArrowUp")).toBe(0);
    expect(nextIndex(boxes, 9, "ArrowDown")).toBe(9);
    expect(nextIndex(boxes, -1, "ArrowDown")).toBe(0);
    expect(nextIndex([], 0, "ArrowDown")).toBe(-1);
  });

  it("works for a single-column list", () => {
    const list = grid(1, 3, 0, 600, 48);
    expect(nextIndex(list, 0, "ArrowDown")).toBe(1);
    expect(nextIndex(list, 2, "ArrowUp")).toBe(1);
  });
});

describe("rubber band boxes", () => {
  it("normalises and intersects", () => {
    const band = boxBetween(50, 50, 10, 10);
    expect(band).toEqual({ left: 10, top: 10, width: 40, height: 40 });
    expect(intersects(band, { left: 45, top: 45, width: 10, height: 10 })).toBe(
      true,
    );
    expect(intersects(band, { left: 50, top: 0, width: 10, height: 10 })).toBe(
      false,
    );
  });
});
