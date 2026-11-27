"use client";

import type { Editor } from "@tiptap/react";
import { ChevronUp, NotebookPen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLiveDocument } from "@/components/editor/core/use-document-loader";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { useDocumentPermissions } from "@/hooks/use-document-permissions";
import { fileHref, fileKind } from "@/lib/files";
import {
  deleteSlide,
  lowerElement,
  raiseElement,
  duplicateSlide,
  field,
  insertSlide,
  insertSlides,
  isEmptyDeck,
  moveSlide,
  replaceDeck,
  seedDeck,
  setLayout,
  setTheme,
  setTransition,
} from "@/lib/slides/deck-doc";
import {
  type Deck,
  type Layout,
  normalizeDeck,
  type Slide,
} from "@/lib/slides/model";
import { isPlaceholderTitle, titleFromHtml } from "@/lib/titles";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { createSnapshotter, htmlToFragment } from "./editor-kit";
import { pickFiles } from "@/components/app-header/app-header";
import { addImage, addTextBox, TEXT_PRESETS } from "./element-actions";
import { ElementToolbar } from "./element-toolbar";
import {
  downloadDeckHtml,
  downloadDeckPptx,
  printDeck,
} from "./export-actions";
import { Filmstrip, type FilmstripActions } from "./filmstrip";
import { LibraryPanel, type LibraryTab } from "./library-panel";
import { Presenter } from "./presenter";
import { RegionEditor } from "./region-editor";
import { fitScale, SlideView, useSize } from "./slide-view";
import {
  $slidesCommands,
  $slidesSave,
  type PresentMode,
} from "./slides-header";
import { SlidesToolbar } from "./slides-toolbar";
import { SlidesTemplateGallery } from "./template-gallery";
import { useElementEditor } from "./use-element-editor";
import { SlidesThumbnail } from "./slides-thumbnail";
import { useSlidesCollab } from "./use-slides-collab";
import { FileTransition } from "@/components/editor/file-transition";
import { roomDoc } from "@/lib/collab-room";

const SAVE_DELAY = 1500;
const STAGE_SHADOW = "shadow-[0_1px_2px_rgb(0_0_0/0.06),0_12px_40px_-12px_rgb(0_0_0/0.22)]";

const PLACEHOLDER: Record<string, string> = {
  title: "Add a title",
  subtitle: "Add a subtitle",
  body: "Add text",
  left: "Add text",
  middle: "Add text",
  right: "Add text",
  image: "Drop an image here",
  stat: "42%",
  caption: "What the number means",
  quote: "A line worth remembering",
  attribution: "Who said it",
  "agenda:body": "One topic per line",
  "image-caption:caption": "Add a caption",
};
const placeholderFor = (layout: Layout, region: string) =>
  PLACEHOLDER[`${layout}:${region}`] ?? PLACEHOLDER[region] ?? "Add text";

const isBlankDeck = (deck: Deck) =>
  deck.slides.length === 1 &&
  !deck.slides[0].elements.length &&
  !Object.values(deck.slides[0].html).some(Boolean);

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  !!t.closest('input,textarea,select,[contenteditable="true"]');

export function SlidesApp({ documentId }: { documentId: string }) {
  const router = useRouter();
  const { document: documentData, access } = useLiveDocument(documentId);
  const permissions = useDocumentPermissions(documentData);
  const canEdit = permissions.canEdit;
  const { updateDocument } = useCloudStore();
  // A room warmed from Home may already hold the synced deck.
  const doc = useMemo(() => roomDoc(documentId), [documentId]);
  const collab = useSlidesCollab(
    documentId,
    doc,
    documentData ? canEdit : null,
  );

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
    if (
      ready ||
      !documentData ||
      collab === "pending" ||
      collab === "connecting"
    )
      return;
    try {
      if (isEmptyDeck(doc))
        seedDeck(doc, normalizeDeck(storedData), htmlToFragment);
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
      const autoTitle =
        current && isPlaceholderTitle(current.title)
          ? titleFromHtml(next.slides[0]?.html.title ?? "")
          : null;
      const ok = await updateDocument(documentId, {
        data: next,
        ...(autoTitle ? { title: autoTitle } : {}),
      }).catch(() => false);
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
  const index =
    foundIndex >= 0
      ? foundIndex
      : Math.min(lastIndex.current, slides.length - 1);
  const current: Slide | undefined = slides[index];
  if (index >= 0) lastIndex.current = index;

  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset per slide
  useEffect(() => {
    setActiveEditor(null);
    setSelected([]);
    setEditingId(null);
  }, [current?.id]);
  // Drop selections whose elements were deleted (here or by a collaborator).
  const elementIds = current?.elements.map((e) => e.id).join(",") ?? "";
  useEffect(() => {
    const live = new Set(elementIds.split(","));
    setSelected((s) =>
      s.every((id) => live.has(id)) ? s : s.filter((id) => live.has(id)),
    );
  }, [elementIds]);

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryTab, setLibraryTab] = useState<LibraryTab>("text");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [presenting, setPresenting] = useState<{
    start: number;
    presenterView: boolean;
  } | null>(null);
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

  // The header's File menu and Present button act on this deck.
  const deckRef = useRef(deck);
  deckRef.current = deck;
  const indexRef = useRef(index);
  indexRef.current = index;
  useEffect(() => {
    if (!ready) return;
    $slidesCommands.set({
      present: (mode: PresentMode) =>
        setPresenting({
          start: mode === "start" ? 0 : indexRef.current,
          presenterView: mode === "presenter",
        }),
      print: () => deckRef.current && printDeck(deckRef.current, title),
      html: () => deckRef.current && downloadDeckHtml(deckRef.current, title),
      pptx: async () => {
        if (deckRef.current) await downloadDeckPptx(deckRef.current, title);
      },
      // Menu bar extras (Insert, Arrange, Slide); each lights up its menu item.
      addText: () => {
        const id = currentRef.current.id;
        if (id) latest.current.onAdded(addTextBox(doc, id, TEXT_PRESETS[2]), true);
      },
      insertImage: () => void pickFiles("image/*", true).then((files) => latest.current.insertImages(files)),
      openLibrary: (tab) => {
        setLibraryTab(tab);
        setLibraryOpen(true);
      },
      openTemplates: () => setTemplatesOpen(true),
      deleteSlide: () => {
        const id = currentRef.current.id;
        if (id) deleteSlide(doc, id);
      },
      toggleNotes: () => setNotesOpen((o) => !o),
      bringToFront: () => {
        for (const id of selectedRef.current) raiseElement(doc, id);
      },
      sendToBack: () => {
        for (const id of selectedRef.current) lowerElement(doc, id);
      },
      selectedCount: selected.length,
    });
    return () => $slidesCommands.set(null);
  }, [ready, title, doc, selected.length]);

  const selectedRef = useRef(selected);
  selectedRef.current = selected;
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
        setPresenting({ start: e.shiftKey ? i : 0, presenterView: false });
      } else if (mod && e.key === "Enter" && canEdit && id) {
        e.preventDefault();
        e.stopPropagation();
        actions.insertAfter(id);
      } else if (
        mod &&
        !e.shiftKey &&
        e.key.toLowerCase() === "d" &&
        canEdit &&
        id &&
        !selectedRef.current.length &&
        !isTyping(e.target)
      ) {
        e.preventDefault();
        actions.duplicate(id);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [deck, presenting, canEdit, actions]);

  const onAdded = useCallback((id: string, edit = false) => {
    setSelected([id]);
    setEditingId(edit ? id : null);
  }, []);

  const insertImages = useCallback(
    async (files: File[]) => {
      const slideId = currentRef.current.id;
      if (!slideId) return;
      for (const f of files) {
        try {
          onAdded(await addImage(doc, slideId, f));
        } catch (e) {
          showToast.error(
            e instanceof Error ? e.message : "Could not read image",
          );
        }
      }
    },
    [doc, onAdded],
  );
  // Menu commands are registered once; they read the newest callbacks through this ref.
  const latest = useRef({ onAdded, insertImages });
  latest.current = { onAdded, insertImages };

  // A pasted screenshot (outside any text) lands on the slide as an image.
  useEffect(() => {
    if (!canEdit || !ready) return;
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target) || presenting) return;
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (!files.length) return;
      e.preventDefault();
      void insertImages(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [canEdit, ready, presenting, insertImages]);

  // New, empty presentations open on the template gallery once.
  const offered = useRef(false);
  useEffect(() => {
    if (
      offered.current ||
      !deck ||
      !canEdit ||
      !documentData ||
      !isPlaceholderTitle(documentData.title) ||
      !isBlankDeck(deck)
    )
      return;
    offered.current = true;
    const key = `slides-templates-offered:${documentId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    setTemplatesOpen(true);
  }, [deck, canEdit, documentData, documentId]);

  const [stageRef, stage] = useSize<HTMLDivElement>();
  const scale = fitScale(stage.w - 96, stage.h - 132);

  const editor = useElementEditor({
    doc,
    slide: current ?? {
      id: "",
      layout: "blank",
      notes: "",
      html: {},
      elements: [],
    },
    canEdit,
    scale,
    selected,
    onSelect: setSelected,
    editingId,
    onEditing: setEditingId,
    onTextFocus: setActiveEditor,
    toolbar: (els) => (
      <ElementToolbar
        doc={doc}
        elements={els}
        theme={deck?.theme ?? "paper"}
        onSelect={setSelected}
        onEditChart={() => {
          setLibraryTab("charts");
          setLibraryOpen(true);
        }}
      />
    ),
  });

  if (access === "missing" || (access === "denied" && !documentData)) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-display text-lg font-semibold tracking-tight">
          {access === "denied"
            ? "You do not have permission to open this presentation"
            : "Presentation not found"}
        </p>
      </div>
    );
  }

  const loading = !deck || !current;
  const selectedChart =
    current?.elements.find(
      (e) =>
        e.type === "chart" && selected.length === 1 && selected[0] === e.id,
    ) ?? null;

  return (
    <div data-app="slides" className="flex h-full min-h-0 bg-background">
      {deck && current ? (
        <Filmstrip
          deck={deck}
          currentId={current.id}
          canEdit={canEdit}
          actions={actions}
        />
      ) : (
        <div className="w-[236px] shrink-0" />
      )}
      {libraryOpen && canEdit && deck && current && (
        <LibraryPanel
          doc={doc}
          slideId={current.id}
          background={current.background}
          theme={deck.theme}
          tab={libraryTab}
          onTab={setLibraryTab}
          chart={selectedChart}
          onAdded={onAdded}
          onClose={() => setLibraryOpen(false)}
          allSlideIds={deck.slides.map((s) => s.id)}
        />
      )}
      <main className="relative flex min-w-0 flex-1 flex-col">
        <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center px-4">
          <div className="pointer-events-auto max-w-full">
            <SlidesToolbar
              editor={activeEditor}
              canEdit={canEdit && !loading}
              layout={current?.layout ?? "title-body"}
              theme={deck?.theme ?? "paper"}
              transition={deck?.transition ?? "none"}
              libraryOpen={libraryOpen}
              onAddSlide={(layout: Layout) =>
                setCurrentId(insertSlide(doc, index + 1, layout))
              }
              onLayout={(layout) =>
                current && setLayout(doc, current.id, layout)
              }
              onTheme={(theme) => setTheme(doc, theme)}
              onTransition={(t) => setTransition(doc, t)}
              onAddText={() =>
                current &&
                onAdded(addTextBox(doc, current.id, TEXT_PRESETS[2]), true)
              }
              onInsertImages={(files) => void insertImages(files)}
              onToggleLibrary={() => setLibraryOpen((o) => !o)}
              onTemplates={() => setTemplatesOpen(true)}
            />
          </div>
        </div>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: clicking empty canvas clears the selection */}
        <div
          ref={stageRef}
          className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-12 pt-20 pb-12"
          onPointerDown={(e) => {
            if (
              (e.target as HTMLElement).closest(
                "[data-el-id],[data-el-frame],[role=toolbar]",
              )
            )
              return;
            setSelected([]);
            setEditingId(null);
          }}
          onDragOver={(e) => {
            if (canEdit && e.dataTransfer.types.includes("Files"))
              e.preventDefault();
          }}
          onDrop={(e) => {
            if (!canEdit || (e.target as HTMLElement).closest(".ProseMirror"))
              return;
            const files = Array.from(e.dataTransfer.files).filter((f) =>
              f.type.startsWith("image/"),
            );
            if (!files.length) return;
            e.preventDefault();
            void insertImages(files);
          }}
        >
          <FileTransition id={documentId}>
            {loading ? (
              // The stored first slide (static, no editors) until the live deck is ready, at the
              // same size and place as the slide that replaces it.
              <div
                className={cn(
                  "aspect-video overflow-hidden rounded-[10px] bg-card",
                  documentData ? STAGE_SHADOW : "animate-pulse shadow-card",
                )}
                style={{
                  width: Math.max(
                    0,
                    Math.min(stage.w - 96, ((stage.h - 132) * 16) / 9),
                  ),
                }}
              >
                {documentData && <SlidesThumbnail data={documentData.data} />}
              </div>
            ) : (
              stage.w > 0 && (
                <SlideView
                  key={current.id}
                  theme={deck.theme}
                  layout={current.layout}
                  background={current.background}
                  scale={scale}
                  radius={10}
                  className={STAGE_SHADOW}
                  region={(r) => (
                    <RegionEditor
                      key={r}
                      doc={doc}
                      name={field(current.id, r)}
                      editable={canEdit}
                      placeholder={placeholderFor(current.layout, r)}
                      onFocus={setActiveEditor}
                      className="sl-r"
                      data-region={r}
                    />
                  )}
                  overlay={editor.overlay}
                >
                  {editor.layer}
                </SlideView>
              )
            )}
          </FileTransition>
        </div>
        {current && (canEdit || current.notes) && (
          <section
            aria-label="Speaker notes"
            className="shrink-0 border-t border-border bg-card"
          >
            <button
              type="button"
              onClick={() => setNotesOpen((o) => !o)}
              aria-expanded={notesOpen}
              className="flex h-10 w-full items-center gap-2 px-5 text-left text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <NotebookPen className="size-4 text-app" />
              Speaker notes
              {!notesOpen && current.notes && (
                <span className="min-w-0 flex-1 truncate font-normal">
                  {current.notes.split("\n")[0]}
                </span>
              )}
              <ChevronUp
                className={cn(
                  "ml-auto size-4 transition-transform duration-200",
                  !notesOpen && "rotate-180",
                )}
              />
            </button>
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
                notesOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="h-32 overflow-y-auto px-5 pb-3 text-[14px] leading-relaxed">
                  <RegionEditor
                    key={current.id}
                    doc={doc}
                    name={field(current.id, "notes")}
                    editable={canEdit}
                    placeholder="What you want to say on this slide"
                    className="mx-auto max-w-3xl [&_.ProseMirror]:min-h-16 [&_.ProseMirror]:outline-none [&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0 [&_p.is-editor-empty:first-child]:before:text-muted-foreground [&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]"
                  />
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
      {presenting && deck && (
        <Presenter
          deck={deck}
          documentId={documentId}
          start={presenting.start}
          withPresenterView={presenting.presenterView}
          onClose={() => setPresenting(null)}
        />
      )}
      {canEdit && (
        <SlidesTemplateGallery
          open={templatesOpen}
          onOpenChange={setTemplatesOpen}
          canInsert={!!deck && !isBlankDeck(deck)}
          onPick={(picked, mode) => {
            if (mode === "insert") {
              insertSlides(doc, picked.slides, index + 1, htmlToFragment);
              setCurrentId(picked.slides[0]?.id ?? "");
            } else {
              replaceDeck(doc, picked, htmlToFragment);
              setCurrentId(picked.slides[0]?.id ?? "");
            }
          }}
        />
      )}
    </div>
  );
}
