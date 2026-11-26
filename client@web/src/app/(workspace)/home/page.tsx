"use client";

import { useStore } from "@nanostores/react";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PageBody } from "@/components/home/page-body";
import { useViewMode, ViewToggle } from "@/components/home/view-toggle";
import { LiveFoldersView } from "@/components/shared/ui/live-folders-view";
import { LiveListView } from "@/components/shared/ui/live-list-view";
import { useDocumentUpload } from "@/hooks/use-document-upload";
import { $auth } from "@/state/auth";
import { searchActions } from "@/state/search";

export default function HomePage() {
  const router = useRouter();
  const { user } = useStore($auth);
  const [isDragOver, setIsDragOver] = useState(false);
  const [_dragCounter, setDragCounter] = useState(0);
  const { uploadFiles, isUploading, uploadingFiles } = useDocumentUpload();
  const [view, setView] = useViewMode();

  useEffect(() => {
    searchActions.setCurrentPage("home");
  }, []);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => prev + 1);

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setIsDragOver(false);
      }
      return newCount;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      setIsDragOver(false);
      setDragCounter(0);

      const { files } = e.dataTransfer;
      if (files && files.length > 0) {
        const results = await uploadFiles(files);

        // Navigate to first successfully uploaded document
        const firstSuccess = results.find((r) => r.success);
        if (firstSuccess?.documentId) {
          setTimeout(() => {
            router.push(`/document/${firstSuccess.documentId}`);
          }, 500);
        }
      }
    },
    [uploadFiles, router],
  );

  // The workspace layout only renders pages once signed in.
  if (!user) return null;

  return (
      <div
        className="relative min-h-full"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        role="region"
        aria-label="Home page content with drag-and-drop file upload"
      >
        {/* Drag Overlay */}
        {isDragOver && (
          <div
            className="pointer-events-none absolute inset-2 z-50 flex items-center justify-center rounded-lg border-2 border-dashed border-primary/40 bg-card/90"
            role="status"
            aria-live="polite"
            aria-label="Drop zone active"
          >
            <div className="text-center px-4">
              <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Upload className="size-5 text-primary" />
              </div>
              <h3 className="mb-1 text-sm font-medium text-foreground">
                Drop documents to upload
              </h3>
              <p className="text-muted-foreground text-sm max-w-md">
                PDF and Word documents will be converted and added to your vault
              </p>
            </div>
          </div>
        )}

        {/* Upload Progress Indicator */}
        {isUploading && uploadingFiles.size > 0 && (
          <div
            className="fixed right-4 bottom-4 z-50 w-80 max-w-[90vw] rounded-lg border border-border bg-popover p-3 shadow-float"
            role="status"
            aria-live="polite"
            aria-label="Upload progress"
          >
            <h4 className="mb-2 text-sm font-medium text-foreground">
              Uploading documents
            </h4>
            <div className="space-y-3">
              {Array.from(uploadingFiles.entries()).map(([id, fileInfo]) => (
                <div key={id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate max-w-[200px] text-foreground">
                      {fileInfo.name}
                    </span>
                    <span className="text-muted-foreground font-medium">
                      {fileInfo.progress}%
                    </span>
                  </div>
                  <div className="h-0.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all duration-300 ease-out"
                      style={{ width: `${fileInfo.progress}%` }}
                      role="progressbar"
                      aria-valuenow={fileInfo.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <PageBody
          title="Your documents"
          actions={<ViewToggle view={view} onChange={setView} />}
        >
          <div className="flex flex-col gap-10">
            <LiveFoldersView
              showHeadline={false}
              mode="recent-folders"
              defaultSortField="modified"
              collapsible={false}
              creationParent={user.id}
              sortable={true}
            />
            <LiveListView
              showHeadline={false}
              creationParent={user.id}
              defaultSortField="modified"
              collapsible={false}
              sortable={true}
              mode="recent-files"
              view={view}
            />
          </div>
        </PageBody>
      </div>
  );
}
