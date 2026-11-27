import { THEMES } from "./model";

export const SLIDE_W = 1280;
export const SLIDE_H = 720;

const themeVars = Object.entries(THEMES)
  .map(([name, t]) => `.sl[data-theme="${name}"]{--sl-bg:${t.bg};--sl-fg:${t.fg};--sl-accent:${t.accent}}`)
  .join("");

const at = (layout: string, region: string, rules: string) => `.sl[data-layout="${layout}"] .sl-r[data-region="${region}"]{${rules}}`;

const TITLE = "top:64px;height:120px;justify-content:flex-end;font-family:var(--sl-serif);font-size:52px;line-height:1.1;font-weight:600;letter-spacing:-0.015em";

/**
 * One stylesheet for every place a slide renders (editor canvas, filmstrip, present mode, print, HTML export),
 * so they always match. Markup: .sl[data-theme][data-layout] > .sl-r[data-region] > content.
 */
export const SLIDE_CSS = [
  `.sl{--sl-serif:var(--font-literata,Literata),Georgia,serif;--sl-sans:var(--font-ui,"Schibsted Grotesk"),system-ui,sans-serif;position:relative;width:${SLIDE_W}px;height:${SLIDE_H}px;overflow:hidden;background:var(--sl-bg);color:var(--sl-fg);font-family:var(--sl-sans);font-size:28px;line-height:1.45;text-align:left;-webkit-print-color-adjust:exact;print-color-adjust:exact}`,
  themeVars,
  ".sl-r{position:absolute;left:96px;right:96px;display:flex;flex-direction:column;overflow:hidden;overflow-wrap:break-word}",
  ".sl-r>*{outline:none;min-height:1.2em}",
  ".sl p{margin:0 0 .45em}.sl p:last-child{margin-bottom:0}",
  ".sl ul,.sl ol{margin:0 0 .45em;padding-left:1.15em}.sl li p{margin:0 0 .2em}.sl ul{list-style:disc}.sl ol{list-style:decimal}",
  ".sl blockquote{margin:0;padding-left:.8em;border-left:3px solid var(--sl-accent)}",
  ".sl code{font-family:ui-monospace,monospace;font-size:.85em}",
  ".sl a{color:var(--sl-accent);text-decoration:underline}",
  ".sl img{display:block;max-width:100%;max-height:100%;object-fit:contain;margin:0 auto}",
  ".sl-r:has(>[contenteditable=\"true\"]):hover{outline:1px dashed color-mix(in srgb,var(--sl-fg) 28%,transparent);outline-offset:6px}.sl-r:has(>[contenteditable=\"true\"]:focus){outline:1px solid color-mix(in srgb,var(--sl-fg) 40%,transparent);outline-offset:6px}",
  ".sl p.is-editor-empty:first-child::before{content:attr(data-placeholder);float:left;height:0;pointer-events:none;opacity:.38}",
  at("title", "title", "top:150px;height:300px;justify-content:flex-end;font-family:var(--sl-serif);font-size:76px;line-height:1.06;font-weight:600;letter-spacing:-0.02em"),
  at("title", "subtitle", "top:478px;height:160px;font-size:30px;opacity:.72"),
  at("title-body", "title", TITLE),
  at("title-body", "body", "top:216px;bottom:64px"),
  at("two-column", "title", TITLE),
  at("two-column", "left", "top:216px;bottom:64px;right:664px"),
  at("two-column", "right", "top:216px;bottom:64px;left:664px"),
  ".sl[data-layout=\"section\"]::before{content:\"\";position:absolute;left:96px;top:250px;width:72px;height:5px;background:var(--sl-accent)}",
  at("section", "title", "top:280px;height:340px;font-family:var(--sl-serif);font-size:64px;line-height:1.1;font-weight:600;letter-spacing:-0.015em"),
  at("image", "title", TITLE),
  at("image", "image", "top:216px;bottom:64px"),
  ".sl-r[data-region=\"image\"]>*{height:100%;display:flex;flex-direction:column;justify-content:center}.sl-r[data-region=\"image\"] img{min-height:0}",
  at("blank", "body", "top:64px;bottom:64px"),
].join("\n");
