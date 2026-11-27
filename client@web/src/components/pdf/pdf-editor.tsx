"use client";

import { useStore } from "@nanostores/react";
import type { Document } from "@shared-types";
import { FileUp, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { pickFiles } from "@/components/app-header/app-header";
import { useLiveDocument } from "@/components/editor/core/use-document-loader";
import { saveBlob } from "@/components/sheet/sheet-files";
import { Button } from "@/components/ui/button";
import { createFile, useCloudStore } from "@/hooks/use-cloudstore";
import { useDocumentPermissions } from "@/hooks/use-document-permissions";
import { fileHref } from "@/lib/files";
import {
  mergeLineRects,
  TEXT_LINE_HEIGHT,
  translate,
} from "@/lib/pdf/annotations";
import { fetchPdfBytes, openPdf, uploadPdfBytes } from "@/lib/pdf/client";
import { readPdfFile } from "@/lib/pdf/create";
import {
  clamp,
  type Frame,
  normRotation,
  screenRectToPage,
  screenToPage,
  stepZoom,
  ZOOM_MAX,
  ZOOM_MIN,
} from "@/lib/pdf/geometry";
import {
  commit,
  type History,
  historyOf,
  preview,
  redo as redoStep,
  undo as undoStep,
} from "@/lib/pdf/history";
import {
  type Annotation,
  type FormValue,
  initialData,
  LETTER,
  MAX_PDF_BYTES,
  newId,
  type PageRef,
  type PdfData,
  parsePdfData,
  type Rect,
  type Rotation,
} from "@/lib/pdf/model";
import { applyPageOp, type PageOp } from "@/lib/pdf/pages";
import { findMatches, type TextRun } from "@/lib/pdf/search";
import { showToast } from "@/lib/toast";
import { $auth } from "@/state/auth";
import { imageFileToDataUrl, imageSize, today } from "./image-utils";
import {
  type FormsBinding,
  type Gesture,
  type OverlayApi,
  PageView,
} from "./pdf-page";
import {
  Outline,
  type OutlineItem,
  type ThumbActions,
  Thumbnails,
} from "./pdf-sidebar";
import {
  $pdfCommands,
  $pdfSave,
  type InsertKind,
  type StampKind,
  type ZoomMode,
} from "./pdf-state";
import { FindBar, PdfToolbar } from "./pdf-toolbar";
import { SignDialog } from "./sign-dialog";
import {
  DEFAULT_STYLES,
  MARKUP_TOOLS,
  STAMP_COLORS,
  TOOL_KEYS,
  type Tool,
  type ToolStyle,
  toolOf,
} from "./tools";

const SAVE_DELAY = 1500;
const PAD = 24;
const PAD_TOP = 76; // room for the floating toolbar
const GAP = 16;

/** Canonical JSON of a model, so a row echo and our own state compare equal. */
const canon = (d: unknown) => JSON.stringify(parsePdfData(d));

interface FieldInfo {
  name: string;
  type: string;
  exportValue?: string;
}

interface Loaded {
  sha: string;
  pdf: PDFDocumentProxy;
  bytes: Uint8Array;
  sizes: [number, number][];
  outline: OutlineItem[];
  fields: Map<string, FieldInfo>;
}

interface Match {
  pageId: string;
  rect: Rect;
}

const safeName = (s: string) =>
  s
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "Document";

type RawOutline = { title: string; dest: unknown; items: RawOutline[] };
const toOutline = (items: RawOutline[] | null): OutlineItem[] =>
  (items ?? []).map((i) => ({
    title: i.title,
    dest: i.dest,
    items: toOutline(i.items),
  }));

export default function PdfEditor({ documentId }: { documentId: string }) {
  const router = useRouter();
  const { document: doc } = useLiveDocument(documentId);
  const permissions = useDocumentPermissions(doc);
  const { canEdit, canDownload } = permissions;
  const { updateDocument } = useCloudStore();
  const user = useStore($auth).user;
  const rawData = (doc as { data?: unknown } | null)?.data;
  const title = doc?.title || "Untitled PDF";

  // ---------------------------------------------------------------------------------------------
  // Model, history, autosave

  const [hist, setHist] = useState<History<PdfData> | null>(null);
  const histRef = useRef(hist);
  histRef.current = hist;
  /** Canonical JSON of what the row holds; null until the stored model is loaded. */
  const saved = useRef<string | null>(null);
  const data = hist?.present ?? null;

  useEffect(() => {
    const parsed = parsePdfData(rawData);
    if (!parsed) return;
    const json = canon(parsed);
    if (json === saved.current) return; // our own save coming back
    const h = histRef.current;
    if (h && saved.current !== null && canon(h.present) !== saved.current)
      return; // unsaved local edits win
    saved.current = json;
    setHist(historyOf(parsed));
  }, [rawData]);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveNow = useCallback(async () => {
    timer.current = null;
    const d = histRef.current?.present;
    if (!d || !d.pages.length || saved.current === null) return;
    const json = canon(d);
    if (json === saved.current) return;
    $pdfSave.set({ state: "saving" });
    const ok = await updateDocument(documentId, {
      data: d,
    } as Partial<Document>).catch(() => false);
    if (ok) {
      saved.current = json;
      $pdfSave.set({ state: "saved", lastSaved: new Date() });
    } else {
      $pdfSave.set({
        state: "error",
        error: "Your latest changes could not be saved. Retrying.",
      });
      timer.current = setTimeout(() => void saveNow(), 5000);
    }
  }, [documentId, updateDocument]);

  // Editors only, never before the stored model is loaded.
  useEffect(() => {
    if (!data || !canEdit || saved.current === null) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void saveNow(), SAVE_DELAY);
  }, [data, canEdit, saveNow]);

  useEffect(() => {
    $pdfSave.set({ state: "idle" });
    const flush = () => {
      if (!timer.current) return;
      clearTimeout(timer.current);
      void saveNow();
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [saveNow]);

  // Form values are not undoable (the fields hold them), so undo and redo carry them forward.
  const travel = useCallback(
    (move: typeof undoStep) =>
      setHist((h) => {
        if (!h) return h;
        const next = move(h);
        return next === h
          ? h
          : { ...next, present: { ...next.present, forms: h.present.forms } };
      }),
    [],
  );
  const undo = useCallback(() => travel(undoStep), [travel]);
  const redo = useCallback(() => travel(redoStep), [travel]);
  const change = useCallback(
    (fn: (d: PdfData) => PdfData) =>
      setHist((h) => (h ? commit(h, fn(h.present)) : h)),
    [],
  );
  const pageOp = useCallback(
    (op: PageOp) => change((d) => applyPageOp(d, op)),
    [change],
  );

  // ---------------------------------------------------------------------------------------------
  // The PDF itself

  const sha = data?.blob?.sha256 ?? null;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const loadedRef = useRef(loaded);
  loadedRef.current = loaded;
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `reload` re-runs the load after an error
  useEffect(() => {
    if (!sha) return;
    let live = true;
    setLoadError(null);
    (async () => {
      const bytes = await fetchPdfBytes(documentId, sha);
      const pdf = await openPdf(bytes);
      if (!live) return void pdf.destroy();
      const sizes = await Promise.all(
        Array.from({ length: pdf.numPages }, (_, i) =>
          pdf.getPage(i + 1).then((page) => {
            const v = page.getViewport({ scale: 1 });
            return [v.width, v.height] as [number, number];
          }),
        ),
      );
      const outline = toOutline(
        (await pdf.getOutline().catch(() => null)) as RawOutline[] | null,
      );
      const fields = new Map<string, FieldInfo>();
      const objects = (await pdf.getFieldObjects().catch(() => null)) as Record<
        string,
        { id?: string; type?: string; exportValues?: string }[]
      > | null;
      for (const [name, widgets] of Object.entries(objects ?? {}))
        for (const w of widgets)
          if (w.id)
            fields.set(w.id, {
              name,
              type: w.type ?? "",
              exportValue: w.exportValues,
            });
      // Fill the fields with the saved values before any page draws them.
      const forms = histRef.current?.present.forms ?? {};
      for (const [id, f] of fields) {
        const v = forms[f.name];
        if (v === undefined) continue;
        const value =
          f.type === "checkbox"
            ? v === true || v === f.exportValue
            : f.type === "radiobutton"
              ? v === f.exportValue
              : v;
        pdf.annotationStorage.setValue(id, { value });
      }
      if (!live) return void pdf.destroy();
      setLoaded({ sha, pdf, bytes, sizes, outline, fields });
    })().catch((e) => {
      console.error("[pdf] load failed", e);
      if (live)
        setLoadError(
          e instanceof Error ? e.message : "The PDF could not be opened",
        );
    });
    return () => {
      live = false;
    };
  }, [sha, documentId, reload]);

  useEffect(() => () => void loaded?.pdf.destroy(), [loaded]);

  const pdf = loaded && loaded.sha === sha ? loaded.pdf : null;
  const pages = data?.pages ?? [];
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  // ---------------------------------------------------------------------------------------------
  // Layout and zoom

  const scroller = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ w: 0, h: 0, top: 0 });
  const [zoomMode, setZoomMode] = useState<ZoomMode>("auto");
  const [viewRotation, setViewRotation] = useState<Rotation>(0);
  const [sidebar, setSidebar] = useState<"pages" | "outline" | null>(null);

  useEffect(() => {
    setSidebar(window.innerWidth >= 1024 ? "pages" : null);
  }, []);

  // The scroller mounts once the model is loaded.
  const hasData = !!data;
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-attach when the scroller mounts
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setView((v) => ({ ...v, w: el.clientWidth, h: el.clientHeight })),
    );
    ro.observe(el);
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoomMode(
        clamp(
          zoomRef.current * Math.exp(-e.deltaY * 0.0025),
          ZOOM_MIN,
          ZOOM_MAX,
        ),
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      ro.disconnect();
      el.removeEventListener("wheel", onWheel);
    };
  }, [hasData]);

  const sizeOf = useCallback(
    (p: PageRef): [number, number] =>
      p.src < 0 ? (p.size ?? LETTER) : (loaded?.sizes[p.src] ?? LETTER),
    [loaded],
  );
  const rotationOf = (p: PageRef) => normRotation(p.rotation + viewRotation);
  const boxAt1 = (p: PageRef): [number, number] => {
    const [w, h] = sizeOf(p);
    return rotationOf(p) % 180 ? [h, w] : [w, h];
  };

  const fitWidth = Math.max(
    0.1,
    (view.w - PAD * 2) / Math.max(1, ...pages.map((p) => boxAt1(p)[0])),
  );
  const offsetsAt1 = pages.map((p) => boxAt1(p)[1]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentPage = pages[Math.min(currentIndex, pages.length - 1)] ?? null;
  const zoom = clamp(
    typeof zoomMode === "number"
      ? zoomMode
      : zoomMode === "width"
        ? fitWidth
        : zoomMode === "page"
          ? Math.min(
              fitWidth,
              (view.h - PAD_TOP - PAD) /
                (currentPage ? boxAt1(currentPage)[1] : 792),
            )
          : Math.min(fitWidth, 1.25),
    ZOOM_MIN,
    ZOOM_MAX,
  );
  const zoomRef = useRef(zoom);

  const offsets = useMemo(() => {
    const out: number[] = [];
    let y = PAD_TOP;
    for (const h of offsetsAt1) {
      out.push(y);
      y += h * zoom + GAP;
    }
    return out;
  }, [offsetsAt1, zoom]);

  // Current page: the one crossing a third of the way down the viewport.
  useEffect(() => {
    const probe = view.top + view.h * 0.35;
    let i = 0;
    while (i + 1 < offsets.length && offsets[i + 1] <= probe) i++;
    setCurrentIndex(i);
  }, [offsets, view.top, view.h]);

  // Keep the middle of the view steady when zooming.
  useLayoutEffect(() => {
    const el = scroller.current;
    const prev = zoomRef.current;
    zoomRef.current = zoom;
    if (!el || prev === zoom) return;
    const ratio = zoom / prev;
    el.scrollTop =
      (el.scrollTop + el.clientHeight / 2 - PAD_TOP) * ratio +
      PAD_TOP -
      el.clientHeight / 2;
    el.scrollLeft =
      (el.scrollLeft + el.clientWidth / 2) * ratio - el.clientWidth / 2;
  }, [zoom]);

  const setZoom = useCallback((z: ZoomMode | "in" | "out") => {
    if (z === "in" || z === "out")
      setZoomMode(stepZoom(zoomRef.current, z === "in" ? 1 : -1));
    else setZoomMode(z);
  }, []);

  const scrollFrame = useRef(0);
  const onScroll = () => {
    cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = requestAnimationFrame(() => {
      const el = scroller.current;
      if (el) setView((v) => ({ ...v, top: el.scrollTop }));
    });
  };

  const offsetsRef = useRef(offsets);
  offsetsRef.current = offsets;
  const scrollToPage = useCallback((index: number, within = 0) => {
    const el = scroller.current;
    const top = offsetsRef.current[index];
    if (!el || top === undefined) return;
    el.scrollTo({ top: Math.max(0, top - 12 + within), behavior: "auto" });
  }, []);

  const frameOf = (p: PageRef): Frame => {
    const [w, h] = sizeOf(p);
    return { w, h, zoom, rotation: rotationOf(p) };
  };

  /** Point in the page where the user is looking: the middle of the visible part of the current page. */
  const lookPoint = (p: PageRef, index: number): [number, number] => {
    const f = frameOf(p);
    const boxH = (rotationOf(p) % 180 ? f.w : f.h) * zoom;
    const boxW = (rotationOf(p) % 180 ? f.h : f.w) * zoom;
    const top = offsets[index] ?? 0;
    const visTop = Math.max(0, view.top - top);
    const visBottom = Math.min(boxH, view.top + view.h - top);
    const sy = visBottom > visTop ? (visTop + visBottom) / 2 : boxH / 2;
    return screenToPage(f, [boxW / 2, sy]);
  };

  // ---------------------------------------------------------------------------------------------
  // Tools, selection

  const [tool, setToolState] = useState<Tool>("select");
  const [styles, setStyles] = useState(DEFAULT_STYLES);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [signMode, setSignMode] = useState<"signature" | "initials" | null>(
    null,
  );

  const setTool = useCallback((t: Tool) => {
    setToolState(t);
    if (t !== "select") setSelectedId(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  const annotations = data?.annotations ?? [];
  const selected = annotations.find((a) => a.id === selectedId) ?? null;
  const styleFor: Tool | null = selected
    ? toolOf(selected)
    : tool === "select"
      ? null
      : tool;
  const style = styleFor ? styles[styleFor] : DEFAULT_STYLES.select;

  const setStyle = (patch: Partial<ToolStyle>) => {
    if (!styleFor) return;
    setStyles((s) => ({ ...s, [styleFor]: { ...s[styleFor], ...patch } }));
    if (!selected) return;
    const next = { ...selected } as Annotation & Record<string, unknown>;
    if (patch.color !== undefined && "color" in next) next.color = patch.color;
    if (patch.width !== undefined && "width" in next) next.width = patch.width;
    if (patch.size !== undefined && next.type === "text") {
      next.size = patch.size;
      next.rect = {
        ...next.rect,
        h: Math.max(next.rect.h, patch.size * TEXT_LINE_HEIGHT),
      };
    }
    if (next.type === "rect" || next.type === "ellipse") {
      const fill = patch.fill ?? !!next.fill;
      next.fill = fill ? (patch.color ?? next.color) : undefined;
      if (!fill) delete next.fill;
    }
    change((d) => ({
      ...d,
      annotations: d.annotations.map((a) =>
        a.id === selected.id ? (next as Annotation) : a,
      ),
    }));
  };

  // Gesture updates must be idempotent (upsert, replace, filter): they apply to the live state, so
  // other changes made while a note is open survive.
  const gesture = useCallback((): Gesture => {
    const base = histRef.current?.present;
    let done = false;
    return {
      update: (fn) => {
        if (done || !base) return;
        setHist((h) =>
          h
            ? preview(h, {
                ...h.present,
                annotations: fn(h.present.annotations),
              })
            : h,
        );
      },
      end: (keep) => {
        if (done || !base) return;
        done = true;
        setHist((h) => {
          if (!h) return h;
          if (!keep || h.present.annotations === base.annotations)
            return preview(h, { ...h.present, annotations: base.annotations });
          return commit(h, h.present, base);
        });
      },
    };
  }, []);

  const api: OverlayApi = {
    tool,
    style: styles[tool],
    canEdit,
    selectedId,
    editingId,
    openNoteId,
    select: setSelectedId,
    edit: setEditingId,
    openNote: setOpenNoteId,
    gesture,
    placed: () => setToolState("select"),
  };

  const addAnnotation = (a: Annotation) => {
    change((d) => ({ ...d, annotations: [...d.annotations, a] }));
    setToolState("select");
    setSelectedId(a.id);
  };

  /** Puts a w x h item where the user is looking on the current page. */
  const placeRect = (
    w: number,
    h: number,
  ): { pageId: string; rect: Rect } | null => {
    if (!currentPage) return null;
    const [pw, ph] = sizeOf(currentPage);
    const scale = Math.min(1, (pw * 0.8) / w, (ph * 0.8) / h);
    const [cx, cy] = lookPoint(currentPage, currentIndex);
    const rw = w * scale;
    const rh = h * scale;
    return {
      pageId: currentPage.id,
      rect: {
        x: clamp(cx - rw / 2, 0, pw - rw),
        y: clamp(cy - rh / 2, 0, ph - rh),
        w: rw,
        h: rh,
      },
    };
  };

  const placeImage = async (url: string, width: number) => {
    const { width: iw, height: ih } = await imageSize(url);
    const at = placeRect(width, (width * ih) / iw);
    if (at)
      addAnnotation({
        id: newId(),
        pageId: at.pageId,
        type: "image",
        rect: at.rect,
        src: url,
      });
  };

  const insert = async (k: InsertKind) => {
    if (!canEdit || !currentPage) return;
    if (k === "signature" || k === "initials") return setSignMode(k);
    if (k === "image") {
      const [file] = await pickFiles(
        "image/png,image/jpeg,image/webp,image/gif",
      );
      if (!file) return;
      try {
        const img = await imageFileToDataUrl(file);
        await placeImage(img.url, Math.min(260, img.width));
      } catch (e) {
        showToast.error(
          "Could not insert the image",
          e instanceof Error ? e.message : undefined,
        );
      }
      return;
    }
    if (k === "date") {
      const size = 12;
      const at = placeRect(110, size * TEXT_LINE_HEIGHT);
      if (at)
        addAnnotation({
          id: newId(),
          pageId: at.pageId,
          type: "text",
          rect: at.rect,
          text: today(),
          size,
          color: "#1d1d1f",
        });
      return;
    }
    setTool(k as Tool);
  };

  const stamp = (k: StampKind) => {
    if (!canEdit) return;
    const label = k === "Date" ? today() : k;
    const at = placeRect(150, 44);
    if (at)
      addAnnotation({
        id: newId(),
        pageId: at.pageId,
        type: "stamp",
        rect: at.rect,
        label,
        color: STAMP_COLORS[k],
      });
  };

  const deleteSelection = () => {
    if (!selectedId) return;
    const id = selectedId;
    change((d) => ({
      ...d,
      annotations: d.annotations.filter((a) => a.id !== id),
    }));
    setSelectedId(null);
    setEditingId(null);
    setOpenNoteId(null);
  };

  // Highlight, underline or strike the text the user just selected.
  const onPointerUp = () => {
    if (!MARKUP_TOOLS.has(tool) || !canEdit) return;
    const markup = tool as "highlight" | "underline" | "strike";
    setTimeout(() => {
      const sel = window.getSelection();
      const root = scroller.current;
      if (!sel || sel.isCollapsed || !sel.rangeCount || !root) return;
      const slots = Array.from(
        root.querySelectorAll<HTMLElement>("[data-page-id]"),
      );
      const byPage = new Map<string, Rect[]>();
      for (const r of Array.from(sel.getRangeAt(0).getClientRects())) {
        if (r.width < 1 || r.height < 1) continue;
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const slot = slots.find((s) => {
          const b = s.getBoundingClientRect();
          return cx >= b.left && cx <= b.right && cy >= b.top && cy <= b.bottom;
        });
        const page =
          slot && pagesRef.current.find((p) => p.id === slot.dataset.pageId);
        if (!slot || !page) continue;
        const b = slot.getBoundingClientRect();
        const rect = screenRectToPage(frameOf(page), {
          left: r.left - b.left,
          top: r.top - b.top,
          width: r.width,
          height: r.height,
        });
        byPage.set(page.id, [...(byPage.get(page.id) ?? []), rect]);
      }
      const added: Annotation[] = [];
      for (const [pageId, rects] of byPage) {
        const merged = mergeLineRects(rects);
        if (merged.length)
          added.push({
            id: newId(),
            pageId,
            type: markup,
            rects: merged,
            color: styles[markup].color,
          });
      }
      if (!added.length) return;
      change((d) => ({ ...d, annotations: [...d.annotations, ...added] }));
      sel.removeAllRanges();
    }, 0);
  };

  // ---------------------------------------------------------------------------------------------
  // Forms

  const onFormInput = useCallback((annotationId: string) => {
    const l = loadedRef.current;
    const field = l?.fields.get(annotationId);
    if (!l || !field) return;
    const stored = (
      l.pdf.annotationStorage.getValue(annotationId, {}) as { value?: unknown }
    ).value;
    let value: FormValue;
    if (field.type === "radiobutton") {
      if (stored !== true || !field.exportValue) return;
      value = field.exportValue;
    } else if (field.type === "checkbox")
      value =
        stored === true || (typeof stored === "string" && stored !== "Off");
    else if (Array.isArray(stored)) value = stored.map(String);
    else if (stored === undefined || stored === null) return;
    else value = String(stored);
    setHist((h) =>
      h && h.present.forms[field.name] !== value
        ? preview(h, {
            ...h.present,
            forms: { ...h.present.forms, [field.name]: value },
          })
        : h,
    );
  }, []);

  const forms = useMemo<FormsBinding | null>(
    () =>
      pdf
        ? {
            storage: pdf.annotationStorage,
            editable: canEdit,
            onInput: onFormInput,
          }
        : null,
    [pdf, canEdit, onFormInput],
  );

  // ---------------------------------------------------------------------------------------------
  // Links, bookmarks

  const goToDest = useCallback(
    async (dest: unknown) => {
      const p = loadedRef.current?.pdf;
      if (!p) return;
      const explicit =
        typeof dest === "string"
          ? await p.getDestination(dest).catch(() => null)
          : dest;
      if (!Array.isArray(explicit)) return;
      const [ref] = explicit;
      const index =
        typeof ref === "number"
          ? ref
          : ref && typeof ref === "object"
            ? await p.getPageIndex(ref).catch(() => -1)
            : -1;
      const i = pagesRef.current.findIndex((pg) => pg.src === index);
      if (i >= 0) scrollToPage(i);
    },
    [scrollToPage],
  );
  const goRef = useRef(goToDest);
  goRef.current = goToDest;
  const links = useMemo(
    () => ({
      externalLinkEnabled: true,
      isInPresentationMode: false,
      eventBus: null,
      addLinkAttributes(link: HTMLAnchorElement, url: string) {
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer nofollow";
      },
      getDestinationHash: () => "#",
      getAnchorUrl: () => "#",
      goToDestination: (dest: unknown) => void goRef.current(dest),
      executeNamedAction() {},
      executeSetOCGState() {},
    }),
    [],
  );

  // ---------------------------------------------------------------------------------------------
  // Find

  const [findOpen, setFindOpen] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);
  const [searching, setSearching] = useState(false);
  const textCache = useRef(
    new Map<
      number,
      { runs: TextRun[]; convert: (x: number, y: number) => number[] }
    >(),
  );
  const searchSeq = useRef(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new PDF invalidates the cached text
  useEffect(() => {
    textCache.current = new Map();
  }, [pdf]);

  const runSearch = useCallback(
    async (q: string) => {
      const seq = ++searchSeq.current;
      if (!q.trim() || !pdf) {
        setMatches([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      const found: Match[] = [];
      for (const page of pagesRef.current) {
        if (page.src < 0 || page.src >= pdf.numPages) continue;
        let text = textCache.current.get(page.src);
        if (!text) {
          const pp = await pdf.getPage(page.src + 1);
          const content = await pp.getTextContent();
          const viewport = pp.getViewport({ scale: 1 });
          text = {
            runs: content.items.flatMap((i) =>
              "str" in i
                ? [
                    {
                      str: i.str,
                      transform: i.transform as number[],
                      width: i.width,
                    },
                  ]
                : [],
            ),
            convert: (x, y) => viewport.convertToViewportPoint(x, y),
          };
          textCache.current.set(page.src, text);
        }
        if (seq !== searchSeq.current) return;
        for (const [x0, y0, x1, y1] of findMatches(text.runs, q)) {
          const [ax, ay] = text.convert(x0, y0);
          const [bx, by] = text.convert(x1, y1);
          found.push({
            pageId: page.id,
            rect: {
              x: Math.min(ax, bx),
              y: Math.min(ay, by),
              w: Math.abs(bx - ax),
              h: Math.abs(by - ay),
            },
          });
        }
      }
      if (seq !== searchSeq.current) return;
      setMatches(found);
      setMatchIndex(0);
      setSearching(false);
    },
    [pdf],
  );

  const showMatch = useCallback(
    (i: number) => {
      const m = matches[i];
      if (!m) return;
      const index = pagesRef.current.findIndex((p) => p.id === m.pageId);
      const page = pagesRef.current[index];
      if (!page) return;
      const [w, h] = sizeOf(page);
      const f: Frame = {
        w,
        h,
        zoom: zoomRef.current,
        rotation: normRotation(page.rotation + viewRotation),
      };
      // Screen y of the match inside its page box.
      const el = scroller.current;
      const top = offsetsRef.current[index];
      if (!el || top === undefined) return;
      const sy = (() => {
        const z = f.zoom;
        switch (f.rotation) {
          case 90:
            return m.rect.x * z;
          case 180:
            return (h - m.rect.y - m.rect.h) * z;
          case 270:
            return (w - m.rect.x - m.rect.w) * z;
          default:
            return m.rect.y * z;
        }
      })();
      const y = top + sy;
      if (y < el.scrollTop + 60 || y > el.scrollTop + el.clientHeight - 60)
        el.scrollTo({ top: Math.max(0, y - el.clientHeight / 3) });
    },
    [matches, sizeOf, viewRotation],
  );

  useEffect(() => {
    showMatch(matchIndex);
  }, [matchIndex, showMatch]);

  const step = (dir: 1 | -1) => {
    if (!matches.length) return;
    setMatchIndex((i) => (i + dir + matches.length) % matches.length);
  };

  const matchesByPage = useMemo(() => {
    const map = new Map<string, Rect[]>();
    for (const m of matches)
      map.set(m.pageId, [...(map.get(m.pageId) ?? []), m.rect]);
    return map;
  }, [matches]);
  const currentMatch = findOpen ? (matches[matchIndex] ?? null) : null;

  // ---------------------------------------------------------------------------------------------
  // Output: download, print, extract, split, merge, convert

  const busy = useRef(false);
  const withBusy = async (label: string, fn: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    const id = showToast.loading(label);
    try {
      await fn();
    } catch (e) {
      console.error("[pdf]", label, e);
      showToast.error(
        "Something went wrong",
        e instanceof Error ? e.message : undefined,
      );
    } finally {
      busy.current = false;
      const { toast } = await import("sonner");
      toast.dismiss(id);
    }
  };

  const original = () => {
    if (data?.blob && !loaded?.bytes)
      throw new Error("The PDF is still loading");
    return data?.blob ? (loaded?.bytes ?? null) : null;
  };

  const build = async (pageIds?: string[]) => {
    if (!data) throw new Error("The PDF is still loading");
    const { exportPdf } = await import("@/lib/pdf/export");
    return exportPdf(original(), data, { pageIds, title });
  };

  const pdfBlob = (bytes: Uint8Array) =>
    new Blob([bytes as BlobPart], { type: "application/pdf" });

  const downloadPdf = () =>
    withBusy("Preparing PDF...", async () =>
      saveBlob(pdfBlob(await build()), `${safeName(title)}.pdf`),
    );
  const downloadOriginal = () =>
    withBusy("Preparing PDF...", async () => {
      const bytes = original();
      if (!bytes) throw new Error("This file has no original PDF");
      saveBlob(pdfBlob(bytes), `${safeName(title)} (original).pdf`);
    });

  const targetPages = () =>
    selectedPages.length
      ? pages.filter((p) => selectedPages.includes(p.id)).map((p) => p.id)
      : currentPage
        ? [currentPage.id]
        : [];
  const rangeLabel = (ids: string[]) => {
    const nums = ids
      .map((id) => pages.findIndex((p) => p.id === id) + 1)
      .sort((a, b) => a - b);
    return nums.length === 1
      ? `page ${nums[0]}`
      : `pages ${nums[0]}-${nums[nums.length - 1]}`;
  };
  const extract = (ids = targetPages()) =>
    withBusy("Extracting pages...", async () => {
      if (!ids.length) return;
      saveBlob(
        pdfBlob(await build(ids)),
        `${safeName(title)} (${rangeLabel(ids)}).pdf`,
      );
    });
  const splitAfter = () =>
    withBusy("Splitting...", async () => {
      const i = currentIndex;
      if (i >= pages.length - 1)
        throw new Error(
          "This is the last page; there is nothing after it to split off",
        );
      const first = pages.slice(0, i + 1).map((p) => p.id);
      const rest = pages.slice(i + 1).map((p) => p.id);
      saveBlob(pdfBlob(await build(first)), `${safeName(title)} (part 1).pdf`);
      saveBlob(pdfBlob(await build(rest)), `${safeName(title)} (part 2).pdf`);
    });

  const print = () =>
    withBusy("Preparing to print...", async () => {
      const url = URL.createObjectURL(pdfBlob(await build()));
      const frame = Object.assign(document.createElement("iframe"), {
        src: url,
        title: "Print",
      });
      frame.style.cssText =
        "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0";
      frame.onload = () => {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
        setTimeout(() => {
          frame.remove();
          URL.revokeObjectURL(url);
        }, 60_000);
      };
      document.body.appendChild(frame);
    });

  const insertFromPdf = async () => {
    if (!canEdit || !data) return;
    const [file] = await pickFiles("application/pdf,.pdf");
    if (!file) return;
    await withBusy("Inserting pages...", async () => {
      const { bytes: extra, pageCount } = await readPdfFile(file);
      const base = original();
      let merged = extra;
      let start = 0;
      let count = pageCount;
      if (base) {
        const { appendPdf } = await import("@/lib/pdf/export");
        ({ bytes: merged, start, count } = await appendPdf(base, extra));
      }
      if (merged.length > MAX_PDF_BYTES)
        throw new Error("Together the PDFs would be larger than 15 MB");
      const stored = await uploadPdfBytes(documentId, merged);
      const at = currentIndex + 1;
      const srcs = Array.from({ length: count }, (_, i) => start + i);
      change((d) => ({
        ...applyPageOp(d, { type: "insert", index: at, srcs }),
        blob: {
          sha256: stored.sha256,
          size: stored.size,
          pageCount: start + count,
        },
      }));
      showToast.success(
        count === 1 ? "1 page inserted" : `${count} pages inserted`,
      );
    });
  };

  const convertToDoc = () =>
    withBusy("Converting to a document...", async () => {
      if (!user) throw new Error("Sign in to convert files");
      const { pdfToHtml } = await import("@/lib/import/pdf");
      const bytes = await build();
      const html = await pdfToHtml(
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ) as ArrayBuffer,
      );
      if (!html)
        throw new Error(
          "No text was found. Scanned PDFs cannot be converted yet.",
        );
      const owned = doc?.owner === user.id;
      const folder = owned
        ? ((doc as { parents?: string[]; location?: string }).parents?.at(-1) ??
          (doc as { location?: string }).location)
        : undefined;
      const id = await createFile(user, {
        kind: "doc",
        title,
        initialContent: html,
        folderId: folder && folder !== "my-drive" ? folder : user.id,
      });
      showToast.success("Document created");
      router.push(fileHref(id, "doc"));
    });

  // ---------------------------------------------------------------------------------------------
  // Page operations

  const rotatePages = (delta: 90 | -90, ids = targetPages()) =>
    pageOp({ type: "rotate", ids, delta });
  const deletePages = (ids = targetPages()) => {
    if (ids.length >= pages.length)
      return showToast.error("A PDF needs at least one page");
    pageOp({ type: "delete", ids });
    setSelectedPages([]);
  };
  const duplicatePages = (ids = targetPages()) =>
    pageOp({ type: "duplicate", ids });
  const insertBlank = (afterId = currentPage?.id) => {
    const i = pages.findIndex((p) => p.id === afterId);
    const ref = pages[i];
    pageOp({
      type: "insertBlank",
      index: i + 1,
      size: ref ? sizeOf(ref) : LETTER,
    });
  };

  const thumbActions: ThumbActions = {
    click: (id, e) => {
      const i = pages.findIndex((p) => p.id === id);
      if (e.shiftKey && selectedPages.length) {
        const anchor = pages.findIndex(
          (p) => p.id === selectedPages[selectedPages.length - 1],
        );
        const [a, b] = anchor < i ? [anchor, i] : [i, anchor];
        setSelectedPages(pages.slice(a, b + 1).map((p) => p.id));
      } else if (e.metaKey || e.ctrlKey) {
        setSelectedPages((s) =>
          s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
        );
      } else setSelectedPages([id]);
      scrollToPage(i);
    },
    move: (id, to) => pageOp({ type: "move", id, to }),
    rotate: (ids, delta) => rotatePages(delta, ids),
    duplicate: (ids) => duplicatePages(ids),
    remove: (ids) => deletePages(ids),
    insertBlankAfter: (id) => insertBlank(id),
    extract: (ids) => void extract(ids),
  };

  // ---------------------------------------------------------------------------------------------
  // Keyboard

  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  keys.current = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    const typing = !!target?.closest(
      "input, textarea, select, [contenteditable='true'], .annotationLayer",
    );
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key.toLowerCase();
    if (mod && k === "f") {
      e.preventDefault();
      setFindOpen(true);
      return;
    }
    if (mod && k === "p") {
      e.preventDefault();
      if (canDownload) void print();
      return;
    }
    if (mod && (k === "=" || k === "+" || k === "-" || k === "0")) {
      e.preventDefault();
      setZoom(k === "0" ? 1 : k === "-" ? "out" : "in");
      return;
    }
    if (typing) return;
    if (mod && k === "z" && canEdit) {
      e.preventDefault();
      e.shiftKey ? redo() : undo();
      return;
    }
    if (mod && k === "y" && canEdit) {
      e.preventDefault();
      redo();
      return;
    }
    if (e.key === "Escape") {
      setSelectedId(null);
      setOpenNoteId(null);
      setFindOpen(false);
      setTool("select");
      return;
    }
    if ((e.key === "Delete" || e.key === "Backspace") && canEdit) {
      if (selectedId) {
        e.preventDefault();
        deleteSelection();
      } else if (selectedPages.length) {
        e.preventDefault();
        deletePages(selectedPages);
      }
      return;
    }
    if (selected && canEdit && e.key.startsWith("Arrow")) {
      e.preventDefault();
      const d = e.shiftKey ? 10 : 1;
      const [dx, dy] =
        e.key === "ArrowLeft"
          ? [-d, 0]
          : e.key === "ArrowRight"
            ? [d, 0]
            : e.key === "ArrowUp"
              ? [0, -d]
              : [0, d];
      change((m) => ({
        ...m,
        annotations: m.annotations.map((a) =>
          a.id === selected.id ? translate(a, dx, dy) : a,
        ),
      }));
      return;
    }
    if (!mod && !e.altKey && canEdit && TOOL_KEYS[k]) {
      e.preventDefault();
      setTool(TOOL_KEYS[k]);
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keys.current(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---------------------------------------------------------------------------------------------
  // Title bar commands

  useEffect(() => {
    $pdfCommands.set({
      canUndo: !!hist?.past.length,
      canRedo: !!hist?.future.length,
      hasSelection: !!selectedId,
      thumbnails: sidebar === "pages",
      outline: sidebar === "outline",
      hasOutline: !!loaded?.outline.length,
      undo,
      redo,
      deleteSelection,
      find: () => setFindOpen(true),
      zoom: setZoom,
      rotateView: () => setViewRotation((r) => normRotation(r + 90)),
      toggleThumbnails: () =>
        setSidebar((s) => (s === "pages" ? null : "pages")),
      toggleOutline: () =>
        setSidebar((s) => (s === "outline" ? null : "outline")),
      insert: (k) => void insert(k),
      stamp,
      rotatePages: (d) => rotatePages(d),
      deletePages: () => deletePages(),
      duplicatePages: () => duplicatePages(),
      insertBlank: () => insertBlank(),
      insertFromPdf: () => void insertFromPdf(),
      extractPages: () => void extract(),
      splitAfter: () => void splitAfter(),
      downloadPdf: () => void downloadPdf(),
      downloadOriginal: () => void downloadOriginal(),
      print: () => void print(),
      convertToDoc: () => void convertToDoc(),
    });
  });
  useEffect(() => () => $pdfCommands.set(null), []);

  // ---------------------------------------------------------------------------------------------
  // Render

  if (!data) {
    return (
      <Placeholder
        raw={rawData}
        canEdit={canEdit}
        documentId={documentId}
        onReady={(d) => {
          saved.current = canon(d);
          setHist(historyOf(d));
        }}
      />
    );
  }

  const ready = !data.blob || !!pdf;
  return (
    <div className="flex min-h-0 flex-1">
      {sidebar && (
        <aside
          aria-label="Pages"
          className="flex w-[164px] shrink-0 flex-col border-r border-border bg-background"
        >
          {!!loaded?.outline.length && (
            <div
              className="flex gap-1 border-b border-border p-1.5"
              role="tablist"
            >
              {(["pages", "outline"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={sidebar === s}
                  onClick={() => setSidebar(s)}
                  className={`flex-1 rounded-[8px] py-1 text-xs font-medium ${sidebar === s ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {s === "pages" ? "Pages" : "Bookmarks"}
                </button>
              ))}
            </div>
          )}
          {sidebar === "outline" && loaded ? (
            <Outline items={loaded.outline} onGo={(d) => void goToDest(d)} />
          ) : (
            <Thumbnails
              pdf={pdf}
              pages={pages}
              sizes={sizeOf}
              currentId={currentPage?.id ?? null}
              selected={selectedPages}
              canEdit={canEdit}
              actions={thumbActions}
            />
          )}
        </aside>
      )}
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-4">
          <div className="pointer-events-auto max-w-full">
            <PdfToolbar
              canEdit={canEdit}
              tool={tool}
              setTool={setTool}
              style={style}
              styleFor={styleFor}
              setStyle={setStyle}
              insert={(k) => void insert(k)}
              stamp={stamp}
              zoom={zoom}
              setZoom={setZoom}
              pageIndex={currentIndex}
              pageCount={pages.length}
              goToPage={(i) => scrollToPage(i)}
              sidebarOpen={!!sidebar}
              toggleSidebar={() => setSidebar((s) => (s ? null : "pages"))}
              find={() => setFindOpen(true)}
              rotateView={() => setViewRotation((r) => normRotation(r + 90))}
            />
          </div>
        </div>
        <FindBar
          open={findOpen}
          count={matches.length}
          current={matchIndex}
          busy={searching}
          onQuery={runSearch}
          onStep={step}
          onClose={() => {
            setFindOpen(false);
            void runSearch("");
          }}
        />
        <div
          ref={scroller}
          onScroll={onScroll}
          onPointerUp={onPointerUp}
          className="min-h-0 flex-1 overflow-auto bg-background"
          style={{
            cursor: MARKUP_TOOLS.has(tool) && canEdit ? "text" : undefined,
          }}
        >
          {loadError ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <p className="font-display text-lg font-semibold tracking-[-0.02em]">
                This PDF could not be opened
              </p>
              <p className="max-w-sm text-[13px] text-muted-foreground">
                {loadError}
              </p>
              <Button variant="outline" onClick={() => setReload((n) => n + 1)}>
                Try again
              </Button>
            </div>
          ) : !ready || view.w === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Loader2
                className="size-5 animate-spin motion-reduce:animate-none"
                aria-label="Loading PDF"
              />
            </div>
          ) : (
            <div
              className="flex w-max min-w-full flex-col"
              style={{ padding: `${PAD_TOP}px ${PAD}px ${PAD}px`, gap: GAP }}
            >
              {pages.map((page, i) => {
                const [w, h] = sizeOf(page);
                const top = offsets[i];
                const boxH = offsetsAt1[i] * zoom;
                const visible =
                  top < view.top + view.h * 2 && top + boxH > view.top - view.h;
                return (
                  <PageView
                    key={page.id}
                    pdf={pdf && page.src < pdf.numPages ? pdf : null}
                    page={page}
                    index={i}
                    w={w}
                    h={h}
                    zoom={zoom}
                    rotation={rotationOf(page)}
                    visible={visible}
                    annotations={
                      visible
                        ? annotations.filter((a) => a.pageId === page.id)
                        : EMPTY
                    }
                    matches={
                      (findOpen && matchesByPage.get(page.id)) || EMPTY_RECTS
                    }
                    currentMatch={
                      currentMatch?.pageId === page.id
                        ? currentMatch.rect
                        : null
                    }
                    api={api}
                    forms={forms}
                    links={links}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
      <SignDialog
        mode={signMode}
        defaultName={user?.displayName || ""}
        onClose={() => setSignMode(null)}
        onDone={(url) =>
          void placeImage(url, signMode === "initials" ? 70 : 180)
        }
      />
    </div>
  );
}

const EMPTY: Annotation[] = [];
const EMPTY_RECTS: Rect[] = [];

/** The row holds no PDF model: offer to start one (only when the row has no data at all). */
function Placeholder({
  raw,
  canEdit,
  documentId,
  onReady,
}: {
  raw: unknown;
  canEdit: boolean;
  documentId: string;
  onReady: (d: PdfData) => void;
}) {
  const { updateDocument } = useCloudStore();
  const [busy, setBusy] = useState(false);
  const empty = raw === null || raw === undefined;

  const start = async (make: () => Promise<PdfData>) => {
    setBusy(true);
    try {
      const d = await make();
      const ok = await updateDocument(documentId, {
        data: d,
      } as Partial<Document>).catch(() => false);
      if (!ok) throw new Error("Check your connection and try again.");
      onReady(d);
    } catch (e) {
      showToast.error(
        "Could not set up this PDF",
        e instanceof Error ? e.message : undefined,
      );
    } finally {
      setBusy(false);
    }
  };

  const upload = () =>
    start(async () => {
      const [file] = await pickFiles("application/pdf,.pdf");
      if (!file) throw new Error("No file was chosen.");
      const { bytes, pageCount } = await readPdfFile(file);
      const stored = await uploadPdfBytes(documentId, bytes);
      return initialData({
        sha256: stored.sha256,
        size: stored.size,
        pageCount,
      });
    });

  const blank = () =>
    start(async () => ({
      version: 1,
      blob: null,
      pages: [{ id: newId(), src: -1, rotation: 0, size: LETTER }],
      annotations: [],
      forms: {},
    }));

  if (!empty) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="font-display text-lg font-semibold tracking-[-0.02em]">
          This PDF could not be opened
        </p>
        <p className="max-w-sm text-[13px] text-muted-foreground">
          Its contents are in a format this version does not understand.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <p className="font-display text-lg font-semibold tracking-[-0.02em]">
        This PDF is empty
      </p>
      {canEdit ? (
        <div className="flex gap-2">
          <Button variant="app" disabled={busy} onClick={() => void upload()}>
            <FileUp />
            Upload a PDF
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void blank()}
          >
            Start with a blank page
          </Button>
        </div>
      ) : (
        <p className="text-[13px] text-muted-foreground">
          The owner has not added a file yet.
        </p>
      )}
    </div>
  );
}
