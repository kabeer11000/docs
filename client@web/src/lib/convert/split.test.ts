// @ts-expect-error its .d.ts declares module "domino" rather than the package name
import domino from "@mixmark-io/domino";
import { describe, expect, it } from "vitest";
import { docHtmlToSlides, MAX_BLOCKS } from "./split";

const parse = (html: string) => (domino as { createDocument(h: string): Document }).createDocument(html);
const split = (html: string, title = "Doc") => docHtmlToSlides(html, title, parse);

describe("docHtmlToSlides", () => {
  it("opens with a title slide and makes one slide per H1/H2", () => {
    const slides = split("<h1>Plan</h1><p>Intro line</p><h2>Goals</h2><ul><li>Ship</li><li>Learn</li></ul><h2>Risks</h2><p>Time</p>");
    expect(slides.map((s) => s.layout)).toEqual(["title", "title-body", "title-body"]);
    expect(slides[0].html).toEqual({ title: "<h1>Plan</h1>", subtitle: "<p>Intro line</p>" });
    expect(slides[1].html).toEqual({ title: "<h1>Goals</h1>", body: "<ul><li>Ship</li><li>Learn</li></ul>" });
  });

  it("uses the document title when no H1 leads, and keeps text before the first heading", () => {
    const slides = split("<p>One</p><p>Two</p><h2>Next</h2>", "My doc");
    expect(slides[0]).toEqual({ layout: "title-body", html: { title: "<h1>My doc</h1>", body: "<p>One</p><p>Two</p>" } });
    expect(slides[1]).toEqual({ layout: "section", html: { title: "<h1>Next</h1>" } });
    expect(split("", "Empty")).toEqual([{ layout: "title", html: { title: "<h1>Empty</h1>", subtitle: "" } }]);
  });

  it("carries images over and turns minor headings into bold lines", () => {
    const img = "https://example.com/a.png";
    const slides = split(
      `<h1>T</h1><h2>Pics</h2><p><img src="${img}"></p><h2>Mixed</h2><h3>Sub</h3><p>Text</p><img src="${img}"><img src="javascript:x">`,
    );
    expect(slides[1]).toEqual({ layout: "image", html: { title: "<h1>Pics</h1>", image: `<img src="${img}">` } });
    expect(slides[2]).toEqual({
      layout: "two-column",
      html: { title: "<h1>Mixed</h1>", left: "<p><strong>Sub</strong></p><p>Text</p>", right: `<img src="${img}">` },
    });
  });

  it("continues long sections on a new slide and escapes titles", () => {
    const paras = Array.from({ length: MAX_BLOCKS + 2 }, (_, i) => `<p>p${i}</p>`).join("");
    const slides = split(`<h1>A &amp; B</h1><h2>Long</h2>${paras}`);
    expect(slides.map((s) => s.html.title)).toEqual(["<h1>A &amp; B</h1>", "<h1>Long</h1>", "<h1>Long (continued)</h1>"]);
    expect(slides[2].html.body).toBe(`<p>p${MAX_BLOCKS}</p><p>p${MAX_BLOCKS + 1}</p>`);
  });
});
