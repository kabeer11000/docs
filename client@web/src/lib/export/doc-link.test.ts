// @ts-expect-error its .d.ts declares module "domino" rather than the package name
import domino from "@mixmark-io/domino";
import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { htmlToDocx } from "./docx";
import { htmlToMarkdown } from "./markdown";
import { absoluteDocLinks } from "./rich-nodes";
import { buildStandaloneHtml, htmlToText } from "./standalone-html";

const html = '<p>See <a data-doc-link="abc" href="/document/abc">Q3 plan</a> and <a href="/document/x">plain</a>.</p>';
const paper = { paper: "a4", orientation: "portrait", margins: { top: 1, right: 1, bottom: 1, left: 1 } } as const;

describe("doc links in exports", () => {
  it("absoluteDocLinks prefixes only file links, and only with an origin", () => {
    expect(absoluteDocLinks(html, "https://docs.example")).toBe(
      '<p>See <a data-doc-link="abc" href="https://docs.example/document/abc">Q3 plan</a> and <a href="/document/x">plain</a>.</p>',
    );
    expect(absoluteDocLinks(html, "")).toBe(html);
  });

  it("markdown writes a link to the file", () => {
    expect(htmlToMarkdown(html)).toBe("See [Q3 plan](/document/abc) and [plain](/document/x).\n");
  });

  it("docx writes a hyperlink", async () => {
    const blob = await htmlToDocx({ html: absoluteDocLinks(html, "https://docs.example"), title: "t", paper });
    const xml = strFromU8(unzipSync(new Uint8Array(await blob.arrayBuffer()))["word/document.xml"]);
    expect(xml).toContain("w:hyperlink");
    expect(xml).toContain("Q3 plan");
  });

  it("standalone html keeps the anchor and plain text keeps the title", () => {
    expect(buildStandaloneHtml({ title: "t", bodyHtml: html, paper })).toContain('<a data-doc-link="abc" href="/document/abc">Q3 plan</a>');
    const parse = (h: string) => (domino as { createDocument(h: string): Document }).createDocument(h);
    expect(htmlToText(html, parse)).toBe("See Q3 plan and plain.\n");
  });
});
