import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { KIND, KINDS } from "@/components/home/kind";
import type { FileKind } from "@/lib/files";
import { cn } from "@/lib/utils";
import { PiSpinner } from "react-icons/pi";
import {
  PAGE_HEIGHT,
  PAGE_WIDTH,
  TemplateDocument,
} from "@/components/create/template-page";
import { TEMPLATES } from "@/data/templates";
import { useCloudStore } from "@/hooks/use-cloudstore";
import { useCreateFile } from "@/hooks/use-create-file";
import { showToast } from "@/lib/toast";
import { $auth } from "@/state/auth";
import { useStore } from "@nanostores/react";
import { useRouter } from "next/navigation";

const PAGE_ASPECT = `${PAGE_WIDTH} / ${PAGE_HEIGHT}`;

/** Card shell shared by the blank cards and template cards: a tinted well with the page inside. */
function PageCard({
  title,
  description,
  kind = "doc",
  page = true,
  onClick,
  disabled,
  children,
}: {
  title: string;
  description: string;
  kind?: FileKind;
  /** Frame the children as a page peeking up from the well. */
  page?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group w-full min-w-0 self-start rounded-[14px] text-left outline-none disabled:opacity-60"
    >
      <div className="lift overflow-hidden rounded-[14px] bg-card shadow-card group-focus-visible:ring-[3px] group-focus-visible:ring-ring">
        <div className={cn("relative aspect-[4/3] overflow-hidden", KIND[kind].soft)}>
          {page ? (
            <div
              className="absolute inset-x-[14%] top-[12%] overflow-hidden rounded-[5px] bg-paper text-paper-foreground shadow-paper transition-transform duration-200 group-hover:-translate-y-1"
              style={{ aspectRatio: PAGE_ASPECT }}
            >
              {children}
            </div>
          ) : (
            children
          )}
        </div>
        <div className="px-3.5 py-3">
          <h3 className="truncate font-display text-[15px] font-semibold tracking-[-0.01em] text-foreground">{title}</h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </button>
  );
}

/** Renders the template at full page size and scales it to the card width. */
function ScaledPreview({ content }: { content: string }) {
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

interface TemplatesProps {
  folderId?: string | null;
}

/** Blank page plus a handful of plain templates. Picking one creates the document and opens it. */
export function Templates({ folderId }: TemplatesProps) {
  const router = useRouter();
  const { user } = useStore($auth);
  const { createDocument } = useCloudStore();
  const { create, creating } = useCreateFile();
  const [pending, setPending] = useState<string | null>(null);
  const parent = folderId || user?.id;

  const pickTemplate = async (id: string) => {
    const template = TEMPLATES.find((t) => t.id === id);
    if (!template || !user || pending) return;
    setPending(id);
    try {
      const docId = await createDocument({ folderId: parent || user.id, title: template.name, initialContent: template.content });
      if (!docId) throw new Error("create failed");
      router.push(`/document/${docId}`);
    } catch {
      showToast.error("Could not create the document", "Check your connection and try again.");
      setPending(null);
    }
  };

  return (
    <div data-tour="templates" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {KINDS.map((kind) => (
        <PageCard
          key={kind}
          kind={kind}
          page={false}
          title={`Blank ${KIND[kind].label.toLowerCase()}`}
          description={KIND[kind].blank}
          onClick={() => create(kind, parent ?? undefined)}
          disabled={creating || !user}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={cn(
                "flex size-12 items-center justify-center rounded-full text-app-foreground shadow-card transition-transform duration-200 group-hover:scale-110",
                KIND[kind].bg,
              )}
            >
              {creating ? <PiSpinner className="size-5 animate-spin" /> : <Plus className="size-5" strokeWidth={2.5} />}
            </span>
          </div>
        </PageCard>
      ))}
      {TEMPLATES.map((t) => (
        <PageCard key={t.id} title={t.name} description={t.description} onClick={() => pickTemplate(t.id)} disabled={!!pending || !user}>
          <ScaledPreview content={t.content} />
          {pending === t.id && (
            <div className="absolute inset-0 flex items-center justify-center bg-paper/60">
              <PiSpinner className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </PageCard>
      ))}
    </div>
  );
}
