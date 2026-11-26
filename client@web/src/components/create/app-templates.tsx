import { useStore } from "@nanostores/react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { PiSpinner } from "react-icons/pi";
import {
  PAGE_HEIGHT,
  PAGE_WIDTH,
  TemplateDocument,
  TemplatePreviewDialog,
} from "@/components/create/template-preview-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { cn } from "@/lib/utils";
import { $auth } from "@/state/auth";

interface Template {
  id: string;
  name: string;
  description: string;
  group: string;
  tags: string[];
  content: string | { type: string; content: any[] }; // Support both HTML and JSON
  isPublic: boolean;
  createdAt: string;
}

const COLLAPSED_TAG_COUNT = 12;
const PAGE_ASPECT = `${PAGE_WIDTH} / ${PAGE_HEIGHT}`;

/** Card shell shared by the blank card and template cards. */
function PageCard({
  title,
  description,
  tag,
  onClick,
  disabled,
  children,
}: {
  title: string;
  description: string;
  tag?: string;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group self-start w-full min-w-0 text-left outline-none disabled:opacity-60"
    >
      <div
        className="relative w-full overflow-hidden rounded-[2px] bg-paper text-paper-foreground shadow-paper transition-[translate,box-shadow] duration-150 ease-out group-hover:-translate-y-0.5 group-hover:shadow-paper-hover group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background"
        style={{ aspectRatio: PAGE_ASPECT }}
      >
        {children}
      </div>
      <div className="mt-3 px-px">
        <h3 className="truncate font-serif text-[15px] font-medium tracking-[-0.01em] text-foreground">
          {title}
        </h3>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {description}
        </p>
        {tag && (
          <p className="mt-1 truncate text-xs text-muted-foreground/80 capitalize">
            {tag}
          </p>
        )}
      </div>
    </button>
  );
}

/** Renders the template at full page size and scales it to the card width. */
function ScaledPreview({ content }: { content: Template["content"] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const resize = new ResizeObserver(([entry]) =>
      setScale(entry.contentRect.width / PAGE_WIDTH),
    );
    // Defer creating the editor until the card is near the viewport.
    const view = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          view.disconnect();
        }
      },
      { rootMargin: "100px", threshold: 0.01 },
    );
    resize.observe(el);
    view.observe(el);
    return () => {
      resize.disconnect();
      view.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 select-none overflow-hidden"
    >
      {isInView && scale > 0 && (
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            height: PAGE_HEIGHT,
          }}
        >
          <TemplateDocument content={content} className="h-full" />
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="w-full">
      <Skeleton className="w-full rounded-[2px]" style={{ aspectRatio: PAGE_ASPECT }} />
      <Skeleton className="mt-3 h-4 w-3/4 rounded-md" />
      <Skeleton className="mt-1.5 h-3 w-1/2 rounded-md" />
    </div>
  );
}

function TagChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "-mb-px h-9 shrink-0 border-b-2 text-[13px] capitalize transition-colors duration-150",
        active
          ? "border-primary font-medium text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

interface TemplatesProps {
  folderId?: string | null;
}

export function Templates({ folderId }: TemplatesProps) {
  const { createDocument } = useCloudStore();
  const authState = useStore($auth);
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(
    null,
  );
  const [templates, setTemplates] = useState<Template[]>([]);
  const [totalTemplates, setTotalTemplates] = useState(0);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCreatingFromPreview, setIsCreatingFromPreview] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const templatesPerPage = 8;

  // Fetch templates from API with pagination and tag filtering
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoadingTemplates(true);
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: templatesPerPage.toString(),
        });

        if (selectedTag) {
          params.append("tag", selectedTag);
        }

        const response = await fetch(`/api/templates?${params.toString()}`);
        const result = await response.json();

        if (result.success) {
          console.log(
            `[Templates] Loaded page ${currentPage}:`,
            result.count,
            "templates (total:",
            result.total,
            selectedTag ? `filtered by tag: ${selectedTag}` : "",
            ")",
          );
          setTemplates(result.data);
          setTotalTemplates(result.total);
          setAllTags(result.allTags || []);
        } else {
          console.error("[Templates] Failed to fetch templates:", result.error);
        }
      } catch (error) {
        console.error("[Templates] Failed to fetch templates:", error);
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, [currentPage, templatesPerPage, selectedTag]);

  const handleTemplateCardClick = (template: Template) => {
    setPreviewTemplate(template);
    setIsPreviewOpen(true);
  };

  const handleUseTemplate = async (template: Template) => {
    setIsCreatingFromPreview(true);

    try {
      console.log(
        "[Templates] Creating document from template:",
        template.name,
      );
      const parentFolder = folderId || authState.user?.id;

      const docId = await createDocument({
        folderId: parentFolder,
        title: template.name,
        initialContent:
          template.content ||
          `<h1>${template.name}</h1><p>Content for ${template.name} goes here...</p>`,
      });

      if (docId) {
        console.log("[Templates] Document created with ID:", docId);
        await new Promise((resolve) => setTimeout(resolve, 500));
        window.location.href = `/document/${docId}`;
      } else {
        console.error("[Templates] Failed to create document from template");
        setIsCreatingFromPreview(false);
      }
    } catch (error) {
      console.error(
        "[Templates] Error creating document from template:",
        error,
      );
      setIsCreatingFromPreview(false);
    }
  };

  const handleBlankDocumentClick = async () => {
    setLoadingTemplateId("blank");

    try {
      // Always create a new blank document
      console.log("[Templates] Creating new blank document");
      const parentFolder = folderId || authState.user?.id;

      const docId = await createDocument({
        folderId: parentFolder,
        title: `Untitled Document ${new Date().toLocaleDateString()}`,
        initialContent: "<p></p>",
      });

      if (docId) {
        console.log("[Templates] Blank document created with ID:", docId);
        // Wait a bit for CloudStore to propagate the creation
        await new Promise((resolve) => setTimeout(resolve, 300));
        window.location.href = `/document/${docId}`;
      }
    } catch (error) {
      console.error("Failed to create blank document:", error);
    } finally {
      setLoadingTemplateId(null);
    }
  };

  // Pagination calculations (server-side pagination)
  const totalPages = Math.ceil(totalTemplates / templatesPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  const handleTagSelect = (tag: string | null) => {
    setSelectedTag(tag);
    setCurrentPage(1); // Reset to first page when changing filter
  };

  const [showAllTags, setShowAllTags] = useState(false);
  const visibleTags = showAllTags
    ? allTags
    : allTags.filter(
        (tag, i) => i < COLLAPSED_TAG_COUNT || tag === selectedTag,
      );

  return (
    <>
      {allTags.length > 0 && (
        <div
          role="toolbar"
          aria-label="Filter templates by tag"
          className="mb-8 flex flex-wrap items-center gap-x-5 border-b border-border"
        >
          <TagChip active={!selectedTag} onClick={() => handleTagSelect(null)}>
            All
          </TagChip>
          {visibleTags.map((tag) => (
            <TagChip
              key={tag}
              active={selectedTag === tag}
              onClick={() => handleTagSelect(selectedTag === tag ? null : tag)}
            >
              {tag}
            </TagChip>
          ))}
          {allTags.length > COLLAPSED_TAG_COUNT && (
            <button
              type="button"
              className="-mb-px h-9 shrink-0 border-b-2 border-transparent text-[13px] text-muted-foreground underline-offset-4 transition-colors duration-150 hover:text-foreground"
              aria-expanded={showAllTags}
              onClick={() => setShowAllTags((v) => !v)}
            >
              {showAllTags
                ? "Fewer tags"
                : `${allTags.length - visibleTags.length} more tags`}
            </button>
          )}
        </div>
      )}

      <div
        data-tour="templates"
        className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      >
        {isLoadingTemplates &&
          [...new Array(8)].map((_, index) => (
            <SkeletonCard key={`skeleton-${index}`} />
          ))}
        {!isLoadingTemplates && (
          <PageCard
            title="Blank document"
            description="Start from an empty page"
            onClick={handleBlankDocumentClick}
            disabled={loadingTemplateId === "blank"}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              {loadingTemplateId === "blank" ? (
                <PiSpinner className="size-5 animate-spin text-muted-foreground" />
              ) : (
                <Plus className="size-5 text-muted-foreground transition-colors duration-150 group-hover:text-foreground" />
              )}
            </div>
          </PageCard>
        )}
        {!isLoadingTemplates &&
          templates.map((template) => (
            <PageCard
              key={template.id}
              title={template.name}
              description={template.description}
              tag={template.group}
              onClick={() => handleTemplateCardClick(template)}
            >
              <ScaledPreview content={template.content} />
            </PageCard>
          ))}
      </div>

      {!isLoadingTemplates && totalTemplates > templatesPerPage && (
        <nav
          aria-label="Templates pagination"
          className="mt-10 flex items-center justify-center gap-1"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevPage}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map(
            (pageNumber) => {
              // Show first page, last page, current page, and pages around current
              const showPage =
                pageNumber === 1 ||
                pageNumber === totalPages ||
                (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1);

              const showEllipsis =
                (pageNumber === currentPage - 2 && currentPage > 3) ||
                (pageNumber === currentPage + 2 && currentPage < totalPages - 2);

              if (showEllipsis) {
                return (
                  <span
                    key={pageNumber}
                    className="px-1.5 text-sm text-muted-foreground"
                  >
                    ...
                  </span>
                );
              }

              if (!showPage) return null;

              const isCurrent = currentPage === pageNumber;
              return (
                <Button
                  key={pageNumber}
                  variant="ghost"
                  size="sm"
                  aria-current={isCurrent ? "page" : undefined}
                  onClick={() => handlePageChange(pageNumber)}
                  className={cn(
                    "min-w-8 px-2 tabular-nums",
                    isCurrent
                      ? "bg-accent font-medium text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {pageNumber}
                </Button>
              );
            },
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </nav>
      )}

      <TemplatePreviewDialog
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        template={previewTemplate}
        onUseTemplate={handleUseTemplate}
        isLoading={isCreatingFromPreview}
      />
    </>
  );
}
