import { csvToGrid, gridToCsv } from "@/lib/sheet/csv";
import { type Grid, gridsToSnapshot, type WorkbookSnapshot } from "@/lib/sheet/grid";
import { gridToPrintHtml } from "@/lib/sheet/print";

const safeName = (title: string) => title.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) || "Spreadsheet";

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function fileToSnapshot(file: File): Promise<{ title: string; data: WorkbookSnapshot }> {
  const title = file.name.replace(/\.(xlsx|csv)$/i, "") || "Imported spreadsheet";
  if (/\.xlsx$/i.test(file.name)) {
    const { xlsxToSnapshot } = await import("@/lib/sheet/xlsx");
    return { title, data: await xlsxToSnapshot(await file.arrayBuffer(), title) };
  }
  if (/\.csv$/i.test(file.name) || file.type === "text/csv") {
    return { title, data: gridsToSnapshot([{ name: "Sheet1", grid: csvToGrid(await file.text()) }], title) };
  }
  throw new Error("Choose an .xlsx or .csv file");
}

export async function downloadSheet(kind: "csv" | "xlsx" | "pdf", title: string, sheet: { name: string; grid: Grid }) {
  if (kind === "pdf") return printHtml(gridToPrintHtml(sheet.grid, title));
  if (kind === "csv") {
    saveBlob(new Blob([`\uFEFF${gridToCsv(sheet.grid)}`], { type: "text/csv;charset=utf-8" }), `${safeName(title)}.csv`);
    return;
  }
  const { gridToXlsx } = await import("@/lib/sheet/xlsx");
  saveBlob(await gridToXlsx(sheet.grid, sheet.name), `${safeName(title)}.xlsx`);
}

/** Opens the browser print dialog (where "Save as PDF" lives) for a standalone HTML page. */
function printHtml(html: string) {
  for (const old of document.querySelectorAll("iframe[data-print-frame]")) old.remove();
  const frame = document.createElement("iframe");
  frame.dataset.printFrame = "";
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  frame.srcdoc = html;
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
  };
  document.body.appendChild(frame);
}
