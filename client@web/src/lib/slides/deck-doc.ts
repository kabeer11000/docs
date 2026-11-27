import * as Y from "yjs";
import { ALL_REGIONS, type Deck, isLayout, isTheme, type Layout, newSlideId, type Theme } from "./model";

/**
 * Live shape of a presentation in one Y.Doc:
 * - "order": Y.Array of slide ids
 * - "slides": Y.Map id -> { layout }
 * - "deck": Y.Map { theme }
 * - one Y.XmlFragment per region, named `${slideId}:${region}` (speaker notes use the region "notes").
 */
export const field = (slideId: string, region: string) => `${slideId}:${region}`;
const FIELDS = [...ALL_REGIONS, "notes"];

const order = (doc: Y.Doc) => doc.getArray<string>("order");
const meta = (doc: Y.Doc) => doc.getMap<{ layout: Layout }>("slides");
const deckMap = (doc: Y.Doc) => doc.getMap<unknown>("deck");

export interface SlideRef {
  id: string;
  layout: Layout;
}

/** Slide order and layouts (duplicate ids, possible if two clients seeded at once, are dropped). */
export function readStructure(doc: Y.Doc): { theme: Theme; slides: SlideRef[] } {
  const seen = new Set<string>();
  const slides: SlideRef[] = [];
  for (const id of order(doc).toArray()) {
    if (seen.has(id)) continue;
    seen.add(id);
    const layout = meta(doc).get(id)?.layout;
    slides.push({ id, layout: isLayout(layout) ? layout : "title-body" });
  }
  const theme = deckMap(doc).get("theme");
  return { theme: isTheme(theme) ? theme : "paper", slides };
}

export const isEmptyDeck = (doc: Y.Doc) => order(doc).length === 0;

/** Fills an empty doc from the stored deck. `fill` writes HTML into a fragment (needs the editor schema). */
export function seedDeck(doc: Y.Doc, deck: Deck, fill: (html: string, fragment: Y.XmlFragment) => void) {
  doc.transact(() => {
    deckMap(doc).set("theme", deck.theme);
    for (const s of deck.slides) {
      meta(doc).set(s.id, { layout: s.layout });
      for (const [region, html] of Object.entries(s.html)) if (html) fill(html, doc.getXmlFragment(field(s.id, region)));
      if (s.notes) fill(notesToHtml(s.notes), doc.getXmlFragment(field(s.id, "notes")));
    }
    order(doc).push(deck.slides.map((s) => s.id));
  }, "seed");
}

export function notesToHtml(notes: string) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return notes
    .split("\n")
    .map((line) => `<p>${esc(line)}</p>`)
    .join("");
}

export function insertSlide(doc: Y.Doc, index: number, layout: Layout): string {
  const id = newSlideId();
  doc.transact(() => {
    meta(doc).set(id, { layout });
    order(doc).insert(Math.max(0, Math.min(index, order(doc).length)), [id]);
  });
  return id;
}

export function duplicateSlide(doc: Y.Doc, id: string): string | null {
  const index = order(doc).toArray().indexOf(id);
  if (index < 0) return null;
  const copy = newSlideId();
  doc.transact(() => {
    meta(doc).set(copy, { layout: meta(doc).get(id)?.layout ?? "title-body" });
    for (const f of FIELDS) {
      const src = doc.getXmlFragment(field(id, f));
      if (src.length) doc.getXmlFragment(field(copy, f)).insert(0, src.toArray().map((n) => n.clone() as Y.XmlElement | Y.XmlText));
    }
    order(doc).insert(index + 1, [copy]);
  });
  return copy;
}

/** Removes a slide (never the last one). Root fragments cannot be deleted in Yjs, so they are emptied. */
export function deleteSlide(doc: Y.Doc, id: string): boolean {
  const ids = order(doc).toArray();
  if (ids.length <= 1 || !ids.includes(id)) return false;
  doc.transact(() => {
    for (let i = ids.length - 1; i >= 0; i--) if (ids[i] === id) order(doc).delete(i, 1);
    meta(doc).delete(id);
    for (const f of FIELDS) {
      const frag = doc.getXmlFragment(field(id, f));
      if (frag.length) frag.delete(0, frag.length);
    }
  });
  return true;
}

export function moveSlide(doc: Y.Doc, id: string, to: number) {
  const from = order(doc).toArray().indexOf(id);
  if (from < 0 || from === to) return;
  doc.transact(() => {
    order(doc).delete(from, 1);
    order(doc).insert(Math.max(0, Math.min(to, order(doc).length)), [id]);
  });
}

export const setLayout = (doc: Y.Doc, id: string, layout: Layout) => meta(doc).set(id, { layout });
export const setTheme = (doc: Y.Doc, theme: Theme) => deckMap(doc).set("theme", theme);
