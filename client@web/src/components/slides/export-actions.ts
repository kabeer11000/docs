import { deckToHtml } from "@/lib/slides/export";
import type { Deck } from "@/lib/slides/model";

const safeName = (title: string) => title.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) || "Presentation";

/** The app's web fonts (next/font @font-face rules and their CSS variables) so print matches the screen. */
function fontCss(): string {
  const rules: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) if (rule instanceof CSSFontFaceRule) rules.push(rule.cssText);
    } catch {
      /* cross-origin sheet */
    }
  }
  const css = getComputedStyle(document.body);
  const vars = ["--font-literata", "--font-ui"].map((v) => `${v}:${css.getPropertyValue(v) || "initial"}`).join(";");
  return `${rules.join("\n")}\n:root{${vars}}`;
}

/** PDF via the browser's print dialog: one slide per 1280x720 page. */
export function printDeck(deck: Deck, title: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  frame.srcdoc = deckToHtml(deck, title, { print: true, extraCss: fontCss() });
  frame.onload = async () => {
    const win = frame.contentWindow;
    if (!win) return frame.remove();
    await win.document.fonts?.ready;
    win.addEventListener("afterprint", () => setTimeout(() => frame.remove(), 0));
    win.focus();
    win.print();
  };
  document.body.appendChild(frame);
}

export function downloadDeckHtml(deck: Deck, title: string) {
  const url = URL.createObjectURL(new Blob([deckToHtml(deck, title)], { type: "text/html;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName(title)}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
