import { htmlToMarkdown, markdownToHtml } from "@/lib/export/markdown";

export type ContentFormat = "html" | "markdown";

// The editor's schema is the real gate (it drops anything it does not know); this strips the
// obvious active content so raw HTML stored through the API is never executable elsewhere.
export function stripActiveHtml(html: string): string {
  return html
    .replace(/<(script|style|iframe|object|embed|noscript|template)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style|iframe|object|embed|link|meta|base)\b[^>]*>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1="#"');
}

export function toStoredHtml(content: string, format: ContentFormat): string {
  return format === "markdown" ? markdownToHtml(content) : stripActiveHtml(content);
}

/**
 * HTML of a doc's first page. Docs saved by the editor store an HTML string; a doc that was
 * created but never edited still holds an empty ProseMirror JSON node. Null means content the
 * server cannot convert (non-empty JSON), so callers refuse to overwrite it.
 */
export function docHtml(content: unknown): string | null {
  if (typeof content === "string") return content;
  if (content == null) return "";
  if (typeof content === "object") {
    const nodes = (content as { content?: unknown[] }).content;
    if (!Array.isArray(nodes) || nodes.length === 0) return "";
  }
  return null;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** Plain text: blocks separated by blank lines, list items and table rows on their own lines. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<[^>]*\bdata-latex="([^"]*)"[^>]*>/gi, "$1")
    // Editor list items and table cells wrap their text in <p>; keep them on one line.
    .replace(/(<(li|td|th)\b[^>]*>)\s*<p\b[^>]*>/gi, "$1")
    .replace(/<\/p>\s*(<\/(li|td|th)>)/gi, "$1")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<\/(td|th)>/gi, "\t")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<hr\b[^>]*>/gi, "\n\n---\n\n")
    .replace(/<\/(p|h[1-6]|pre|blockquote|ul|ol|table|div)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] !== "#") return ENTITIES[e.toLowerCase()] ?? m;
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    })
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function exportHtml(html: string, format: "html" | "markdown" | "text"): string {
  if (format === "markdown") return htmlToMarkdown(html);
  if (format === "text") return htmlToPlainText(html);
  return html;
}

/** Same count the editor's autosave stores. */
export function wordCount(html: string): number {
  const text = html.replace(/<[^>]*>/g, "").trim();
  return text.length === 0 ? 0 : text.split(/\s+/).length;
}

/** Appends HTML at the end of a doc, dropping the empty trailing paragraph an empty editor leaves. */
export function appendHtml(current: string, added: string): string {
  return current.replace(/(<p>\s*(<br\s*\/?>)?\s*<\/p>\s*)+$/i, "") + added;
}
