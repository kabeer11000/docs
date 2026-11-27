import { type CellValue, displayValue, type Grid, type GridCell } from "./grid";

function quote(text: string): string {
  return /[",\r\n]|^\s|\s$/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** RFC 4180 CSV of the shown values (formulas export their result, like other spreadsheet apps). */
export function gridToCsv(grid: Grid): string {
  return grid.map((row) => row.map((cell) => quote(displayValue(cell.v))).join(",")).join("\r\n");
}

/** RFC 4180 parser: quoted fields, doubled quotes, newlines inside quotes, CRLF/LF/CR, optional BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  for (; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch !== '"') field += ch;
      else if (text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = false;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const NUMBER = /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;

/** Types a CSV field: numbers (except leading-zero codes like 007), TRUE/FALSE, "=..." formulas, else text. */
export function csvCell(text: string): GridCell {
  if (text.length > 1 && text.startsWith("=")) return { v: null, f: text };
  const upper = text.toUpperCase();
  if (upper === "TRUE" || upper === "FALSE") return { v: upper === "TRUE" };
  const trimmed = text.trim();
  if (NUMBER.test(trimmed) && !/^[-+]?0\d/.test(trimmed)) return { v: Number(trimmed) };
  return { v: (text === "" ? null : text) as CellValue };
}

export const csvToGrid = (text: string): Grid => parseCsv(text).map((row) => row.map(csvCell));
