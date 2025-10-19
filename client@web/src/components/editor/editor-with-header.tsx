"use client";

import { useStore } from "@nanostores/react";
import type { Document } from "@shared-types";
import { MessagesSquare, PenTool } from "lucide-react";
import dynamic from "next/dynamic";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { useComments } from "@/hooks/use-comments";
import { useDocumentPermissions } from "@/hooks/use-document-permissions";
import cloudStore from "@/lib/cloudstore";
import { cn } from "@/lib/utils";
import { $auth } from "@/state/auth";
import { editorActions, editorUIState } from "@/state/editor";
import { DocumentHeader } from "./document-header";
import { EditableTitle } from "./editable-title";

const Editor = dynamic(() => import("./editor"), { ssr: false });

interface EditorWithHeaderProps {
  documentId: string;
  hocusPocusHost?: string;
  renderHeaderContent?: (props: {
    title: React.ReactNode;
    saveStatus: React.ReactNode;
    actions: React.ReactNode;
  }) => React.ReactNode;
}

export function EditorWithHeader({
  documentId,
  hocusPocusHost = "http://localhost:4321",
  renderHeaderContent,
}: EditorWithHeaderProps) {
  const { user: currentUser } = useStore($auth);
  const { getDocument, updateDocument } = useCloudStore();
  const [documentData, setDocumentData] = useState<Document | null>(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(true);
  const [saveStatus, _setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [lastSaved, _setLastSaved] = useState<Date | null>(null);
  const [errorMessage, _setErrorMessage] = useState<string | null>(null);
  const [isSignaturePanelOpen, setIsSignaturePanelOpen] = useState(false);

  const isCommentsSidebarOpen = useStore(editorUIState).isCommentsSidebarOpen;
  const { comments } = useComments(documentId);

  // Load document from CloudStore
  useEffect(() => {
    if (!documentId || !currentUser) return;

    setIsLoadingDocument(true);
    let watcher: any = null;

    const startWatching = async () => {
      try {
        const documentsCollection = cloudStore.collection("documents");
        const query = cloudStore.query.where("id", "EQUAL", documentId);

        watcher = documentsCollection.watch(
          query,
          ({ collection: docs }: { collection: Document[] }) => {
            const doc = docs?.[0];
            if (doc) {
              const isOwner = doc.owner === currentUser.id;
              const isSharedWithUser = doc.sharing?.sharedWith?.some(
                (shared) =>
                  shared.status === "active" &&
                  (shared.userId === currentUser.id ||
                    shared.email === currentUser.email),
              );

              if (isOwner || isSharedWithUser) {
                setDocumentData(doc);
              }
            }
            setIsLoadingDocument(false);
          },
        );
      } catch (error) {
        console.error("[EditorWithHeader] Failed to watch document:", error);
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

  const permissions = useDocumentPermissions(documentData);

  const userSignatureRequest = useMemo(() => {
    if (!documentData || !currentUser) return null;
    return documentData.signatureRequests?.find(
      (req) =>
        req.status === "pending" &&
        (req.userId === currentUser.id || req.email === currentUser.email),
    );
  }, [documentData, currentUser]);

  const isDocumentLocked = useMemo(() => {
    if (!documentData?.signatureRequests?.length) return false;
    return documentData.signatureRequests.every(
      (req) => req.status === "signed",
    );
  }, [documentData?.signatureRequests]);

  const handleTitleChange = useCallback((newTitle: string) => {
    setDocumentData((prev) => (prev ? { ...prev, title: newTitle } : null));
  }, []);

  const handleTemplateSelect = useCallback(
    (_templateContent: string, _templateTitle: string) => {
      // Will be handled by Editor component
    },
    [],
  );

  if (isLoadingDocument || !documentData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  // Title Row Content (to be rendered in SiteHeader)
  const titleContent = (
    <div className="flex-shrink-0 max-w-md">
      <EditableTitle
        title={documentData.title}
        onTitleChange={handleTitleChange}
        documentId={documentData._id}
        onTemplateSelect={handleTemplateSelect}
        canRename={permissions.canRename && !isDocumentLocked}
      />
    </div>
  );

  // Save Status Content
  const saveStatusContent = (
    <div className="flex items-center gap-2 text-sm">
      {saveStatus === "saving" && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs">Saving...</span>
        </div>
      )}
      {saveStatus === "saved" && lastSaved && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-xs whitespace-nowrap">
            Last saved:{" "}
            {lastSaved.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      )}
      {saveStatus === "error" && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 text-destructive cursor-help">
                <div className="w-2 h-2 bg-destructive rounded-full"></div>
                <span className="text-xs">Save failed</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{errorMessage || "Unknown error occurred"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );

  // Actions Content
  const actionsContent = (
    <div className="flex items-center gap-3">
      {/* Comments Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          editorActions.setCommentsSidebarOpen(!isCommentsSidebarOpen)
        }
        className={cn(
          "relative h-8 w-8 p-0",
          isCommentsSidebarOpen && "bg-accent",
        )}
      >
        <MessagesSquare className="w-4 h-4" />
        {comments.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {comments.length}
          </span>
        )}
      </Button>

      {/* Signatures Toggle (only for signers) */}
      {userSignatureRequest && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsSignaturePanelOpen(!isSignaturePanelOpen)}
          className={cn(
            "relative h-8 w-8 p-0",
            isSignaturePanelOpen && "bg-accent",
          )}
        >
          <PenTool className="w-4 h-4" />
          {(documentData?.signatures?.length || 0) > 0 && (
            <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {documentData?.signatures?.length}
            </span>
          )}
        </Button>
      )}

      {/* Document Header (Share, Role, Options) */}
      <DocumentHeader
        document={documentData}
        provider={null}
        currentUser={currentUser}
        onTitleChange={handleTitleChange}
        permissions={permissions}
        isDocumentLocked={isDocumentLocked}
      />
    </div>
  );

  // Render header content if provided
  if (renderHeaderContent) {
    renderHeaderContent({
      title: titleContent,
      saveStatus: saveStatusContent,
      actions: actionsContent,
    });
  }

  return (
    <Editor
      documentId={documentId}
      hocusPocusHost={hocusPocusHost}
      hideHeaderRow={!!renderHeaderContent} // Hide internal header if rendering in SiteHeader
    />
  );
}
