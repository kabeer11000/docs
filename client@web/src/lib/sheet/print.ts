import { displayValue, type Grid } from "./grid";

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/** The used range as a clean, light, printable table (numbers right-aligned, header row repeats per page). */
export function gridToPrintHtml(grid: Grid, title: string): string {
  const width = grid.reduce((n, row) => Math.max(n, row.length), 0);
  const landscape = width > 8;
  const rows = grid
    .map((row, r) => {
      const tag = r === 0 ? "th" : "td";
      const cells = Array.from({ length: width }, (_, c) => {
        const v = row[c]?.v ?? null;
        const num = typeof v === "number" ? ' class="n"' : "";
        return `<${tag}${num}>${escapeHtml(displayValue(v))}</${tag}>`;
      }).join("");
      return r === 0 ? `<thead><tr>${cells}</tr></thead><tbody>` : `<tr>${cells}</tr>`;
    })
    .join("");
  const body = grid.length ? `<table>${rows}</tbody></table>` : "<p>This sheet is empty.</p>";
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
@page { size: ${landscape ? "landscape" : "portrait"}; margin: 14mm; }
html, body { margin: 0; background: #fff; color: #121418; font: 10pt/1.35 system-ui, -apple-system, "Segoe UI", sans-serif; }
h1 { font-size: 13pt; font-weight: 600; margin: 0 0 8pt; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 0.5pt solid #d5d9df; padding: 3pt 5pt; text-align: left; vertical-align: top; white-space: pre-wrap; word-break: break-word; }
th { background: #f2f4f6; font-weight: 600; }
.n { text-align: right; font-variant-numeric: tabular-nums; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
</style></head><body><h1>${escapeHtml(title)}</h1>${body}</body></html>`;
}
