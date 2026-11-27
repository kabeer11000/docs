"use client";

import { useStore } from "@nanostores/react";
import { ArrowUp } from "lucide-react";
import { use, useEffect, useRef, useState } from "react";
import { CreateTiles } from "@/components/home/create-tiles";
import { Greeting, JumpBackIn } from "@/components/home/home-sections";
import { HomeTabs, StarredView } from "@/components/home/home-tabs";
import { KindFilter, type KindFilterValue } from "@/components/home/kind";
import { PageBody } from "@/components/home/page-body";
import { SectionHeader } from "@/components/home/section-header";
import { useViewMode, ViewToggle } from "@/components/home/view-toggle";
import { ListView } from "@/components/shared/ui/list-view";
import { LiveFoldersView } from "@/components/shared/ui/live-folders-view";
import { useDocuments } from "@/hooks/use-documents";
import { useImportFiles } from "@/lib/import/use-import-files";
import { $auth } from "@/state/auth";
import { searchActions } from "@/state/search";

const hasFiles = (e: React.DragEvent) =>
  Array.from(e.dataTransfer.types).includes("Files");

export default function HomePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const starred = use(searchParams).tab === "starred";
  const { user } = useStore($auth);
  const [view, setView] = useViewMode();
  const [kind, setKind] = useState<KindFilterValue>("all");
  const { documents, isLoading } = useDocuments(undefined, "recent-files");
  const { importFiles } = useImportFiles();
  const [dragging, setDragging] = useState(false);
  // dragenter/dragleave fire for every child; count them so the overlay does not flicker.
  const depth = useRef(0);

  useEffect(() => {
    searchActions.setCurrentPage("home");
  }, []);

  // The workspace layout only renders pages once signed in.
  if (!user) return null;

  const onDragEnter = (e: React.DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth.current += 1;
    setDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    if (!hasFiles(e)) return;
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setDragging(false);
  };
  const onDragOver = (e: React.DragEvent) => {
    if (hasFiles(e)) e.preventDefault();
  };
  const onDrop = (e: React.DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth.current = 0;
    setDragging(false);
    if (e.dataTransfer.files.length) importFiles(e.dataTransfer.files, user.id);
  };

  return (
    <section
      className="relative min-h-full"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      aria-label="Home"
    >
      {dragging && (
        <output
          className="pointer-events-none fixed inset-3 top-[3.75rem] z-50 flex items-center justify-center rounded-[20px] border-2 border-dashed border-foreground/40 bg-background/85 px-6"
          aria-live="polite"
        >
          <span className="flex flex-col items-center text-center">
            <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-foreground text-background shadow-float">
              <ArrowUp className="size-6" strokeWidth={2.5} />
            </span>
            <span className="font-display text-2xl font-bold tracking-[-0.02em]">
              Drop to import
            </span>
            <span className="mt-1 max-w-md text-sm text-balance text-muted-foreground">
              Word, PDF, Markdown and HTML open as documents, Excel and CSV as
              spreadsheets, PowerPoint as presentations.
            </span>
          </span>
        </output>
      )}

      <PageBody title={<Greeting />}>
        <HomeTabs
          active={starred ? "starred" : "recent"}
          actions={<ViewToggle view={view} onChange={setView} />}
        />
        {starred ? (
          <StarredView view={view} />
        ) : (
          <div className="flex flex-col gap-12">
            <CreateTiles folderId={user.id} dragging={dragging} />

            <JumpBackIn />

            <LiveFoldersView
              showHeadline
              headlineText="Folders"
              mode="recent-folders"
              collapsible={false}
              creationParent={user.id}
            />

            <section aria-labelledby="all-files">
              <SectionHeader title={<span id="all-files">All files</span>} />
              <ListView
                items={documents}
                isLoading={isLoading}
                mode="recent-files"
                creationParent={user.id}
                collapsible={false}
                defaultSortField="modified"
                enableCopy={false}
                enableBulkSelection
                view={view}
                kindFilter={kind}
                filters={documents.length > 0 && <KindFilter value={kind} onChange={setKind} />}
              />
            </section>
          </div>
        )}
      </PageBody>
    </section>
  );
}
