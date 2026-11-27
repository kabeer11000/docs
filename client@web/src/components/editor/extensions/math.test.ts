// @ts-expect-error its .d.ts declares module "domino" rather than the package name
import domino from "@mixmark-io/domino";
import { getSchema } from "@tiptap/core";
import { DOMParser, DOMSerializer } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { BlockMath, InlineMath } from "./math";

const dom = (domino as { createDocument(h: string): Document }).createDocument("<html><body></body></html>");
const schema = getSchema([StarterKit, InlineMath, BlockMath]);

const roundTrip = (html: string) => {
  const el = dom.createElement("div");
  el.innerHTML = html;
  const doc = DOMParser.fromSchema(schema).parse(el);
  const out = dom.createElement("div");
  out.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(doc.content, { document: dom }));
  return out.innerHTML;
};

// Saved documents must keep loading exactly as with @tiptap/extension-mathematics.
describe("math nodes", () => {
  it("keeps the stored inline and block math markup", () => {
    const inline = '<p>a <span data-latex="x^2" data-type="inline-math"></span> b</p>';
    const block = '<div data-latex="\frac{1}{2}" data-type="block-math"></div>';
    expect(roundTrip(inline)).toBe(inline);
    expect(roundTrip(block)).toBe(block);
  });
});
