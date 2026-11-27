"use client";

import { useStore } from "@nanostores/react";
import type { ChainedCommands } from "@tiptap/core";
import {
  Check,
  Clock,
  Lock,
  MessagesSquare,
  MoreVertical,
  PenTool,
} from "lucide-react";
import { computed } from "nanostores";
import { useRouter } from "next/navigation";
import { type ReactNode, useMemo, useState } from "react";
import { AppHeader, pressShortcut } from "@/components/app-header/app-header";
import {
  type DocFormat,
  type DocInsert,
  docMenus,
} from "@/components/app-header/menus";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useComments } from "@/hooks/use-comments";
import { useDocumentPermissions } from "@/hooks/use-document-permissions";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { $auth } from "@/state/auth";
import { editorActions, editorInstance, editorUIState } from "@/state/editor";
import { useLiveDocument } from "./core/use-document-loader";
import { $pageSetupOpen, $shortcutsOpen } from "./dialogs-state";
import {
  copyDocumentAs,
  downloadDocument,
  printDocument,
} from "./document-actions";
import { SLASH_ITEMS } from "./extensions/slash-command";
import { $focusMode, toggleFocusMode } from "./focus-mode";
import { $outlineOpen, toggleOutline } from "./outline/outline-state";
import { $versionsOpen } from "./versions/version-history";

// Narrow subscriptions: editorUIState also carries word counts that change on every keystroke.
const $commentsOpen = computed(editorUIState, (s) => s.isCommentsSidebarOpen);
const $saveStatus = computed(editorUIState, (s) => s.saveStatus);
const $lastSaved = computed(editorUIState, (s) => s.lastSaved);
const $saveError = computed(editorUIState, (s) => s.saveErrorMessage);

const FORMAT: Record<DocFormat, (c: ChainedCommands) => ChainedCommands> = {
  bold: (c) => c.toggleBold(),
  italic: (c) => c.toggleItalic(),
  underline: (c) => c.toggleUnderline(),
  strike: (c) => c.toggleStrike(),
  highlight: (c) => c.toggleHighlight(),
  code: (c) => c.toggleCode(),
  superscript: (c) => c.toggleSuperscript(),
  subscript: (c) => c.toggleSubscript(),
  paragraph: (c) => c.setParagraph(),
  h1: (c) => c.toggleHeading({ level: 1 }),
  h2: (c) => c.toggleHeading({ level: 2 }),
  h3: (c) => c.toggleHeading({ level: 3 }),
  alignLeft: (c) => c.setTextAlign("left"),
  alignCenter: (c) => c.setTextAlign("center"),
  alignRight: (c) => c.setTextAlign("right"),
  alignJustify: (c) => c.setTextAlign("justify"),
  bulletList: (c) => c.toggleBulletList(),
  orderedList: (c) => c.toggleOrderedList(),
  taskList: (c) => c.toggleTaskList(),
  blockquote: (c) => c.toggleBlockquote(),
  codeBlock: (c) => c.toggleCodeBlock(),
  clear: (c) => c.unsetAllMarks().clearNodes(),
};

const liveEditor = () => {
  const e = editorInstance.get();
  return e && !e.isDestroyed ? e : null;
};

const canRun = (check: "undo" | "redo") => {
  try {
    return !!liveEditor()?.can()[check]();
  } catch {
    return false;
  }
};

function insertBlock(block: DocInsert) {
  const editor = liveEditor();
  const item = SLASH_ITEMS.find((i) => i.title === block);
  if (!editor || !item) return;
  const at = editor.state.selection.from;
  item.run(editor, { from: at, to: at });
}

function useDocFileActions(documentId: string) {
  const router = useRouter();

  const convertToSlides = async () => {
    const id = showToast.loading("Turning headings into slides");
    const { toast } = await import("sonner");
    try {
      const { convertDocToSlides } = await import(
        "@/lib/convert/doc-to-slides"
      );
      const slidesId = await convertDocToSlides(documentId);
      if (!slidesId) throw new Error("Could not create the presentation");
      showToast.success("Presentation created");
      router.push(`/slides/${slidesId}`);
    } catch (error) {
      showToast.error(
        "Conversion failed",
        error instanceof Error ? error.message : undefined,
      );
    } finally {
      toast.dismiss(id);
    }
  };

  return { convertToSlides };
}

export function EditorHeaderContent({ documentId }: { documentId: string }) {
  const { user: currentUser } = useStore($auth);
  const { document: documentData } = useLiveDocument(documentId);
  const [isSignaturePanelOpen, setIsSignaturePanelOpen] = useState(false);
  const commentsOpen = useStore($commentsOpen);
  const status = {
    state: useStore($saveStatus),
    lastSaved: useStore($lastSaved),
    error: useStore($saveError),
  };
  const { comments } = useComments(documentId);
  const permissions = useDocumentPermissions(documentData);
  const { convertToSlides } = useDocFileActions(documentId);

  const userSignatureRequest = useMemo(() => {
    if (!documentData || !currentUser) return null;
    return documentData.signatureRequests?.find(
      (req) =>
        req.status === "pending" &&
        (req.userId === currentUser.id || req.email === currentUser.email),
    );
  }, [documentData, currentUser]);

  const isDocumentLocked =
    !!documentData?.signatureRequests?.length &&
    documentData.signatureRequests.every((req) => req.status === "signed");

  const title = documentData?.title ?? "Document";
  const signatureRequests = documentData?.signatureRequests ?? [];
  const signedCount = signatureRequests.filter(
    (req) => req.status === "signed",
  ).length;
  const signatureCount = documentData?.signatures?.length ?? 0;
  const run = (fn: (c: ChainedCommands) => ChainedCommands) => {
    const editor = liveEditor();
    if (editor) fn(editor.chain().focus()).run();
  };

  return (
    <AppHeader
      kind="doc"
      doc={documentData}
      permissions={{
        ...permissions,
        canRename: permissions.canRename && !isDocumentLocked,
      }}
      status={status}
      note={isDocumentLocked ? "Locked for signing" : undefined}
      details={() => {
        const ui = editorUIState.get();
        return [
          ["Words", ui.wordCount.toLocaleString()],
          ["Characters", ui.characterCount.toLocaleString()],
        ];
      }}
      menus={(file) =>
        docMenus({
          ...file,
          hasEditor: !!liveEditor(),
          canUndo: canRun("undo"),
          canRedo: canRun("redo"),
          outlineOpen: $outlineOpen.get(),
          focusMode: $focusMode.get(),
          commentsOpen: $commentsOpen.get(),
          convertToSlides: () => void convertToSlides(),
          versionHistory: () => $versionsOpen.set(true),
          download: (kind) => void downloadDocument(kind, title),
          copyAs: (kind) => void copyDocumentAs(kind),
          pageSetup: () => $pageSetupOpen.set(true),
          print: () => void printDocument(title),
          undo: () => run((c) => c.undo()),
          redo: () => run((c) => c.redo()),
          selectAll: () => run((c) => c.selectAll()),
          find: () => pressShortcut("f", { ctrlKey: true }),
          replace: () => pressShortcut("h", { ctrlKey: true }),
          toggleOutline,
          toggleFocusMode,
          toggleComments: () =>
            editorActions.setCommentsSidebarOpen(!$commentsOpen.get()),
          insert: insertBlock,
          format: (f) => run(FORMAT[f]),
          shortcuts: () => $shortcutsOpen.set(true),
        })
      }
      actions={
        <>
          <CountButton
            label="Comments"
            icon={<MessagesSquare />}
            count={comments.length}
            active={commentsOpen}
            onClick={() => editorActions.setCommentsSidebarOpen(!commentsOpen)}
          />
          {userSignatureRequest && (
            <CountButton
              label="Signatures"
              icon={<PenTool />}
              count={signatureCount}
              active={isSignaturePanelOpen}
              onClick={() => setIsSignaturePanelOpen(!isSignaturePanelOpen)}
            />
          )}
          {signatureRequests.length > 0 &&
            (permissions.accessLevel === "owner" ||
              permissions.accessLevel === "editor") && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Signature status"
                    className="text-muted-foreground"
                  >
                    <MoreVertical />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <div className="p-2">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Signature status
                      </span>
                      <span className="text-xs font-medium tabular-nums">
                        {signedCount}/{signatureRequests.length}
                      </span>
                    </div>
                    <div className="max-h-32 space-y-1.5 overflow-y-auto">
                      {signatureRequests.map((req) => (
                        <div
                          key={req.id}
                          className="flex items-center gap-2 text-xs"
                        >
                          {req.status === "signed" ? (
                            <Check className="size-3 shrink-0 text-green-600 dark:text-green-400" />
                          ) : (
                            <Clock className="size-3 shrink-0 text-muted-foreground" />
                          )}
                          <span
                            className={
                              req.status === "signed"
                                ? "text-foreground"
                                : "text-muted-foreground"
                            }
                          >
                            {req.email}
                          </span>
                        </div>
                      ))}
                    </div>
                    {isDocumentLocked && (
                      <div className="mt-2 flex items-center gap-1.5 rounded-md bg-green-500/10 px-2 py-1 text-xs font-medium text-green-600 dark:text-green-400">
                        <Lock className="size-3" />
                        Document locked
                      </div>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
        </>
      }
    />
  );
}

function CountButton({
  label,
  icon,
  count,
  active,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip delayDuration={400}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          onClick={onClick}
          aria-label={`${label} (${count})`}
          aria-pressed={active}
          className={cn(
            "min-w-9 gap-1.5 rounded-full px-2.5 text-muted-foreground tabular-nums",
            active && "bg-app-soft text-app hover:bg-app-soft hover:text-app",
          )}
        >
          {icon}
          {count > 0 && <span className="text-[13px]">{count}</span>}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
