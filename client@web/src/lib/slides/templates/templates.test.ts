import { describe, expect, it } from "vitest";
import { ICON_NODES } from "../icon-data";
import { isTheme, normalizeDeck, THEMES } from "../model";
import { slideToSpec } from "../pptx";
import { templateDeck } from "../template-utils";
import { getTemplate, TEMPLATE_CATEGORIES, TEMPLATES } from ".";

describe("slide templates", () => {
  it("has at least 30 templates with unique ids and names", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(30);
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
    expect(new Set(TEMPLATES.map((t) => t.name)).size).toBe(TEMPLATES.length);
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
      expect(isTheme(t.deck.theme)).toBe(true);
      expect(normalizeDeck(t.deck)).toEqual(t.deck);
    });

    it("has a listed category and a description", () => {
      expect(TEMPLATE_CATEGORIES).toContain(t.category);
      expect(t.description.length).toBeGreaterThan(40);
    });

    it("is composed, not just text", () => {
      const kinds = new Set(
        t.deck.slides.flatMap((s) => s.elements.map((e) => e.type)),
      );
      expect(kinds.has("shape")).toBe(true);
      expect(kinds.size).toBeGreaterThanOrEqual(2);
    });

    it("copies into a fresh deck with new ids", () => {
      const deck = templateDeck(t.id);
      expect(deck?.slides.length).toBe(t.deck.slides.length);
      const own = new Set(t.deck.slides.map((s) => s.id));
      expect(deck?.slides.some((s) => own.has(s.id))).toBe(false);
    });

    it("converts every slide for PowerPoint", () => {
      for (const s of t.deck.slides)
        expect(slideToSpec(s, t.deck.theme).items.length).toBeGreaterThan(0);
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
