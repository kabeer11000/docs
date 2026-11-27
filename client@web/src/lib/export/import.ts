// Files -> editor HTML for a NEW document. Everything goes through a tag/attribute allowlist
// because the HTML is stored and later rendered (thumbnails, editor).

export const IMPORT_ACCEPT = ".md,.markdown,.html,.htm,.txt,.docx";

const ALLOWED_TAGS = new Set(
  "p h1 h2 h3 h4 h5 h6 strong b em i u s del strike code pre blockquote ul ol li a br hr table thead tbody tr th td img label input div span sub sup mark".split(" "),
);
const DROP_WITH_CONTENT = new Set("script style iframe object embed noscript template head title meta link form button select textarea svg math video audio canvas".split(" "));
const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ["href", "title"],
  img: ["src", "alt", "title", "width", "height"],
  th: ["colspan", "rowspan"],
  td: ["colspan", "rowspan"],
  ol: ["start"],
  ul: ["data-type"],
  li: ["data-type", "data-checked"],
  code: ["class"],
  div: ["data-page-break", "data-callout", "data-type", "data-latex"],
  span: ["data-type", "data-latex"],
  input: ["type", "checked"],
};
const SAFE_URL = /^(https?:|mailto:|#|\/)/i;
const SAFE_IMG = /^(https?:|data:image\/(png|jpe?g|gif|webp);)/i;

const defaultParse = (html: string) => new DOMParser().parseFromString(html, "text/html");

export function sanitizeHtml(html: string, parse: (html: string) => Document = defaultParse): string {
  const doc = parse(html);
  const clean = (el: Element) => {
    for (const child of Array.from(el.children)) {
      const tag = child.tagName.toLowerCase();
      if (DROP_WITH_CONTENT.has(tag) || (tag === "input" && child.getAttribute("type") !== "checkbox")) {
        child.remove();
        continue;
      }
      clean(child);
      if (!ALLOWED_TAGS.has(tag)) {
        child.replaceWith(...Array.from(child.childNodes));
        continue;
      }
      const allowed = ALLOWED_ATTRS[tag] ?? [];
      for (const attr of Array.from(child.attributes)) {
        const name = attr.name.toLowerCase();
        const ok =
          allowed.includes(name) &&
          (name !== "href" || SAFE_URL.test(attr.value.trim())) &&
          (name !== "src" || SAFE_IMG.test(attr.value.trim())) &&
          (name !== "class" || /^language-[\w-]+$/.test(attr.value));
        if (!ok) child.removeAttribute(attr.name);
      }
    }
  };
  clean(doc.body);
  return doc.body.innerHTML.trim();
}

const escapeHtml = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string);

export function textToHtml(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${block.split("\n").map(escapeHtml).join("<br>")}</p>`)
    .join("");
}

export const titleFromFilename = (name: string) => name.replace(/\.[^.]+$/, "").trim() || "Imported document";

export async function fileToHtml(file: File): Promise<{ title: string; html: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const title = titleFromFilename(file.name);
  if (ext === "md" || ext === "markdown") {
    // Loaded on use: the markdown pipeline is large and this module sits in every app shell.
    const { markdownToHtml } = await import("./markdown");
    return { title, html: sanitizeHtml(markdownToHtml(await file.text())) };
  }
  if (ext === "html" || ext === "htm") {
    const raw = await file.text();
    const docTitle = defaultParse(raw).title.trim();
    return { title: docTitle || title, html: sanitizeHtml(raw) };
  }
  if (ext === "txt") return { title, html: textToHtml(await file.text()) };
  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
    return { title, html: sanitizeHtml(value) };
  }
  throw new Error("Unsupported file type. Use .md, .html, .txt or .docx");
}
