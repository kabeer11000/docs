import { DOMParser as PMDOMParser, DOMSerializer, type Schema } from "@tiptap/pm/model";
import { useMemo } from "react";

/** The stored HTML through the editor's own schema: the markup the editor will render, with
 *  anything the schema does not know dropped (so it is as safe as loading it into the editor). */
export function schemaHtml(schema: Schema, html: string): string | null {
  try {
    const body = new window.DOMParser().parseFromString(html, "text/html").body;
    const doc = PMDOMParser.fromSchema(schema).parse(body);
    if (!doc.textContent.trim() && doc.childCount <= 1) return null;
    const out = document.createElement("div");
    out.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(doc.content, { document }));
    return out.innerHTML;
  } catch {
    return null;
  }
}

/**
 * Read-only first page of the stored document, shown while the editor waits for the live room
 * (or the solo fallback) before it may load content. Same classes and paper geometry as the
 * editor, so the swap does not move anything. It never feeds the editor: content still loads only
 * through the editor's guarded seeding.
 */
export function StoredPreview({ schema, html }: { schema: Schema; html: string }) {
  const markup = useMemo(() => schemaHtml(schema, html), [schema, html]);
  if (!markup) return null;
  return (
    <div
      inert
      aria-hidden
      className="tiptap ProseMirror paged stored-preview"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: serialized from the editor schema above
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
