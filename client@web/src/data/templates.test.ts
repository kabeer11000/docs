// @ts-expect-error its .d.ts declares module "domino" rather than the package name
import domino from "@mixmark-io/domino";
import { describe, expect, it } from "vitest";
import { parseTemplate, templateMarkup } from "@/components/templates/schema";
import { TEMPLATE_CATEGORIES, TEMPLATES } from "./templates";

const createDocument = (html = "") =>
  (domino as { createDocument(h: string): Document }).createDocument(html);
const parse = (html: string) => createDocument(html).body;
const squash = (s: string) => s.replace(/[\s ]+/g, "");

describe("document templates", () => {
  it("has a broad, uniquely named set across every category", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(36);
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
    expect(new Set(TEMPLATES.map((t) => t.name)).size).toBe(TEMPLATES.length);
    for (const c of TEMPLATE_CATEGORIES)
      expect(
        TEMPLATES.filter((t) => t.category === c).length,
      ).toBeGreaterThanOrEqual(5);
  });

  it("varies accent colours across templates", () => {
    const accents = new Set(
      TEMPLATES.map((t) => /color: (#[0-9A-F]{6})/i.exec(t.content)?.[1]),
    );
    expect(accents.size).toBeGreaterThanOrEqual(10);
  });

  describe.each(TEMPLATES.map((t) => [t.id, t] as const))("%s", (_, t) => {
    const body = parse(t.content);
    const doc = parseTemplate(t.content, createDocument());

    it("keeps every word through the editor schema", () => {
      expect(squash(doc.textContent)).toBe(squash(body.textContent));
    });

    it("keeps its colours, fonts, banner, callouts and headings through the editor schema", () => {
      const colours: string[] = [];
      const fonts: string[] = [];
      const images: string[] = [];
      const callouts: string[] = [];
      const headingClasses: string[] = [];
      doc.descendants((node) => {
        for (const mark of node.marks) {
          if (mark.type.name !== "textStyle") continue;
          if (mark.attrs.color) colours.push(mark.attrs.color);
          if (mark.attrs.fontFamily) fonts.push(mark.attrs.fontFamily);
        }
        if (node.type.name === "image") images.push(node.attrs.src);
        if (node.type.name === "callout") callouts.push(node.attrs.tone);
        if (node.type.name === "heading" && node.attrs.class)
          headingClasses.push(node.attrs.class);
      });
      const spans = Array.from(body.querySelectorAll("span[style]"));
      const expectedColours = spans.flatMap(
        (s) => /color: ([^;]+)/.exec(s.getAttribute("style") ?? "")?.[1] ?? [],
      );
      // Colours are per text node, so each coloured span yields at least one mark.
      expect(new Set(colours)).toEqual(new Set(expectedColours));
      expect(fonts.length > 0).toBe(
        spans.some((s) => s.getAttribute("style")?.includes("font-family")),
      );
      expect(images).toEqual(
        Array.from(body.querySelectorAll("img")).map((i) =>
          i.getAttribute("src"),
        ),
      );
      expect(callouts).toEqual(
        Array.from(body.querySelectorAll("div[data-callout]")).map((d) =>
          d.getAttribute("data-callout"),
        ),
      );
      expect(headingClasses).toEqual(
        Array.from(body.querySelectorAll("h1[class],h2[class],h3[class]")).map(
          (h) => h.getAttribute("class"),
        ),
      );
    });

    it("looks designed: accent colour and a banner or coloured title", () => {
      expect(t.content).toMatch(/color: #[0-9A-F]{6}/i);
      expect(
        body.querySelector("img") || body.querySelector("h1.title span[style]"),
      ).toBeTruthy();
      expect(t.description.length).toBeGreaterThan(10);
      expect(t.content).not.toMatch(/lorem|ipsum/i);
    });

    it("keeps banners small", () => {
      for (const img of Array.from(body.querySelectorAll("img"))) {
        const src = img.getAttribute("src") ?? "";
        expect(src.startsWith("data:image/svg+xml,")).toBe(true);
        expect(src.length).toBeLessThan(3072);
      }
    });

    it("renders static preview markup with real task checkboxes", () => {
      const html = templateMarkup(t.content, createDocument());
      const tasks = body.querySelectorAll('li[data-type="taskItem"]').length;
      expect(html.match(/type="checkbox"/g)?.length ?? 0).toBe(tasks);
    });
  });
});
