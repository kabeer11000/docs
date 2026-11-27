import type { Document } from "@shared-types";
import { stripActiveHtml } from "@/lib/api/content";
import { documents } from "@/lib/api/server";
import { documentCss } from "@/lib/export/standalone-html";
import { fromStored } from "@/lib/paper";
import { displayValue, isWorkbookSnapshot, snapshotToGrid } from "@/lib/sheet/grid";
import { deckToHtml } from "@/lib/slides/export";
import { normalizeDeck } from "@/lib/slides/model";

// Published files: plain server-rendered HTML, no app JavaScript.
// The CSP sandbox gives the page an opaque origin, so even content that slips past
// stripActiveHtml can never read this site's cookies or storage.
const SANDBOX_CSP =
  "sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox; default-src 'none'; img-src https: data:; media-src https:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; frame-src https:; script-src 'unsafe-inline'";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

function shell(title: string, css: string, body: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta property="og:title" content="${esc(title)}"><meta name="robots" content="index,follow">
<style>${css}
.published-bar{position:fixed;bottom:16px;right:16px;font:500 12px/1 system-ui,sans-serif;background:#121418;color:#fff;padding:8px 12px;border-radius:999px;text-decoration:none;opacity:.85}
.published-bar:hover{opacity:1}</style></head><body>${body}
<a class="published-bar" href="https://docs.kabeers.network" target="_blank" rel="noopener">Made with Docs</a></body></html>`;
}

function renderDoc(doc: Document) {
  const content = doc.pages?.[0]?.content;
  const html = typeof content === "string" ? stripActiveHtml(content) : "";
  // Reading on the web: no fixed page height, and edge-to-edge on phones.
  const css = `${documentCss(fromStored(doc.pageSettings))}
.page{min-height:0}
@media (max-width:760px){.page{margin:0;padding:28px 20px 64px;box-shadow:none;border-radius:0}}`;
  return shell(doc.title, css, `<main class="page">${html}</main>`);
}

function renderSheet(doc: Document) {
  if (!isWorkbookSnapshot(doc.data)) return shell(doc.title, "", "<p>This spreadsheet is empty.</p>");
  const grid = snapshotToGrid(doc.data, undefined, 200, 40);
  const rows = grid
    .map((row) => `<tr>${row.map((c) => `<td>${esc(displayValue(c.v))}</td>`).join("")}</tr>`)
    .join("");
  const css = `body{margin:0;font:14px/1.4 system-ui,sans-serif;color:#121418;background:#f5f6f8}h1{font-size:20px;margin:24px}
.wrap{overflow:auto;margin:0 24px 24px;background:#fff;border-radius:12px;box-shadow:0 0 0 1px #e3e6eb}
table{border-collapse:collapse}td{border:1px solid #e3e6eb;padding:6px 10px;white-space:nowrap;min-width:64px}`;
  return shell(doc.title, css, `<h1>${esc(doc.title)}</h1><div class="wrap"><table>${rows}</table></div>`);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await (await documents()).findOne({ id, "published.at": { $exists: true } });
  if (!doc) return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain" } });

  const kind = doc.kind ?? "doc";
  const html =
    kind === "slides" ? deckToHtml(normalizeDeck(doc.data), doc.title) : kind === "sheet" ? renderSheet(doc) : renderDoc(doc);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": SANDBOX_CSP,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
    },
  });
}
