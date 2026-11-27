import { cssPageRule, type PaperSettings, pageGeometry } from "../paper";
import { mathToMathml } from "./mathml";
import { absoluteDocLinks, diagramsToSvg } from "./rich-nodes";

// A single self-contained .html file that looks like the page: a sheet on a desk on screen,
// and the same paper size and margins when printed. No external requests.

const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

export function documentCss(paper: PaperSettings): string {
  const g = pageGeometry(paper);
  const m = g.margins;
  return `${cssPageRule(paper)}
:root { color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; background: #eceef1; color: #1e2227; font-family: "Schibsted Grotesk", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
.page { width: ${g.width}px; max-width: 100%; min-height: ${g.height}px; margin: 32px auto; padding: ${m.top}px ${m.right}px ${m.bottom}px ${m.left}px; background: #fff; border-radius: 2px; box-shadow: 0 0 0 1px #d9dce0, 0 1px 3px rgba(30, 34, 39, 0.06); font-size: 16px; line-height: 1.625; overflow-wrap: break-word; }
.page > :first-child { margin-top: 0; }
h1, h2, h3 { font-weight: 600; letter-spacing: -0.01em; }
h1 { font-size: 30px; line-height: 1.2; margin: 24px 0 16px; }
h2 { font-size: 24px; line-height: 1.3; margin: 20px 0 12px; }
h3 { font-size: 20px; line-height: 1.4; margin: 16px 0 8px; }
h1.title { font-size: 36px; text-align: center; }
h2.subtitle { font-size: 18px; font-weight: 500; color: #686e76; text-align: center; }
p { margin: 8px 0; }
a { color: #2340b8; text-underline-offset: 2px; }
strong { font-weight: 600; }
blockquote { margin: 16px 0; padding-left: 16px; border-left: 2px solid #d9dce0; color: #686e76; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.9em; background: #f1f2f4; border-radius: 4px; padding: 1px 4px; }
pre { margin: 16px 0; padding: 16px; background: #f1f2f4; border-radius: 6px; overflow-x: auto; font-size: 14px; line-height: 1.5; }
pre code { background: none; padding: 0; font-size: inherit; }
ul, ol { margin: 8px 0; padding-left: 24px; }
li { margin: 4px 0; }
li p, td p, th p { margin: 0; }
ul[data-type="taskList"] { list-style: none; padding-left: 2px; }
ul[data-type="taskList"] > li { display: flex; gap: 8px; align-items: flex-start; }
ul[data-type="taskList"] > li > label { margin-top: 1px; }
ul[data-type="taskList"] > li > div { flex: 1; }
ul[data-type="taskList"] > li[data-checked="true"] > div { color: #686e76; text-decoration: line-through; }
table { border-collapse: collapse; width: 100%; margin: 16px 0; }
th, td { border: 1px solid #d9dce0; padding: 8px 12px; text-align: left; vertical-align: top; }
th { background: #f5f6f8; font-weight: 500; }
hr { border: 0; border-top: 1px solid #d9dce0; margin: 24px 0; }
img { max-width: 100%; height: auto; }
.page-break { break-after: page; height: 0; margin: 0; border-top: 1px dashed #d9dce0; }
.comment-highlight { background: none; }
mark { background: #ffe36b; color: inherit; border-radius: 2px; padding: 0 1px; }
div[data-callout] { margin: 12px 0; padding: 10px 14px; border-left: 3px solid #686e76; border-radius: 2px; background: #f3f4f6; }
div[data-callout="tip"] { border-left-color: #16a34a; background: #eef8f1; }
div[data-callout="warning"] { border-left-color: #d97706; background: #fdf4e7; }
div[data-callout] > :first-child { margin-top: 0; }
div[data-callout] > :last-child { margin-bottom: 0; }
div[data-type="block-math"] { margin: 16px 0; overflow-x: auto; }
div[data-embed] { margin: 16px 0; border: 1px solid #d9dce0; border-radius: 2px; overflow: hidden; }
div[data-embed] iframe { display: block; width: 100%; aspect-ratio: var(--embed-aspect, 16 / 9); border: 0; }
div[data-embed] .embed-link { display: block; padding: 6px 10px; border-top: 1px solid #d9dce0; font-size: 12px; color: #686e76; text-decoration: none; }
div[data-diagram] { margin: 16px 0; text-align: center; }
div[data-diagram] svg { max-width: 100%; height: auto; }
@media print {
  body { background: none; }
  .page { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; border-radius: 0; }
  .page-break { border: 0; }
  div[data-embed] { border: 0; }
  div[data-embed] iframe { display: none; }
  div[data-embed] .embed-link { padding: 0; border: 0; font-size: inherit; color: inherit; text-decoration: underline; }
  div[data-embed] .embed-link::after { content: " (" attr(href) ")"; }
  pre, div[data-callout], div[data-type="block-math"], div[data-diagram] { break-inside: avoid; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  h1, h2, h3 { break-after: avoid; }
}`;
}

export function buildStandaloneHtml(opts: { title: string; bodyHtml: string; paper: PaperSettings }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(opts.title)}</title>
<style>
${documentCss(opts.paper)}
</style>
</head>
<body>
<article class="page">
${diagramsToSvg(mathToMathml(absoluteDocLinks(opts.bodyHtml)))}
</article>
</body>
</html>
`;
}

/** Plain text: blank lines between blocks, list items and table rows on consecutive lines. */
export function htmlToText(html: string, parse: (html: string) => Document): string {
  const doc = parse(html);
  for (const el of Array.from(doc.querySelectorAll("[data-latex]"))) el.textContent = el.getAttribute("data-latex");
  const lines: { text: string; tight: boolean }[] = [];
  const walk = (el: Element, depth: number) => {
    for (const child of Array.from(el.children)) {
      const tag = child.tagName;
      if (child.classList.contains("embed-link")) lines.push({ text: `${child.textContent}: ${child.getAttribute("href")}`, tight: false });
      else if (/^(P|H[1-6]|PRE)$/.test(tag) || child.hasAttribute("data-latex")) lines.push({ text: (child.textContent ?? "").trimEnd(), tight: false });
      else if (tag === "LI") {
        const checked = child.getAttribute("data-checked");
        const parent = child.parentElement;
        const mark =
          checked === "true" ? "[x] " : checked === "false" ? "[ ] " : parent?.tagName === "OL" ? `${Array.from(parent.children).indexOf(child) + Number(parent.getAttribute("start") || 1)}. ` : "- ";
        const own = Array.from(child.childNodes)
          .filter((n) => !/^(UL|OL)$/.test(n.nodeName))
          .map((n) => (n.textContent ?? "").trim())
          .filter(Boolean)
          .join(" ");
        lines.push({ text: "  ".repeat(depth) + mark + own, tight: true });
        for (const nested of Array.from(child.children).filter((c) => /^(UL|OL)$/.test(c.tagName))) walk(nested, depth + 1);
      } else if (tag === "TR") {
        lines.push({ text: Array.from(child.children).map((c) => (c.textContent ?? "").trim()).join("\t"), tight: true });
      } else if (tag === "HR") lines.push({ text: "---", tight: false });
      else walk(child, depth);
    }
  };
  walk(doc.body, 0);
  const out = lines.map((l, i) => (i === 0 ? "" : l.tight && lines[i - 1].tight ? "\n" : "\n\n") + l.text).join("");
  return `${out.trim()}\n`;
}
