// @ts-expect-error its .d.ts declares module "domino" rather than the package name
import domino from "@mixmark-io/domino";
import { getSchema } from "@tiptap/core";
import { DOMParser, DOMSerializer } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import { atom } from "nanostores";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/state/cloudstore-data", () => ({
  $documents: atom([{ id: "abc", title: "Renamed plan", kind: "sheet" }]),
}));

const { DocLink } = await import("../extensions/doc-link");

const dom = (domino as { createDocument(h: string): Document }).createDocument("<html><body></body></html>");
const schema = getSchema([StarterKit, DocLink]);

const parse = (html: string) => {
  const el = dom.createElement("div");
  el.innerHTML = html;
  return DOMParser.fromSchema(schema).parse(el);
};
const serialize = (doc: ReturnType<typeof parse>) => {
  const el = dom.createElement("div");
  el.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(doc.content, { document: dom }));
  return el.innerHTML;
};

describe("docLink node", () => {
  it("parses the anchor ahead of the link mark and serializes with the live title and route", () => {
    const doc = parse('<p>See <a data-doc-link="abc" href="/document/abc">Old plan</a></p>');
    const node = doc.firstChild?.lastChild;
    expect(node?.type.name).toBe("docLink");
    expect(node?.attrs).toEqual({ id: "abc", title: "Old plan" });
    expect(serialize(doc)).toBe('<p>See <a data-doc-link="abc" href="/sheet/abc">Renamed plan</a></p>');
  });

  it("falls back to the stored title for unknown files", () => {
    expect(serialize(parse('<p><a data-doc-link="zzz" href="/document/zzz">Gone</a></p>'))).toBe(
      '<p><a data-doc-link="zzz" href="/document/zzz">Gone</a></p>',
    );
  });
});
