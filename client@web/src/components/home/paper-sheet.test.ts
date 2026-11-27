// @ts-expect-error its .d.ts declares module "domino" rather than the package name
import domino from "@mixmark-io/domino";
import { describe, expect, it } from "vitest";
import { getPreviewBlocks } from "./paper-sheet";

const parse = (html: string) => (domino as { createDocument(h: string): Document }).createDocument(html);

describe("getPreviewBlocks", () => {
  it("reads saved HTML", () => {
    const blocks = getPreviewBlocks(
      "<h1>Title</h1><h3>Sub</h3><p>Body  text</p><ul><li><p>One</p></li><li><p>Two</p></li></ul><p></p>",
      parse,
    );
    expect(blocks).toEqual([
      { kind: "h1", text: "Title" },
      { kind: "h2", text: "Sub" },
      { kind: "p", text: "Body text" },
      { kind: "li", text: "One" },
      { kind: "li", text: "Two" },
    ]);
  });

  it("still reads ProseMirror JSON", () => {
    const blocks = getPreviewBlocks({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hi" }] }] });
    expect(blocks).toEqual([{ kind: "p", text: "Hi" }]);
  });

  it("returns nothing for empty or unparsable input", () => {
    expect(getPreviewBlocks("<p></p>", parse)).toEqual([]);
    expect(getPreviewBlocks("<p>x</p>", null)).toEqual([]);
    expect(getPreviewBlocks(undefined)).toEqual([]);
  });
});
