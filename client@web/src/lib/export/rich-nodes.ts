import katex from "katex";
import { diagramSvgs } from "./diagram-cache";

export { diagramSvgs };

// Serialization helpers for editor nodes whose saved HTML is not what a reader should see.

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " " };
const unescapeHtml = (s: string) => s.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, e: string) => ENTITIES[e]);

// Math nodes serialize as empty elements carrying their LaTeX:
// <span data-latex="x^2" data-type="inline-math"></span>, <div ... data-type="block-math"></div>.
const MATH_RE = /<(span|div)\b([^>]*\bdata-type="(inline|block)-math"[^>]*)>\s*<\/\1>/g;

/** Fill each math node with `render(latex, block)`; the LaTeX attribute is dropped. */
export function replaceMath(html: string, render: (latex: string, block: boolean) => string): string {
  return html.replace(MATH_RE, (_m, tag: string, attrs: string, kind: string) => {
    const latex = unescapeHtml(attrs.match(/\bdata-latex="([^"]*)"/)?.[1] ?? "");
    return `<${tag} data-type="${kind}-math">${render(latex, kind === "block")}</${tag}>`;
  });
}

/** Math nodes as MathML, which browsers and Word render without KaTeX's stylesheet or fonts. */
export const mathToMathml = (html: string) =>
  replaceMath(html, (latex, block) => katex.renderToString(latex, { output: "mathml", displayMode: block, throwOnError: false }));

/** Mermaid source -> last SVG the editor rendered for it (light theme), for exports that can show it. */

const DIAGRAM_RE = /<div\b[^>]*\bdata-diagram="[^"]*"[^>]*><pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre><\/div>/g;

/** Diagrams as their rendered SVG where the editor has one; the others keep their source. */
export const diagramsToSvg = (html: string) =>
  html.replace(DIAGRAM_RE, (whole, code: string) => {
    const svg = diagramSvgs.get(unescapeHtml(code));
    return svg ? `<div data-diagram="">${svg}</div>` : whole;
  });

/** Links to other files carry app paths; exports leave the app, so make them absolute when an origin is known. */
export const absoluteDocLinks = (html: string, origin = typeof window === "undefined" ? "" : window.location.origin) =>
  origin ? html.replace(/<a\b[^>]*\bdata-doc-link=[^>]*>/g, (tag) => tag.replace(/\bhref="\//, `href="${origin}/`)) : html;
