import { backgroundCss, elementMarkup } from "./elements";
import { type Deck, LAYOUTS, type Slide } from "./model";
import { SLIDE_CSS, SLIDE_H, SLIDE_W } from "./styles";

export type NavAction = "next" | "prev" | "first" | "last";

/** Presenting keys, shared by present mode and the exported deck. */
export const NAV_KEYS: Record<string, NavAction> = {
  ArrowRight: "next",
  ArrowDown: "next",
  PageDown: "next",
  " ": "next",
  Enter: "next",
  ArrowLeft: "prev",
  ArrowUp: "prev",
  PageUp: "prev",
  Backspace: "prev",
  Home: "first",
  End: "last",
};

export function navigate(
  action: NavAction,
  index: number,
  count: number,
): number {
  const next =
    action === "next"
      ? index + 1
      : action === "prev"
        ? index - 1
        : action === "first"
          ? 0
          : count - 1;
  return Math.max(0, Math.min(count - 1, next));
}

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Markup for one slide; region and text box HTML is the editor's own output (schema-generated), inserted as is. */
export const slideMarkup = (slide: Slide, theme: Deck["theme"]) => {
  const bg = backgroundCss(slide.background);
  return `<section class="sl" data-theme="${theme}" data-layout="${slide.layout}"${bg ? ` style="background:${escapeHtml(bg)}"` : ""}>${LAYOUTS[
    slide.layout
  ].regions
    .map(
      (r) =>
        `<div class="sl-r" data-region="${r}"><div>${slide.html[r] ?? ""}</div></div>`,
    )
    .join("")}${(slide.elements ?? []).map(elementMarkup).join("")}</section>`;
};

const SCREEN_CSS = `html,body{margin:0;height:100%;background:#000;overflow:hidden}.sl{position:absolute;left:50%;top:50%;display:none}.sl.on{display:block}`;
const PRINT_CSS = `@page{size:${SLIDE_W}px ${SLIDE_H}px;margin:0}html,body{margin:0;background:#fff}.sl{break-after:page;page-break-after:always}.sl:last-child{break-after:auto;page-break-after:auto}`;

const navScript = () =>
  `var K=${JSON.stringify(NAV_KEYS)},s=[].slice.call(document.querySelectorAll(".sl")),i=0;` +
  `function fit(){var k=Math.min(innerWidth/${SLIDE_W},innerHeight/${SLIDE_H});s.forEach(function(e){e.style.transform="translate(-50%,-50%) scale("+k+")"})}` +
  `function go(n){i=Math.max(0,Math.min(s.length-1,n));s.forEach(function(e,j){e.classList.toggle("on",j===i)})}` +
  `addEventListener("keydown",function(e){var a=K[e.key];if(!a)return;e.preventDefault();go(a==="next"?i+1:a==="prev"?i-1:a==="first"?0:s.length-1)});` +
  `addEventListener("click",function(){go(i+1)});addEventListener("resize",fit);fit();go(0);`;

/**
 * A self-contained HTML file for the deck. Screen mode shows one slide at a time with keyboard navigation;
 * print mode lays every slide on its own 1280x720 page. `extraCss` lets the caller embed fonts.
 */
export function deckToHtml(
  deck: Deck,
  title: string,
  opts: { print?: boolean; extraCss?: string } = {},
): string {
  const slides = deck.slides.map((s) => slideMarkup(s, deck.theme)).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title || "Presentation")}</title>
<style>${opts.extraCss ?? ""}
${SLIDE_CSS}
${opts.print ? PRINT_CSS : SCREEN_CSS}</style>
</head>
<body>
${slides}
${opts.print ? "" : `<script>${navScript()}</script>`}
</body>
</html>`;
}
