import type { Document } from "@shared-types";
import { describe, expect, it } from "vitest";
import { findBacklinks, fuzzyScore, linkExcerpt, rankFiles } from "./links";

const link = (id: string, title: string) => `<a data-doc-link="${id}" href="/document/${id}">${title}</a>`;

const doc = (id: string, title: string, content: unknown, updatedAt: string, kind?: Document["kind"]) =>
  ({ id, title, kind, updatedAt, pages: [{ id: "p", content, format: "Letter", pageNumber: 1 }] }) as unknown as Document;

describe("fuzzyScore", () => {
  it("orders exact > prefix > word substring > substring > subsequence", () => {
    const s = (t: string) => fuzzyScore(t, "plan");
    expect(s("plan")).toBeGreaterThan(s("Planning notes"));
    expect(s("Planning notes")).toBeGreaterThan(s("Q3 plan"));
    expect(s("Q3 plan")).toBeGreaterThan(s("Q3plan"));
    expect(s("Q3plan")).toBeGreaterThan(s("p-l-a-n"));
    expect(s("p-l-a-n")).toBeGreaterThan(0);
    expect(s("nalp")).toBe(0);
  });

  it("matches everything for an empty query", () => {
    expect(fuzzyScore("anything", "  ")).toBeGreaterThan(0);
  });
});

describe("rankFiles", () => {
  const files = [
    { id: "a", title: "Roadmap", kind: undefined, updatedAt: "2026-01-01" },
    { id: "b", title: "Road trip", kind: "sheet" as const, updatedAt: "2026-03-01" },
    { id: "c", title: "Budget", kind: undefined, updatedAt: "2026-02-01" },
  ];

  it("sorts by recency with no query and respects the limit", () => {
    expect(rankFiles(files, "").map((f) => f.id)).toEqual(["b", "c", "a"]);
    expect(rankFiles(files, "", 2)).toHaveLength(2);
  });

  it("filters non-matches and breaks score ties by recency", () => {
    expect(rankFiles(files, "road").map((f) => f.id)).toEqual(["b", "a"]);
    expect(rankFiles(files, "zzz")).toEqual([]);
  });
});

describe("linkExcerpt", () => {
  it("returns the block text holding the link", () => {
    const html = `<h1>Head</h1><p>See ${link("x", "Plan &amp; scope")} for details.</p><p>Other</p>`;
    expect(linkExcerpt(html, "x")).toBe("See Plan & scope for details.");
  });

  it("trims long blocks around the link with ellipses", () => {
    const html = `<p>${"word ".repeat(40)}${link("x", "Target")}${" tail".repeat(40)}</p>`;
    const out = linkExcerpt(html, "x", 40);
    expect(out.startsWith("...")).toBe(true);
    expect(out.endsWith("...")).toBe(true);
    expect(out).toContain("Target");
    expect(out.length).toBeLessThan(60);
  });

  it("returns an empty string when there is no link", () => {
    expect(linkExcerpt("<p>nothing</p>", "x")).toBe("");
  });
});

describe("findBacklinks", () => {
  it("lists documents linking to the id, newest first, skipping self, other kinds and non-HTML content", () => {
    const docs = [
      doc("old", "Old", `<p>${link("t", "T")}</p>`, "2026-01-01"),
      doc("new", "New", `<p>Ref ${link("t", "T")}</p>`, "2026-05-01"),
      doc("t", "Self", `<p>${link("t", "T")}</p>`, "2026-06-01"),
      doc("sheet", "Sheet", `<p>${link("t", "T")}</p>`, "2026-06-01", "sheet"),
      doc("json", "Json", { type: "doc", content: [] }, "2026-06-01"),
      doc("prefix", "Prefix", `<p>${link("t2", "T2")}</p>`, "2026-06-01"),
    ];
    expect(findBacklinks(docs, "t")).toEqual([
      { id: "new", title: "New", excerpt: "Ref T" },
      { id: "old", title: "Old", excerpt: "T" },
    ]);
  });
});
