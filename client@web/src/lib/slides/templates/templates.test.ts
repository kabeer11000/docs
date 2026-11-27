import { describe, expect, it } from "vitest";
import { ICON_NODES } from "../icon-data";
import { normalizeDeck, THEMES } from "../model";
import { getTemplate, TEMPLATE_CATEGORIES, TEMPLATES } from ".";

describe("slide templates", () => {
  it("has at least 12 templates with unique ids", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(12);
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
  });

  it("uses every theme and lists only the categories in use", () => {
    const themes = new Set(TEMPLATES.map((t) => t.deck.theme));
    for (const theme of Object.keys(THEMES))
      expect(themes, theme).toContain(theme);
    expect(new Set(TEMPLATE_CATEGORIES)).toEqual(
      new Set(TEMPLATES.map((t) => t.category)),
    );
    expect(TEMPLATE_CATEGORIES.length).toBeGreaterThanOrEqual(4);
  });

  it("finds templates by id", () => {
    expect(getTemplate(TEMPLATES[0].id)).toBe(TEMPLATES[0]);
    expect(getTemplate("missing")).toBeUndefined();
  });

  describe.each(TEMPLATES.map((t) => [t.id, t] as const))("%s", (_, t) => {
    it("has 6 to 10 slides", () => {
      expect(t.deck.slides.length).toBeGreaterThanOrEqual(6);
      expect(t.deck.slides.length).toBeLessThanOrEqual(10);
    });

    it("survives normalizeDeck unchanged", () => {
      expect(normalizeDeck(t.deck)).toEqual(t.deck);
    });

    it("has unique slide and element ids", () => {
      const ids = t.deck.slides.flatMap((s) => [
        s.id,
        ...s.elements.map((e) => e.id),
      ]);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("uses only known icons", () => {
      for (const e of t.deck.slides.flatMap((s) => s.elements)) {
        if (e.type === "icon")
          expect(Object.hasOwn(ICON_NODES, e.icon ?? ""), e.icon).toBe(true);
      }
    });

    it("has real copy and no external images", () => {
      const json = JSON.stringify(t.deck);
      expect(json).not.toMatch(/lorem/i);
      expect(json).not.toMatch(/http/i);
      expect(json).not.toMatch(/"src"/);
      expect(
        t.deck.slides
          .flatMap((s) => s.elements)
          .some((e) => e.type === "image"),
      ).toBe(false);
    });
  });
});
