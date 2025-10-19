import { useStore } from "@nanostores/react";
import Color from "@tiptap/extension-color";
import ListItem from "@tiptap/extension-list-item";
import TextAlign from "@tiptap/extension-text-align";
import { FontSize, TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
  Plane as Airplane,
  BookOpen,
  Briefcase,
  Building,
  Building2 as Buildings,
  Calendar,
  Camera,
  ChevronLeft,
  ChevronRight,
  Award as Certificate,
  ChartLine as ChartLineUp,
  CheckCircle,
  Clock,
  Code,
  DollarSign,
  Table as Desk,
  Factory,
  FileText,
  Film as FilmSlate,
  FlaskConical as Flask,
  Gavel,
  Settings,
  Gift,
  Globe,
  GraduationCap,
  Handshake,
  Home,
  Lock,
  Megaphone,
  File as Note,
  Package,
  Palette,
  Plus,
  // Prohibit,
  Receipt,
  StampIcon as  Seal,
  Network as ShareNetwork,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Stamp,
  // Storefront,
  Truck,
  User,
  Users,
  User2 as UsersThree,
  Warehouse,
  FileWarning as Warning,
  Wrench,
  X,
} from "lucide-react";
import {
  TableCellPlus,
  TableHeaderPlus,
  TablePlus,
  TableRowPlus,
} from "tiptap-pagination-plus";
import { TemplatePreviewDialog } from "@/components/create/template-preview-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { $auth } from "@/state/auth";

interface TemplateCardProps {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  content: string | { type: string; content: any[] };
  onClick?: () => void;
}

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

// Map template categories to appropriate icons
const _getTemplateIcon = (category: string, title: string): React.ComponentType => {
  const categoryLower = category.toLowerCase();
  const _titleLower = title.toLowerCase();

  // Specific category matches (most specific first)
  if (categoryLower.includes("assignment of shares")) return UsersThree;
  if (categoryLower.includes("child travel consent")) return Airplane;
  if (
    categoryLower.includes("warehouse lease") ||
    categoryLower.includes("warehouse")
  )
    return Warehouse;
  if (categoryLower.includes("commercial lease")) return Buildings;
  if (categoryLower.includes("coworking space")) return Desk;
  if (
    categoryLower.includes("bill of sale") ||
    categoryLower.includes("sale deed")
  )
    return Receipt;
  if (categoryLower.includes("deed of trust")) return Seal;
  if (
    categoryLower.includes("power of attorney") ||
    categoryLower.includes("guarantee")
  )
    return Stamp;
  if (categoryLower.includes("indemnity")) return Shield;
  if (
    categoryLower.includes("release of liability") ||
    categoryLower.includes("waiver")
  )
    return Warning;

  // Legal & IP
  if (
    categoryLower.includes("trademark") ||
    categoryLower.includes("patent") ||
    categoryLower.includes("ip agreement")
  )
    return Gavel;
  if (categoryLower.includes("nda") || categoryLower.includes("confidential"))
    return ShieldCheck;
  // if (categoryLower.includes("non-compete")) return Prohibit;

  // Financial & Business
  if (
    categoryLower.includes("fixed price") ||
    categoryLower.includes("lump sum")
  )
    return DollarSign;
  if (categoryLower.includes("time & materials")) return Clock;
  if (categoryLower.includes("investor")) return ChartLineUp;
  if (categoryLower.includes("shareholder")) return ChartLineUp;
  // if (categoryLower.includes("franchise")) return Storefront;
  if (categoryLower.includes("buy-sell")) return Handshake;
  if (categoryLower.includes("business transfer")) return Handshake;

  // Licensing & Certification
  if (
    categoryLower.includes("licensing") ||
    categoryLower.includes("license") ||
    categoryLower.includes("eula")
  )
    return Certificate;
  if (categoryLower.includes("beta") || categoryLower.includes("testing"))
    return Flask;

  // People & Groups
  if (
    categoryLower.includes("ambassador") ||
    categoryLower.includes("influencer")
  )
    return Users;
  if (categoryLower.includes("referral")) return Users;
  if (categoryLower.includes("board") || categoryLower.includes("director"))
    return UsersThree;

  // Contracts & Agreements
  if (categoryLower.includes("booking")) return Calendar;
  if (
    categoryLower.includes("contract amendment") ||
    categoryLower.includes("renewal")
  )
    return Note;
  if (
    categoryLower.includes("terms of use") ||
    categoryLower.includes("rfp") ||
    categoryLower.includes("request for proposal")
  )
    return FileText;
  if (categoryLower.includes("master services")) return Briefcase;

  // Industry Specific
  if (categoryLower.includes("cybersecurity")) return Lock;
  if (
    categoryLower.includes("software") ||
    categoryLower.includes("technology transfer") ||
    categoryLower.includes("web development")
  )
    return Code;
  if (categoryLower.includes("photography")) return Camera;
  if (
    categoryLower.includes("stunt performer") ||
    categoryLower.includes("film")
  )
    return FilmSlate;
  if (categoryLower.includes("exhibition")) return Camera;

  // General categories
  if (categoryLower.includes("share") || categoryLower.includes("stock"))
    return ShareNetwork;
  if (
    categoryLower.includes("copyright") ||
    categoryLower.includes("author") ||
    categoryLower.includes("publisher")
  )
    return BookOpen;
  if (categoryLower.includes("lease") || categoryLower.includes("rental"))
    return Home;
  if (
    categoryLower.includes("consulting") ||
    categoryLower.includes("freelancer")
  )
    return Briefcase;
  if (categoryLower.includes("design")) return Palette;
  if (
    categoryLower.includes("domain") ||
    categoryLower.includes("online course")
  )
    return Globe;
  if (
    categoryLower.includes("employee") ||
    categoryLower.includes("employment")
  )
    return User;
  if (
    categoryLower.includes("equipment") ||
    categoryLower.includes("fleet maintenance")
  )
    return Wrench;
  if (categoryLower.includes("freight") || categoryLower.includes("logistics"))
    return Truck;
  if (
    categoryLower.includes("partnership") ||
    categoryLower.includes("joint venture")
  )
    return Handshake;
  if (categoryLower.includes("llc") || categoryLower.includes("llp"))
    return Building;
  if (
    categoryLower.includes("manufacturing") ||
    categoryLower.includes("distributor")
  )
    return Factory;
  if (
    categoryLower.includes("teacher") ||
    categoryLower.includes("course") ||
    categoryLower.includes("education")
  )
    return GraduationCap;
  if (
    categoryLower.includes("vendor") ||
    categoryLower.includes("supplier") ||
    categoryLower.includes("supply")
  )
    return Package;
  if (categoryLower.includes("wedding") || categoryLower.includes("event"))
    return Gift;
  if (
    categoryLower.includes("marketing") ||
    categoryLower.includes("advertising")
  )
    return Megaphone;
  if (
    categoryLower.includes("service") ||
    categoryLower.includes("maintenance")
  )
    return Settings;
  if (
    categoryLower.includes("subcontract") ||
    categoryLower.includes("handyman")
  )
    return Wrench;
  if (categoryLower.includes("quality")) return CheckCircle;
  if (
    categoryLower.includes("merchandise") ||
    categoryLower.includes("purchasing")
  )
    return ShoppingCart;

  // Default icon
  return FileText;
};

const TemplateCard: React.FC<TemplateCardProps> = ({
  id,
  title,
  description,
  category,
  tags,
  content,
  onClick,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  // Intersection Observer to detect when card enters viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true);
        }
      },
      {
        rootMargin: "100px", // Start loading 100px before card enters viewport
        threshold: 0.01,
      },
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Only initialize editor when card is in/near viewport
  const previewEditor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit,
        Underline,
        TextStyle,
        FontSize,
        Color,
        ListItem,
        TextAlign.configure({
          types: ["heading", "paragraph"],
          alignments: ["left", "center", "right", "justify"],
          defaultAlignment: "left",
        }),
        TablePlus,
        TableRowPlus,
        TableCellPlus,
        TableHeaderPlus,
      ],
      content: content || "",
      editable: false,
      editorProps: {
        attributes: {
          class: "text-xs leading-tight",
        },
      },
    },
    isInView ? [content] : undefined, // undefined prevents editor creation until in view
  );

  return (
    <Card
      ref={cardRef}
      className="w-full group  bg-transparent border-none  cursor-pointer transition-all border-none-duration-200-hover:shadow-md hover:border-accent disabled:opacity-50"
      style={{
        animation: "fade-in 0.25s ease-in-out",
      }}
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="aspect-[3/4] group-hover:shadow-xl group-hover:bg-muted group-hover:outline outline-muted  bg-transparent duration-150 transition-all rounded-md mb-3 overflow-hidden relative">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {isInView && previewEditor ? (
              <EditorContent
                editor={previewEditor}
                className="px-4 text-[0.5rem] leading-tight line-clamp-[20] opacity-70 [&_h1]:text-[0.65rem] [&_h1]:font-semibold [&_h1]:mb-1 [&_h2]:text-[0.55rem] [&_h2]:font-medium [&_h2]:mb-0.5 [&_h3]:text-[0.5rem] [&_h3]:font-medium"
              />
            ) : (
              <div className="text-[0.5rem] leading-tight opacity-30 text-muted-foreground">
                {/* Subtle placeholder while editor loads */}
              </div>
            )}
          </div>
        </div>

        <h3 className="font-semibold text-sm mb-1 line-clamp-2 break-words">
          {title}
        </h3>

        <p className="text-xs text-muted-foreground mb-3 line-clamp-2 break-words">
          {description}
        </p>

        <Badge
          variant="secondary"
          className="text-xs px-2 py-1 rounded-full truncate max-w-full block"
        >
          {category}
        </Badge>
      </CardContent>
    </Card>
  );
};

function SkeletonCard() {
  return (
    <div className="w-full">
      <Skeleton className="aspect-[3/4] rounded-md mb-3" />
      <div className="grid grid-cols-1 gap-y-4">
        <Skeleton className="h-4 w-full rounded-full" />
        <Skeleton className="h-4 w-12 rounded-full" />
      </div>
    </div>
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

  return (
    <>
      {/* Tag Filter Dropdown */}
      {!isLoadingTemplates && allTags.length > 0 && (
        <div className="mb-6 flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            Filter by tag:
          </span>
          <Select
            value={selectedTag || "all"}
            onValueChange={(value) =>
              handleTagSelect(value === "all" ? null : value)
            }
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="All tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {allTags.map((tag) => (
                <SelectItem key={tag} value={tag} className="capitalize">
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTag && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleTagSelect(null)}
              className="h-8"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {isLoadingTemplates &&
          [...new Array(8)].map((_, index) => (
            <SkeletonCard key={`skeleton-${index}`} />
          ))}
        {!isLoadingTemplates && (
          <Card
            className="w-full bg-transparent border-none group cursor-pointer transition-all border-none duration-200 hover:shadow-md hover:border-accent disabled:opacity-50"
            style={{
              animation: "fade-in 0.25s ease-in-out",
            }}
            onClick={
              loadingTemplateId === "blank"
                ? undefined
                : handleBlankDocumentClick
            }
          >
            <CardContent className="p-0">
              {/* Template Preview */}
              <div className="aspect-[3/4] group-hover:shadow-xl group-hover:border duration-300 transition-all rounded-md bg-muted mb-3 flex items-center justify-center overflow-hidden">
                {loadingTemplateId === "blank" ? (
                  <div>Loading ... </div>
                  // <Spinner className="h-6 w-6 text-muted-foreground animate-spin" />
                ) : (
                  <Plus className="h-8 w-8 text-muted-foreground" />
                )}
              </div>

              {/* Title */}
              <h3 className="font-semibold text-sm mb-1 line-clamp-2 break-words">
                Blank
              </h3>

              {/* Description */}
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2 break-words">
                Start fresh with a crisp new document
              </p>
            </CardContent>
          </Card>
        )}
        {!isLoadingTemplates &&
          templates.map((template) => (
            <TemplateCard
              key={template.id}
              id={template.id}
              title={template.name}
              description={template.description}
              category={template.group}
              tags={template.tags}
              content={template.content}
              onClick={() => handleTemplateCardClick(template)}
            />
          ))}
      </div>

      {/* Pagination Controls */}
      {!isLoadingTemplates && totalTemplates > templatesPerPage && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
              (pageNumber) => {
                // Show first page, last page, current page, and pages around current
                const showPage =
                  pageNumber === 1 ||
                  pageNumber === totalPages ||
                  (pageNumber >= currentPage - 1 &&
                    pageNumber <= currentPage + 1);

                const showEllipsis =
                  (pageNumber === currentPage - 2 && currentPage > 3) ||
                  (pageNumber === currentPage + 2 &&
                    currentPage < totalPages - 2);

                if (showEllipsis) {
                  return (
                    <span
                      key={pageNumber}
                      className="px-2 text-muted-foreground"
                    >
                      ...
                    </span>
                  );
                }

                if (!showPage) return null;

                return (
                  <Button
                    key={pageNumber}
                    variant={currentPage === pageNumber ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNumber)}
                    className="min-w-[40px]"
                  >
                    {pageNumber}
                  </Button>
                );
              },
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
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