import type { HocuspocusProvider } from "@hocuspocus/provider";
import { useStore } from "@nanostores/react";
import { debounce } from "@repo/shadcn-ui/lib/utils";
import type { Document } from "@shared-types";
import { Collaboration } from "@tiptap/extension-collaboration";
import Color from "@tiptap/extension-color";
import ListItem from "@tiptap/extension-list-item";
import TextAlign from "@tiptap/extension-text-align";
import { FontSize, TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { CheckCircle2, Flag, Lightbulb, Sparkles } from "lucide-react";
import { computed } from "nanostores";
import {
  Fragment,
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CollaborationCaret } from "tiptap-collaboration-caret-plus";
import {
  PaginationPlus,
  TableCellPlus,
  TableHeaderPlus,
  TablePlus,
  TableRowPlus,
} from "tiptap-pagination-plus";
import * as Y from "yjs";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { useCloudStoreSaver } from "@/hooks/use-cloudstore-saver";
import { useComments } from "@/hooks/use-comments";
import { useDocumentPermissions } from "@/hooks/use-document-permissions";
import cloudStore from "@/lib/cloudstore";
import { cn } from "@/lib/utils";
import { $auth } from "@/state/auth";
import { editorActions, editorUIState } from "@/state/editor";
import { CollaborationAvatars } from "./collaboration-avatars";
import { CommentDialog } from "./comment-dialog";
import { CommentsSidebar } from "./comments/comments-sidebar";
import { EditorControls, EditorStatusBar } from "./editor-controls";
import { CustomHeading } from "./extensions/custom-heading";
import { GreenFlag, RedFlag } from "./extensions/flag-mark";
import { FontFamily } from "./extensions/font-family";
import { EditorSkeleton } from "./editor-skeleton";
import { SelectionMenu } from "./selection-menu";
import { ToolbarSeparator } from "./toolbar-button";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/toast"; // Import showToast
import { EditorAIChatPanel } from "./editor-ai-chat-panel";

// Fixed pagination config to prevent memory leaks
const PAGINATION_CONFIG = {
  pageHeight: 842,
  pageGap: 20,
  pageGapBorderSize: 1,
  pageBreakBackground: "var(--paper-canvas)",
  pageHeaderHeight: 0,
  pageFooterHeight: 0,
  footerRight: "",
  footerLeft: "",
  headerRight: "",
  headerLeft: "",
  marginTop: 50,
  marginBottom: 50,
  marginLeft: 50,
  marginRight: 50,
  contentMarginTop: 0,
  contentMarginBottom: 0,
};

// Debug flag
const DEBUG = false;
const debug = (...args: any[]) => DEBUG && console.log("[Editor]", ...args);
const debugError = (...args: any[]) =>
  DEBUG && console.error("[Editor]", ...args);


// Memoized flag tooltip component
const FlagTooltip = memo(({ flagTooltip, onMouseLeave }: any) => {
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
        <Icon
          className={cn(
            "mt-0.5 size-4 shrink-0",
            isRed ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400",
          )}
        />
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

const DocumentEditor = ({
  documentId,
  hocusPocusHost = "http://localhost:4321",
  hideHeaderRow = false,
}: {
  documentId: string;
  hocusPocusHost: string;
  hideHeaderRow?: boolean;
}) => {
  // Use singleton YJS document
  const yDocRef = useRef<Y.Doc | null>(null);
  const getYDoc = useCallback(() => {
    if (!yDocRef.current) {
      yDocRef.current = new Y.Doc();
    }
    return yDocRef.current;
  }, []);

  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [documentData, setDocumentData] = useState<Document | null>(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(true);
  const [documentError, setDocumentError] = useState<string | null>(null);

  // Optimize state updates with refs for non-render-critical values
  const selectionRangeRef = useRef<{ from: number; to: number; text: string } | null>(null);
  const showCommentDialogRef = useRef(false);
  const [selectionMenuPosition, setSelectionMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showSelectionMenu, setShowSelectionMenu] = useState(false);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [isCreatingComment, setIsCreatingComment] = useState(false);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [flagTooltip, setFlagTooltip] = useState<any>(null);
  const editorContainerRef = useRef<HTMLDivElement | null>(null);

  // Keep ref in sync with state for use in callbacks
  useEffect(() => {
    showCommentDialogRef.current = showCommentDialog;
  }, [showCommentDialog]);

  // Use computed store values more efficiently
  const isCommentsSidebarOpen = useStore(
    useMemo(() => computed(editorUIState, (state) => state.isCommentsSidebarOpen), [])
  );
  const isAIPanelOpen = useStore(
    useMemo(() => computed(editorUIState, (state) => state.isAIPanelOpen), [])
  );

  const { user: currentUser } = useStore($auth);

  // Comments hook
  const {
    comments,
    isLoading: isLoadingComments,
    createComment,
    addReply,
    updateComment,
    resolveComment,
    deleteComment,
    getComment,
  } = useComments(documentId);

  // Initialize provider with cleanup
  useEffect(() => {
    let hp: HocuspocusProvider | null = null;
    let mounted = true;

    const initProvider = async () => {
      try {
        const { HocuspocusProvider } = await import("@hocuspocus/provider");
        if (!mounted) return;

        const yDoc = getYDoc();
        hp = new HocuspocusProvider({
          url: hocusPocusHost,
          name: documentId,
          onConnect: () => {
            if (!mounted) return;
            setProvider(hp);
            editorUIState.set({ ...editorUIState.get(), isConnected: true });
            debug("Provider connected");
          },
          onDisconnect: () => {
            if (!mounted) return;
            editorUIState.set({ ...editorUIState.get(), isConnected: false });
          },
          document: yDoc,
          onSynced: () => {
            if (!mounted) return;
            editorUIState.set({ ...editorUIState.get(), isConnected: true });
            debug("Provider synced");
          },
        });
      } catch (error) {
        debugError("Failed to initialize provider:", error);
        showToast.error("Failed to connect to document provider. Please try again later.");
      }
    };

    initProvider();

    return () => {
      mounted = false;
      if (hp) {
        editorUIState.set({ ...editorUIState.get(), isConnected: false });
        hp.destroy();
        setProvider(null);
      }
    };
  }, [documentId, hocusPocusHost, getYDoc]);

  // Optimize document loading with early return
  useEffect(() => {
    if (!documentId || !currentUser) return;

    let watcher: any = null;
    let mounted = true;

    const startWatching = async () => {
      try {
        setIsLoadingDocument(true);
        const documentsCollection = cloudStore.collection("documents");
        const query = cloudStore.query.where("id", "EQUAL", documentId);

        watcher = documentsCollection.watch(
          query,
          ({ collection: docs }: { collection: Document[] }) => {
            if (!mounted) return;
            
            const doc = docs?.[0];
            if (!doc) {
              setDocumentError("Document not found");
              setIsLoadingDocument(false);
              showToast.error("Document not found.");
              return;
            }

            // Check access
            const isOwner = doc.owner === currentUser.id;
            const isSharedWithUser = doc.sharing?.sharedWith?.some(
              (shared) =>
                shared.status === "active" &&
                (shared.userId === currentUser.id || shared.email === currentUser.email),
            );

            if (!isOwner && !isSharedWithUser) {
              setDocumentError("You do not have permission to access this document");
              setTimeout(() => window.location.href = "/home", 2000);
              showToast.error("You do not have permission to access this document.");
              return;
            }

            setDocumentData(doc);
            setDocumentError(null);
            setIsLoadingDocument(false);
          },
        );
      } catch (error) {
        if (mounted) {
          setDocumentError("Failed to load document");
          setIsLoadingDocument(false);
          showToast.error("Failed to load document. Please try again.");
        }
      }
    };

    startWatching();
    return () => {
      mounted = false;
      watcher?.destroy?.();
    };
  }, [documentId, currentUser]);

  const permissions = useDocumentPermissions(documentData);

  // Optimize editor configuration with stable references
  const extensions = useMemo(() => [
    StarterKit.configure({
      history: false,
      heading: false,
      undoRedo: false,
    }),
    CustomHeading.configure({ levels: [1, 2] }),
    Underline,
    TextStyle,
    FontSize,
    FontFamily,
    Color,
    ListItem,
    TextAlign.configure({
      types: ["heading", "paragraph"],
      alignments: ["left", "center", "right", "justify"],
      defaultAlignment: "left",
    }),
    RedFlag,
    GreenFlag,
    TablePlus,
    TableRowPlus,
    TableCellPlus,
    TableHeaderPlus,
    PaginationPlus.configure({
      ...PAGINATION_CONFIG,
      onPageCountChange: (t: number) =>
        editorUIState.set({ ...editorUIState.get(), totalPages: t }),
    }),
    CollaborationCaret.configure({
      provider: provider,
      user: {
        id: currentUser?.id || "anonymous",
        name: currentUser?.displayName || currentUser?.email || "Anonymous User",
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      },
    }),
    Collaboration.configure({
      document: getYDoc(),
    }),
  ], [provider, currentUser, getYDoc]);

  // Debounced selection handler
  const debouncedSelectionUpdate = useMemo(
    () => debounce(({ editor }: any) => {
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
              const range = domSelection.getRangeAt(0);
              const rect = range.getBoundingClientRect();
              setSelectionMenuPosition({
                x: rect.left + rect.width / 2 - 150,
                y: rect.top - 60,
              });
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
    []
  );

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    autofocus: true,
    enableInputRules: false,
    enablePasteRules: true,
    extensions,
    onSelectionUpdate: debouncedSelectionUpdate,
    onCreate: ({ editor }) => {
      editorActions.setEditor(editor);
      debug("Editor created");
    },
    onUpdate: ({ transaction }) => {
      if (!transaction.docChanged) return;
      // Comment range update logic here if needed
    },
    editable: permissions.canEdit,
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px]",
      },
    },
  }, [extensions, permissions.canEdit, debouncedSelectionUpdate]);

  // Load initial content
  useEffect(() => {
    if (!editor || !documentData?.pages?.[0]?.content) return;
    
    const content = documentData.pages[0].content;
    const currentText = editor.getText().trim();
    
    if (currentText.length === 0 || editor.getHTML() === "<p></p>") {
      setTimeout(() => {
        if (editor && !editor.isDestroyed && editor.view?.dom) {
          try {
            // Keep the initial load out of undo history, otherwise Ctrl+Z wipes the document.
            editor.chain().setMeta("addToHistory", false).setContent(content).run();
          } catch (error) {
            console.error("[Editor] Failed to set content:", error);
            showToast.error("Failed to load document content.");
          }
        }
      }, 500);
    }
  }, [editor, documentData?.pages]);

  // CloudStore saver
  const { saveStatus, lastSaved, forceSave, errorMessage } = useCloudStoreSaver(
    editor,
    documentId,
    documentData,
  );

  useEffect(() => {
    editorActions.setSaveStatus(saveStatus, lastSaved, errorMessage);
  }, [saveStatus, lastSaved, errorMessage]);

  // Optimized event handlers with useCallback
  const handleCommentClick = useCallback(() => {
    setShowSelectionMenu(false);
    setShowCommentDialog(true);
    // Only open sidebar on desktop, not on mobile
    if (window.innerWidth >= 768) {
      editorActions.setCommentsSidebarOpen(true);
    }
  }, []);

  const handleCreateComment = useCallback(
    async (content: string) => {
      const range = selectionRangeRef.current;
      if (!range || !documentId || isCreatingComment) return;

      setIsCreatingComment(true);
      try {
        const commentId = await createComment({
          documentId,
          content,
          range: { from: range.from, to: range.to },
        });

        if (commentId) {
          setShowCommentDialog(false);
          selectionRangeRef.current = null;
          setActiveCommentId(commentId);
          // Only open sidebar on desktop after creating comment
          if (window.innerWidth >= 768) {
            editorActions.setCommentsSidebarOpen(true);
          }
        }
      } catch (error) {
        console.error("Failed to create comment:", error);
        showToast.error("Failed to create comment. Please try again.");
      } finally {
        setIsCreatingComment(false);
      }
    },
    [documentId, createComment, isCreatingComment]
  );

  const handleSidebarCommentClick = useCallback(
    (commentId: string) => {
      setActiveCommentId(commentId);
      const comment = getComment(commentId);

      if (!comment || !editor) return;

      setShowSelectionMenu(false);

      // Navigate to comment with retry logic
      const navigateToComment = () => {
        if (!editor || editor.isDestroyed || !editor.view) return;

        try {
          const docSize = editor.state.doc.content.size;
          if (comment.range.from >= 0 && comment.range.to <= docSize && comment.range.from < comment.range.to) {
            editor.view.focus();
            editor.commands.setTextSelection({
              from: comment.range.from,
              to: comment.range.to,
            });
            editor.commands.scrollIntoView();
          }
        } catch (error) {
          console.warn("Error navigating to comment:", error);
          showToast.error("Failed to navigate to comment location.");
        }
      };

      navigateToComment();
      // Retry once if needed
      setTimeout(navigateToComment, 200);

      // Close sidebar on mobile after navigation
      setTimeout(() => {
        if (window.innerWidth < 768) {
          editorActions.setCommentsSidebarOpen(false);
        }
      }, 250);
    },
    [getComment, editor]
  );

  const handleResolveComment = useCallback(
    async (commentId: string) => {
      try {
        const success = await resolveComment(commentId);
        if (success) {
          setActiveCommentId(null);
          selectionRangeRef.current = null;
          setShowCommentDialog(false);
          // Close sidebar on mobile after resolving
          if (window.innerWidth < 768) {
            editorActions.setCommentsSidebarOpen(false);
          }
        } else {
          showToast.error("Failed to resolve comment.");
        }
      } catch (error) {
        console.error("Failed to resolve comment:", error);
        showToast.error("Failed to resolve comment. Please try again.");
      }
    },
    [resolveComment]
  );

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      try {
        const success = await deleteComment(commentId);
        if (success) {
          setActiveCommentId(null);
          selectionRangeRef.current = null;
          setShowCommentDialog(false);
          // Close sidebar on mobile after deleting
          if (window.innerWidth < 768) {
            editorActions.setCommentsSidebarOpen(false);
          }
        } else {
          showToast.error("Failed to delete comment.");
        }
      } catch (error) {
        console.error("Failed to delete comment:", error);
        showToast.error("Failed to delete comment. Please try again.");
      }
    },
    [deleteComment]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        forceSave();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [forceSave]);

  // Optimized flag hover handler
  useEffect(() => {
    const handleFlagHover = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const redFlag = target.closest("[data-red-flag]");
      const greenFlag = target.closest("[data-green-flag]");

      if (redFlag || greenFlag) {
        const elem = (redFlag || greenFlag) as HTMLElement;
        const rect = elem.getBoundingClientRect();
        setFlagTooltip({
          isOpen: true,
          type: redFlag ? "red" : "green",
          reason: elem.getAttribute("data-reason") || "",
          severity: elem.getAttribute("data-severity") || "medium",
          recommendation: elem.getAttribute("data-recommendation") || "",
          position: { x: rect.left, y: rect.bottom + 5 },
        });
      } else if (!target.closest("[data-flag-tooltip]")) {
        setFlagTooltip(null);
      }
    };

    document.addEventListener("mouseover", handleFlagHover);
    return () => document.removeEventListener("mouseover", handleFlagHover);
  }, []);

  // Click outside handler for selection menu
  useEffect(() => {
    if (!showSelectionMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-selection-menu]") && !target.closest('[role="dialog"]')) {
        setShowSelectionMenu(false);
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSelectionMenu]);

  // Cleanup
  useEffect(() => {
    return () => {
      const yDoc = yDocRef.current;
      if (yDoc) {
        yDoc.destroy();
        yDocRef.current = null;
      }
    };
  }, []);

  // Compute responsive margins - no margins on mobile, only on desktop
  const responsiveMargins = useMemo(() =>
    cn(
      "transition-all duration-300 ease-in-out",
      "md:transition-all md:duration-300",
      isAIPanelOpen && isCommentsSidebarOpen
        ? "md:mr-[640px]"
        : isAIPanelOpen
          ? "md:mr-80"
          : isCommentsSidebarOpen
            ? "md:mr-80"
            : "md:mr-0"
    ),
    [isAIPanelOpen, isCommentsSidebarOpen]
  );

  if (isLoadingDocument) {
    return <EditorSkeleton />;
  }

  if (documentError || !documentData) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">{documentError || "Document not found"}</p>
      </div>
    );
  }

  return (
    <Fragment>
      {/* Editor Toolbar */}
      <div
        data-tour="editor-toolbar"
        className={cn("sticky top-0 z-10 shrink-0 bg-background editor-toolbar", responsiveMargins)}
      >
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

      {/* Document canvas */}
      <div
        ref={editorContainerRef}
        className={cn("relative flex-1 overflow-y-auto bg-paper-canvas px-2 pt-3 pb-8 md:px-8", responsiveMargins)}
      >
        <div className="relative mx-auto max-w-4xl">
          <EditorContent
            editor={editor}
            className="editor-paper min-h-[calc(100vh-10rem)] w-full rounded-[2px] bg-paper text-paper-foreground shadow-paper"
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className={cn("shrink-0 bg-background editor-status-bar", responsiveMargins)}>
        <EditorStatusBar />
      </div>

      <Suspense fallback={null}>
        <EditorAIChatPanel />
      </Suspense>

      {/* Selection Menu */}
      <SelectionMenu
        isVisible={showSelectionMenu}
        position={selectionMenuPosition}
        onComment={handleCommentClick}
      />

      {/* Comment Dialog */}
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

      {/* Flag Tooltip */}
      <FlagTooltip 
        flagTooltip={flagTooltip} 
        onMouseLeave={() => setFlagTooltip(null)} 
      />

      {/* Comments Sidebar */}
      <CommentsSidebar
        comments={comments}
        isOpen={isCommentsSidebarOpen}
        onClose={() => editorActions.setCommentsSidebarOpen(false)}
        onCommentClick={handleSidebarCommentClick}
        onResolve={handleResolveComment}
        onDelete={handleDeleteComment}
        onEdit={updateComment}
        onReply={addReply}
        currentUserId={currentUser?.id || ""}
        activeCommentId={activeCommentId}
      />
    </Fragment>
  );
};

export default memo(DocumentEditor);