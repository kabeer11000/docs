import { describe, expect, it } from "vitest";
import { freshIds, templateDeck } from "./template-utils";
import { TEMPLATES } from "./templates";

const ids = (d: { slides: { id: string; elements: { id: string }[] }[] }) =>
  d.slides.flatMap((s) => [s.id, ...s.elements.map((e) => e.id)]);
const strip = (d: { slides: { id: string; elements: { id: string }[] }[] }) =>
  d.slides.map(({ id: _id, elements, ...s }) => ({
    ...s,
    elements: elements.map(({ id: _e, ...e }) => e),
  }));

describe("template utils", () => {
  it("gives every slide and element a new unique id and keeps the content", () => {
    for (const t of TEMPLATES) {
      const copy = freshIds(t.deck);
      const before = new Set(ids(t.deck));
      const after = ids(copy);
      expect(new Set(after).size).toBe(after.length);
      expect(after.some((id) => before.has(id))).toBe(false);
      expect(strip(copy)).toEqual(strip(t.deck));
      expect(copy.theme).toBe(t.deck.theme);
    }
  });

  it("does not share objects with the template", () => {
    const t = TEMPLATES[0];
    const copy = freshIds(t.deck);
    copy.slides[0].html.title = "changed";
    expect(t.deck.slides[0].html.title).not.toBe("changed");
  });

  it("builds a normalized deck, or null for an unknown id", () => {
    const deck = templateDeck(TEMPLATES[0].id);
    expect(deck?.slides).toHaveLength(TEMPLATES[0].deck.slides.length);
    expect(templateDeck("nope")).toBeNull();
  });
});
