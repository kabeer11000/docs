"use client";

import type { Editor } from "@tiptap/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { useLiveDocument } from "@/components/editor/core/use-document-loader";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { useDocumentPermissions } from "@/hooks/use-document-permissions";
import { fileHref, fileKind } from "@/lib/files";
import {
  deleteSlide,
  duplicateSlide,
  field,
  insertSlide,
  isEmptyDeck,
  moveSlide,
  seedDeck,
  setLayout,
  setTheme,
} from "@/lib/slides/deck-doc";
import { type Deck, type Layout, normalizeDeck } from "@/lib/slides/model";
import { isPlaceholderTitle, titleFromHtml } from "@/lib/titles";
import { showToast } from "@/lib/toast";
import { createSnapshotter, htmlToFragment } from "./editor-kit";
import { downloadDeckHtml, printDeck } from "./export-actions";
import { Filmstrip, type FilmstripActions } from "./filmstrip";
import { Presenter } from "./presenter";
import { RegionEditor } from "./region-editor";
import { fitScale, SlideView, useSize } from "./slide-view";
import { $slidesSave } from "./slides-header";
import { SlidesToolbar } from "./slides-toolbar";
import { useSlidesCollab } from "./use-slides-collab";

const SAVE_DELAY = 1500;

const PLACEHOLDER: Record<string, string> = {
  title: "Add a title",
  subtitle: "Add a subtitle",
  body: "Add text",
  left: "Add text",
  right: "Add text",
  image: "Drop an image here, or use Insert image",
};

export function SlidesApp({ documentId }: { documentId: string }) {
  const router = useRouter();
  const { document: documentData, access } = useLiveDocument(documentId);
  const permissions = useDocumentPermissions(documentData);
  const canEdit = permissions.canEdit;
  const { updateDocument } = useCloudStore();
  const doc = useMemo(() => new Y.Doc(), []);
  const collab = useSlidesCollab(documentId, doc, documentData ? canEdit : null);

  useEffect(() => {
    if (access === "denied") {
      showToast.error("You do not have permission to open this presentation.");
      router.replace("/home");
    } else if (documentData && fileKind(documentData) !== "slides") {
      router.replace(fileHref(documentData.id, fileKind(documentData)));
    }
  }, [access, documentData, router]);

  // Seed from the database only once the room has answered and is empty (never over live content).
  // ponytail: two editors opening an empty room in the same instant can both seed (same as docs);
  // duplicate slide ids are dropped on read, but region text would double.
  const [ready, setReady] = useState(false);
  const storedData = documentData?.data;
  useEffect(() => {
    if (ready || !documentData || collab === "pending" || collab === "connecting") return;
    try {
      if (isEmptyDeck(doc)) seedDeck(doc, normalizeDeck(storedData), htmlToFragment);
    } catch (error) {
      console.error("[slides] failed to load", error);
      showToast.error("Failed to load the presentation.");
      return;
    }
    setReady(true);
  }, [ready, documentData, collab, doc, storedData]);

  const [deck, setDeck] = useState<Deck | null>(null);
  const snapshotter = useMemo(() => createSnapshotter(doc), [doc]);
  useEffect(() => snapshotter.attach(), [snapshotter]);

  // Leading + trailing throttle: structure changes show at once, typing re-reads at most every 150ms.
  useEffect(() => {
    if (!ready) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let dirty = false;
    const read = () => setDeck(snapshotter.snapshot());
    const tick = () => {
      if (dirty) {
        dirty = false;
        read();
        timer = setTimeout(tick, 150);
      } else timer = null;
    };
    const onUpdate = () => {
      if (timer) dirty = true;
      else {
        read();
        timer = setTimeout(tick, 150);
      }
    };
    read();
    doc.on("update", onUpdate);
    return () => {
      doc.off("update", onUpdate);
      if (timer) clearTimeout(timer);
    };
  }, [ready, doc, snapshotter]);

  // Autosave: editors only, never before the stored deck is loaded, never an unchanged or empty deck.
  const docRef = useRef(documentData);
  docRef.current = documentData;
  useEffect(() => {
    if (!ready || !canEdit) return;
    $slidesSave.set("idle");
    let last = JSON.stringify(snapshotter.snapshot());
    let timer: ReturnType<typeof setTimeout> | null = null;
    const save = async () => {
      timer = null;
      const next = snapshotter.snapshot();
      const json = JSON.stringify(next);
      if (!next.slides.length || json === last) return;
      last = json;
      $slidesSave.set("saving");
      const current = docRef.current;
      const autoTitle = current && isPlaceholderTitle(current.title) ? titleFromHtml(next.slides[0]?.html.title ?? "") : null;
      const ok = await updateDocument(documentId, { data: next, ...(autoTitle ? { title: autoTitle } : {}) }).catch(() => false);
      if (!ok) last = "";
      $slidesSave.set(ok ? "saved" : "error");
    };
    const onUpdate = (_u: Uint8Array, origin: unknown) => {
      if (origin === "seed") return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(save, SAVE_DELAY);
    };
    const flush = () => {
      if (!timer) return;
      clearTimeout(timer);
      void save();
    };
    doc.on("update", onUpdate);
    window.addEventListener("pagehide", flush);
    return () => {
      doc.off("update", onUpdate);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [ready, canEdit, doc, snapshotter, documentId, updateDocument]);

  const [currentId, setCurrentId] = useState("");
  const lastIndex = useRef(0);
  const slides = deck?.slides ?? [];
  const foundIndex = slides.findIndex((s) => s.id === currentId);
  const index = foundIndex >= 0 ? foundIndex : Math.min(lastIndex.current, slides.length - 1);
  const current = slides[index];
  if (index >= 0) lastIndex.current = index;

  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  useEffect(() => setActiveEditor(null), [current?.id]);

  const [presenting, setPresenting] = useState<number | null>(null);
  const title = documentData?.title ?? "Presentation";

  const actions: FilmstripActions = useMemo(
    () => ({
      select: setCurrentId,
      move: (id, to) => moveSlide(doc, id, to),
      duplicate: (id) => {
        const copy = duplicateSlide(doc, id);
        if (copy) setCurrentId(copy);
      },
      remove: (id) => deleteSlide(doc, id),
      insertAfter: (id) => {
        const at = doc.getArray<string>("order").toArray().indexOf(id) + 1;
        setCurrentId(insertSlide(doc, at, "title-body"));
      },
    }),
    [doc],
  );

  const currentRef = useRef({ id: "", index: 0 });
  currentRef.current = { id: current?.id ?? "", index };
  useEffect(() => {
    if (!deck) return;
    const onKey = (e: KeyboardEvent) => {
      if (presenting !== null) return;
      const mod = e.ctrlKey || e.metaKey;
      const { id, index: i } = currentRef.current;
      if (e.key === "F5") {
        e.preventDefault();
        setPresenting(e.shiftKey ? i : 0);
      } else if (mod && e.key === "Enter" && canEdit && id) {
        e.preventDefault();
        e.stopPropagation();
        actions.insertAfter(id);
      } else if (mod && !e.shiftKey && e.key.toLowerCase() === "d" && canEdit && id) {
        e.preventDefault();
        actions.duplicate(id);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [deck, presenting, canEdit, actions]);

  const [stageRef, stage] = useSize<HTMLDivElement>();

  if (access === "missing" || (access === "denied" && !documentData)) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-serif text-lg font-medium">
          {access === "denied" ? "You do not have permission to open this presentation" : "Presentation not found"}
        </p>
      </div>
    );
  }

  const loading = !deck || !current;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <SlidesToolbar
        editor={activeEditor}
        canEdit={canEdit && !loading}
        layout={current?.layout ?? "title-body"}
        theme={deck?.theme ?? "paper"}
        onAddSlide={(layout: Layout) => setCurrentId(insertSlide(doc, index + 1, layout))}
        onLayout={(layout) => current && setLayout(doc, current.id, layout)}
        onTheme={(theme) => setTheme(doc, theme)}
        onPrint={() => deck && printDeck(deck, title)}
        onDownloadHtml={() => deck && downloadDeckHtml(deck, title)}
        onPresent={() => setPresenting(index)}
      />
      <div className="flex min-h-0 flex-1">
        {deck && current ? (
          <Filmstrip deck={deck} currentId={current.id} canEdit={canEdit} actions={actions} />
        ) : (
          <div className="w-[228px] shrink-0 border-r border-border" />
        )}
        <main className="flex min-w-0 flex-1 flex-col">
          <div ref={stageRef} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-8">
            {loading ? (
              <div
                className="aspect-video animate-pulse rounded-[2px] bg-paper shadow-paper"
                style={{ width: Math.max(0, Math.min(stage.w - 64, ((stage.h - 64) * 16) / 9)) }}
              />
            ) : (
              stage.w > 0 && (
                <SlideView
                  key={current.id}
                  theme={deck.theme}
                  layout={current.layout}
                  scale={fitScale(stage.w - 64, stage.h - 64)}
                  className="rounded-[2px] shadow-paper"
                  region={(r) => (
                    <RegionEditor
                      key={r}
                      doc={doc}
                      name={field(current.id, r)}
                      editable={canEdit}
                      placeholder={PLACEHOLDER[r] ?? "Add text"}
                      onFocus={setActiveEditor}
                      className="sl-r"
                      data-region={r}
                    />
                  )}
                />
              )
            )}
          </div>
          {current && (canEdit || current.notes) && (
            <div className="h-28 shrink-0 overflow-y-auto border-t border-border px-8 py-3 text-[14px] leading-relaxed">
              <RegionEditor
                key={current.id}
                doc={doc}
                name={field(current.id, "notes")}
                editable={canEdit}
                placeholder="Speaker notes"
                className="mx-auto max-w-3xl [&_.ProseMirror]:min-h-16 [&_.ProseMirror]:outline-none [&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0 [&_p.is-editor-empty:first-child]:before:text-muted-foreground [&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]"
              />
            </div>
          )}
        </main>
      </div>
      {presenting !== null && deck && <Presenter deck={deck} start={presenting} onClose={() => setPresenting(null)} />}
    </div>
  );
}
