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
import { Lock, X as XIcon } from "lucide-react";
import { computed } from "nanostores";
import {
  Fragment,
  lazy,
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
import { Button } from "@/components/ui/button";
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
import { EditorControls } from "./editor-controls";
import { CustomHeading } from "./extensions/custom-heading";
import { GreenFlag, RedFlag } from "./extensions/flag-mark";
import { FontFamily } from "./extensions/font-family";
import { SelectionMenu } from "./selection-menu";

const EditorAIChatPanel = lazy(() =>
  import("./editor-ai-chat-panel").then((m) => ({
    default: m.EditorAIChatPanel,
  })),
);
const AIFab = lazy(() =>
  import("./ai-fab").then((m) => ({ default: m.AIFab })),
);
const EditorStatusBar = lazy(() =>
  import("./editor-controls").then((m) => ({ default: m.EditorStatusBar })),
);

// Fixed pagination config to prevent memory leaks
const PAGINATION_CONFIG = {
  pageHeight: 842, // Letter height (11" × 96dpi)
  pageGap: 20,
  pageGapBorderSize: 1,
  pageBreakBackground: "var(--color-neutral-900)",
  pageHeaderHeight: 0,
  pageFooterHeight: 0,
  footerRight: "",
  footerLeft: "",
  headerRight: "",
  headerLeft: "",
  marginTop: 50, //72, // 1" margins (1" × 72pt)
  marginBottom:  50 ,
  marginLeft: 50,
  marginRight: 50,
  contentMarginTop: 0,
  contentMarginBottom: 0,
};

// Debug flag - set to true for development debugging
const DEBUG = false;
const debug = (...args: any[]) => DEBUG && console.log("[Editor]", ...args);
const debugError = (...args: any[]) =>
  DEBUG && console.error("[Editor]", ...args);

const DocumentEditor = ({
  documentId,
  hocusPocusHost = "http://localhost:4321",
  hideHeaderRow = false,
}: {
  documentId: string;
  hocusPocusHost: string;
  hideHeaderRow?: boolean;
}) => {
  // Create YJS document per component instance to prevent memory leaks
  const yDocRef = useRef<Y.Doc | null>(null);
  if (!yDocRef.current) {
    yDocRef.current = new Y.Doc();
  }
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [documentData, setDocumentData] = useState<Document | null>(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(true);
  const [documentError, setDocumentError] = useState<string | null>(null);

  // Comments state
  const isCommentsSidebarOpen = useStore(
    computed(editorUIState, (state) => state.isCommentsSidebarOpen),
  );
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [selectionRange, setSelectionRange] = useState<{
    from: number;
    to: number;
    text: string;
  } | null>(null);
  const [selectionMenuPosition, setSelectionMenuPosition] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });
  const [showSelectionMenu, setShowSelectionMenu] = useState(false);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [isCreatingComment, setIsCreatingComment] = useState(false);
  const [flagTooltip, setFlagTooltip] = useState<{
    isOpen: boolean;
    type: "red" | "green";
    reason: string;
    severity: string;
    recommendation?: string;
    position: { x: number; y: number };
  } | null>(null);
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorContainerRef = useRef<HTMLDivElement | null>(null);


  // Subscribe to AI panel state for responsive layout
  const editorUI = useStore(editorUIState);
  const isAIPanelOpen = editorUI.isAIPanelOpen;

  const { user: currentUser } = useStore($auth);
  const { getDocument, updateDocument } = useCloudStore();

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
          document: yDocRef.current ?? undefined,
          onSynced: () => {
            if (!mounted) return;
            editorUIState.set({ ...editorUIState.get(), isConnected: true });
            debug("Provider synced");
          },
        });
      } catch (error) {
        debugError("Failed to initialize provider:", error);
      }
    };

    initProvider();

    return () => {
      mounted = false;
      if (hp) {
        try {
          // Update state before destroying to avoid React warnings
          editorUIState.set({ ...editorUIState.get(), isConnected: false });
          hp.destroy();
        } catch (error) {
          debugError("Error destroying provider:", error);
        } finally {
          setProvider(null);
        }
      }
    };
  }, [documentId, hocusPocusHost]);

  // Load document from CloudStore with real-time updates
  useEffect(() => {
    if (!documentId || !currentUser) return;

    setIsLoadingDocument(true);
    let watcher: any = null;

    const startWatching = async () => {
      try {
        const documentsCollection = cloudStore.collection("documents");
        const query = cloudStore.query.where("_id", "EQUAL", documentId);

        watcher = documentsCollection.watch(
          query,
          ({ collection: docs }: { collection: Document[] }) => {
            const doc = docs?.[0];

            if (doc) {
              // Check access: owner OR shared with user (active status only)
              const isOwner = doc.owner === currentUser.id;
              const isSharedWithUser = doc.sharing?.sharedWith?.some(
                (shared) =>
                  shared.status === "active" &&
                  (shared.userId === currentUser.id ||
                    shared.email === currentUser.email),
              );

              if (!isOwner && !isSharedWithUser) {
                setDocumentError(
                  "You do not have permission to access this document",
                );
                console.error(
                  "[Editor] Access denied for document:",
                  documentId,
                );
                setTimeout(() => {
                  window.location.href = "/home";
                }, 2000);
                return;
              }

              console.log("[Editor] CloudStore document loaded:", {
                title: doc.title,
                hasContent: !!doc.pages?.[0]?.content,
                contentType: typeof doc.pages?.[0]?.content,
                contentPreview:
                  typeof doc.pages?.[0]?.content === "string"
                    ? doc.pages[0].content.substring(0, 100)
                    : JSON.stringify(doc.pages?.[0]?.content).substring(0, 100),
              });

              setDocumentData(doc);
              debug("Document loaded/updated, access granted", {
                isOwner,
                isSharedWithUser,
                documentId,
                signatures: doc.signatures?.length || 0,
              });
            } else {
              setDocumentError("Document not found");
            }
            setIsLoadingDocument(false);
          },
        );
      } catch (error) {
        console.error("[Editor] Failed to watch document:", error);
        setDocumentError("Failed to load document");
        setIsLoadingDocument(false);
      }
    };

    startWatching();

    return () => {
      if (watcher && typeof watcher.stop === "function") {
        watcher.stop();
      }
    };
  }, [documentId, currentUser]);

  // Get document permissions
  const permissions = useDocumentPermissions(documentData);

  // Memoize editor props
  const editorProps = useMemo(
    () => ({
      attributes: {
        class:
          "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px]",
      },
    }),
    [],
  );

  const editor = useEditor(
    {
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      autofocus: true, // updated from "start" => true, to enable autofocus
      enableInputRules: false,
      enablePasteRules: true,
      extensions: [
        StarterKit.configure({
          // @ts-expect-error
          history: false,
          heading: false, // Disable default heading, we'll use CustomHeading
          undoRedo: false,
        }),
        CustomHeading.configure({
          levels: [1, 2],
        }),
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
            name:
              currentUser?.displayName ||
              currentUser?.email ||
              "Anonymous User",
            color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
          },
        }),
        Collaboration.configure({
          document: yDocRef.current,
        }),
      ],
      onSelectionUpdate: debounce(({ editor }) => {
        const { view, state } = editor;
        const { from, to } = view.state.selection;

        // Don't show menu if dialog is open
        if (showCommentDialog) return;

        if (from !== to) {
          const selectedText = state.doc.textBetween(from, to, "");
          if (selectedText.trim()) {
            editorActions.setSelectedText(selectedText);
            setSelectionRange({ from, to, text: selectedText });

            // Show menu after selection
            setTimeout(() => {
              const domSelection = window.getSelection();
              if (
                domSelection &&
                domSelection.rangeCount > 0 &&
                !showCommentDialog
              ) {
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
        }
      }, 300),
      onCreate: ({ editor }) => {
        editorActions.setEditor(editor);
        debug(
          "Editor created with extensions:",
          editor.extensionManager.extensions.map((e) => e.name),
        );
      },
      onUpdate: ({ editor, transaction }) => {
        // Update comment ranges when document changes
        if (!transaction.docChanged) return;

        const mapping = transaction.mapping;
        comments.forEach((comment) => {
          const newFrom = mapping.map(comment.range.from);
          const newTo = mapping.map(comment.range.to);

          if (newFrom !== comment.range.from || newTo !== comment.range.to) {
            updateComment(comment.id, comment.content).then(() => {
              // Update range in CloudStore
              const commentsCollection = cloudStore?.collection("comments");
              const query = cloudStore?.query.where("id", "EQUAL", comment.id);
              if (commentsCollection && query) {
                commentsCollection.update(query, {
                  range: { from: newFrom, to: newTo },
                });
              }
            });
          }
        });
      },
      editable: permissions.canEdit,
      editorProps,
    },
    [provider?.isAttached, permissions.canEdit],
  ); // Only recreate when provider changes, not documentData

  // Update collaboration user info when currentUser changes
  useEffect(() => {
    if (!provider || !currentUser) return;

    const userName =
      currentUser.displayName || currentUser.email || "Anonymous User";
    const userId = currentUser.id || "anonymous";

    // Update awareness with user info
    provider.setAwarenessField("user", {
      id: userId,
      name: userName,
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
    });

    debug("Updated collaboration user info:", { id: userId, name: userName });
  }, [provider, currentUser]);

  // Load initial content when editor and document are ready
  // Note: We load content even if provider isn't synced (for offline/solo editing)
  useEffect(() => {
    // Safety check: wait for editor to be fully ready
    if (!editor) {
      console.log("[Editor] Waiting for editor to initialize...");
      return;
    }

    const content = documentData?.pages?.[0]?.content;
    if (!content) return;

    // Check if editor is empty or has minimal content
    let currentContent: string;
    let currentText: string;

    try {
      currentContent = editor.getHTML();
      currentText = editor.getText().trim();
    } catch (_error) {
      console.log("[Editor] Editor not fully ready, skipping content load");
      return;
    }

    const isEmpty =
      currentText.length === 0 ||
      currentContent === "<p></p>" ||
      currentContent === "";

    if (isEmpty) {
      console.log("[Editor] Loading initial content from CloudStore", {
        contentLength: typeof content === "string" ? content.length : 0,
        providerSynced: provider?.isSynced,
      });
      // Use setTimeout to ensure view is fully mounted
      setTimeout(() => {
        // Check that editor is fully initialized following codebase patterns
        if (!editor || editor.isDestroyed) {
          console.log("[Editor] Editor destroyed, skipping content load");
          return;
        }

        // Additional check for view availability
        if (!editor.view || !editor.view.dom) {
          console.log(
            "[Editor] Editor view not ready yet, skipping content load",
          );
          return;
        }

        try {
          editor.commands.setContent(content);
          console.log("[Editor] Content loaded into editor successfully");
        } catch (error) {
          console.error("[Editor] Failed to set content:", error);
        }
      }, 500); // Longer delay to ensure editor DOM is fully ready
    } else {
      debug("Editor not empty, skipping CloudStore content load", {
        currentText: currentText.substring(0, 50),
      });
    }
  }, [editor, documentData?.pages?.[0]?.content, provider?.isSynced]);

  // Initialize CloudStore saver
  const { saveStatus, lastSaved, forceSave, errorMessage } = useCloudStoreSaver(
    editor,
    documentId,
    documentData,
  );

  // Sync save status to global state for header display
  useEffect(() => {
    editorActions.setSaveStatus(saveStatus, lastSaved, errorMessage);
  }, [saveStatus, lastSaved, errorMessage]);

  // Memoize title change handler
  const _handleTitleChange = useCallback((newTitle: string) => {
    setDocumentData((prev) => (prev ? { ...prev, title: newTitle } : null));
  }, []);

  // Handle template selection
  const _handleTemplateSelect = useCallback(
    (templateContent: string, templateTitle: string) => {
      // Check that editor is fully initialized following codebase patterns
      if (!editor || editor.isDestroyed) {
        console.warn("[Editor] Cannot apply template - editor destroyed");
        return;
      }

      // Additional check for view availability
      if (!editor.view || !editor.view.dom) {
        console.warn("[Editor] Cannot apply template - editor view not ready");
        return;
      }

      try {
        editor.commands.setContent(templateContent);
        debug("Template content applied to editor:", templateTitle);
      } catch (error) {
        console.error("[Editor] Failed to apply template content:", error);
      }
    },
    [editor],
  );

  // Selection menu handlers
  const handleCommentClick = useCallback(() => {
    setShowSelectionMenu(false);
    setShowCommentDialog(true);
    editorActions.setCommentsSidebarOpen(true);
  }, []);

  // Comment handlers
  const handleCreateComment = useCallback(
    async (content: string) => {
      if (!selectionRange || !documentId || isCreatingComment) return;

      setIsCreatingComment(true);

      try {
        const commentId = await createComment({
          documentId,
          content,
          range: { from: selectionRange.from, to: selectionRange.to },
        });

        if (commentId) {
          setShowCommentDialog(false);
          setSelectionRange(null);
          setActiveCommentId(commentId);
          editorActions.setCommentsSidebarOpen(true);
        }
      } catch (error) {
        console.error("Failed to create comment:", error);
      } finally {
        setIsCreatingComment(false);
      }
    },
    [selectionRange, documentId, createComment, isCreatingComment],
  );

  const handleSidebarCommentClick = useCallback(
    (commentId: string) => {
      setActiveCommentId(commentId);
      const comment = getComment(commentId);

      if (comment) {
        // Hide selection menu before jumping to comment
        setShowSelectionMenu(false);

        // Try immediate navigation if editor is ready
        if (editor && editor.view && !editor.isDestroyed) {
          try {
            // Validate comment range before navigating
            const docSize = editor.state.doc.content.size;
            const isValidRange =
              comment.range.from >= 0 &&
              comment.range.to <= docSize &&
              comment.range.from < comment.range.to;

            if (!isValidRange) {
              console.warn(
                "Comment has invalid range, skipping navigation:",
                comment.id,
              );
              return;
            }

            // Focus editor and scroll to the comment range
            editor.view.focus();
            editor.commands.setTextSelection({
              from: comment.range.from,
              to: comment.range.to,
            });

            // Scroll into view
            editor.commands.scrollIntoView();
          } catch (error) {
            console.warn("Error navigating to comment, will retry:", error);
            // If immediate navigation fails, try with delay
            setTimeout(() => {
              if (editor && editor.view && !editor.isDestroyed) {
                try {
                  const docSize = editor.state.doc.content.size;
                  const isValidRange =
                    comment.range.from >= 0 &&
                    comment.range.to <= docSize &&
                    comment.range.from < comment.range.to;

                  if (isValidRange) {
                    editor.view.focus();
                    editor.commands.setTextSelection({
                      from: comment.range.from,
                      to: comment.range.to,
                    });
                    editor.commands.scrollIntoView();
                  }
                } catch (retryError) {
                  console.error("Retry navigation also failed:", retryError);
                }
              }
            }, 200);
          }
        } else {
          // If editor isn't ready, set a timeout to try again
          // This handles the case where the editor is still initializing after page load
          setTimeout(() => {
            if (editor && editor.view && !editor.isDestroyed) {
              try {
                // Re-validate range after timeout
                const docSize = editor.state.doc.content.size;
                const isValidRange =
                  comment.range.from >= 0 &&
                  comment.range.to <= docSize &&
                  comment.range.from < comment.range.to;

                if (isValidRange) {
                  editor.view.focus();
                  editor.commands.setTextSelection({
                    from: comment.range.from,
                    to: comment.range.to,
                  });
                  editor.commands.scrollIntoView();
                }
              } catch (retryError) {
                console.error("Delayed navigation failed:", retryError);
              }
            }
          }, 200);
        }
      }
    },
    [getComment, editor],
  );

  const handleResolveComment = useCallback(
    async (commentId: string) => {
      try {
        const success = await resolveComment(commentId);
        if (success) {
          setActiveCommentId(null);
          // Reset selection menu if it was related to this comment
          setSelectionRange(null);
          setShowCommentDialog(false);
        }
      } catch (error) {
        console.error("Failed to resolve comment:", error);
        // Potentially show error to user
      }
    },
    [resolveComment, setSelectionRange, setShowCommentDialog],
  );

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      try {
        const success = await deleteComment(commentId);
        if (success) {
          setActiveCommentId(null);
          // Reset selection menu if it was related to this comment
          setSelectionRange(null);
          setShowCommentDialog(false);
        }
      } catch (error) {
        console.error("Failed to delete comment:", error);
        // Potentially show error to user
      }
    },
    [deleteComment, setSelectionRange, setShowCommentDialog],
  );

  const handleEditComment = useCallback(
    async (commentId: string, content: string) => {
      await updateComment(commentId, content);
    },
    [updateComment],
  );

  const handleReplyComment = useCallback(
    async (commentId: string, content: string) => {
      await addReply({ commentId, content });
    },
    [addReply],
  );

  // Add keyboard shortcut for manual save (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        forceSave();
        debug("Manual save triggered via Ctrl+S");
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [forceSave]);

  // Hover handler for flags
  useEffect(() => {
    const handleFlagHover = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Check if hovering over a flag
      const redFlag = target.closest("[data-red-flag]");
      const greenFlag = target.closest("[data-green-flag]");

      if (redFlag) {
        const reason = redFlag.getAttribute("data-reason") || "";
        const severity = redFlag.getAttribute("data-severity") || "medium";
        const recommendation =
          redFlag.getAttribute("data-recommendation") || "";
        const rect = redFlag.getBoundingClientRect();

        setFlagTooltip({
          isOpen: true,
          type: "red",
          reason,
          severity,
          recommendation,
          position: { x: rect.left, y: rect.bottom + 5 },
        });
      } else if (greenFlag) {
        const reason = greenFlag.getAttribute("data-reason") || "";
        const severity = greenFlag.getAttribute("data-severity") || "medium";
        const rect = greenFlag.getBoundingClientRect();

        setFlagTooltip({
          isOpen: true,
          type: "green",
          reason,
          severity,
          position: { x: rect.left, y: rect.bottom + 5 },
        });
      } else if (!target.closest("[data-flag-tooltip]")) {
        setFlagTooltip(null);
      }
    };

    document.addEventListener("mouseover", handleFlagHover);
    return () => document.removeEventListener("mouseover", handleFlagHover);
  }, []);

  // Click outside handler to close selection menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Don't close if clicking on the menu itself or dialog
      if (
        target.closest("[data-selection-menu]") ||
        target.closest('[role="dialog"]')
      ) {
        return;
      }

      setShowSelectionMenu(false);
    };

    if (showSelectionMenu) {
      // Use a slight delay to prevent immediate closing
      const timeoutId = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showSelectionMenu]);

  // Cleanup YJS document on unmount
  useEffect(() => {
    return () => {
      if (yDocRef.current) {
        yDocRef.current.destroy();
        yDocRef.current = null;
      }
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
      // Reset any drag state
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  // Show loading state while document is loading
  if (isLoadingDocument) {
    return (
      <Fragment>
        {/* Editor Toolbar Skeleton */}
        <div className="sticky top-0 bg-background z-[10] editor-toolbar border-b">
          <div className="flex items-center w-full px-4 gap-2 h-14">
            <div className="flex-1 min-w-0 overflow-x-auto">
              <div className="h-10 w-full bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>

        {/* Document Content Area Skeleton */}
        <div
          ref={editorContainerRef}
          className={cn(
            "flex-1 overflow-y-auto md:lg:p-8 p-2 transition-all bg-muted duration-300 relative",
            isAIPanelOpen && isCommentsSidebarOpen
              ? "mr-[640px]"
              : isAIPanelOpen
                ? "mr-80"
                : isCommentsSidebarOpen
                  ? "mr-80"
                  : "mr-0",
          )}
        >
          <div className="max-w-4xl mx-auto relative">
            <div className="bg-background w-full min-h-[calc(100vh-10rem)] rounded-lg p-2 md:lg:p-8">
              <div className="space-y-4">
                <div className="h-8 bg-muted/50 rounded w-3/4 animate-pulse"></div>
                <div className="h-6 bg-muted/50 rounded w-full animate-pulse"></div>
                <div className="h-6 bg-muted/50 rounded w-full animate-pulse"></div>
                <div className="h-6 bg-muted/50 rounded w-5/6 animate-pulse"></div>
                <div className="h-6 bg-muted/50 rounded w-4/6 animate-pulse"></div>
                <div className="h-6 bg-muted/50 rounded w-5/6 animate-pulse"></div>
                <div className="h-6 bg-muted/50 rounded w-full animate-pulse"></div>
                <div className="h-6 bg-muted/50 rounded w-2/3 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Bar Skeleton */}
        <div
          className={cn(
            "sticky bottom-0 editor-status-bar border-t transition-all duration-300",
            isAIPanelOpen && isCommentsSidebarOpen
              ? "mr-[640px]"
              : isAIPanelOpen
                ? "mr-80"
                : isCommentsSidebarOpen
                  ? "mr-80"
                  : "mr-0",
          )}
        >
          <div className="h-10 bg-muted animate-pulse rounded" />
        </div>

        {/* AI Components Skeletons */}
        <Suspense fallback={null}>
          <AIFab />
        </Suspense>
        <Suspense fallback={
          isAIPanelOpen ? (
            <div className="fixed right-0 top-0 h-full w-80 bg-background border-l z-50">
              <div className="flex flex-col h-full">
                <div className="p-4 border-b">
                  <div className="h-6 bg-muted animate-pulse rounded w-3/4"></div>
                </div>
                <div className="flex-1 p-4 space-y-4">
                  <div className="h-4 bg-muted animate-pulse rounded w-full"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-5/6"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-4/6"></div>
                  <div className="h-10 bg-muted animate-pulse rounded mt-4"></div>
                </div>
              </div>
            </div>
          ) : null
        }>
          <EditorAIChatPanel />
        </Suspense>

        {/* Selection Menu */}
        <SelectionMenu
          isVisible={showSelectionMenu}
          position={selectionMenuPosition}
          onComment={handleCommentClick}
        />

        {/* Collaboration Avatars with loading state */}
        <Suspense fallback={
          <div className="flex items-center gap-2 ml-4">
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse"></div>
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse"></div>
          </div>
        }>
          <CollaborationAvatars provider={provider} />
        </Suspense>

        {/* Comment Dialog */}
        <CommentDialog
          isOpen={showCommentDialog}
          selectedText={selectionRange?.text || ""}
          onClose={() => {
            setShowCommentDialog(false);
            setSelectionRange(null);
          }}
          onSubmit={handleCreateComment}
          isSubmitting={isCreatingComment}
        />

        {/* Comment Dialog */}
        <CommentDialog
          isOpen={showCommentDialog}
          selectedText={selectionRange?.text || ""}
          onClose={() => {
            setShowCommentDialog(false);
            setSelectionRange(null);
          }}
          onSubmit={handleCreateComment}
          isSubmitting={isCreatingComment}
        />

        {/* Comments Sidebar */}
        <CommentsSidebar
          comments={comments}
          isOpen={isCommentsSidebarOpen}
          onClose={() => editorActions.setCommentsSidebarOpen(false)}
          onCommentClick={handleSidebarCommentClick}
          onResolve={handleResolveComment}
          onDelete={handleDeleteComment}
          onEdit={handleEditComment}
          onReply={handleReplyComment}
          currentUserId={currentUser?.id || ""}
          activeCommentId={activeCommentId}
        />
      </Fragment>
    );
  }

  if (documentError || !documentData) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">
          {documentError || "Document not found"}
        </p>
      </div>
    );
  }

  return (
    <Fragment>
      {/* Editor Toolbar */}
      <div 
        className={cn(
          "sticky top-0 bg-background z-[10] editor-toolbar border-b transition-all duration-300 ease-in-out",
          isAIPanelOpen && isCommentsSidebarOpen
            ? "mr-[640px]"
            : isAIPanelOpen
              ? "mr-80"
              : isCommentsSidebarOpen
                ? "mr-80"
                : "mr-0",
        )}
      >
        <div className="flex items-center w-full px-4 gap-2 h-14">
          <div className="flex-1 min-w-0 overflow-x-auto">
            {permissions.canEdit && (
              <Suspense
                fallback={
                  <div className="h-10 w-full bg-muted animate-pulse rounded" />
                }
              >
                <div className="h-10 flex items-center">
                  <EditorControls canEdit={permissions.canEdit} />
                </div>
              </Suspense>
            )}
            {!permissions.canEdit && (
              <div className="h-10 flex items-center justify-center text-sm text-muted-foreground">
                View-only mode
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Content Area */}
      <div
        ref={editorContainerRef}
        className={cn(
          "flex-1 overflow-y-auto md:lg:p-8 p-2 transition-all bg-muted duration-300 ease-in-out relative",
          isAIPanelOpen && isCommentsSidebarOpen
            ? "mr-[640px]"
            : isAIPanelOpen
              ? "mr-80"
              : isCommentsSidebarOpen
                ? "mr-80"
                : "mr-0",
        )}
      >
        <div className="max-w-4xl mx-auto relative">
          <EditorContent editor={editor} className="bg-background w-full min-h-[calc(100vh-10rem)] editor-paper" />
        </div>
      </div>

      {/* Status Bar */}
      <div
        className={cn(
          "sticky bottom-0 editor-status-bar border-t transition-all duration-300 ease-in-out",
          isAIPanelOpen && isCommentsSidebarOpen
            ? "mr-[640px]"
            : isAIPanelOpen
              ? "mr-80"
              : isCommentsSidebarOpen
                ? "mr-80"
                : "mr-0",
        )}
      >
        <Suspense
          fallback={<div className="h-10 bg-background animate-pulse rounded" />}
        >
          <EditorStatusBar />
        </Suspense>
      </div>

      {/* AI Components */}
      <Suspense fallback={null}>
        <AIFab />
      </Suspense>
      <Suspense fallback={
        isAIPanelOpen ? (
          <div className="fixed right-0 top-0 h-full w-80 bg-background border-l z-50">
            <div className="flex flex-col h-full">
              <div className="p-4 border-b h-14 flex items-center">
                <div className="h-6 bg-muted animate-pulse rounded w-3/4"></div>
              </div>
              <div className="flex-1 p-4 space-y-4">
                <div className="h-4 bg-muted animate-pulse rounded w-full"></div>
                <div className="h-4 bg-muted animate-pulse rounded w-5/6"></div>
                <div className="h-4 bg-muted animate-pulse rounded w-4/6"></div>
                <div className="h-10 bg-muted animate-pulse rounded mt-4"></div>
              </div>
            </div>
          </div>
        ) : null
      }>
        <EditorAIChatPanel />
      </Suspense>

      {/* Selection Menu */}
      <SelectionMenu
        isVisible={showSelectionMenu}
        position={selectionMenuPosition}
        onComment={handleCommentClick}
      />

      {/* Collaboration Avatars with loading state */}
      <Suspense fallback={
        <div className="flex items-center gap-2 ml-4">
          <div className="w-8 h-8 rounded-full bg-muted animate-pulse"></div>
          <div className="w-8 h-8 rounded-full bg-muted animate-pulse"></div>
        </div>
      }>
        <CollaborationAvatars provider={provider} />
      </Suspense>

      {/* Comment Dialog */}
      <CommentDialog
        isOpen={showCommentDialog}
        selectedText={selectionRange?.text || ""}
        onClose={() => {
          setShowCommentDialog(false);
          setSelectionRange(null);
        }}
        onSubmit={handleCreateComment}
        isSubmitting={isCreatingComment}
      />

      {/* Flag Tooltip */}
      {flagTooltip && (
        <div
          data-flag-tooltip
          className="fixed z-50 bg-background border border-border shadow-lg rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: flagTooltip.position.x,
            top: flagTooltip.position.y,
            maxWidth: "320px",
          }}
          onMouseEnter={() => {}}
          onMouseLeave={() => setFlagTooltip(null)}
        >
          <div
            className={`p-3 ${flagTooltip.type === "red" ? "bg-red-50" : "bg-green-50"}`}
          >
            <div className="flex items-start gap-2">
              {flagTooltip.type === "red" ? (
                <span className="text-red-600 font-bold text-lg">🚩</span>
              ) : (
                <span className="text-green-600 font-bold text-lg">✅</span>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4
                    className={`font-semibold text-xs ${flagTooltip.type === "red" ? "text-red-900" : "text-green-900"}`}
                  >
                    {flagTooltip.type === "Red Flag" ? "Red Flag" : "Green Flag"}
                  </h4>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      flagTooltip.severity === "high"
                        ? "bg-red-200 text-red-800"
                        : flagTooltip.severity === "medium"
                          ? "bg-yellow-200 text-yellow-800"
                          : "bg-blue-200 text-blue-800"
                    }`}
                  >
                    {flagTooltip.severity}
                  </span>
                </div>
                <p
                  className={`text-xs leading-relaxed ${flagTooltip.type === "red" ? "text-red-800" : "text-green-800"}`}
                >
                  {flagTooltip.reason}
                </p>
                {flagTooltip.recommendation && flagTooltip.type === "red" && (
                  <div className="mt-2 pt-2 border-t border-red-200">
                    <p className="text-xs font-medium text-red-900 mb-0.5">
                      💡 Recommendation:
                    </p>
                    <p className="text-xs text-red-700 leading-relaxed">
                      {flagTooltip.recommendation}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comments Sidebar */}
      <CommentsSidebar
        comments={comments}
        isOpen={isCommentsSidebarOpen}
        onClose={() => editorActions.setCommentsSidebarOpen(false)}
        onCommentClick={handleSidebarCommentClick}
        onResolve={handleResolveComment}
        onDelete={handleDeleteComment}
        onEdit={handleEditComment}
        onReply={handleReplyComment}
        currentUserId={currentUser?.id || ""}
        activeCommentId={activeCommentId}
      />
    </Fragment>
  );
};

export default DocumentEditor;
