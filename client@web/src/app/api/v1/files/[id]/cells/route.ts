import { fileKind } from "@/lib/api/documents";
import { ApiError } from "@/lib/api/errors";
import { type ApiUser, canWrite } from "@/lib/api/permissions";
import { authenticate, documents, json, loadFile, route } from "@/lib/api/server";
import {
  type CellRange,
  findSheet,
  formatA1Range,
  loadWorkbook,
  MAX_RANGE_CELLS,
  parseA1Range,
  rangeSize,
  readCells,
  usedRange,
  writeCells,
} from "@/lib/api/sheet-cells";
import { parseBody, putCellsSchema } from "@/lib/api/validation";

type Params = { id: string };

function parseRange(input: string): CellRange {
  const range = parseA1Range(input);
  if (!range) throw new ApiError("validation_failed", `range "${input}" is not valid A1 notation (e.g. A1:D20)`);
  if (rangeSize(range) > MAX_RANGE_CELLS) throw new ApiError("validation_failed", `range covers more than ${MAX_RANGE_CELLS} cells`);
  return range;
}

async function loadSheet(caller: ApiUser, id: string, sheetSelector: string | null | undefined) {
  const { doc, access } = await loadFile(id, caller);
  if (fileKind(doc) !== "sheet") throw new ApiError("validation_failed", "Cells are only available for sheets");
  const { workbook, storedAsString } = loadWorkbook(doc.data, doc.id);
  const sheet = findSheet(workbook, sheetSelector);
  if (!sheet) throw new ApiError("not_found", "Sheet not found");
  return { access, workbook, storedAsString, sheet };
}

export const GET = route<Params>(async (request, { id }) => {
  const params = new URL(request.url).searchParams;
  const { sheet } = await loadSheet(await authenticate(request), id, params.get("sheet"));
  const rangeParam = params.get("range");
  const range = rangeParam ? parseRange(rangeParam) : (usedRange(sheet) ?? { startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
  if (rangeSize(range) > MAX_RANGE_CELLS) throw new ApiError("validation_failed", "Sheet is too large; pass a range");
  return json({ sheet: { id: sheet.id, name: sheet.name ?? null }, range: formatA1Range(range), values: readCells(sheet, range) });
});

export const PUT = route<Params>(async (request, { id }) => {
  const caller = await authenticate(request);
  const body = await parseBody(request, putCellsSchema);
  const { access, workbook, storedAsString, sheet } = await loadSheet(caller, id, body.sheet);
  if (!canWrite(access)) throw new ApiError("forbidden", "You need edit access to change this file");

  const target = parseRange(body.range ?? "A1");
  const height = body.values.length;
  const width = Math.max(...body.values.map((r) => r.length));
  if (height * width > MAX_RANGE_CELLS) throw new ApiError("validation_failed", `values cover more than ${MAX_RANGE_CELLS} cells`);
  if (body.range?.includes(":") && (height > target.endRow - target.startRow + 1 || width > target.endCol - target.startCol + 1)) {
    throw new ApiError("validation_failed", `values do not fit in range ${formatA1Range(target)}`);
  }

  const written = writeCells(sheet, target.startRow, target.startCol, body.values);
  // ponytail: read-modify-write of the whole snapshot; a concurrent write (or an open editor's autosave) can overwrite it.
  await (await documents()).updateOne(
    { id },
    { $set: { data: storedAsString ? JSON.stringify(workbook) : workbook, updatedAt: new Date().toISOString() } },
  );
  return json({
    sheet: { id: sheet.id, name: sheet.name ?? null },
    range: formatA1Range(written),
    updatedCells: body.values.reduce((n, r) => n + r.length, 0),
  });
});
