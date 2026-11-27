import type { Cell, CellValue as ExcelValue, Workbook } from "exceljs";
import { type CellValue, type Grid, type GridCell, gridsToSnapshot, type WorkbookSnapshot } from "./grid";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

async function newWorkbook(): Promise<Workbook> {
  const mod = await import("exceljs");
  const excel = ("default" in mod && mod.default ? mod.default : mod) as typeof import("exceljs");
  return new excel.Workbook();
}

function dateText(d: Date): string {
  const iso = d.toISOString();
  return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, 10) : iso.slice(0, 19).replace("T", " ");
}

function plain(value: ExcelValue | undefined): CellValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return dateText(value);
  if ("richText" in value) return value.richText.map((r) => r.text).join("");
  if ("error" in value) return value.error;
  if ("text" in value && "hyperlink" in value) return typeof value.text === "string" ? value.text : plain(value.text);
  if ("result" in value) return plain(value.result as ExcelValue);
  return null;
}

export function excelCell(cell: Pick<Cell, "value" | "formula">): GridCell {
  const value = cell.value;
  const isFormula = typeof value === "object" && value !== null && ("formula" in value || "sharedFormula" in value);
  const formula = isFormula ? cell.formula : undefined;
  return formula ? { v: plain(value), f: `=${formula}` } : { v: plain(value) };
}

/** Every worksheet of an .xlsx file as values and formulas (styles, merges and charts are not carried over). */
export async function xlsxToSnapshot(data: ArrayBuffer, name = "Workbook"): Promise<WorkbookSnapshot> {
  const wb = await newWorkbook();
  await wb.xlsx.load(data);
  const sheets = wb.worksheets.map((ws) => {
    const grid: Grid = [];
    ws.eachRow((row, r) => {
      row.eachCell({ includeEmpty: false }, (cell, c) => {
        const out = excelCell(cell);
        if (out.v === null && !out.f) return;
        grid[r - 1] ??= [];
        grid[r - 1][c - 1] = out;
      });
    });
    const width = grid.reduce((n, row) => Math.max(n, row?.length ?? 0), 0);
    const dense = Array.from(grid, (row) => Array.from({ length: width }, (_, c) => row?.[c] ?? { v: null }));
    return { name: ws.name, grid: dense };
  });
  return gridsToSnapshot(sheets, name);
}

/** One worksheet .xlsx; formula cells keep the formula plus their last result. */
export async function gridToXlsx(grid: Grid, sheetName = "Sheet1"): Promise<Blob> {
  const wb = await newWorkbook();
  const ws = wb.addWorksheet(sheetName.slice(0, 31) || "Sheet1");
  grid.forEach((row, r) => {
    row.forEach(({ v, f }, c) => {
      if (v === null && !f) return;
      ws.getCell(r + 1, c + 1).value = f ? { formula: f.replace(/^=/, ""), result: v ?? undefined } : v;
    });
  });
  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer as ArrayBuffer], { type: XLSX_MIME });
}
