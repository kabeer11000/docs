import { useStore } from "@nanostores/react";
import { ArrowUp, Loader2, Plus } from "lucide-react";
import { useRef } from "react";
import { useCreateFile } from "@/hooks/use-create-file";
import type { CreatableKind, FileKind } from "@/lib/files";
import { IMPORT_ACCEPT, useImportFiles } from "@/lib/import/use-import-files";
import { cn } from "@/lib/utils";
import { $auth } from "@/state/auth";
import styles from "./create-tiles.module.css";
import { KIND, KINDS } from "./kind";

const tileClass = cn(
  styles.tile,
  "group lift relative flex min-w-0 flex-col overflow-hidden rounded-[14px] bg-card text-left shadow-card outline-none",
  "focus-visible:ring-[3px] focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60",
);

function DocPreview() {
  return (
    <div className={styles.paper}>
      <div className={styles.heading} />
      <div className={styles.bar} />
      <div className={styles.bar} style={{ width: "88%" }} />
      <span className={styles.typed}>
        <span className={styles.typedText}>The launch moves to May</span>
        <span className={styles.caret} />
      </span>
    </div>
  );
}

const SHEET_ROWS = [
  ["Item", "Qty", "Price", "Total"],
  ["Paper", "4", "2.50", "10.00"],
  ["Ink", "2", "8.00", "16.00"],
  ["Pens", "6", "1.25", "7.50"],
];

function SheetPreview() {
  return (
    <div className={styles.paper}>
      <div className={styles.fx}>
        <b>fx</b>
        <span>=B2*C2</span>
      </div>
      <div className={styles.grid}>
        {SHEET_ROWS.flatMap((row, r) =>
          row.map((v, c) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: static preview
              key={`${r}-${c}`}
              className={cn(
                styles.cell,
                r === 0 && styles.head,
                r > 0 && c === 3 && styles.result,
                r === 1 && c === 3 && styles.selected,
              )}
              style={{ "--i": r } as React.CSSProperties}
            >
              {v}
            </span>
          )),
        )}
      </div>
    </div>
  );
}

function SlidesPreview() {
  return (
    <div className={styles.slide}>
      <div className={styles.dot} />
      <p className={styles.slideTitle}>
        Quarterly
        <br />
        review
      </p>
      <div className={styles.slideSub} />
    </div>
  );
}

const PREVIEW: Record<CreatableKind, () => React.JSX.Element> = {
  doc: DocPreview,
  sheet: SheetPreview,
  slides: SlidesPreview,
};

function TileLabel({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-3 px-4 py-3.5">
      {children}
      <span className="min-w-0">
        <span className="block truncate font-display text-[15px] font-semibold tracking-[-0.01em] text-foreground">
          {title}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {hint}
        </span>
      </span>
    </span>
  );
}

interface CreateTilesProps {
  /** Folder new and imported files go into; defaults to the vault root. */
  folderId?: string;
  /** Highlights the import tile while files are dragged over the page. */
  dragging?: boolean;
  showImport?: boolean;
  className?: string;
}

/** The three create tiles (one per app) with tiny live previews, plus the import tile. */
export function CreateTiles({
  folderId,
  dragging,
  showImport = true,
  className,
}: CreateTilesProps) {
  const { user } = useStore($auth);
  const { create, creating } = useCreateFile();
  const { importFiles, busy } = useImportFiles();
  const input = useRef<HTMLInputElement>(null);
  const parent = folderId || user?.id;

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4",
        className,
      )}
    >
      {KINDS.map((kind) => {
        const k = KIND[kind];
        const Preview = PREVIEW[kind];
        return (
          <button
            key={kind}
            type="button"
            className={tileClass}
            disabled={creating || !user}
            onClick={() => create(kind, parent)}
            aria-label={`New ${k.label.toLowerCase()}`}
          >
            <span
              className={cn(styles.stage, "block aspect-[16/10] bg-muted/70")}
              aria-hidden="true"
            >
              <Preview />
            </span>
            <TileLabel title={k.label} hint={k.blank}>
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-app-foreground",
                  k.bg,
                )}
              >
                <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
              </span>
            </TileLabel>
          </button>
        );
      })}
      {showImport && (
        <>
          <button
            type="button"
            data-dragging={dragging ? "true" : undefined}
            className={cn(
              tileClass,
              "border-2 border-dashed border-input bg-transparent shadow-none hover:border-foreground/30 hover:bg-card",
              dragging &&
                "border-foreground/60 bg-highlight hover:bg-highlight",
            )}
            disabled={busy || !user}
            onClick={() => input.current?.click()}
            aria-label="Import a file"
          >
            <span
              className={cn(
                styles.stage,
                "flex aspect-[16/10] items-center justify-center",
              )}
              aria-hidden="true"
            >
              <span
                className={cn(
                  styles.arrow,
                  "flex size-12 items-center justify-center rounded-full bg-foreground text-background shadow-card",
                )}
              >
                {busy ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <ArrowUp className="size-5" strokeWidth={2.5} />
                )}
              </span>
              <span className="absolute inset-x-3 bottom-3 flex flex-wrap justify-center gap-1">
                {["docx", "pdf", "xlsx", "csv", "pptx", "md"].map((ext) => (
                  <span
                    key={ext}
                    className="rounded-full bg-card px-1.5 text-[10px] leading-4 font-medium text-muted-foreground shadow-card"
                  >
                    {ext}
                  </span>
                ))}
              </span>
            </span>
            <TileLabel
              title={dragging ? "Drop to import" : "Import"}
              hint="Drop files anywhere"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-highlight text-highlight-foreground">
                <ArrowUp
                  className="size-4"
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
              </span>
            </TileLabel>
          </button>
          <input
            ref={input}
            type="file"
            accept={IMPORT_ACCEPT}
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) importFiles(e.target.files, parent);
              e.target.value = "";
            }}
          />
        </>
      )}
    </div>
  );
}
