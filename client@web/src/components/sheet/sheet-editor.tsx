"use client";

// Engine CSS first; univer-overrides.css must stay last so its fixes win.
import "@univerjs/preset-sheets-core/lib/index.css";
import "@univerjs/preset-sheets-sort/lib/index.css";
import "@univerjs/preset-sheets-filter/lib/index.css";
import "@univerjs/preset-sheets-conditional-formatting/lib/index.css";
import "@univerjs/preset-sheets-data-validation/lib/index.css";
import "@univerjs/preset-sheets-find-replace/lib/index.css";
import "./univer-overrides.css";
import { UniverSheetsConditionalFormattingPreset } from "@univerjs/preset-sheets-conditional-formatting";
import sheetsCfEnUS from "@univerjs/preset-sheets-conditional-formatting/locales/en-US";
import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import sheetsCoreEnUS from "@univerjs/preset-sheets-core/locales/en-US";
import { UniverSheetsDataValidationPreset } from "@univerjs/preset-sheets-data-validation";
import sheetsDvEnUS from "@univerjs/preset-sheets-data-validation/locales/en-US";
import { UniverSheetsFilterPreset } from "@univerjs/preset-sheets-filter";
import sheetsFilterEnUS from "@univerjs/preset-sheets-filter/locales/en-US";
import { UniverSheetsFindReplacePreset } from "@univerjs/preset-sheets-find-replace";
import sheetsFindReplaceEnUS from "@univerjs/preset-sheets-find-replace/locales/en-US";
import { UniverSheetsSortPreset } from "@univerjs/preset-sheets-sort";
import sheetsSortEnUS from "@univerjs/preset-sheets-sort/locales/en-US";
import { CommandType, createUniver, defaultTheme, type IWorkbookData, LocaleType, mergeLocales, type Theme } from "@univerjs/presets";
import { nanoid } from "nanoid";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { useLiveDocument } from "@/components/editor/core/use-document-loader";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { useDocumentPermissions } from "@/hooks/use-document-permissions";
import { joinCharts, type SheetChart, splitCharts } from "@/lib/sheet/chart";
import { emptySnapshot, gridFromRanges, isWorkbookSnapshot, stableStringify } from "@/lib/sheet/grid";
import { showToast } from "@/lib/toast";
import { SheetCharts } from "./sheet-charts";
import { $sheetEngine, $sheetSave } from "./sheet-state";

type UniverAPI = ReturnType<typeof createUniver>["univerAPI"];

// v3: jade accents (brand at 600, like Univer's own ramp) over the Studio neutrals.
// Univer reads the light end of the gray ramp in light mode and the dark end in dark mode.
const theme: Theme = {
  ...defaultTheme,
  primary: {
    50: "#F0FAF6",
    100: "#E2F6EE",
    200: "#C3EDDC",
    300: "#8FDDBF",
    400: "#3DD39B",
    500: "#1FB883",
    600: "#0E9F6E",
    700: "#0B8A5F",
    800: "#08704D",
    900: "#06573C",
  },
  gray: {
    0: "#FFFFFF",
    50: "#F5F6F8",
    100: "#ECEEF1",
    200: "#E3E6EB",
    300: "#C9CED6",
    400: "#9AA1AD",
    500: "#646B76",
    600: "#3A3F48",
    700: "#262A33",
    800: "#171A21",
    900: "#0E1014",
    1000: "#000000",
  },
};

// Rarely used toolbar items, hidden to keep the ribbon light (ids that do not exist are ignored).
const HIDDEN_MENU_ITEMS = ["sheet.command.set-text-rotation", "sheet.command.set-range-font-increase", "sheet.command.set-range-font-decrease"];
const menu = Object.fromEntries(HIDDEN_MENU_ITEMS.map((id) => [id, { hidden: true }]));

const locale = mergeLocales(sheetsCoreEnUS, sheetsSortEnUS, sheetsFilterEnUS, sheetsCfEnUS, sheetsDvEnUS, sheetsFindReplaceEnUS);

const SAVE_DELAY = 1500;
const RETRY_DELAY = 5000;

export default function SheetEditor({ documentId }: { documentId: string }) {
  const { document: doc } = useLiveDocument(documentId);
  const { canEdit } = useDocumentPermissions(doc);
  const { updateDocument } = useCloudStore();
  const { resolvedTheme } = useTheme();
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<UniverAPI | null>(null);
  // `edits` counts local changes; the workbook is dirty while it is ahead of `savedEdits`.
  const s = useRef({
    loaded: false,
    blocked: false,
    applying: false,
    saving: false,
    edits: 0,
    savedEdits: 0,
    baseline: "",
    remote: "",
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
  }).current;
  const [charts, setCharts] = useState<SheetChart[]>([]);
  const chartsRef = useRef<SheetChart[]>([]);
  // Bumped (once per frame at most) after engine commands so charts re-read their cells.
  const [tick, setTick] = useState(0);
  const latest = useRef({ doc, canEdit, updateDocument });
  latest.current = { doc, canEdit, updateDocument };
  const ready = !!doc;

  const applyEditable = () => {
    apiRef.current?.getActiveWorkbook()?.setEditable(latest.current.canEdit && !s.blocked);
  };

  const load = (data: unknown) => {
    const api = apiRef.current;
    if (!api) return;
    // Never show an empty workbook for content we cannot read: it would be saved over the real data.
    const { workbook, charts: stored } = splitCharts(data);
    s.blocked = data !== null && data !== undefined && !isWorkbookSnapshot(workbook);
    if (s.blocked) showToast.error("This spreadsheet could not be read", "It is open read-only so nothing is overwritten.");
    s.applying = true;
    try {
      const prev = api.getActiveWorkbook();
      const activeId = prev?.getActiveSheet().getSheetId();
      if (prev) api.disposeUnit(prev.getId());
      const wb = api.createWorkbook((isWorkbookSnapshot(workbook) ? workbook : emptySnapshot()) as Partial<IWorkbookData>);
      if (activeId && wb.getSheetBySheetId(activeId)) wb.setActiveSheet(activeId);
      chartsRef.current = stored;
      setCharts(stored);
      s.baseline = stableStringify(joinCharts(wb.save(), stored));
      s.remote = stableStringify(data ?? null);
      s.edits = s.savedEdits = 0;
      s.loaded = true;
      applyEditable();
    } finally {
      s.applying = false;
    }
  };

  const schedule = (delay = SAVE_DELAY) => {
    clearTimeout(s.timer);
    s.timer = setTimeout(save, delay);
  };

  async function save() {
    clearTimeout(s.timer);
    const wb = apiRef.current?.getActiveWorkbook();
    if (!wb || !s.loaded || s.blocked || !latest.current.canEdit || s.edits === s.savedEdits) return;
    if (s.saving) return schedule();
    const edits = s.edits;
    const data = joinCharts(wb.save(), chartsRef.current);
    const key = stableStringify(data);
    if (key === s.baseline) {
      s.savedEdits = edits;
      return;
    }
    s.saving = true;
    $sheetSave.set({ status: "saving", error: null });
    let failed = false;
    try {
      const ok = await latest.current.updateDocument(documentId, { data, updatedAt: new Date().toISOString() });
      if (!ok) throw new Error("The change was not saved");
      s.baseline = s.remote = key;
      s.savedEdits = edits;
      $sheetSave.set({ status: "saved", error: null });
    } catch (error) {
      failed = true;
      $sheetSave.set({ status: "error", error: error instanceof Error ? error.message : "Save failed" });
    } finally {
      s.saving = false;
      if (s.edits !== s.savedEdits) schedule(failed ? RETRY_DELAY : SAVE_DELAY);
    }
  }

  const updateCharts = (next: SheetChart[]) => {
    if (!latest.current.canEdit || s.blocked) return;
    chartsRef.current = next;
    setCharts(next);
    s.edits++;
    schedule();
  };

  const insertChart = () => {
    const ws = apiRef.current?.getActiveWorkbook()?.getActiveSheet();
    if (!ws || !latest.current.canEdit || s.blocked) return;
    const lastRow = ws.getLastRow();
    const lastCol = ws.getLastColumn();
    if (lastRow < 0 || lastCol < 0) {
      showToast.info("Add some numbers first", "Then select them and insert a chart.");
      return;
    }
    const sel = ws.getActiveRange()?.getRange();
    const single = !sel || (sel.startRow === sel.endRow && sel.startColumn === sel.endColumn);
    // One cell selected: chart the whole used range. Whole rows/columns are clipped to the used range.
    const range = single
      ? { startRow: 0, startColumn: 0, endRow: lastRow, endColumn: lastCol }
      : {
          startRow: sel.startRow,
          startColumn: sel.startColumn,
          endRow: Math.max(sel.startRow, Math.min(sel.endRow, lastRow)),
          endColumn: Math.max(sel.startColumn, Math.min(sel.endColumn, lastCol)),
        };
    const host = hostRef.current;
    const n = chartsRef.current.length;
    const w = 440;
    const h = 300;
    const x = Math.max(16, (host?.clientWidth ?? 800) - w - 48 - (n % 5) * 24);
    const y = 96 + (n % 5) * 24;
    updateCharts([...chartsRef.current, { id: nanoid(10), sheetId: ws.getSheetId(), type: "bar", range, x, y, w, h }]);
  };

  const readValues = (chart: SheetChart) => {
    const wb = apiRef.current?.getActiveWorkbook();
    const ws = wb?.getActiveSheet();
    if (!ws || ws.getSheetId() !== chart.sheetId) return null;
    const { startRow, startColumn, endRow, endColumn } = chart.range;
    return ws.getRange(startRow, startColumn, endRow - startRow + 1, endColumn - startColumn + 1).getRawValues();
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: the engine is created once per document, when it first arrives
  useEffect(() => {
    const host = hostRef.current;
    if (!ready || !host) return;
    const container = document.createElement("div");
    container.style.cssText = "position:absolute;inset:0";
    host.append(container);
    const { univer, univerAPI: api } = createUniver({
      locale: LocaleType.EN_US,
      locales: { [LocaleType.EN_US]: locale },
      theme,
      darkMode: document.documentElement.classList.contains("dark"),
      presets: [
        UniverSheetsCorePreset({ container, ribbonType: "simple", toolbar: latest.current.canEdit, menu }),
        UniverSheetsSortPreset(),
        UniverSheetsFilterPreset(),
        UniverSheetsConditionalFormattingPreset(),
        UniverSheetsDataValidationPreset(),
        UniverSheetsFindReplacePreset(),
      ],
    });
    apiRef.current = api;
    $sheetSave.set({ status: "idle", error: null });
    load(latest.current.doc?.data);

    let frame = 0;
    const sub = api.addEvent(api.Event.CommandExecuted, (event) => {
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        setTick((t) => t + 1);
      });
      if (event.type !== CommandType.MUTATION || event.options?.onlyLocal || event.options?.fromCollab) return;
      if (s.applying || !s.loaded) return;
      s.edits++;
      schedule();
    });
    $sheetEngine.set({
      activeSheet: () => {
        const ws = api.getActiveWorkbook()?.getActiveSheet();
        if (!ws) return { name: "Sheet1", grid: [] };
        const range = ws.getRange(0, 0, Math.max(ws.getLastRow() + 1, 1), Math.max(ws.getLastColumn() + 1, 1));
        return { name: ws.getSheetName(), grid: gridFromRanges(range.getRawValues(), range.getFormulas()) };
      },
      insertChart,
    });

    const flush = () => {
      if (document.visibilityState === "hidden") void save();
    };
    const onPageHide = () => void save();
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", onPageHide);
      void save(); // takes the snapshot synchronously, before the engine goes away below
      clearTimeout(s.timer);
      sub.dispose();
      cancelAnimationFrame(frame);
      $sheetEngine.set(null);
      s.loaded = false;
      apiRef.current = null;
      queueMicrotask(() => {
        univer.dispose();
        container.remove();
      });
    };
  }, [ready, documentId]);

  // Another tab or person saved: take their version unless we hold unsaved edits (last write wins).
  // biome-ignore lint/correctness/useExhaustiveDependencies: reacts to remote data only
  useEffect(() => {
    if (!s.loaded || !doc) return;
    const key = stableStringify(doc.data ?? null);
    if (key === s.remote || key === s.baseline) {
      s.remote = key;
      return;
    }
    if (s.saving || s.edits !== s.savedEdits) return;
    load(doc.data);
  }, [doc?.data]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: applyEditable reads the latest permission
  useEffect(applyEditable, [canEdit]);

  useEffect(() => {
    apiRef.current?.toggleDarkMode(resolvedTheme === "dark");
  }, [resolvedTheme]);

  return (
    <div ref={hostRef} className="sheet-host relative min-h-0 flex-1">
      <SheetCharts
        charts={charts}
        version={tick}
        readValues={readValues}
        dark={resolvedTheme === "dark"}
        editable={canEdit && !s.blocked}
        onChange={(chart) => updateCharts(chartsRef.current.map((c) => (c.id === chart.id ? chart : c)))}
        onDelete={(id) => updateCharts(chartsRef.current.filter((c) => c.id !== id))}
      />
    </div>
  );
}
