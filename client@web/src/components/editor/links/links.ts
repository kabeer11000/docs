import type { Document } from "@shared-types";

export type LinkableFile = Pick<Document, "id" | "title" | "kind" | "updatedAt">;

const time = (d: Pick<Document, "updatedAt">) => new Date(d.updatedAt).getTime() || 0;

/** 0 when `query` is not a subsequence of `title`; higher is a better match. */
export function fuzzyScore(title: string, query: string): number {
  const t = title.toLowerCase();
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  if (t === q) return 1000;
  if (t.startsWith(q)) return 500;
  const at = t.indexOf(q);
  if (at >= 0) return 300 - Math.min(at, 100) + (/\W/.test(t[at - 1] ?? "") ? 50 : 0);
  let score = 100;
  let i = -1;
  for (const c of q) {
    const next = t.indexOf(c, i + 1);
    if (next < 0) return 0;
    score -= next - i - 1;
    i = next;
  }
  return Math.max(score, 1);
}

/** Best matches first, ties broken by most recently updated. */
export function rankFiles<T extends LinkableFile>(files: T[], query: string, limit = 8): T[] {
  return files
    .map((f) => ({ f, s: fuzzyScore(f.title || "", query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || time(b.f) - time(a.f))
    .slice(0, limit)
    .map((x) => x.f);
}

export const docContent = (d: Pick<Document, "pages">): string => {
  const c = d.pages?.[0]?.content;
  return typeof c === "string" ? c : "";
};

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " " };
const decode = (s: string) => s.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, e: string) => ENTITIES[e]);
const BLOCK = /<\/?(p|h[1-6]|li|td|th|tr|div|pre|blockquote|br|hr|ul|ol|table)\b[^>]*>/gi;
const MARK = "\u0001";

/** The text of the block holding the first link to `id`, cut to about `width` characters around it. */
export function linkExcerpt(html: string, id: string, width = 90): string {
  const at = html.indexOf(`data-doc-link="${id}"`);
  if (at < 0) return "";
  const start = html.lastIndexOf("<a", at);
  const end = html.indexOf("</a>", at);
  if (start < 0 || end < 0) return "";
  const marked = `${html.slice(0, start)}${MARK}${html.slice(start, end)}${MARK}${html.slice(end)}`;
  const text = decode(marked.replace(BLOCK, "\n").replace(/<[^>]*>/g, ""));
  const line = (text.split("\n").find((l) => l.includes(MARK)) ?? "").replace(/\s+/g, " ");
  const a = line.indexOf(MARK);
  const b = line.indexOf(MARK, a + 1);
  const side = Math.max(0, Math.floor((width - (b - a - 1)) / 2));
  const from = Math.max(0, a - side);
  const to = Math.min(line.length, b + 1 + side);
  const cut = line.slice(from, to).replaceAll(MARK, "").trim();
  return `${from > 0 ? "..." : ""}${cut}${to < line.length ? "..." : ""}`;
}

export interface Backlink {
  id: string;
  title: string;
  excerpt: string;
}

/** Documents (not sheets or slides) whose saved content links to `id`, most recently updated first. */
export function findBacklinks(docs: Document[], id: string): Backlink[] {
  const needle = `data-doc-link="${id}"`;
  return docs
    .filter((d) => d.id !== id && (d.kind ?? "doc") === "doc" && docContent(d).includes(needle))
    .sort((a, b) => time(b) - time(a))
    .map((d) => ({ id: d.id, title: d.title, excerpt: linkExcerpt(docContent(d), id) }));
}
