import type { Editor } from "@tiptap/react";
import { atom, computed } from "nanostores";
import { debounce } from "../lib/utils";

// Editor instance
export const editorInstance = atom<Editor | null>(null);

// AI prompt state
export const aiPromptState = atom({
  isOpen: false,
  prompt: "",
  isLoading: false,
  selectedText: "",
  position: { x: 0, y: 0 },
});

// Collaboration state
export const collaborationState = atom({
  isConnected: false,
  connectedUsers: [] as Array<{ name: string; color: string; id: string }>,
  documentId: "",
});

// Page settings state
export const pageSettingsState = atom({
  pageSize: "letter",
  orientation: "portrait",
  marginTop: 1,
  marginBottom: 1,
  marginLeft: 1,
  marginRight: 1,
  customWidth: 8.5,
  customHeight: 11,
});

// Editor UI state
export const editorUIState = atom({
  selectedText: "",
  isConnected: false,
  showToolbar: true,
  currentPage: 1,
  totalPages: 1,
  wordCount: 0,
  characterCount: 0,
  isAIPanelOpen: false,
  isAIBarOpen: false,
  showTableControls: false,
  isCommentsSidebarOpen: false,
  aiProcessing: null as "analyzing" | "explaining" | "summarizing" | null,
  saveStatus: "idle" as "idle" | "saving" | "saved" | "error",
  lastSaved: null as Date | null,
  saveErrorMessage: null as string | null,
});

// Editor format state for toolbar buttons
export const editorFormatState = atom({
  isBold: false,
  isItalic: false,
  isUnderline: false,
  isStrikethrough: false,
  isCode: false,
  isBulletList: false,
  isOrderedList: false,
  isBlockquote: false,
  isHeading1: false,
  isHeading2: false,
  isTable: false,
});

// Computed values
export const isEditorReady = computed(
  editorInstance,
  (editor) => editor !== null,
);
export const canUndo = computed(editorInstance, (editor) => {
  if (!editor || !editor.can) return false;
  try {
    return editor.can().undo();
  } catch {
    return false;
  }
});
export const canRedo = computed(editorInstance, (editor) => {
  if (!editor || !editor.can) return false;
  try {
    return editor.can().redo();
  } catch {
    return false;
  }
});
// Actions
export const editorActions = {
  // Editor management
  setEditor: (editor: Editor | null) => {
    editorInstance.set(editor);
    if (editor && !editor.isDestroyed) {
      // Wait for editor to be fully initialized before setting up listeners
      // Set up event listeners for format state updates
      editor.on(
        "transaction",
        debounce(() => {
          editorActions.updateFormatState();
          editorActions.updateCounts();
        }, 200),
      );
      // Initial state update
      editorActions.updateFormatState();
      editorActions.updateCounts();
    }
  },

  updateFormatState: () => {
    const editor = editorInstance.get();
    if (!editor || editor.isDestroyed || !editor.isActive) return;

    try {
      editorFormatState.set({
        isBold: editor.isActive("bold"),
        isItalic: editor.isActive("italic"),
        isUnderline: editor.isActive("underline"),
        isStrikethrough: editor.isActive("strike"),
        isCode: editor.isActive("code"),
        isBulletList: editor.isActive("bulletList"),
        isOrderedList: editor.isActive("orderedList"),
        isBlockquote: editor.isActive("blockquote"),
        isHeading1: editor.isActive("heading", { level: 1 }),
        isHeading2: editor.isActive("heading", { level: 2 }),
        isTable: editor.isActive("table"),
      });

      // Update table controls visibility
      const currentUI = editorUIState.get();
      editorUIState.set({
        ...currentUI,
        showTableControls: editor.isActive("table"),
      });
    } catch (error) {
      console.warn("Error updating format state:", error);
    }
  },

  updateCounts: () => {
    const editor = editorInstance.get();
    if (!editor || editor.isDestroyed || !editor.getText) return;

    try {
      const text = editor.getText();
      const wordCount = text
        .split(/\s+/)
        .filter((word) => word.length > 0).length;
      const characterCount = text.length;

      const currentUI = editorUIState.get();
      editorUIState.set({
        ...currentUI,
        wordCount,
        characterCount,
      });
    } catch (error) {
      console.warn("Error updating counts:", error);
    }
  },
  setSelectedText: (text: string) => {
    const currentUI = editorUIState.get();
    editorUIState.set({ ...currentUI, selectedText: text });
  },
  setAIBarOpen: (isOpen: boolean) => {
    const currentUI = editorUIState.get();
    editorUIState.set({
      ...currentUI,
      isAIBarOpen: isOpen,
      isAIPanelOpen: false,
    });
  },

  // AI Panel management
  setAIPanelOpen: (isOpen: boolean) => {
    const currentUI = editorUIState.get();
    editorUIState.set({
      ...currentUI,
      isAIPanelOpen: isOpen,
      isAIBarOpen: false,
      isCommentsSidebarOpen: isOpen ? false : currentUI.isCommentsSidebarOpen,
    });
  },

  toggleAIPanel: () => {
    const currentUI = editorUIState.get();
    editorActions.setAIPanelOpen(!currentUI.isAIPanelOpen);
  },

  // Editor commands
  toggleBold: () => {
    const editor = editorInstance.get();
    editor?.chain().focus().toggleBold().run();
  },

  toggleItalic: () => {
    const editor = editorInstance.get();
    editor?.chain().focus().toggleItalic().run();
  },

  toggleUnderline: () => {
    const editor = editorInstance.get();
    editor?.chain().focus().toggleUnderline().run();
  },

  toggleStrikethrough: () => {
    const editor = editorInstance.get();
    editor?.chain().focus().toggleStrike().run();
  },

  toggleCode: () => {
    const editor = editorInstance.get();
    editor?.chain().focus().toggleCode().run();
  },

  toggleBulletList: () => {
    const editor = editorInstance.get();
    editor?.chain().focus().toggleBulletList().run();
  },

  toggleOrderedList: () => {
    const editor = editorInstance.get();
    editor?.chain().focus().toggleOrderedList().run();
  },

  toggleBlockquote: () => {
    const editor = editorInstance.get();
    editor?.chain().focus().toggleBlockquote().run();
  },

  toggleHeading1: () => {
    const editor = editorInstance.get();
    editor?.chain().focus().toggleHeading({ level: 1 }).run();
  },

  toggleHeading2: () => {
    const editor = editorInstance.get();
    editor?.chain().focus().toggleHeading({ level: 2 }).run();
  },

  setParagraph: () => {
    const editor = editorInstance.get();
    editor?.chain().focus().setParagraph().run();
  },

  setHeading1: () => {
    const editor = editorInstance.get();
    editor?.chain().focus().setHeading({ level: 1 }).run();
  },

  setHeading2: () => {
    const editor = editorInstance.get();
    editor?.chain().focus().setHeading({ level: 2 }).run();
  },

  setSubtitle: () => {
    const editor = editorInstance.get();
    editor?.chain().focus().setHeading({ level: 2 }).run();
  },

  // Text alignment
  setTextAlign: (alignment: "left" | "center" | "right" | "justify") => {
    const editor = editorInstance.get();
    editor?.chain().focus().setTextAlign(alignment).run();
  },

  undo: () => {
    const editor = editorInstance.get();
    editor?.chain().focus().undo().run();
  },

  redo: () => {
    const editor = editorInstance.get();
    editor?.chain().focus().redo().run();
  },

  // Table commands
  insertTable: () => {
    const editor = editorInstance.get();
    editor
      ?.chain()
      .focus()
      .insertTable({ rows: 3, cols: 4, withHeaderRow: true })
      .run();
  },

  addColumnBefore: () => {
    const editor = editorInstance.get();
    editor?.chain().focus().addColumnBefore().run();
  },

  addColumnAfter: () => {
    const editor = editorInstance.get();
    editor?.chain().focus().addColumnAfter().run();
  },

  addRowBefore: () => {
    const editor = editorInstance.get();
    editor?.chain().focus().addRowBefore().run();
  },

  addRowAfter: () => {
    const editor = editorInstance.get();
    editor?.chain().focus().addRowAfter().run();
  },

  deleteTable: () => {
    const editor = editorInstance.get();
    editor?.chain().focus().deleteTable().run();
  },

  // Page settings
  updatePageSettings: (settings: Partial<typeof pageSettingsState.value>) => {
    const current = pageSettingsState.get();
    pageSettingsState.set({
      ...current,
      ...settings,
    });
  },

  // Comments sidebar
  setCommentsSidebarOpen: (isOpen: boolean) => {
    const current = editorUIState.get();
    editorUIState.set({
      ...current,
      isCommentsSidebarOpen: isOpen,
      isAIPanelOpen: isOpen ? false : current.isAIPanelOpen,
    });
  },

  // Save status management
  setSaveStatus: (
    status: "idle" | "saving" | "saved" | "error",
    lastSaved?: Date | null,
    errorMessage?: string | null,
  ) => {
    const current = editorUIState.get();
    editorUIState.set({
      ...current,
      saveStatus: status,
      lastSaved: lastSaved !== undefined ? lastSaved : current.lastSaved,
      saveErrorMessage:
        errorMessage !== undefined ? errorMessage : current.saveErrorMessage,
    });
  },
};
