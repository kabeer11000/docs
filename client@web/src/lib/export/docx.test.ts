import { describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { htmlToDocx } from "./docx";

const xmlOf = async (blob: Blob) => strFromU8(unzipSync(new Uint8Array(await blob.arrayBuffer()))["word/document.xml"]);

describe("htmlToDocx", () => {
  it("keeps headings, marks, lists, tables, links and page breaks", async () => {
    const html =
      '<h1>Title</h1><p><strong>bold</strong> <em>it</em> <a href="https://e.com">link</a></p><ul><li><p>item</p></li></ul>' +
      '<table><tbody><tr><th><p>A</p></th></tr><tr><td><p>1</p></td></tr></tbody></table><div data-page-break="true"></div><p>after</p>';
    const xml = await xmlOf(await htmlToDocx({ html, title: "t", paper: { paper: "a4", orientation: "portrait", margins: { top: 1, right: 1, bottom: 1, left: 1 } } }));
    expect(xml).toContain("Heading1");
    expect(xml).toContain("<w:b/>");
    expect(xml).toContain("<w:i/>");
    expect(xml).toContain("w:hyperlink");
    expect(xml).toContain("<w:numPr>");
    expect(xml).toContain("<w:tbl>");
    expect(xml).toMatch(/<w:pageBreakBefore\/><\/w:pPr><w:r><w:t[^>]*>after/);
    expect(xml).toContain("after");
    // A4 = 11906 x 16838 twips (rounded from inches)
    expect(xml).toMatch(/<w:pgSz w:w="1190\d" w:h="1683\d"/);
    expect(xml).toContain('w:top="1440"');
  });

  it("writes highlights, sub/superscript, code, callouts and math", async () => {
    const html =
      '<p><mark>hi</mark> H<sub>2</sub>O x<sup>2</sup></p><pre><code class="language-js">let a = 1;</code></pre>' +
      '<div data-callout="warning" class="callout"><p>careful</p></div><p><span data-latex="\\frac{1}{2}" data-type="inline-math"></span></p>';
    const xml = await xmlOf(await htmlToDocx({ html, title: "t", paper: { paper: "a4", orientation: "portrait", margins: { top: 1, right: 1, bottom: 1, left: 1 } } }));
    expect(xml).toMatch(/<w:highlight|<w:shd[^>]*w:fill="FFE36B"/i);
    expect(xml).toContain('w:vertAlign w:val="subscript"');
    expect(xml).toContain('w:vertAlign w:val="superscript"');
    expect(xml).toContain("let a = 1;");
    expect(xml).toMatch(/<w:pBdr><w:left[^>]*w:color="D97706"/i);
    expect(xml).toContain("careful");
    expect(xml).toContain("<m:oMath");
    expect(xml).toContain("<m:f>");
  });

  it("writes embeds as hyperlinks and diagrams as their source", async () => {
    const html =
      '<div data-embed="YouTube" class="embed"><iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" title="YouTube"></iframe>' +
      '<a class="embed-link" href="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ">YouTube</a></div>' +
      '<div data-diagram="" class="diagram"><pre><code class="language-mermaid">flowchart LR\n  A --&gt; B</code></pre></div>';
    const xml = await xmlOf(await htmlToDocx({ html, title: "t", paper: { paper: "a4", orientation: "portrait", margins: { top: 1, right: 1, bottom: 1, left: 1 } } }));
    expect(xml).toContain("w:hyperlink");
    expect(xml).toContain(">YouTube<");
    expect(xml).toContain("A --&gt; B");
  });

  it("writes landscape sheets", async () => {
    const xml = await xmlOf(await htmlToDocx({ html: "<p>x</p>", title: "t", paper: { paper: "letter", orientation: "landscape", margins: { top: 1, right: 1, bottom: 1, left: 1 } } }));
    expect(xml).toMatch(/<w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/);
  });
});
