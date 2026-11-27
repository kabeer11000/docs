import { type Deck, newSlideId, normalizeDeck } from "./model";
import { getTemplate } from "./templates";

/** A deep copy with new slide and element ids, so template slides never collide with a deck's own. */
export function freshIds(deck: Deck): Deck {
  return {
    ...deck,
    slides: deck.slides.map((s) => ({
      ...s,
      id: newSlideId(),
      html: { ...s.html },
      elements: s.elements.map((e) => ({
        ...e,
        id: newSlideId(),
        ...(e.chart ? { chart: structuredClone(e.chart) } : {}),
      })),
    })),
  };
}

/** A ready-to-use deck from a template, or null for an unknown id. */
export function templateDeck(id: string): Deck | null {
  const t = getTemplate(id);
  return t ? normalizeDeck(freshIds(t.deck)) : null;
}
