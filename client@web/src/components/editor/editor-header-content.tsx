"use client";

import { useStore } from "@nanostores/react";
import type { Document } from "@shared-types";
import {
  Check,
  Clock,
  Lock,
  MessagesSquare,
  MoreVertical,
  PenTool,
  Share,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { useComments } from "@/hooks/use-comments";
import { useDocumentPermissions } from "@/hooks/use-document-permissions";
import { showToast } from "@/lib/toast";
import cloudStore from "@/lib/cloudstore";
import { cn } from "@/lib/utils";
import { $auth } from "@/state/auth";
import { editorActions, editorUIState } from "@/state/editor";
import { EditableTitle } from "./editable-title";
import { PrintButton } from "./print-button";
import { ShareDialog } from "./share-dialog";

interface EditorHeaderContentProps {
  documentId: string;
  onDocumentLoad?: (document: Document) => void;
}

export function EditorHeaderContent({
  documentId,
  onDocumentLoad,
}: EditorHeaderContentProps) {
  const { user: currentUser } = useStore($auth);
  const { updateDocument, duplicateDocument } = useCloudStore();
  const [documentData, setDocumentData] = useState<Document | null>(null);
  const [isSignaturePanelOpen, setIsSignaturePanelOpen] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const printButtonRef = useRef<HTMLButtonElement>(null);

  const editorUI = useStore(editorUIState);
  const isCommentsSidebarOpen = editorUI.isCommentsSidebarOpen;
  const saveStatus = editorUI.saveStatus;
  const lastSaved = editorUI.lastSaved;
  const errorMessage = editorUI.saveErrorMessage;
  const { comments } = useComments(documentId);

  // Load document from CloudStore
  useEffect(() => {
    if (!documentId || !currentUser) return;

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
              setDocumentData(doc);
              onDocumentLoad?.(doc);
              // Update page title when document data loads/updates
              document.title = `${doc.title} - DocFlow`;
            }
          },
        );
      } catch (error) {
        console.error("[EditorHeaderContent] Failed to watch document:", error);
      }
    };

    startWatching();

    return () => {
      if (watcher && typeof watcher.stop === "function") {
        watcher.stop();
      }
    };
  }, [documentId, currentUser, onDocumentLoad]);

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
      // Template selection would be handled by the Editor component
      // This is just a placeholder for the EditableTitle component
    },
    [],
  );

  const handleCopy = useCallback(async () => {
    if (!documentData) return;
    
    try {
      showToast.info("Creating a copy...");
      
      const newId = await duplicateDocument(documentData._id);
      if (newId) {
        // Open the copy in a new tab/window, keep the original in current tab
        window.open(`/document/${newId}`, '_blank');
        showToast.success("Copy created successfully!");
      } else {
        showToast.error("Failed to create copy");
      }
    } catch (error) {
      console.error("Failed to copy document:", error);
      showToast.error("Failed to create copy");
    }
  }, [documentData, duplicateDocument]);

  // Listen for copy, print, and star events from toolbar
  useEffect(() => {
    const handleCopyEvent = () => {
      handleCopy();
    };
    const handlePrintEvent = () => {
      printButtonRef.current?.click();
    };
    const handleStarEvent = async () => {
      if (!documentData) return;
      
      try {
        // Toggle the starred status
        const newStarredStatus = !documentData.isStarred;
        const success = await updateDocument(documentData._id, { 
          isStarred: newStarredStatus,
          updatedAt: new Date().toISOString()
        });
        
        if (success) {
          showToast.success(newStarredStatus ? "Added to starred" : "Removed from starred");
        } else {
          showToast.error("Failed to update document");
        }
      } catch (error) {
        console.error("Error updating starred status:", error);
        showToast.error("Failed to update document");
      }
    };
    
    window.addEventListener("document-copy-requested", handleCopyEvent);
    window.addEventListener("document-print-requested", handlePrintEvent);
    window.addEventListener("document-star-requested", handleStarEvent);
    return () => {
      window.removeEventListener("document-copy-requested", handleCopyEvent);
      window.removeEventListener("document-print-requested", handlePrintEvent);
      window.removeEventListener("document-star-requested", handleStarEvent);
    };
  }, [handleCopy, documentData, updateDocument]);

  if (!documentData) {
    return (
      <div className="flex items-center justify-between w-full">
        <div className="flex-shrink-0">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <>
      {/* Left: Document Title */}
      <div className="flex-shrink-0 max-w-md">
        <EditableTitle
          title={documentData.title}
          onTitleChange={handleTitleChange}
          documentId={documentData._id}
          onTemplateSelect={handleTemplateSelect}
          canRename={permissions.canRename && !isDocumentLocked}
        />
      </div>

      {/* Right: Save Status + Owner Label + Actions */}
      <div className="flex items-center gap-3">
        {/* Save Status Indicator */}
        {saveStatus && (
          <div className="flex items-center gap-2 text-sm">
            {saveStatus === "saving" && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs whitespace-nowrap">Saving...</span>
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
                      <span className="text-xs whitespace-nowrap">
                        Save failed
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{errorMessage || "Unknown error occurred"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}

        {/* Owner Label + Actions */}
        <div className="flex items-center gap-2">
          {/* Owner Role Badge */}
          {permissions?.accessLevel && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border cursor-help bg-transparent h-8",
                      permissions.accessLevel === "owner" &&
                        "text-purple-300 border-purple-500/50",
                      permissions.accessLevel === "editor" &&
                        "text-blue-300 border-blue-500/50",
                      permissions.accessLevel === "viewer" &&
                        "text-gray-300 border-gray-500/50",
                      permissions.accessLevel === "signer" &&
                        "text-signer/70 border-signer/50",
                    )}
                  >
                    <div
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        permissions.accessLevel === "owner" && "bg-purple-400",
                        permissions.accessLevel === "editor" && "bg-blue-400",
                        permissions.accessLevel === "viewer" && "bg-gray-400",
                        permissions.accessLevel === "signer" && "bg-signer/70",
                      )}
                    />
                    {permissions.accessLevel === "owner" && "Owner"}
                    {permissions.accessLevel === "editor" && "Editor"}
                    {permissions.accessLevel === "viewer" && "Viewer"}
                    {permissions.accessLevel === "signer" && "Signer"}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {permissions.accessLevel === "owner" &&
                      "Full access - Can edit, share, and delete"}
                    {permissions.accessLevel === "editor" &&
                      "Can edit and comment"}
                    {permissions.accessLevel === "viewer" &&
                      "Read-only access with commenting"}
                    {permissions.accessLevel === "signer" &&
                      "Can view and sign document"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Share Button */}
          {permissions?.canShare && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowShareDialog(true)}
              className="h-8 px-3"
            >
              <Share className="w-3.5 h-3.5 mr-1.5" />
              Share
            </Button>
          )}

          {/* Comments Toggle Button */}
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

          {/* Signatures Toggle Button - Only show for signers */}
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

          {/* Signature Status - Only show for documents with signature requests */}
          {documentData.signatureRequests &&
            documentData.signatureRequests.length > 0 &&
            (permissions?.accessLevel === "owner" ||
              permissions?.accessLevel === "editor") && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <div className="px-2 py-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Signature Status
                      </span>
                      <span className="text-xs font-medium">
                        {
                          documentData.signatureRequests.filter(
                            (req) => req.status === "signed",
                          ).length
                        }
                        /{documentData.signatureRequests.length}
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {documentData.signatureRequests.map((req) => (
                        <div
                          key={req.id}
                          className="flex items-center gap-2 text-xs"
                        >
                          {req.status === "signed" ? (
                            <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                          ) : (
                            <Clock className="h-3 w-3 text-neutral-400 flex-shrink-0" />
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
                    {documentData.signatureRequests.every(
                      (req) => req.status === "signed",
                    ) && (
                      <div className="flex items-center gap-1.5 mt-2 px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium">
                        <Lock className="h-3 w-3" />
                        <span>Document Locked</span>
                      </div>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
        </div>
      </div>

      {/* Share Dialog */}
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        document={documentData}
      />

      {/* Hidden PrintButton - accessed via ref by toolbar */}
      <div style={{ display: "none" }}>
        <PrintButton ref={printButtonRef} />
      </div>
    </>
  );
}
