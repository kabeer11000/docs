import { describe, expect, it } from "vitest";
import { importKind } from "./kinds";
import { bodySize, groupLines, headingLevel, type PdfTextItem, pdfPagesToHtml } from "./pdf";

const run = (str: string, x: number, y: number, size = 10, bold = false): PdfTextItem => ({
  str,
  x,
  y,
  width: str.length * size * 0.5,
  size,
  bold,
});

describe("importKind", () => {
  it("routes by extension, case-insensitively", () => {
    expect(importKind("a.DOCX")).toBe("doc");
    expect(importKind("notes.markdown")).toBe("doc");
    expect(importKind("scan.pdf")).toBe("pdf");
    expect(importKind("data.csv")).toBe("sheet");
    expect(importKind("deck.pptx")).toBe("slides");
    expect(importKind("old.ppt")).toBeNull();
    expect(importKind("README")).toBeNull();
  });
});

describe("pdf text grouping", () => {
  it("joins runs on one baseline in x order and adds spaces at gaps", () => {
    const lines = groupLines([run("world", 40, 100), run("Hello", 0, 100.5), run("Next", 0, 86)]);
    expect(lines.map((l) => l.text)).toEqual(["Hello world", "Next"]);
  });

  it("does not add a space between touching runs", () => {
    const lines = groupLines([run("Hel", 0, 100), run("lo", 15, 100)]);
    expect(lines[0].text).toBe("Hello");
  });

  it("finds the body size by character count and maps larger sizes to headings", () => {
    const lines = groupLines([run("Big title", 0, 200, 24), run("a long line of body text here", 0, 170), run("more body text again", 0, 158)]);
    expect(bodySize(lines)).toBe(10);
    expect(headingLevel(24, 10)).toBe(1);
    expect(headingLevel(14, 10)).toBe(2);
    expect(headingLevel(11.5, 10)).toBe(3);
    expect(headingLevel(10.5, 10)).toBe(0);
  });

  it("builds headings, paragraphs, bold, bullets and page breaks", () => {
    const page1 = [
      run("Report", 0, 700, 22),
      run("First line of a para-", 0, 660),
      run("graph that wraps.", 0, 648),
      run("Second paragraph after a gap.", 0, 620),
      run("Key point", 0, 590, 10, true),
      run("• one", 0, 570),
      run("• two", 0, 558),
    ];
    const page2 = [run("Back matter", 0, 700, 13), run("End & done <ok>", 0, 680)];
    expect(pdfPagesToHtml([page1, page2])).toBe(
      "<h1>Report</h1><p>First line of a paragraph that wraps.</p><p>Second paragraph after a gap.</p><p><strong>Key point</strong></p>" +
        '<ul><li><p>one</p></li><li><p>two</p></li></ul><div data-page-break="true"></div><h2>Back matter</h2><p>End &amp; done &lt;ok&gt;</p>',
    );
  });

  it("returns nothing for pages without text", () => {
    expect(pdfPagesToHtml([[], [run("  ", 0, 10)]])).toBe("");
  });
});
