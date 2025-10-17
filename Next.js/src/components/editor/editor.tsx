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
import { Lock, PenTool, X as XIcon } from "lucide-react";
import { nanoid } from "nanoid";
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
import { aiChatActions } from "@/state/ai-chat";
import { $auth } from "@/state/auth";
import { editorActions, editorUIState } from "@/state/editor";
import { AnalysisDialog } from "./analysis-dialog";
import { CollaborationAvatars } from "./collaboration-avatars";
import { CommentDialog } from "./comment-dialog";
import { CommentsSidebar } from "./comments/comments-sidebar";
import { EditorControls } from "./editor-controls";
import { CustomHeading } from "./extensions/custom-heading";
import { GreenFlag, RedFlag } from "./extensions/flag-mark";
import { FontFamily } from "./extensions/font-family";
import { SelectionMenu } from "./selection-menu";
import { SignaturePanel } from "./signature-panel";

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
  pageBreakBackground: "var(--color-neutral-200)",
  pageHeaderHeight: 0,
  pageFooterHeight: 0,
  footerRight: "",
  footerLeft: "",
  headerRight: "",
  headerLeft: "",
  marginTop: 72, // 1" margins (1" × 72pt)
  marginBottom: 72,
  marginLeft: 72,
  marginRight: 72,
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
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
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

  // Signature state
  const [isSignaturePanelOpen, setIsSignaturePanelOpen] = useState(false);
  const [placementMode, setPlacementMode] = useState(false);
  const [pendingSignatureDataUrl, setPendingSignatureDataUrl] = useState<
    string | null
  >(null);
  const [draggingSignatureId, setDraggingSignatureId] = useState<string | null>(
    null,
  );
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [tempSignaturePosition, setTempSignaturePosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

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

  // Check if user is a signer with pending signature request
  const userSignatureRequest = useMemo(() => {
    if (!documentData || !currentUser) return null;
    return documentData.signatureRequests?.find(
      (req) =>
        req.status === "pending" &&
        (req.userId === currentUser.id || req.email === currentUser.email),
    );
  }, [documentData, currentUser]);

  // Check if user has signed
  const hasUserSigned = useMemo(() => {
    if (!documentData || !currentUser) return false;
    return (
      documentData.signatures?.some(
        (sig) =>
          sig.signedBy.userId === currentUser?.id ||
          sig.signedBy.email === currentUser?.email,
      ) || false
    );
  }, [documentData?.signatures, currentUser, documentData]);

  // Check if document is locked (all signature requests completed)
  const isDocumentLocked = useMemo(() => {
    if (!documentData?.signatureRequests?.length) return false;
    return documentData.signatureRequests.every(
      (req) => req.status === "signed",
    );
  }, [documentData?.signatureRequests]);

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
      editable: permissions.canEdit && !isDocumentLocked,
      editorProps,
    },
    [provider?.isAttached, permissions.canEdit, isDocumentLocked],
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

  const handleExplainClick = useCallback(async () => {
    if (!selectionRange?.text || !editor) return;
    setShowSelectionMenu(false);

    const { from, to } = selectionRange;

    try {
      editorUIState.set({ ...editorUIState.get(), aiProcessing: "explaining" });

      const response = await fetch(
        "https://lexa-ai-983624625569.europe-west1.run.app/explain",
        {
          method: "POST",
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: selectionRange.text,
            explanation_type: "detailed",
            target_audience: "general",
          }),
        },
      );

      const data = await response.json();
      editor
        .chain()
        .focus()
        .deleteRange({ from, to })
        .insertContentAt(from, data.explanation)
        .run();
    } catch (error) {
      console.error("Failed to explain:", error);
    } finally {
      editorUIState.set({ ...editorUIState.get(), aiProcessing: null });
    }
  }, [selectionRange, editor]);

  const handleAskLexaClick = useCallback(() => {
    if (!selectionRange?.text) return;
    setShowSelectionMenu(false);
    editorActions.setAIPanelOpen(true);
    aiChatActions.setInputValue(selectionRange.text);
  }, [selectionRange]);

  const handleSummarizeClick = useCallback(async () => {
    if (!selectionRange?.text || !editor) return;
    setShowSelectionMenu(false);

    const { from, to } = selectionRange;

    try {
      editorUIState.set({
        ...editorUIState.get(),
        aiProcessing: "summarizing",
      });

      const response = await fetch(
        "https://lexa-ai-983624625569.europe-west1.run.app/summarize",
        {
          method: "POST",
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: selectionRange.text,
            summary_type: "general",
          }),
        },
      );

      const data = await response.json();
      editor
        .chain()
        .focus()
        .deleteRange({ from, to })
        .insertContentAt(from, data.summary)
        .run();
    } catch (error) {
      console.error("Failed to summarize:", error);
    } finally {
      editorUIState.set({ ...editorUIState.get(), aiProcessing: null });
    }
  }, [selectionRange, editor]);

  const handleAnalyzeClick = useCallback(async () => {
    if (!selectionRange?.text || !editor) return;
    setShowSelectionMenu(false);

    const { from, to } = selectionRange;

    try {
      editorUIState.set({ ...editorUIState.get(), aiProcessing: "analyzing" });

      const response = await fetch(
        "https://lexa-ai-983624625569.europe-west1.run.app/analyze-contract",
        {
          method: "POST",
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            html_content: selectionRange.text,
            perspective: "client",
            contract_type: "general",
          }),
        },
      );

      const data = await response.json();

      // Apply inline marks for flags
      const docText = editor.state.doc.textBetween(from, to, "");

      // Apply red flags
      if (data.red_flags?.length > 0) {
        data.red_flags.forEach((flag: any) => {
          const flagText = flag.flagged_text;
          const flagIndex = docText.indexOf(flagText);
          if (flagIndex !== -1) {
            const flagFrom = from + flagIndex;
            const flagTo = flagFrom + flagText.length;
            editor
              .chain()
              .focus()
              .setTextSelection({ from: flagFrom, to: flagTo })
              .setRedFlag({
                reason: flag.reason,
                severity: flag.severity,
                recommendation: flag.recommendation,
              })
              .run();
          }
        });
      }

      // Apply green flags
      if (data.green_flags?.length > 0) {
        data.green_flags.forEach((flag: any) => {
          const flagText = flag.flagged_text;
          const flagIndex = docText.indexOf(flagText);
          if (flagIndex !== -1) {
            const flagFrom = from + flagIndex;
            const flagTo = flagFrom + flagText.length;
            editor
              .chain()
              .focus()
              .setTextSelection({ from: flagFrom, to: flagTo })
              .setGreenFlag({
                reason: flag.reason,
                severity: flag.severity,
              })
              .run();
          }
        });
      }

      setAnalysisData(data);
      setShowAnalysisDialog(true);
    } catch (error) {
      console.error("Failed to analyze:", error);
    } finally {
      editorUIState.set({ ...editorUIState.get(), aiProcessing: null });
    }
  }, [selectionRange, editor]);

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

      if (comment && editor && editor.view) {
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

        // Hide selection menu before jumping to comment
        setShowSelectionMenu(false);

        // Focus editor and scroll to the comment range
        editor.view.focus();
        editor.commands.setTextSelection({
          from: comment.range.from,
          to: comment.range.to,
        });

        // Scroll into view
        editor.commands.scrollIntoView();
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
        }
      } catch (error) {
        console.error("Failed to resolve comment:", error);
      }
    },
    [resolveComment],
  );

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      try {
        const success = await deleteComment(commentId);
        if (success) {
          setActiveCommentId(null);
        }
      } catch (error) {
        console.error("Failed to delete comment:", error);
      }
    },
    [deleteComment],
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

  // Signature handlers
  const handlePlaceSignature = useCallback((dataUrl: string) => {
    setPendingSignatureDataUrl(dataUrl);
    setPlacementMode(true);
    setIsSignaturePanelOpen(false);
  }, []);

  const handleDocumentClick = useCallback(
    async (e: React.MouseEvent) => {
      if (
        !placementMode ||
        !pendingSignatureDataUrl ||
        !documentData ||
        !currentUser
      )
        return;

      e.preventDefault();
      e.stopPropagation();

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const newSignature = {
        id: nanoid(),
        dataUrl: pendingSignatureDataUrl,
        position: {
          x: Math.max(0, x - 100),
          y: Math.max(0, y - 50),
          width: 200,
          height: 100,
        },
        signedBy: {
          userId: currentUser.id,
          name: currentUser.displayName || currentUser.email || "Anonymous",
          email: currentUser.email ?? undefined,
        },
        signedAt: new Date(),
        status: "placed" as const,
      };

      const updatedSignatures = [
        ...(documentData.signatures || []),
        newSignature,
      ];

      // Update signature request status if user is a signer
      const updatedSignatureRequests = documentData.signatureRequests?.map(
        (req) =>
          req.status === "pending" &&
          (req.userId === currentUser.id || req.email === currentUser.email)
            ? { ...req, status: "signed" as const }
            : req,
      );

      const success = await updateDocument(documentData._id, {
        signatures: updatedSignatures,
        signatureRequests: updatedSignatureRequests,
      });

      if (success) {
        setPlacementMode(false);
        setPendingSignatureDataUrl(null);
      }
    },
    [
      placementMode,
      pendingSignatureDataUrl,
      documentData,
      currentUser,
      updateDocument,
    ],
  );

  const handleRemoveSignature = useCallback(
    async (signatureId: string) => {
      if (!documentData || !currentUser) return;

      const removedSignature = documentData.signatures?.find(
        (sig) => sig.id === signatureId,
      );
      if (!removedSignature) return;

      const updatedSignatures =
        documentData.signatures?.filter((sig) => sig.id !== signatureId) || [];

      // If user is removing their own signature and has a signature request, revert it to pending
      const isOwnSignature =
        removedSignature.signedBy.userId === currentUser.id ||
        removedSignature.signedBy.email === currentUser.email;

      const updatedSignatureRequests = isOwnSignature
        ? documentData.signatureRequests?.map((req) =>
            req.status === "signed" &&
            (req.userId === currentUser.id || req.email === currentUser.email)
              ? { ...req, status: "pending" as const }
              : req,
          )
        : documentData.signatureRequests;

      await updateDocument(documentData._id, {
        signatures: updatedSignatures,
        signatureRequests: updatedSignatureRequests,
      });
    },
    [documentData, currentUser, updateDocument],
  );

  // Signature drag handlers
  const handleSignatureDragStart = useCallback(
    (e: React.MouseEvent, signatureId: string) => {
      e.preventDefault();
      e.stopPropagation();

      const signature = documentData?.signatures?.find(
        (s) => s.id === signatureId,
      );
      if (!signature || !editorContainerRef.current) return;

      setDraggingSignatureId(signatureId);

      // Get exact click position within the signature
      const sigElement = e.currentTarget as HTMLElement;
      const sigRect = sigElement.getBoundingClientRect();
      const _containerRect = editorContainerRef.current.getBoundingClientRect();

      // Calculate offset from signature's top-left corner
      const offsetX = e.clientX - sigRect.left;
      const offsetY = e.clientY - sigRect.top;

      setDragOffset({ x: offsetX, y: offsetY });

      // Set initial temp position
      setTempSignaturePosition({
        x: signature.position.x,
        y: signature.position.y,
      });

      // Set grabbing cursor globally
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
    },
    [documentData],
  );

  const handleSignatureDrag = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingSignatureId || !editorContainerRef.current) return;

      e.preventDefault();

      const signature = documentData?.signatures?.find(
        (s) => s.id === draggingSignatureId,
      );
      if (!signature) return;

      const container = editorContainerRef.current;
      const containerRect = container.getBoundingClientRect();
      const scrollTop = container.scrollTop;

      // Calculate position relative to container + scroll
      let x = e.clientX - containerRect.left - dragOffset.x;
      let y = e.clientY - containerRect.top + scrollTop - dragOffset.y;

      // Get max bounds (allow full document height)
      const maxWidth = containerRect.width;
      const maxHeight = container.scrollHeight;

      // Constrain within bounds
      x = Math.max(0, Math.min(x, maxWidth - signature.position.width));
      y = Math.max(0, Math.min(y, maxHeight - signature.position.height));

      // Update temp position for smooth rendering
      setTempSignaturePosition({ x, y });

      // Auto-scroll when near edges
      const scrollZone = 50;
      const scrollSpeed = 10;
      const mouseY = e.clientY - containerRect.top;

      if (mouseY < scrollZone && scrollTop > 0) {
        // Scroll up
        container.scrollTop = Math.max(0, scrollTop - scrollSpeed);
      } else if (
        mouseY > containerRect.height - scrollZone &&
        scrollTop < maxHeight - containerRect.height
      ) {
        // Scroll down
        container.scrollTop = Math.min(
          maxHeight - containerRect.height,
          scrollTop + scrollSpeed,
        );
      }
    },
    [draggingSignatureId, dragOffset, documentData],
  );

  const handleSignatureDragEnd = useCallback(
    async (e: React.MouseEvent) => {
      if (!draggingSignatureId || !documentData || !editorContainerRef.current)
        return;

      e.preventDefault();

      const signature = documentData.signatures?.find(
        (s) => s.id === draggingSignatureId,
      );
      if (!signature || !tempSignaturePosition) {
        setDraggingSignatureId(null);
        setDragOffset({ x: 0, y: 0 });
        setTempSignaturePosition(null);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        return;
      }

      // Use the temp position as final position
      const updatedSignatures =
        documentData.signatures?.map((sig) =>
          sig.id === draggingSignatureId
            ? {
                ...sig,
                position: {
                  ...sig.position,
                  x: Math.round(tempSignaturePosition.x),
                  y: Math.round(tempSignaturePosition.y),
                },
              }
            : sig,
        ) || [];

      await updateDocument(documentData._id, {
        signatures: updatedSignatures,
      });

      // Reset cursor and state
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      setDraggingSignatureId(null);
      setDragOffset({ x: 0, y: 0 });
      setTempSignaturePosition(null);
    },
    [draggingSignatureId, tempSignaturePosition, documentData, updateDocument],
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

  // Cancel drag helper
  const cancelDrag = useCallback(() => {
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    setDraggingSignatureId(null);
    setDragOffset({ x: 0, y: 0 });
    setTempSignaturePosition(null);
  }, []);

  // Cleanup signature drag on escape key or right-click
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.key === "Escape" && draggingSignatureId) {
        cancelDrag();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (draggingSignatureId) {
        e.preventDefault();
        cancelDrag();
      }
    };

    document.addEventListener("keydown", handleKeyboard);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("keydown", handleKeyboard);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [draggingSignatureId, cancelDrag]);

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
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
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
      {/* Editor Toolbar - Original Layout (Formatting Only) */}
      <div className="sticky top-0 z-[10] bg-background/10 backdrop-blur-sm shadow-sm">
        <div
          className={cn(
            "transition-all duration-300 ease-in-out",
            isAIPanelOpen && isCommentsSidebarOpen
              ? "mr-[640px]"
              : isAIPanelOpen
                ? "mr-80"
                : isCommentsSidebarOpen
                  ? "mr-80"
                  : "mr-0",
          )}
        >
          <div className="flex items-center w-full px-4 py-2 gap-2">
            <div className="flex-1 min-w-0">
              {permissions.canEdit && !isDocumentLocked && (
                <Suspense
                  fallback={
                    <div className="h-12 bg-neutral-200 animate-pulse" />
                  }
                >
                  <EditorControls canEdit={permissions.canEdit} />
                </Suspense>
              )}
              {isDocumentLocked && (
                <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4" />
                  <span>Document is locked - All signatures collected</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Document Content Area */}
      <div
        ref={editorContainerRef}
        className={cn(
          "flex-1 overflow-y-auto p-8 transition-all duration-300 relative",
          isAIPanelOpen && isCommentsSidebarOpen
            ? "mr-[640px]"
            : isAIPanelOpen
              ? "mr-80"
              : isCommentsSidebarOpen
                ? "mr-80"
                : "mr-0",
          placementMode && "cursor-crosshair",
        )}
        onClick={handleDocumentClick}
      >
        {/* Placement mode overlay */}
        {placementMode && (
          <div className="absolute inset-0 bg-blue-500/10 z-[50] pointer-events-none">
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white p-3 rounded-lg shadow-lg pointer-events-auto">
              <p className="text-sm font-medium mb-2">
                Click anywhere to place signature
              </p>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  setPlacementMode(false);
                  setPendingSignatureDataUrl(null);
                }}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Dragging mode indicator */}
        {draggingSignatureId && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] pointer-events-none">
            <div className="bg-white px-4 py-2 rounded-lg shadow-lg border border-blue-500 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-900">
                  Moving signature
                </span>
              </div>
              <div className="h-4 w-px bg-gray-300"></div>
              <span className="text-xs text-gray-500">
                Right-click or ESC to cancel
              </span>
            </div>
          </div>
        )}

        <div
          className="max-w-4xl mx-auto relative"
          onMouseMove={handleSignatureDrag}
          onMouseUp={handleSignatureDragEnd}
          onMouseLeave={(e) => {
            if (draggingSignatureId) {
              handleSignatureDragEnd(e as any);
            }
          }}
        >
          {/* Placed signatures */}
          {documentData?.signatures?.map((signature) => {
            // Only the signer themselves can edit/remove their signature - not even the owner
            const canEditSignature =
              signature.signedBy.userId === currentUser?.id &&
              !isDocumentLocked;
            const isDragging = draggingSignatureId === signature.id;

            // Use temp position if dragging, otherwise use saved position
            const displayPosition =
              isDragging && tempSignaturePosition
                ? tempSignaturePosition
                : signature.position;

            return (
              <div
                key={signature.id}
                data-signature-id={signature.id}
                className={cn(
                  "absolute z-[40] group border-2 border-transparent hover:border-blue-500",
                  canEditSignature &&
                    "cursor-grab active:cursor-grabbing select-none",
                  isDragging && "opacity-70 shadow-2xl cursor-grabbing",
                )}
                style={{
                  left: displayPosition.x,
                  top: displayPosition.y,
                  width: signature.position.width,
                  height: signature.position.height,
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  transition: isDragging ? "none" : "border-color 0.2s",
                  willChange: isDragging ? "transform" : "auto",
                }}
                title={`Signed by ${signature.signedBy.name} on ${new Date(signature.signedAt).toLocaleString()}`}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={
                  canEditSignature
                    ? (e) => handleSignatureDragStart(e, signature.id)
                    : undefined
                }
              >
                <img
                  src={signature.dataUrl}
                  alt="Signature"
                  className="w-full h-full object-contain pointer-events-none"
                />
                {canEditSignature && (
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRemoveSignature(signature.id);
                    }}
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto z-10"
                  >
                    <XIcon className="w-3 h-3" />
                  </Button>
                )}
              </div>
            );
          })}

          <EditorContent editor={editor} className="w-full bg-white" />
        </div>
      </div>

      {/* Status Bar */}
      <div
        className={cn(
          "sticky bottom-0 bg-background/10 backdrop-blur-sm border-t transition-all duration-300",
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
          fallback={<div className="h-8 bg-neutral-100 animate-pulse" />}
        >
          <EditorStatusBar />
        </Suspense>
      </div>

      {/* AI Components */}
      {/* <Suspense fallback={null}>
        <AIFab />
      </Suspense> */}
      <Suspense fallback={null}>
        <EditorAIChatPanel />
      </Suspense>

      {/* Floating Sign Button for Signers */}
      {userSignatureRequest && !hasUserSigned && (
        <button
          onClick={() => setIsSignaturePanelOpen(true)}
          className={cn(
            "fixed bottom-24 z-50 bg-sidebar text-foreground",
            "rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105",
            "flex items-center gap-3 px-5 py-3 font-medium group",
            "border border-border",
            isAIPanelOpen && isCommentsSidebarOpen
              ? "right-[656px]"
              : isAIPanelOpen
                ? "right-[336px]"
                : isCommentsSidebarOpen
                  ? "right-[336px]"
                  : "right-6",
          )}
        >
          <PenTool className="w-5 h-5 group-hover:rotate-6 transition-transform" />
          <span className="text-sm">Sign Document</span>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border border-white"></div>
        </button>
      )}

      {/* Selection Menu - Show Ask Lexa & Comment for all, other features for editors only */}
      {/* <SelectionMenu
        isVisible={showSelectionMenu}
        position={selectionMenuPosition}
        onComment={handleCommentClick}
        onExplain={permissions.canEdit ? handleExplainClick : undefined}
        onAskLexa={handleAskLexaClick}
        onSummarize={permissions.canEdit ? handleSummarizeClick : undefined}
        onAnalyze={permissions.canEdit ? handleAnalyzeClick : undefined}
      /> */}

      {/* Analysis Dialog - Only for editors */}
      {permissions.canEdit && (
        <AnalysisDialog
          isOpen={showAnalysisDialog}
          onClose={() => setShowAnalysisDialog(false)}
          data={analysisData}
        />
      )}

      {/* Collaboration Avatars */}
      <CollaborationAvatars provider={provider} />

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
                    {flagTooltip.type === "red" ? "Red Flag" : "Green Flag"}
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

      {/* Signature Panel */}
      <SignaturePanel
        isOpen={isSignaturePanelOpen}
        onClose={() => setIsSignaturePanelOpen(false)}
        onPlaceSignature={handlePlaceSignature}
        document={documentData}
        signatureCount={documentData?.signatures?.length || 0}
        isSignatureRequest={!!userSignatureRequest}
      />
    </Fragment>
  );
};

export default DocumentEditor;
