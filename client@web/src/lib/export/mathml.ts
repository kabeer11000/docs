import katex from "katex";
import { replaceMath } from "./rich-nodes";

// Kept apart from rich-nodes so modules that only need the light helpers (markdown, import) do not pull in KaTeX.

/** Math nodes as MathML, which browsers and Word render without KaTeX's stylesheet or fonts. */
export const mathToMathml = (html: string) =>
  replaceMath(html, (latex, block) => katex.renderToString(latex, { output: "mathml", displayMode: block, throwOnError: false }));
