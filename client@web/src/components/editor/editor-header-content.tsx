"use client";

import { useStore } from "@nanostores/react";
import { Check, Clock, FileText, Lock, MessagesSquare, MoreVertical, PenTool, Star } from "lucide-react";
import { computed } from "nanostores";
import Link from "next/link";
import { lazy, type ReactNode, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { useComments } from "@/hooks/use-comments";
import { useDocumentPermissions } from "@/hooks/use-document-permissions";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { $auth } from "@/state/auth";
import { editorActions, editorUIState } from "@/state/editor";
import { useLiveDocument } from "./core/use-document-loader";
import { EditableTitle } from "./editable-title";
import { FileMenu } from "./file-menu";

const ShareDialog = lazy(() => import("./share-dialog").then((m) => ({ default: m.ShareDialog })));

// Narrow subscriptions: editorUIState also carries word counts that change on every keystroke.
// Primitive computed values only notify when they actually change.
const $commentsOpen = computed(editorUIState, (s) => s.isCommentsSidebarOpen);
const $saveStatus = computed(editorUIState, (s) => s.saveStatus);
const $lastSaved = computed(editorUIState, (s) => s.lastSaved);
const $saveError = computed(editorUIState, (s) => s.saveErrorMessage);

const noop = () => {};

export function EditorHeaderContent({ documentId }: { documentId: string }) {
  const { user: currentUser } = useStore($auth);
  const { updateDocument, duplicateDocument } = useCloudStore();
  const { document: documentData } = useLiveDocument(documentId);
  const [isSignaturePanelOpen, setIsSignaturePanelOpen] = useState(false);
  const [shareOpened, setShareOpened] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const ui = {
    comments: useStore($commentsOpen),
    saveStatus: useStore($saveStatus),
    lastSaved: useStore($lastSaved),
    error: useStore($saveError),
  };
  const { comments } = useComments(documentId);

  useEffect(() => {
    if (documentData?.title) document.title = `${documentData.title} - Docs`;
  }, [documentData?.title]);

  const permissions = useDocumentPermissions(documentData);

  const userSignatureRequest = useMemo(() => {
    if (!documentData || !currentUser) return null;
    return documentData.signatureRequests?.find(
      (req) => req.status === "pending" && (req.userId === currentUser.id || req.email === currentUser.email),
    );
  }, [documentData, currentUser]);

  const isDocumentLocked = useMemo(
    () => !!documentData?.signatureRequests?.length && documentData.signatureRequests.every((req) => req.status === "signed"),
    [documentData?.signatureRequests],
  );

  const handleCopy = useCallback(async () => {
    if (!documentData) return;
    try {
      showToast.info("Creating a copy...");
      const newId = await duplicateDocument(documentData.id);
      if (newId) {
        window.open(`/document/${newId}`, "_blank");
        showToast.success("Copy created");
      } else showToast.error("Failed to create copy");
    } catch (error) {
      console.error("Failed to copy document:", error);
      showToast.error("Failed to create copy");
    }
  }, [documentData, duplicateDocument]);

  const handleToggleStar = useCallback(async () => {
    if (!documentData) return;
    const starred = !documentData.isStarred;
    const ok = await updateDocument(documentData.id, { isStarred: starred, updatedAt: new Date().toISOString() }).catch(() => false);
    if (ok) showToast.success(starred ? "Added to starred" : "Removed from starred");
    else showToast.error("Failed to update document");
  }, [documentData, updateDocument]);

  useEffect(() => {
    window.addEventListener("document-copy-requested", handleCopy);
    window.addEventListener("document-star-requested", handleToggleStar);
    return () => {
      window.removeEventListener("document-copy-requested", handleCopy);
      window.removeEventListener("document-star-requested", handleToggleStar);
    };
  }, [handleCopy, handleToggleStar]);

  if (!documentData) {
    return (
      <div className="flex w-full items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="hidden size-8 sm:block" />
          <div className="h-5 w-48 rounded-sm bg-muted animate-pulse" />
        </div>
        <div className="h-8 w-20 rounded-md bg-muted animate-pulse" />
      </div>
    );
  }

  const access = permissions?.accessLevel ? ACCESS_LABELS[permissions.accessLevel] : null;
  const signatureRequests = documentData.signatureRequests ?? [];
  const signedCount = signatureRequests.filter((req) => req.status === "signed").length;
  const signatureCount = documentData.signatures?.length ?? 0;
  const openShare = () => {
    setShareOpened(true);
    setShowShareDialog(true);
  };

  return (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <Link
          href="/home"
          aria-label="Back to documents"
          className="hidden size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:flex"
        >
          <FileText className="size-[18px]" />
        </Link>
        <div className="min-w-0 max-w-[min(28rem,40vw)]">
          <EditableTitle
            title={documentData.title}
            onTitleChange={noop}
            documentId={documentData.id}
            canRename={permissions.canRename && !isDocumentLocked}
          />
        </div>
        <Tooltip delayDuration={400}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleStar}
              aria-label={documentData.isStarred ? "Remove from starred" : "Add to starred"}
              aria-pressed={!!documentData.isStarred}
              className="shrink-0 text-muted-foreground"
            >
              <Star className={cn(documentData.isStarred && "fill-current text-foreground")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{documentData.isStarred ? "Starred" : "Star"}</TooltipContent>
        </Tooltip>
        <FileMenu title={documentData.title} canEdit={permissions.canEdit} onCopy={handleCopy} />
        {access && (
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <span className="ml-1 hidden shrink-0 cursor-default items-center gap-1 text-xs text-muted-foreground md:inline-flex">
                {isDocumentLocked && <Lock className="size-3" />}
                {access.label}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">{access.hint}</TooltipContent>
          </Tooltip>
        )}
        <SaveStatus status={ui.saveStatus} lastSaved={ui.lastSaved} errorMessage={ui.error} />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <CountButton
          label="Comments"
          icon={<MessagesSquare />}
          count={comments.length}
          active={ui.comments}
          onClick={() => editorActions.setCommentsSidebarOpen(!ui.comments)}
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

        {signatureRequests.length > 0 && (permissions?.accessLevel === "owner" || permissions?.accessLevel === "editor") && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Signature status" className="text-muted-foreground">
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="p-2">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Signature status</span>
                  <span className="text-xs font-medium tabular-nums">
                    {signedCount}/{signatureRequests.length}
                  </span>
                </div>
                <div className="max-h-32 space-y-1.5 overflow-y-auto">
                  {signatureRequests.map((req) => (
                    <div key={req.id} className="flex items-center gap-2 text-xs">
                      {req.status === "signed" ? (
                        <Check className="size-3 shrink-0 text-green-600 dark:text-green-400" />
                      ) : (
                        <Clock className="size-3 shrink-0 text-muted-foreground" />
                      )}
                      <span className={req.status === "signed" ? "text-foreground" : "text-muted-foreground"}>{req.email}</span>
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

        {permissions?.canShare && (
          <Button data-tour="share-button" onClick={openShare} className="ml-1 px-3">
            <Lock className="hidden sm:block" />
            Share
          </Button>
        )}
      </div>

      {shareOpened && (
        <Suspense fallback={null}>
          <ShareDialog open={showShareDialog} onOpenChange={setShowShareDialog} document={documentData} />
        </Suspense>
      )}
    </>
  );
}

const ACCESS_LABELS: Record<string, { label: string; hint: string }> = {
  owner: { label: "Owner", hint: "Full access - can edit, share, and delete" },
  editor: { label: "Editor", hint: "Can edit and comment" },
  viewer: { label: "Viewer", hint: "Read-only access with commenting" },
  signer: { label: "Signer", hint: "Can view and sign document" },
};

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
          className={cn("min-w-8 gap-1.5 px-2 text-muted-foreground tabular-nums", active && "bg-accent text-foreground")}
        >
          {icon}
          {count > 0 && <span className="text-[13px]">{count}</span>}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

const statusClass = "ml-1 hidden shrink-0 items-center gap-1.5 text-xs sm:inline-flex";

function SaveStatus({
  status,
  lastSaved,
  errorMessage,
}: {
  status: "idle" | "saving" | "saved" | "error";
  lastSaved: Date | null;
  errorMessage: string | null;
}) {
  if (status === "error") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(statusClass, "cursor-help text-destructive")}>Save failed</span>
        </TooltipTrigger>
        <TooltipContent side="bottom">{errorMessage || "Unknown error occurred"}</TooltipContent>
      </Tooltip>
    );
  }
  if (status === "saving") return <span className={cn(statusClass, "text-muted-foreground")}>Saving...</span>;
  if (status === "saved") {
    const time = lastSaved?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return (
      <span className={cn(statusClass, "text-muted-foreground")} title={time ? `Last saved ${time}` : undefined}>
        Saved
      </span>
    );
  }
  return null;
}
