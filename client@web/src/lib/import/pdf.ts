/**
 * PDF -> editor HTML. pdf.js gives positioned text runs; we rebuild lines, then paragraphs, and infer
 * headings from font size relative to the body text. Images and vector graphics are skipped.
 */

/** One text run, in PDF user space (y grows upwards). */
export interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  size: number;
  bold: boolean;
}

interface Line {
  text: string;
  y: number;
  size: number;
  bold: boolean;
}

const escapeHtml = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string);
const BULLET = /^\s*[•●▪◦‣∙·\-–*]\s+/;
const round = (n: number) => Math.round(n * 2) / 2;

/** Runs grouped into reading-order lines (top to bottom, then left to right). */
export function groupLines(items: PdfTextItem[]): Line[] {
  const runs = items.filter((i) => i.str.length > 0 && i.size > 0).sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: PdfTextItem[][] = [];
  for (const run of runs) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(row[0].y - run.y) <= Math.max(row[0].size, run.size) * 0.5) row.push(run);
    else rows.push([run]);
  }
  return rows
    .map((row) => {
      row.sort((a, b) => a.x - b.x);
      let text = "";
      let end = Number.NEGATIVE_INFINITY;
      for (const run of row) {
        const gap = run.x - end;
        if (text && gap > run.size * 0.15 && !/\s$/.test(text) && !/^\s/.test(run.str)) text += " ";
        text += run.str;
        end = run.x + run.width;
      }
      const visible = row.filter((r) => r.str.trim());
      const weight = (r: PdfTextItem) => r.str.trim().length;
      const total = visible.reduce((n, r) => n + weight(r), 0);
      // The line's size is the size most of its characters have.
      const sizes = new Map<number, number>();
      for (const r of visible) sizes.set(round(r.size), (sizes.get(round(r.size)) ?? 0) + weight(r));
      const size = [...sizes].sort((a, b) => b[1] - a[1])[0]?.[0] ?? round(row[0].size);
      const boldChars = visible.filter((r) => r.bold).reduce((n, r) => n + weight(r), 0);
      return { text: text.replace(/\s+/g, " ").trim(), y: row[0].y, size, bold: total > 0 && boldChars / total > 0.8 };
    })
    .filter((l) => l.text);
}

/** Most common size by character count: the body text size. */
export function bodySize(lines: Line[]): number {
  const counts = new Map<number, number>();
  for (const l of lines) counts.set(l.size, (counts.get(l.size) ?? 0) + l.text.length);
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 12;
}

export function headingLevel(size: number, body: number): 0 | 1 | 2 | 3 {
  const r = size / body;
  if (r >= 1.6) return 1;
  if (r >= 1.3) return 2;
  if (r >= 1.12) return 3;
  return 0;
}

type Block = { kind: "h1" | "h2" | "h3" | "p" | "li"; text: string; bold: boolean };

/** Lines of one page as blocks. A gap clearly wider than the usual line spacing starts a new paragraph. */
function pageBlocks(lines: Line[], body: number): Block[] {
  const gaps = lines
    .slice(1)
    .map((l, i) => lines[i].y - l.y)
    // Only gaps that look like ordinary line spacing, so a page of short paragraphs still finds it.
    .filter((g) => g > 0 && g <= body * 2)
    .sort((a, b) => a - b);
  const lineGap = gaps[Math.floor(gaps.length / 2)] ?? body * 1.2;
  const blocks: Block[] = [];
  let prev: Line | null = null;
  for (const line of lines) {
    const level = headingLevel(line.size, body);
    const bullet = BULLET.test(line.text);
    const kind: Block["kind"] = level ? (`h${level}` as Block["kind"]) : bullet ? "li" : "p";
    const text = bullet ? line.text.replace(BULLET, "") : line.text;
    const last = blocks[blocks.length - 1];
    const gap = prev ? prev.y - line.y : 0;
    const joins =
      last &&
      prev &&
      !bullet &&
      (last.kind === kind || (last.kind === "li" && kind === "p")) &&
      last.bold === line.bold &&
      prev.size === line.size &&
      gap > 0 &&
      gap <= Math.max(lineGap * 1.35, line.size * 1.5);
    if (joins) {
      // Re-join words hyphenated across a line break.
      last.text = /[a-z]-$/.test(last.text) && /^[a-z]/.test(text) ? last.text.slice(0, -1) + text : `${last.text} ${text}`;
    } else {
      blocks.push({ kind, text, bold: line.bold });
    }
    prev = line;
  }
  return blocks;
}

function blocksToHtml(blocks: Block[]): string {
  let html = "";
  let inList = false;
  for (const b of blocks) {
    if (b.kind === "li" && !inList) html += "<ul>";
    if (b.kind !== "li" && inList) html += "</ul>";
    inList = b.kind === "li";
    const text = escapeHtml(b.text);
    if (b.kind === "li") html += `<li><p>${b.bold ? `<strong>${text}</strong>` : text}</p></li>`;
    else if (b.kind === "p") html += `<p>${b.bold ? `<strong>${text}</strong>` : text}</p>`;
    else html += `<${b.kind}>${text}</${b.kind}>`;
  }
  return inList ? `${html}</ul>` : html;
}

/** Text runs of every page as editor HTML, with a page break between PDF pages. */
export function pdfPagesToHtml(pages: PdfTextItem[][]): string {
  const linesPerPage = pages.map(groupLines);
  const body = bodySize(linesPerPage.flat());
  return linesPerPage
    .map((lines) => blocksToHtml(pageBlocks(lines, body)))
    .filter(Boolean)
    .join('<div data-page-break="true"></div>');
}

const BOLD_FONT = /bold|black|heavy|semibold|demi/i;

/** Loads pdf.js on demand (browser only) and converts the file. */
export async function pdfToHtml(data: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
  }
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(data), isEvalSupported: false }).promise;
  try {
    const pages: PdfTextItem[][] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      // Real font names (e.g. "ABCDEF+Arial-BoldMT") are only known once the page's fonts are loaded.
      await page.getOperatorList().catch(() => null);
      const fontName = (id: string): string => {
        try {
          const font = page.commonObjs.get(id) as { name?: string } | undefined;
          return font?.name ?? content.styles[id]?.fontFamily ?? id;
        } catch {
          return content.styles[id]?.fontFamily ?? id;
        }
      };
      const items: PdfTextItem[] = [];
      for (const item of content.items) {
        if (!("str" in item)) continue;
        const [, , c, d, e, f] = item.transform as number[];
        items.push({ str: item.str, x: e, y: f, width: item.width, size: Math.hypot(c, d) || item.height, bold: BOLD_FONT.test(fontName(item.fontName)) });
      }
      pages.push(items);
      page.cleanup();
    }
    return pdfPagesToHtml(pages);
  } finally {
    void pdf.destroy();
  }
}
