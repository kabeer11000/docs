import { describe, expect, it } from "vitest";
import { isPlaceholderTitle, titleFromHtml } from "./titles";

describe("isPlaceholderTitle", () => {
  it("matches names given to new files", () => {
    for (const t of ["", "Untitled document", "Untitled Document", "Untitled Document 11/17/2025", "untitled", "Untitled spreadsheet"]) {
      expect(isPlaceholderTitle(t)).toBe(true);
    }
  });
  it("leaves real titles alone", () => {
    for (const t of ["Untitled thoughts on design", "Business Proposal", "Notes"]) expect(isPlaceholderTitle(t)).toBe(false);
  });
});

describe("titleFromHtml", () => {
  it("takes the first non-empty block", () => {
    expect(titleFromHtml("<p></p><h1>Q3 &amp; Q4 <em>plan</em></h1><p>body</p>")).toBe("Q3 & Q4 plan");
  });
  it("trims long lines", () => {
    const t = titleFromHtml(`<p>${"word ".repeat(30)}</p>`) ?? "";
    expect(t.length).toBeLessThanOrEqual(60);
    expect(t.endsWith("...")).toBe(true);
  });
  it("returns null for an empty document", () => {
    expect(titleFromHtml("<p></p><p> </p>")).toBeNull();
  });
});
