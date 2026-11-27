"use client";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { useStore } from "@nanostores/react";
import { debounce } from "@repo/shadcn-ui/lib/utils";
import { Collaboration } from "@tiptap/extension-collaboration";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import Placeholder from "@tiptap/extension-placeholder";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TextAlign from "@tiptap/extension-text-align";
import { FontSize, TextStyle } from "@tiptap/extension-text-style";
import { type Editor, EditorContent, useEditor } from "@tiptap/react";
import { yUndoPluginKey } from "@tiptap/y-tiptap";
import StarterKit from "@tiptap/starter-kit";
import { CheckCircle2, Flag, Lightbulb, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { computed } from "nanostores";
import {
  Fragment,
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CollaborationCaret } from "tiptap-collaboration-caret-plus";
import { TableCellPlus, TableHeaderPlus, TablePlus, TableRowPlus } from "tiptap-pagination-plus";
import * as Y from "yjs";
import { Button } from "@/components/ui/button";
import { useCloudStoreSaver } from "@/hooks/use-cloudstore-saver";
import { authManager } from "@/lib/auth/manager";
import { fileHref } from "@/lib/files";
import { useComments } from "@/hooks/use-comments";
import { useDocumentPermissions } from "@/hooks/use-document-permissions";
import { $paperSettings, fromStored, pageGeometry } from "@/lib/paper";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { $auth } from "@/state/auth";
import { editorActions, editorUIState } from "@/state/editor";
import { CollaborationAvatars } from "./collaboration-avatars";
import { useLiveDocument } from "./core/use-document-loader";
import { useWritingMemory } from "./core/use-writing-memory";
import { FocusMode } from "./focus-mode";
import { printDocument } from "./document-actions";
import { EditorControls, EditorStatusBar } from "./editor-controls";
import { EditorSkeleton } from "./editor-skeleton";
import { Callout } from "./extensions/callout";
import { CodeBlock } from "./extensions/code-block";
import { CustomHeading } from "./extensions/custom-heading";
import { Diagram } from "./extensions/diagram";
import { Embed } from "./extensions/embed";
import { GreenFlag, RedFlag } from "./extensions/flag-mark";
import { FontFamily } from "./extensions/font-family";
import { ImageDrop } from "./extensions/image-drop";
import { BlockMath, InlineMath } from "./extensions/math";
import { PageBreak } from "./extensions/page-break";
import { Pagination, repaginate } from "./extensions/pagination";
import { SlashCommand } from "./extensions/slash-command";
import { FindBar } from "./find/find-bar";
import { Find } from "./find/find-extension";
import { Outline } from "./outline/outline";
import { $pageSetupOpen, $shortcutsOpen } from "./dialogs-state";
import { PaperSheet } from "./paper-sheet";
import { SelectionMenu } from "./selection-menu";
import { ToolbarSeparator } from "./toolbar-button";
import "./editor-paper.css";

// Rarely used panels load on first use.
const EditorAIChatPanel = lazy(() => import("./editor-ai-chat-panel").then((m) => ({ default: m.EditorAIChatPanel })));
const CommentsSidebar = lazy(() => import("./comments/comments-sidebar").then((m) => ({ default: m.CommentsSidebar })));
const CommentDialog = lazy(() => import("./comment-dialog").then((m) => ({ default: m.CommentDialog })));
const ShortcutsDialog = lazy(() => import("./shortcuts-dialog"));
const PageSetup = lazy(() => import("./page-setup"));

const $commentsOpen = computed(editorUIState, (s) => s.isCommentsSidebarOpen);
const $aiOpen = computed(editorUIState, (s) => s.isAIPanelOpen);

interface FlagTooltipState {
  type: "red" | "green";
  reason: string;
  severity: string;
  recommendation: string;
  position: { x: number; y: number };
}

const FlagTooltip = memo(({ flagTooltip, onMouseLeave }: { flagTooltip: FlagTooltipState | null; onMouseLeave: () => void }) => {
  if (!flagTooltip) return null;
  const isRed = flagTooltip.type === "red";
  const Icon = isRed ? Flag : CheckCircle2;

  return (
    <div
      data-flag-tooltip
      className="fixed z-50 max-w-[320px] rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-float animate-in fade-in duration-150"
      style={{ left: flagTooltip.position.x, top: flagTooltip.position.y }}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex items-start gap-2.5">
        <Icon className={cn("mt-0.5 size-4 shrink-0", isRed ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")} />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h4 className="text-xs font-medium">{isRed ? "Red flag" : "Green flag"}</h4>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[11px] font-medium capitalize",
                flagTooltip.severity === "high"
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : flagTooltip.severity === "medium"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "bg-primary/10 text-primary",
              )}
            >
              {flagTooltip.severity}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">{flagTooltip.reason}</p>
          {flagTooltip.recommendation && isRed && (
            <div className="mt-2 border-t border-border pt-2">
              <p className="mb-0.5 flex items-center gap-1 text-xs font-medium">
                <Lightbulb className="size-3.5 text-amber-600 dark:text-amber-400" />
                Recommendation
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">{flagTooltip.recommendation}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
FlagTooltip.displayName = "FlagTooltip";

const COLLAB_URL = process.env.NEXT_PUBLIC_HOCUSPOCUS_URL;
// How long to wait for the live server before editing alone, and how long a dropped connection
// may last before we stop rejoining (see the provider effect).
const COLLAB_CONNECT_TIMEOUT = 5000;
const COLLAB_REJOIN_WINDOW = 10000;

async function collabToken() {
  const { tokens } = authManager.currentState;
  if (tokens && authManager.isTokenExpired(tokens.accessToken)) await authManager.refreshToken();
  return authManager.currentState.tokens?.accessToken ?? "";
}

const DocumentEditor = ({ documentId }: { documentId: string }) => {
  const yDocRef = useRef<Y.Doc | null>(null);
  const getYDoc = useCallback(() => {
    yDocRef.current ??= new Y.Doc();
    return yDocRef.current;
  }, []);

  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const { document: documentData, access } = useLiveDocument(documentId);
  const router = useRouter();

  const selectionRangeRef = useRef<{ from: number; to: number; text: string } | null>(null);
  const showCommentDialogRef = useRef(false);
  const [selectionMenuPosition, setSelectionMenuPosition] = useState({ x: 0, y: 0 });
  const [showSelectionMenu, setShowSelectionMenu] = useState(false);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [isCreatingComment, setIsCreatingComment] = useState(false);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [flagTooltip, setFlagTooltip] = useState<FlagTooltipState | null>(null);

  useEffect(() => {
    showCommentDialogRef.current = showCommentDialog;
  }, [showCommentDialog]);

  const isCommentsSidebarOpen = useStore($commentsOpen);
  const isAIPanelOpen = useStore($aiOpen);
  // Panels mount on first open and stay mounted (keeps their state and close animation).
  const [mounted, setMounted] = useState({ ai: false, comments: false });
  useEffect(() => {
    if ((isAIPanelOpen && !mounted.ai) || (isCommentsSidebarOpen && !mounted.comments)) {
      setMounted((m) => ({ ai: m.ai || isAIPanelOpen, comments: m.comments || isCommentsSidebarOpen }));
    }
  }, [isAIPanelOpen, isCommentsSidebarOpen, mounted]);

  const { user: currentUser } = useStore($auth);
  const userId = currentUser?.id || "anonymous";
  const userName = currentUser?.displayName || currentUser?.email || "Anonymous User";

  const { comments, createComment, addReply, updateComment, resolveComment, deleteComment, getComment } =
    useComments(documentId);

  // Paper: stored per document, read by the pagination plugin on every layout pass.
  const paper = useStore($paperSettings);
  const geometry = useMemo(() => pageGeometry(paper), [paper]);
  const geometryRef = useRef(geometry);
  geometryRef.current = geometry;
  const storedPaper = JSON.stringify(documentData?.pageSettings ?? null);
  useEffect(() => {
    $paperSettings.set(fromStored(JSON.parse(storedPaper)));
  }, [storedPaper]);
  const [pages, setPages] = useState(1);

  // "connecting" until the live server has sent its copy, "live" after, "solo" when there is no
  // server, it is unreachable, or the user cannot edit. Content is loaded only once this settles.
  const [collab, setCollab] = useState<"connecting" | "live" | "solo">(COLLAB_URL ? "connecting" : "solo");
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const goSolo = useCallback(() => {
    providerRef.current?.destroy();
    providerRef.current = null;
    setProvider(null);
    editorUIState.set({ ...editorUIState.get(), isConnected: false });
    setCollab((c) => (c === "solo" ? c : "solo"));
  }, []);

  useEffect(() => {
    if (!COLLAB_URL) return;
    let alive = true;
    let synced = false;
    let dropTimer: ReturnType<typeof setTimeout> | undefined;
    const connectTimer = setTimeout(() => alive && !synced && goSolo(), COLLAB_CONNECT_TIMEOUT);
    try {
      const hp = new HocuspocusProvider({
        url: COLLAB_URL,
        name: documentId,
        document: getYDoc(),
        token: collabToken,
        onConnect: () => {
          if (!alive) return;
          clearTimeout(dropTimer);
          editorUIState.set({ ...editorUIState.get(), isConnected: true });
        },
        onSynced: () => {
          if (!alive || synced) return;
          synced = true;
          setCollab((c) => (c === "connecting" ? "live" : c));
        },
        onAuthenticationFailed: () => alive && goSolo(),
        onDisconnect: () => {
          if (!alive || !providerRef.current) return;
          editorUIState.set({ ...editorUIState.get(), isConnected: false });
          // ponytail: the server keeps a room only while someone is connected. After a long drop
          // another editor may have reseeded it from the database, and merging our copy into that
          // would duplicate the text. So we stop rejoining and keep saving on our own instead.
          // A small window remains if someone opens the document during a short drop.
          clearTimeout(dropTimer);
          dropTimer = setTimeout(() => {
            if (!alive || !providerRef.current) return;
            goSolo();
            showToast.error("Live editing disconnected", "Your changes still save. Reload to see others' edits.");
          }, COLLAB_REJOIN_WINDOW);
        },
      });
      providerRef.current = hp;
      // Hand it to the editor now (it is still empty), not on connect, which would rebuild an
      // editor that may already hold the document.
      setProvider(hp);
    } catch {
      goSolo();
    }
    return () => {
      alive = false;
      clearTimeout(connectTimer);
      clearTimeout(dropTimer);
      providerRef.current?.destroy();
      providerRef.current = null;
      setProvider(null);
      editorUIState.set({ ...editorUIState.get(), isConnected: false });
    };
  }, [documentId, getYDoc, goSolo]);

  const permissions = useDocumentPermissions(documentData);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: false,
        undoRedo: false,
        codeBlock: false,
        link: { openOnClick: false, autolink: true, linkOnPaste: true, defaultProtocol: "https" },
      }),
      CodeBlock,
      Highlight,
      Subscript,
      Superscript,
      Callout,
      InlineMath,
      BlockMath,
      Embed,
      Diagram,
      CustomHeading.configure({ levels: [1, 2, 3] }),
      TextStyle,
      FontSize,
      FontFamily,
      Color,
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
        defaultAlignment: "left",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Image.configure({ allowBase64: true }),
      ImageDrop,
      PageBreak,
      Placeholder.configure({ placeholder: "Start writing, or type / for blocks" }),
      SlashCommand,
      RedFlag,
      GreenFlag,
      TablePlus,
      TableRowPlus,
      TableCellPlus,
      TableHeaderPlus,
      Pagination.configure({
        getLayout: () => {
          const g = geometryRef.current;
          return { contentHeight: g.contentHeight, between: g.margins.bottom + g.gap + g.margins.top };
        },
        onPageCount: (n) => {
          setPages(n);
          editorUIState.set({ ...editorUIState.get(), totalPages: n });
        },
      }),
      CollaborationCaret.configure({
        provider,
        user: { id: userId, name: userName, color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}` },
      }),
      Collaboration.configure({ document: getYDoc() }),
      Find,
    ],
    [provider, userId, userName, getYDoc],
  );

  const debouncedSelectionUpdate = useMemo(
    () =>
      debounce(({ editor }: { editor: Editor }) => {
        const { from, to } = editor.state.selection;
        if (showCommentDialogRef.current) return;
        if (from !== to) {
          const selectedText = editor.state.doc.textBetween(from, to, "");
          if (selectedText.trim()) {
            editorActions.setSelectedText(selectedText);
            selectionRangeRef.current = { from, to, text: selectedText };
            setTimeout(() => {
              const domSelection = window.getSelection();
              if (domSelection && domSelection.rangeCount > 0 && !showCommentDialogRef.current) {
                const rect = domSelection.getRangeAt(0).getBoundingClientRect();
                setSelectionMenuPosition({ x: rect.left + rect.width / 2 - 150, y: rect.top - 60 });
                setShowSelectionMenu(true);
              }
            }, 100);
          }
        } else {
          editorActions.setSelectedText("");
          setShowSelectionMenu(false);
          selectionRangeRef.current = null;
        }
      }, 300),
    [],
  );

  // The editor only renders once the document is known on the client, so it can be created
  // synchronously in the first render instead of an extra commit later.
  const editor = useEditor(
    {
      immediatelyRender: true,
      shouldRerenderOnTransaction: false,
      autofocus: false,
      enableInputRules: true,
      enablePasteRules: true,
      extensions,
      editable: false,
      onSelectionUpdate: debouncedSelectionUpdate,
      onCreate: ({ editor }) => editorActions.setEditor(editor),
      editorProps: {
        attributes: { class: "paged focus:outline-none" },
      },
    },
    [extensions, debouncedSelectionUpdate],
  );

  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.setEditable(permissions.canEdit && !!documentData);
  }, [editor, permissions.canEdit, documentData]);

  // Initial content, before paint, outside undo history and without an "update" (no autosave on open).
  const loadedRef = useRef(false);
  const [contentReady, setContentReady] = useState(false);
  const initialContent = documentData?.pages?.[0]?.content;
  const canEdit = permissions.canEdit;
  useLayoutEffect(() => {
    if (!editor || editor.isDestroyed || loadedRef.current || !documentData) return;
    // Viewers read the stored copy only; live rooms are for editors.
    if (!canEdit && collab !== "solo") return goSolo();
    if (collab === "connecting") return;
    try {
      // In a live room someone already loaded the document: use the room's copy, never load it
      // a second time (the two copies would merge into duplicated text).
      // ponytail: two editors opening an empty room in the same instant can both load it.
      const roomHasContent = collab === "live" && getYDoc().getXmlFragment("default").length > 0;
      if (initialContent && !roomHasContent && editor.isEmpty) {
        editor.chain().setMeta("addToHistory", false).setContent(initialContent, { emitUpdate: false }).run();
      }
      // y-tiptap still records the initial load when the view mounts in the same commit, so Ctrl+Z
      // could empty the document (and autosave would store that). Start history after the load.
      const clearHistory = () => {
        if (!editor.isDestroyed) yUndoPluginKey.getState(editor.state)?.undoManager?.clear();
      };
      clearHistory();
      setTimeout(clearHistory, 0);
      loadedRef.current = true;
      setContentReady(true);
    } catch (error) {
      console.error("[Editor] Failed to set content:", error);
      showToast.error("Failed to load document content.");
    }
  }, [editor, documentData, initialContent, collab, canEdit, goSolo, getYDoc]);

  useEffect(() => {
    repaginate(editor?.isDestroyed ? null : editor?.view);
  }, [editor, geometry]);

  // Saving starts only once the stored content is in the editor, so an early unload can never
  // write an empty document over the real one.
  const { saveStatus, lastSaved, forceSave, errorMessage } = useCloudStoreSaver(
    contentReady && canEdit ? editor : null,
    documentId,
    documentData,
  );

  useWritingMemory(editor, documentId, contentReady, canEdit);

  useEffect(() => {
    editorActions.setSaveStatus(saveStatus, lastSaved, errorMessage);
  }, [saveStatus, lastSaved, errorMessage]);

  const handleCommentClick = useCallback(() => {
    setShowSelectionMenu(false);
    setShowCommentDialog(true);
    if (window.innerWidth >= 768) editorActions.setCommentsSidebarOpen(true);
  }, []);

  const handleCreateComment = useCallback(
    async (content: string) => {
      const range = selectionRangeRef.current;
      if (!range || !documentId || isCreatingComment) return;
      setIsCreatingComment(true);
      try {
        const commentId = await createComment({ documentId, content, range: { from: range.from, to: range.to } });
        if (commentId) {
          setShowCommentDialog(false);
          selectionRangeRef.current = null;
          setActiveCommentId(commentId);
          if (window.innerWidth >= 768) editorActions.setCommentsSidebarOpen(true);
        }
      } catch (error) {
        console.error("Failed to create comment:", error);
        showToast.error("Failed to create comment. Please try again.");
      } finally {
        setIsCreatingComment(false);
      }
    },
    [documentId, createComment, isCreatingComment],
  );

  const handleSidebarCommentClick = useCallback(
    (commentId: string) => {
      setActiveCommentId(commentId);
      const comment = getComment(commentId);
      if (!comment || !editor) return;
      setShowSelectionMenu(false);
      const navigateToComment = () => {
        if (!editor || editor.isDestroyed) return;
        try {
          const docSize = editor.state.doc.content.size;
          if (comment.range.from >= 0 && comment.range.to <= docSize && comment.range.from < comment.range.to) {
            editor.view.focus();
            editor.commands.setTextSelection({ from: comment.range.from, to: comment.range.to });
            editor.commands.scrollIntoView();
          }
        } catch (error) {
          console.warn("Error navigating to comment:", error);
          showToast.error("Failed to navigate to comment location.");
        }
      };
      navigateToComment();
      setTimeout(navigateToComment, 200);
      setTimeout(() => {
        if (window.innerWidth < 768) editorActions.setCommentsSidebarOpen(false);
      }, 250);
    },
    [getComment, editor],
  );

  const afterCommentChange = useCallback((ok: boolean, failMessage: string) => {
    if (!ok) {
      showToast.error(failMessage);
      return;
    }
    setActiveCommentId(null);
    selectionRangeRef.current = null;
    setShowCommentDialog(false);
    if (window.innerWidth < 768) editorActions.setCommentsSidebarOpen(false);
  }, []);

  const handleResolveComment = useCallback(
    async (commentId: string) => afterCommentChange(await resolveComment(commentId).catch(() => false), "Failed to resolve comment."),
    [resolveComment, afterCommentChange],
  );
  const handleDeleteComment = useCallback(
    async (commentId: string) => afterCommentChange(await deleteComment(commentId).catch(() => false), "Failed to delete comment."),
    [deleteComment, afterCommentChange],
  );
  const handleReply = useCallback((commentId: string, content: string) => addReply({ commentId, content }), [addReply]);

  const title = documentData?.title ?? "Document";
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === "s") {
        e.preventDefault();
        forceSave();
      } else if (key === "p") {
        e.preventDefault();
        printDocument(title);
      } else if (key === "/") {
        e.preventDefault();
        $shortcutsOpen.set(!$shortcutsOpen.get());
      }
    };
    const handlePrintEvent = () => printDocument(title);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("document-print-requested", handlePrintEvent);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("document-print-requested", handlePrintEvent);
    };
  }, [forceSave, title]);

  useEffect(() => {
    const handleFlagHover = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const flag = target.closest("[data-red-flag], [data-green-flag]") as HTMLElement | null;
      if (flag) {
        const rect = flag.getBoundingClientRect();
        setFlagTooltip({
          type: flag.hasAttribute("data-red-flag") ? "red" : "green",
          reason: flag.getAttribute("data-reason") || "",
          severity: flag.getAttribute("data-severity") || "medium",
          recommendation: flag.getAttribute("data-recommendation") || "",
          position: { x: rect.left, y: rect.bottom + 5 },
        });
      } else if (!target.closest("[data-flag-tooltip]")) {
        setFlagTooltip((t) => (t ? null : t));
      }
    };
    document.addEventListener("mouseover", handleFlagHover);
    return () => document.removeEventListener("mouseover", handleFlagHover);
  }, []);

  useEffect(() => {
    if (!showSelectionMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-selection-menu]") && !target.closest('[role="dialog"]')) setShowSelectionMenu(false);
    };
    const timeoutId = setTimeout(() => document.addEventListener("mousedown", handleClickOutside), 100);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSelectionMenu]);

  useEffect(
    () => () => {
      yDocRef.current?.destroy();
      yDocRef.current = null;
      editorActions.setEditor(null);
    },
    [],
  );

  const sideMargin = cn(
    "transition-[margin] duration-300 ease-in-out",
    isAIPanelOpen && isCommentsSidebarOpen ? "md:mr-[640px]" : isAIPanelOpen || isCommentsSidebarOpen ? "md:mr-80" : "md:mr-0",
  );

  // Sheets and slides share the documents collection; send them to their own app.
  const otherKind = documentData?.kind && documentData.kind !== "doc" ? documentData.kind : null;
  useEffect(() => {
    if (otherKind) router.replace(fileHref(documentId, otherKind));
  }, [otherKind, documentId, router]);

  useEffect(() => {
    if (access !== "denied") return;
    showToast.error("You do not have permission to access this document.");
    const t = setTimeout(() => {
      router.replace("/home");
    }, 2000);
    return () => clearTimeout(t);
  }, [access, router]);

  if (access === "loading") return <EditorSkeleton />;
  if (access !== "ok" || !documentData) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[13px] text-muted-foreground">
          {access === "denied" ? "You do not have permission to access this document" : "Document not found"}
        </p>
      </div>
    );
  }

  return (
    <Fragment>
      <div data-tour="editor-toolbar" className={cn("sticky top-0 z-10 shrink-0 bg-background editor-toolbar", sideMargin)}>
        <div className="flex h-11 items-center gap-1 px-2 md:px-3">
          <div className="min-w-0 flex-1 overflow-x-auto scrollbar-hidden">
            {permissions.canEdit ? (
              <EditorControls canEdit={permissions.canEdit} />
            ) : (
              <span className="px-2 text-[13px] text-muted-foreground">View only</span>
            )}
          </div>
          <CollaborationAvatars provider={provider} />
          <ToolbarSeparator className="hidden sm:block" />
          <Button
            data-tour="editor-ai"
            variant="ghost"
            onClick={() => editorActions.setAIPanelOpen(true)}
            aria-label="Ask AI"
            className={cn("shrink-0 gap-1.5 px-2.5 text-muted-foreground", isAIPanelOpen && "bg-accent text-foreground")}
          >
            <Sparkles />
            <span className="hidden sm:inline">Ask AI</span>
          </Button>
        </div>
      </div>

      <div className={cn("relative flex-1 overflow-auto bg-paper-canvas px-2 pt-4 pb-10 md:px-8", sideMargin)}>
        <Outline />
        <FindBar canEdit={permissions.canEdit} />
          <FocusMode />
        <PaperSheet geometry={geometry} pages={pages}>
          <EditorContent editor={editor} className="contents" />
        </PaperSheet>
      </div>

      <div className={cn("shrink-0 bg-background editor-status-bar", sideMargin)}>
        <EditorStatusBar />
      </div>

      <SelectionMenu
        isVisible={showSelectionMenu}
        position={selectionMenuPosition}
        onComment={handleCommentClick}
        onAskLexa={() => editorActions.setAIPanelOpen(true)}
      />

      <FlagTooltip flagTooltip={flagTooltip} onMouseLeave={() => setFlagTooltip(null)} />

      <Suspense fallback={null}>
        {mounted.ai && <EditorAIChatPanel />}
        {showCommentDialog && (
          <CommentDialog
            isOpen={showCommentDialog}
            selectedText={selectionRangeRef.current?.text || ""}
            onClose={() => {
              setShowCommentDialog(false);
              selectionRangeRef.current = null;
            }}
            onSubmit={handleCreateComment}
            isSubmitting={isCreatingComment}
          />
        )}
        {mounted.comments && (
          <CommentsSidebar
            comments={comments}
            isOpen={isCommentsSidebarOpen}
            onClose={() => editorActions.setCommentsSidebarOpen(false)}
            onCommentClick={handleSidebarCommentClick}
            onResolve={handleResolveComment}
            onDelete={handleDeleteComment}
            onEdit={updateComment}
            onReply={handleReply}
            currentUserId={currentUser?.id || ""}
            activeCommentId={activeCommentId}
          />
        )}
        <LazyDialogs documentId={documentId} canEdit={permissions.canEdit} />
      </Suspense>
    </Fragment>
  );
};

/** Page setup and shortcuts load the first time they are opened. */
function LazyDialogs({ documentId, canEdit }: { documentId: string; canEdit: boolean }) {
  const pageSetup = useStore($pageSetupOpen);
  const shortcuts = useStore($shortcutsOpen);
  const [seen, setSeen] = useState({ pageSetup: false, shortcuts: false });
  if ((pageSetup && !seen.pageSetup) || (shortcuts && !seen.shortcuts)) {
    setSeen({ pageSetup: seen.pageSetup || pageSetup, shortcuts: seen.shortcuts || shortcuts });
  }
  return (
    <>
      {seen.pageSetup && <PageSetup documentId={documentId} canEdit={canEdit} />}
      {seen.shortcuts && <ShortcutsDialog />}
    </>
  );
}

export default memo(DocumentEditor);
