"use client";

import "@univerjs/preset-sheets-core/lib/index.css";
import "./univer-overrides.css";
import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import sheetsCoreEnUS from "@univerjs/preset-sheets-core/locales/en-US";
import { CommandType, createUniver, defaultTheme, type IWorkbookData, LocaleType, mergeLocales, type Theme } from "@univerjs/presets";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import { useLiveDocument } from "@/components/editor/core/use-document-loader";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { useDocumentPermissions } from "@/hooks/use-document-permissions";
import { emptySnapshot, gridFromRanges, isWorkbookSnapshot, stableStringify } from "@/lib/sheet/grid";
import { showToast } from "@/lib/toast";
import { $sheetEngine, $sheetSave } from "./sheet-state";

type UniverAPI = ReturnType<typeof createUniver>["univerAPI"];

// Desk/paper/rule/graphite ramp shared by both modes (Univer reads the light end for light mode and the dark end for dark).
const theme: Theme = {
  ...defaultTheme,
  primary: {
    50: "#EEF1FC",
    100: "#DDE3F8",
    200: "#BAC6F1",
    300: "#8BA2FF",
    400: "#5A75E0",
    500: "#3A57CF",
    600: "#2340B8",
    700: "#1C339A",
    800: "#16297C",
    900: "#101F5E",
  },
  gray: {
    0: "#FFFFFF",
    50: "#F6F7F9",
    100: "#ECEEF1",
    200: "#D9DCE0",
    300: "#B4B9C0",
    400: "#8A9099",
    500: "#686E76",
    600: "#3A3F46",
    700: "#2C3036",
    800: "#1D2024",
    900: "#141619",
    1000: "#000000",
  },
};

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
    s.blocked = data !== null && data !== undefined && !isWorkbookSnapshot(data);
    if (s.blocked) showToast.error("This spreadsheet could not be read", "It is open read-only so nothing is overwritten.");
    s.applying = true;
    try {
      const prev = api.getActiveWorkbook();
      const activeId = prev?.getActiveSheet().getSheetId();
      if (prev) api.disposeUnit(prev.getId());
      const wb = api.createWorkbook((isWorkbookSnapshot(data) ? data : emptySnapshot()) as Partial<IWorkbookData>);
      if (activeId && wb.getSheetBySheetId(activeId)) wb.setActiveSheet(activeId);
      s.baseline = stableStringify(wb.save());
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
    const data = wb.save();
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: the engine is created once per document, when it first arrives
  useEffect(() => {
    const host = hostRef.current;
    if (!ready || !host) return;
    const container = document.createElement("div");
    container.style.cssText = "position:absolute;inset:0";
    host.append(container);
    const { univer, univerAPI: api } = createUniver({
      locale: LocaleType.EN_US,
      locales: { [LocaleType.EN_US]: mergeLocales(sheetsCoreEnUS) },
      theme,
      darkMode: document.documentElement.classList.contains("dark"),
      presets: [UniverSheetsCorePreset({ container, ribbonType: "simple", toolbar: latest.current.canEdit })],
    });
    apiRef.current = api;
    $sheetSave.set({ status: "idle", error: null });
    load(latest.current.doc?.data);

    const sub = api.addEvent(api.Event.CommandExecuted, (event) => {
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

  return <div ref={hostRef} className="sheet-host relative min-h-0 flex-1" />;
}
