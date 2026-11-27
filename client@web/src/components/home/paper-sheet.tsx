import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PreviewBlock = { kind: "h1" | "h2" | "p" | "li"; text: string };

type PMNode = { type?: string; text?: string; attrs?: { level?: number }; content?: PMNode[] };

const MAX_BLOCKS = 18;
const MAX_CHARS = 1400;

function nodeText(node: PMNode): string {
  if (node.text) return node.text;
  return (node.content || []).map(nodeText).join(node.type === "listItem" ? " " : "");
}

type ParseHtml = (html: string) => Pick<Document, "querySelectorAll">;
const browserParse: ParseHtml | null =
  typeof DOMParser === "undefined" ? null : (html) => new DOMParser().parseFromString(html, "text/html");

/** Text blocks from saved HTML (what the editor stores today). */
function htmlBlocks(html: string, parse: ParseHtml): PreviewBlock[] {
  const blocks: PreviewBlock[] = [];
  let chars = 0;
  for (const el of Array.from(parse(html).querySelectorAll("h1,h2,h3,h4,h5,h6,p,li"))) {
    if (blocks.length >= MAX_BLOCKS || chars >= MAX_CHARS) break;
    const tag = el.tagName.toLowerCase();
    if (tag === "p" && el.closest("li")) continue; // the list item already carries its text
    const text = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) continue;
    const kind = tag === "h1" ? "h1" : tag[0] === "h" ? "h2" : tag === "li" ? "li" : "p";
    blocks.push({ kind, text: text.slice(0, 400) });
    chars += text.length;
  }
  return blocks;
}

/** Flattens the first page (saved HTML, or older ProseMirror JSON) into a few text blocks for a thumbnail. */
export function getPreviewBlocks(content: unknown, parse: ParseHtml | null = browserParse): PreviewBlock[] {
  if (typeof content === "string") return parse ? htmlBlocks(content, parse) : [];
  const blocks: PreviewBlock[] = [];
  let chars = 0;
  const walk = (node: PMNode) => {
    if (blocks.length >= MAX_BLOCKS || chars >= MAX_CHARS) return;
    const type = node.type;
    if (type === "heading" || type === "paragraph" || type === "listItem") {
      const text = nodeText(node).trim();
      if (text) {
        const kind =
          type === "heading"
            ? (node.attrs?.level ?? 1) <= 1
              ? "h1"
              : "h2"
            : type === "listItem"
              ? "li"
              : "p";
        blocks.push({ kind, text: text.slice(0, 400) });
        chars += text.length;
      }
      return;
    }
    for (const child of node.content || []) walk(child);
  };
  if (content && typeof content === "object") walk(content as PMNode);
  return blocks;
}

const blockClass: Record<PreviewBlock["kind"], string> = {
  h1: "mb-[2cqw] font-display text-[4.2cqw] font-semibold leading-tight",
  h2: "mt-[1.5cqw] mb-[1cqw] font-display text-[3cqw] font-semibold leading-tight",
  p: "mb-[1.6cqw] text-[1.9cqw] leading-[1.5]",
  li: "mb-[0.8cqw] pl-[3cqw] text-[1.9cqw] leading-[1.5]",
};

const LINE_WIDTHS = ["100%", "96%", "99%", "88%", "100%", "93%", "62%"];

interface PaperSheetProps {
  /** Fallback title shown when there is no preview content. */
  title?: string;
  content?: unknown;
  className?: string;
  children?: ReactNode;
}

/** A flat letter-size sheet (8.5 x 11). Renders a scaled first page, a title with faint lines, or blank. */
export function PaperSheet({ title, content, className, children }: PaperSheetProps) {
  const blocks = content ? getPreviewBlocks(content) : [];

  return (
    <div
      className={cn(
        "@container relative aspect-[8.5/11] w-full overflow-hidden rounded-[5px] bg-paper text-paper-foreground shadow-paper",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden px-[11%] py-[10%] select-none" aria-hidden="true">
        {blocks.length > 0 ? (
          blocks.map((b, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static preview
            <p key={i} className={cn("break-words", blockClass[b.kind])}>
              {b.text}
            </p>
          ))
        ) : title ? (
          <>
            <p className="mb-[4cqw] line-clamp-2 font-display text-[5cqw] font-semibold leading-tight">
              {title}
            </p>
            <div className="space-y-[2.6cqw]">
              {LINE_WIDTHS.map((w, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static lines
                <div key={i} className="h-[1.3cqw] bg-paper-foreground/[0.07]" style={{ width: w }} />
              ))}
            </div>
          </>
        ) : null}
      </div>
      {children}
    </div>
  );
}
