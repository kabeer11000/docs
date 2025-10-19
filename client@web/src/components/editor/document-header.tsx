import type { HocuspocusProvider } from "@hocuspocus/provider";
import { useStore } from "@nanostores/react";
import type { Document } from "@shared-types";
import {
  Check,
  Clock,
  Code,
  Copy,
  Download,
  FileText,
  Lock,
  MoreVertical,
  Quote,
  Share,
  Star,
} from "lucide-react";
import { computed } from "nanostores";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCloudStore } from "@/hooks/use-cloudstore";
import type { DocumentPermissions } from "@/hooks/use-document-permissions";
import type { Orientation, PageSettings, PageSizeId } from "@/lib/page-config";
import {
  editorActions,
  editorFormatState,
  editorInstance,
  pageSettingsState,
} from "@/state/editor";
import { PrintButton } from "./print-button";
import { ShareDialog } from "./share-dialog";

interface DocumentHeaderProps {
  document: Document;
  provider: HocuspocusProvider | null;
  currentUser?: any;
  onTitleChange?: (newTitle: string) => void;
  permissions?: DocumentPermissions;
  isDocumentLocked?: boolean;
}

export function DocumentHeader({
  document,
  provider,
  currentUser,
  onTitleChange,
  permissions,
  isDocumentLocked = false,
}: DocumentHeaderProps) {
  const formatState = useStore(computed(editorFormatState, (state) => state));
  const _editor = useStore(editorInstance);
  const pageSettings = useStore(pageSettingsState);
  const { updateDocument, duplicateDocument } = useCloudStore();

  const [showShareDialog, setShowShareDialog] = useState(false);
  const printButtonRef = useRef<HTMLButtonElement>(null);

  const _getCurrentPageSettings = (): PageSettings => ({
    pageSize: pageSettings.pageSize as PageSizeId,
    orientation: pageSettings.orientation as Orientation,
    margins: {
      top: pageSettings.marginTop,
      right: pageSettings.marginRight,
      bottom: pageSettings.marginBottom,
      left: pageSettings.marginLeft,
    },
    customDimensions:
      pageSettings.pageSize === "custom"
        ? {
            width: pageSettings.customWidth,
            height: pageSettings.customHeight,
          }
        : undefined,
  });

  const [_showPageSetup, setShowPageSetup] = useState(false);

  const handlePageSetup = () => {
    setShowPageSetup(true);
  };

  const handleCopy = async () => {
    try {
      const newId = await duplicateDocument(document.id);
      if (newId) {
        // Open copied document in same tab
        window.location.href = `/document/${newId}`;
      }
    } catch (error) {
      console.error("Failed to copy document:", error);
    }
  };

  const getRoleDisplay = () => {
    if (!permissions?.accessLevel) return null;

    const roleConfig = {
      owner: {
        label: "Owner",
        bgColor: "bg-purple-100",
        textColor: "text-purple-700",
        borderColor: "border-purple-200",
        dotColor: "bg-purple-500",
        tooltip: "Full access - Can edit, share, and delete",
      },
      editor: {
        label: "Editor",
        bgColor: "bg-blue-100",
        textColor: "text-blue-700",
        borderColor: "border-blue-200",
        dotColor: "bg-blue-500",
        tooltip: "Can edit and comment",
      },
      viewer: {
        label: "Viewer",
        bgColor: "bg-gray-100",
        textColor: "text-gray-700",
        borderColor: "border-gray-200",
        dotColor: "bg-gray-500",
        tooltip: "Read-only access with commenting",
      },
      signer: {
        label: "Signer",
        bgColor: "bg-signer/10",
        textColor: "text-signer",
        borderColor: "border-signer/30",
        dotColor: "bg-signer",
        tooltip: "Can view and sign document",
      },
    };

    const config = roleConfig[permissions.accessLevel];
    if (!config) return null;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor} cursor-help`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
              {config.label}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{config.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <>
      {getRoleDisplay()}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <MoreVertical className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {permissions?.canShare && (
            <>
              <DropdownMenuItem onClick={() => setShowShareDialog(true)}>
                <Share className="h-4 w-4 mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {permissions?.canDownload && (
            <DropdownMenuItem onClick={() => printButtonRef.current?.click()}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </DropdownMenuItem>
          )}

          {/* Signature Status - Only show for owner/editor if signature requests exist */}
          {document.signatureRequests &&
            document.signatureRequests.length > 0 &&
            (permissions?.accessLevel === "owner" ||
              permissions?.accessLevel === "editor") && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Signature Status
                    </span>
                    <span className="text-xs font-medium">
                      {
                        document.signatureRequests.filter(
                          (req) => req.status === "signed",
                        ).length
                      }
                      /{document.signatureRequests.length}
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {document.signatureRequests.map((req) => (
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
                  {document.signatureRequests.every(
                    (req) => req.status === "signed",
                  ) && (
                    <div className="flex items-center gap-1.5 mt-2 px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium">
                      <Lock className="h-3 w-3" />
                      <span>Document Locked</span>
                    </div>
                  )}
                </div>
                <DropdownMenuSeparator />
              </>
            )}

          {permissions?.accessLevel !== "signer" &&
            permissions?.accessLevel !== "viewer" &&
            !isDocumentLocked && (
              <DropdownMenuItem onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-2" />
                Make a copy
              </DropdownMenuItem>
            )}
          {permissions?.canEdit && !isDocumentLocked && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handlePageSetup}>
                <FileText className="h-4 w-4 mr-2" />
                Page setup
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={editorActions.toggleBlockquote}>
                <Quote className="h-4 w-4 mr-2" />
                <span className={formatState.isBlockquote ? "font-medium" : ""}>
                  Blockquote
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={editorActions.toggleCode}>
                <Code className="h-4 w-4 mr-2" />
                <span className={formatState.isCode ? "font-medium" : ""}>
                  Code
                </span>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Star className="h-4 w-4 mr-2" />
            Add to starred
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        document={document}
      />

      {/* Hidden PrintButton for reusing functionality */}
      <div style={{ display: "none" }}>
        <PrintButton ref={printButtonRef} />
      </div>
    </>
  );
}
