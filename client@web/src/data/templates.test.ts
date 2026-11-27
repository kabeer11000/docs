// @ts-expect-error its .d.ts declares module "domino" rather than the package name
import domino from "@mixmark-io/domino";
import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "@/lib/export/import";
import { TEMPLATE_CATEGORIES, TEMPLATES } from "./templates";

const parse = (html: string) =>
  (domino as { createDocument(h: string): Document }).createDocument(html);

describe("document templates", () => {
  it("has a broad, uniquely named set across every category", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(36);
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
    expect(new Set(TEMPLATES.map((t) => t.name)).size).toBe(TEMPLATES.length);
    for (const c of TEMPLATE_CATEGORIES)
      expect(
        TEMPLATES.filter((t) => t.category === c).length,
      ).toBeGreaterThanOrEqual(5);
  });

  describe.each(TEMPLATES.map((t) => [t.id, t] as const))("%s", (_, t) => {
    it("survives the import sanitizer unchanged", () => {
      expect(sanitizeHtml(t.content, parse)).toBe(t.content);
    });

    it("has no filler, inline styling or empty description", () => {
      expect(t.content).not.toMatch(/lorem|ipsum|style=|color:/i);
      expect(t.description.length).toBeGreaterThan(10);
    });

    it("parses into real blocks", () => {
      const body = parse(t.content).body;
      expect(body.querySelectorAll("p,h1,h2,li,td").length).toBeGreaterThan(5);
      for (const ul of Array.from(
        body.querySelectorAll('ul[data-type="taskList"]'),
      )) {
        for (const li of Array.from(ul.children))
          expect(li.getAttribute("data-type")).toBe("taskItem");
      }
    });
  });
});
