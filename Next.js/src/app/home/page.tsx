"use client";

import { useStore } from "@nanostores/react";
import { Upload } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDocumentUpload } from "@/hooks/use-document-upload";
import { cn } from "@/lib/utils";
import { $auth } from "@/state/auth";
import { searchActions } from "@/state/search";

// Lazy load heavy components
const ReactHome = dynamic(() => import("@/components/home"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  ),
});

const LiveFoldersView = dynamic(
  () =>
    import("@/components/shared/ui/live-folders-view").then((m) => ({
      default: m.LiveFoldersView,
    })),
  { ssr: false },
);

const LiveListView = dynamic(
  () =>
    import("@/components/shared/ui/live-list-view").then((m) => ({
      default: m.LiveListView,
    })),
  { ssr: false },
);

const Banner = dynamic(
  () => import("@/components/home/banner").then((m) => ({ default: m.Banner })),
  { ssr: false },
);

export default function HomePage() {
  const router = useRouter();
  const authState = useStore($auth);
  const [showBanner, setShowBanner] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [_dragCounter, setDragCounter] = useState(0);
  const { uploadFiles, isUploading, uploadingFiles } = useDocumentUpload();

  useEffect(() => {
    // Give auth state time to initialize
    const timeout = setTimeout(() => {
      setIsChecking(false);
    }, 100);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    // Don't redirect while still checking
    if (isChecking) return;

    // Check if user is authenticated
    if (!authState.user && !authState.isLoading) {
      router.push("/auth/login");
      return;
    }

    if (authState.user) {
      // Set the current page context for search
      searchActions.setCurrentPage("home");

      // Check if banner should be shown (check cookie)
      const bannerClosed = document.cookie.includes("lx.popups.0152.cl=true");
      setShowBanner(!bannerClosed);
    }
  }, [authState.user, authState.isLoading, router, isChecking]);

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

  // Show loading while checking auth
  if (isChecking || authState.isLoading || !authState.user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <ReactHome pathname="/home">
      <div
        className={cn("px-4 sm:px-6 md:px-8 lg:px-12 pb-8 md:pb-12 relative")}
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
            className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-background/50 dark:bg-background/50 pointer-events-none"
            role="status"
            aria-live="polite"
            aria-label="Drop zone active"
          >
            <div className="text-center px-4">
              <div className="w-20 h-20 mx-auto mb-4 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center shadow-lg border-2 border-primary/30">
                <Upload className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Drop documents to upload
              </h3>
              <p className="text-muted-foreground text-sm max-w-md">
                PDF and Word documents will be converted and added to your vault
              </p>
              <p className="text-muted-foreground text-xs mt-2">
                Or press Escape to cancel
              </p>
            </div>
          </div>
        )}

        {/* Upload Progress Indicator */}
        {isUploading && uploadingFiles.size > 0 && (
          <div
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 bg-card dark:bg-card rounded-xl shadow-2xl border border-border p-4 min-w-[300px] max-w-[90vw] sm:max-w-[400px]"
            role="status"
            aria-live="polite"
            aria-label="Upload progress"
          >
            <h4 className="font-semibold text-sm mb-3 text-foreground">
              Uploading Documents
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
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
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

        <div className="mx-auto max-w-7xl flex flex-col gap-y-10 md:gap-y-12">
          {showBanner && <Banner />}

          <LiveFoldersView
            showHeadline={true}
            headlineText="Recent Folders"
            mode="recent-folders"
            defaultSortField="modified"
            collapsible={true}
            sortable={true}
          />
          <LiveListView
            headlineText="Quick Access"
            showHeadline={true}
            defaultSortField="modified"
            collapsible={true}
            sortable={true}
            mode="recent-files"
          />
        </div>
      </div>
    </ReactHome>
  );
}
