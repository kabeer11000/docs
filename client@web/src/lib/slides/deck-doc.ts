import type * as Y from "yjs";
import {
  ALL_REGIONS,
  type Deck,
  isBackground,
  isLayout,
  isTheme,
  isTransition,
  type Layout,
  newSlideId,
  normalizeElement,
  type Slide,
  type SlideElement,
  type Theme,
  type Transition,
} from "./model";

/**
 * Live shape of a presentation in one Y.Doc:
 * - "order": Y.Array of slide ids
 * - "slides": Y.Map id -> { layout }
 * - "deck": Y.Map { theme, transition }
 * - "elements": Y.Map elementId -> { slide, type, x, y, w, h, src?, z } (one entry per element, so two people
 *   moving different elements never clash)
 * - one Y.XmlFragment per region, named `${slideId}:${region}` (speaker notes use the region "notes"),
 *   and one per text box, named `el:${elementId}`.
 */
export const field = (slideId: string, region: string) =>
  `${slideId}:${region}`;
export const elementField = (elementId: string) => `el:${elementId}`;
const FIELDS = [...ALL_REGIONS, "notes"];

const order = (doc: Y.Doc) => doc.getArray<string>("order");
const meta = (doc: Y.Doc) =>
  doc.getMap<{ layout: Layout; background?: string }>("slides");
const deckMap = (doc: Y.Doc) => doc.getMap<unknown>("deck");

export type ElementRef = Omit<SlideElement, "html">;
interface StoredElement extends ElementRef {
  slide: string;
  z: number;
}
const elementMap = (doc: Y.Doc) => doc.getMap<StoredElement>("elements");

export interface SlideRef {
  id: string;
  layout: Layout;
  elements: ElementRef[];
  background?: string;
}

/** Elements per slide, in stacking order. Invalid entries are skipped. */
function elementsBySlide(doc: Y.Doc) {
  const out = new Map<string, (ElementRef & { z: number })[]>();
  for (const [id, raw] of elementMap(doc).entries()) {
    const el = normalizeElement({ ...raw, id });
    if (!el || typeof raw.slide !== "string") continue;
    const { html: _html, ...ref } = el;
    const list = out.get(raw.slide) ?? [];
    list.push({ ...ref, z: typeof raw.z === "number" ? raw.z : 0 });
    out.set(raw.slide, list);
  }
  for (const list of out.values())
    list.sort((a, b) => a.z - b.z || a.id.localeCompare(b.id));
  return out;
}

/** Slide order, layouts and elements (duplicate ids, possible if two clients seeded at once, are dropped). */
export function readStructure(doc: Y.Doc): {
  theme: Theme;
  transition: Transition;
  slides: SlideRef[];
} {
  const seen = new Set<string>();
  const slides: SlideRef[] = [];
  const els = elementsBySlide(doc);
  for (const id of order(doc).toArray()) {
    if (seen.has(id)) continue;
    seen.add(id);
    const m = meta(doc).get(id);
    const layout = m?.layout;
    const elements = (els.get(id) ?? []).map(({ z: _z, ...e }) => e);
    slides.push({
      id,
      layout: isLayout(layout) ? layout : "title-body",
      elements,
      ...(isBackground(m?.background) ? { background: m?.background } : {}),
    });
  }
  const theme = deckMap(doc).get("theme");
  const transition = deckMap(doc).get("transition");
  return {
    theme: isTheme(theme) ? theme : "paper",
    transition: isTransition(transition) ? transition : "none",
    slides,
  };
}

export const isEmptyDeck = (doc: Y.Doc) => order(doc).length === 0;

type Fill = (html: string, fragment: Y.XmlFragment) => void;

/** Writes whole slides (content, notes, elements) into the doc at `index`. Ids must be new to this doc. */
export function insertSlides(
  doc: Y.Doc,
  slides: Slide[],
  index: number,
  fill: Fill,
) {
  doc.transact(() => {
    for (const s of slides) {
      meta(doc).set(
        s.id,
        s.background
          ? { layout: s.layout, background: s.background }
          : { layout: s.layout },
      );
      for (const [r, html] of Object.entries(s.html))
        if (html) fill(html, doc.getXmlFragment(field(s.id, r)));
      if (s.notes)
        fill(notesToHtml(s.notes), doc.getXmlFragment(field(s.id, "notes")));
      for (const [i, { html, ...e }] of s.elements.entries()) {
        elementMap(doc).set(e.id, { ...e, slide: s.id, z: i });
        if (e.type === "text" && html)
          fill(html, doc.getXmlFragment(elementField(e.id)));
      }
    }
    order(doc).insert(
      Math.max(0, Math.min(index, order(doc).length)),
      slides.map((s) => s.id),
    );
  });
}

/** Fills an empty doc from the stored deck. `fill` writes HTML into a fragment (needs the editor schema). */
export function seedDeck(doc: Y.Doc, deck: Deck, fill: Fill) {
  doc.transact(() => {
    deckMap(doc).set("theme", deck.theme);
    deckMap(doc).set("transition", deck.transition);
    insertSlides(doc, deck.slides, 0, fill);
  }, "seed");
}

/** Replaces every slide with `deck`'s (and takes its theme and transition). */
export function replaceDeck(doc: Y.Doc, deck: Deck, fill: Fill) {
  doc.transact(() => {
    const old = order(doc).toArray();
    insertSlides(doc, deck.slides, old.length, fill);
    for (const id of old) deleteSlide(doc, id);
    deckMap(doc).set("theme", deck.theme);
    deckMap(doc).set("transition", deck.transition);
  });
}

export function notesToHtml(notes: string) {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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

const cloneFragment = (doc: Y.Doc, from: string, to: string) => {
  const src = doc.getXmlFragment(from);
  if (src.length)
    doc.getXmlFragment(to).insert(
      0,
      src.toArray().map((n) => n.clone() as Y.XmlElement | Y.XmlText),
    );
};

const slideElementIds = (doc: Y.Doc, slideId: string) =>
  [...elementMap(doc).entries()]
    .filter(([, e]) => e.slide === slideId)
    .map(([id]) => id);

export function duplicateSlide(doc: Y.Doc, id: string): string | null {
  const index = order(doc).toArray().indexOf(id);
  if (index < 0) return null;
  const copy = newSlideId();
  doc.transact(() => {
    meta(doc).set(copy, { ...(meta(doc).get(id) ?? { layout: "title-body" }) });
    for (const f of FIELDS) cloneFragment(doc, field(id, f), field(copy, f));
    for (const elId of slideElementIds(doc, id)) {
      const el = elementMap(doc).get(elId);
      if (!el) continue;
      const newId = newSlideId();
      elementMap(doc).set(newId, { ...el, id: newId, slide: copy });
      cloneFragment(doc, elementField(elId), elementField(newId));
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
    for (let i = ids.length - 1; i >= 0; i--)
      if (ids[i] === id) order(doc).delete(i, 1);
    meta(doc).delete(id);
    for (const elId of slideElementIds(doc, id)) removeElement(doc, elId);
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

export const setLayout = (doc: Y.Doc, id: string, layout: Layout) =>
  meta(doc).set(id, { ...meta(doc).get(id), layout });
/** A per-slide background (BACKGROUNDS key or hex); undefined restores the theme background. */
export function setBackground(
  doc: Y.Doc,
  id: string,
  background: string | undefined,
) {
  const { background: _old, ...rest } = meta(doc).get(id) ?? {
    layout: "title-body" as Layout,
  };
  meta(doc).set(id, background ? { ...rest, background } : rest);
}
export const setTheme = (doc: Y.Doc, theme: Theme) =>
  deckMap(doc).set("theme", theme);
export const setTransition = (doc: Y.Doc, transition: Transition) =>
  deckMap(doc).set("transition", transition);

let zCounter = 0;
const nextZ = () => Date.now() * 100 + (zCounter++ % 100);

export function addElement(
  doc: Y.Doc,
  slideId: string,
  el: Omit<ElementRef, "id">,
): string {
  const id = newSlideId();
  elementMap(doc).set(id, { ...el, id, slide: slideId, z: nextZ() });
  return id;
}

/** Changes an element's fields (a no-op if someone else deleted it meanwhile). `undefined` clears a field. */
export function patchElement(
  doc: Y.Doc,
  id: string,
  patch: Partial<Omit<ElementRef, "id" | "type">>,
) {
  const cur = elementMap(doc).get(id);
  if (!cur) return;
  const next: Record<string, unknown> = { ...cur, ...patch };
  for (const k of Object.keys(next)) if (next[k] === undefined) delete next[k];
  elementMap(doc).set(id, next as unknown as StoredElement);
}

export const updateElement = (
  doc: Y.Doc,
  id: string,
  box: Pick<ElementRef, "x" | "y" | "w" | "h">,
) => patchElement(doc, id, box);

/** Copies an element (and its text) onto `slideId`, nudged by (dx, dy) percent. Returns the new id. */
export function duplicateElement(
  doc: Y.Doc,
  id: string,
  slideId?: string,
  dx = 2,
  dy = 3,
): string | null {
  const cur = elementMap(doc).get(id);
  if (!cur) return null;
  const copy = newSlideId();
  doc.transact(() => {
    elementMap(doc).set(copy, {
      ...cur,
      id: copy,
      slide: slideId ?? cur.slide,
      x: cur.x + dx,
      y: cur.y + dy,
      z: nextZ(),
    });
    cloneFragment(doc, elementField(id), elementField(copy));
  });
  return copy;
}

/** Sends an element behind everything else on its slide. */
export function lowerElement(doc: Y.Doc, id: string) {
  const cur = elementMap(doc).get(id);
  if (!cur) return;
  const zs = [...elementMap(doc).values()]
    .filter((e) => e.slide === cur.slide)
    .map((e) => e.z ?? 0);
  elementMap(doc).set(id, { ...cur, z: Math.min(...zs) - 1 });
}

/** Brings an element to the front of its slide. */
export function raiseElement(doc: Y.Doc, id: string) {
  const cur = elementMap(doc).get(id);
  if (cur) elementMap(doc).set(id, { ...cur, z: nextZ() });
}

export function removeElement(doc: Y.Doc, id: string) {
  doc.transact(() => {
    elementMap(doc).delete(id);
    const frag = doc.getXmlFragment(elementField(id));
    if (frag.length) frag.delete(0, frag.length);
  });
}
