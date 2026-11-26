import { cssPageRule, type PaperSettings, pageGeometry } from "../paper";

// Print = the on-screen pages. The editor DOM (with its pagination spacers) is cloned into a
// hidden iframe that loads the app's own stylesheets, so fonts, widths and line breaks are
// identical to the screen; spacers become forced page breaks.

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

export function printOverridesCss(paper: PaperSettings): string {
  const g = pageGeometry(paper);
  return `${cssPageRule(paper)}
html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; height: auto !important; overflow: visible !important; }
body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.print-root { width: ${g.contentWidth}px; margin: 0 auto; }
.print-root > .ProseMirror { padding: 0 !important; margin: 0 !important; width: auto !important; min-height: 0 !important; background: none !important; box-shadow: none !important; }
.print-root .pg-break { height: 0 !important; margin: 0 !important; break-before: page; }
.print-root [data-page-break] { break-after: auto !important; visibility: hidden; }
.print-root .comment-highlight, .print-root .comment-highlighted, .print-root .comment-resolved { background: none !important; border-bottom: 0 !important; }
.print-root .red-flag-underline, .print-root .green-flag-underline { background: none !important; border-bottom: 0 !important; }
.print-root a { color: inherit !important; text-decoration: underline !important; }
.print-root .ProseMirror-selectednode { outline: none !important; }
@media screen { body { background: #eceef1 !important; } .print-root { background: #fff; padding: ${g.margins.top}px ${g.margins.right}px; } }`;
}

export interface PrintInput {
  /** Cloned editor root (outerHTML). */
  contentHtml: string;
  paper: PaperSettings;
  title: string;
  /** `<link rel=stylesheet>` / `<style>` tags of the app. */
  headHtml: string;
  htmlClass?: string;
  bodyClass?: string;
  baseHref?: string;
}

export function buildPrintHtml(p: PrintInput): string {
  return `<!DOCTYPE html><html lang="en" class="${escapeHtml(p.htmlClass ?? "")}"><head><meta charset="utf-8">${
    p.baseHref ? `<base href="${escapeHtml(p.baseHref)}">` : ""
  }<title>${escapeHtml(p.title)}</title>${p.headHtml}<style>${printOverridesCss(p.paper)}</style></head><body class="${escapeHtml(
    p.bodyClass ?? "",
  )}"><div class="print-root">${p.contentHtml}</div></body></html>`;
}

/** Editor DOM without editing chrome (carets, selection, contenteditable). */
export function snapshotEditor(dom: HTMLElement): string {
  const clone = dom.cloneNode(true) as HTMLElement;
  clone.removeAttribute("contenteditable");
  clone.removeAttribute("style");
  clone.classList.remove("ProseMirror-focused");
  for (const el of clone.querySelectorAll(
    ".collaboration-carets__caret, .collaboration-cursor__caret, .ProseMirror-gapcursor, .ProseMirror-dropcursor, .slash-query",
  )) {
    el.remove();
  }
  for (const el of clone.querySelectorAll("[contenteditable]")) el.removeAttribute("contenteditable");
  return clone.outerHTML;
}

function appHead(): string {
  return Array.from(document.head.querySelectorAll('link[rel="stylesheet"], style'))
    .map((el) => {
      if (el instanceof HTMLLinkElement) return `<link rel="stylesheet" href="${escapeHtml(el.href)}">`;
      return el.outerHTML;
    })
    .join("");
}

/** Classes that carry next/font variables, minus the theme so print is always light. */
const lightClasses = (cls: string) => cls.split(/\s+/).filter((c) => c && c !== "dark").join(" ");

export function buildPrintHtmlFromEditor(dom: HTMLElement, paper: PaperSettings, title: string): string {
  return buildPrintHtml({
    contentHtml: snapshotEditor(dom),
    paper,
    title,
    headHtml: appHead(),
    htmlClass: lightClasses(document.documentElement.className),
    bodyClass: lightClasses(document.body.className),
    baseHref: `${location.origin}/`,
  });
}

/** Opens the browser print dialog with exactly the on-screen pages. */
export function printEditor(dom: HTMLElement, paper: PaperSettings, title: string) {
  for (const old of document.querySelectorAll("iframe[data-print-frame]")) old.remove();
  const frame = document.createElement("iframe");
  frame.dataset.printFrame = "";
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  frame.srcdoc = buildPrintHtmlFromEditor(dom, paper, title);
  frame.onload = async () => {
    const win = frame.contentWindow;
    if (!win) return;
    await win.document.fonts?.ready;
    await Promise.all(
      Array.from(win.document.images).map((img) =>
        img.complete
          ? null
          : new Promise((resolve) => {
              img.onload = img.onerror = resolve;
            }),
      ),
    );
    win.focus();
    win.print();
  };
  document.body.appendChild(frame);
}
