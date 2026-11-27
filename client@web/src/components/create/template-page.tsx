"use client";

import { useMemo } from "react";
import { templateMarkup } from "@/components/templates/schema";
import { cn } from "@/lib/utils";
import "@/components/editor/editor-paper.css";

export const PAGE_WIDTH = 816;
export const PAGE_HEIGHT = 1056;
const MARGIN = 72;

const markupCache = new Map<string, string>();
const markupOf = (content: string) => {
  let html = markupCache.get(content);
  if (html === undefined) {
    html = templateMarkup(content, document);
    markupCache.set(content, html);
  }
  return html;
};

/**
 * Static render of template content on a document page: the editor's own markup and typography
 * (editor-paper.css), no editor instance. Client only (callers mount it after the card is in view).
 */
export function TemplateDocument({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const html = useMemo(
    () => (typeof document === "undefined" ? "" : markupOf(content)),
    [content],
  );
  return (
    <div
      data-app="doc"
      className={cn("bg-paper text-paper-foreground", className)}
      style={{ width: PAGE_WIDTH }}
    >
      <div
        className="tiptap ProseMirror paged"
        style={{ padding: MARGIN, color: "var(--paper-foreground)" }}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: our own template HTML, re-serialized through the editor schema
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
