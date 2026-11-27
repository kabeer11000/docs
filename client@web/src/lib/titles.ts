/** Names given to new files before the user types anything. */
export const isPlaceholderTitle = (title?: string) => !title?.trim() || /^untitled( (document|spreadsheet|presentation))?( \d{1,2}\/\d{1,2}\/\d{2,4})?$/i.test(title.trim());

/** First line of text in saved HTML, trimmed to a title-sized length (null when there is none). */
export function titleFromHtml(html: string): string | null {
  const block = html.match(/<(h[1-6]|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)?.map((b) =>
    b.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim(),
  ).find(Boolean);
  if (!block) return null;
  return block.length > 60 ? `${block.slice(0, 57).trimEnd()}...` : block;
}
