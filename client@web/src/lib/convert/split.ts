import { isSafeImageSrc } from "@/lib/slides/model";

/** One slide before normalizeDeck: a layout and its region HTML. */
export interface DraftSlide {
  layout: "title" | "title-body" | "section" | "image" | "two-column";
  html: Record<string, string>;
}

/** Blocks per slide before the section continues on a new slide. */
export const MAX_BLOCKS = 7;

const escapeHtml = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string);
const defaultParse = (html: string) => new DOMParser().parseFromString(html, "text/html");

interface Section {
  title: string;
  level: 0 | 1 | 2;
  blocks: string[];
  images: string[];
}

/** Body blocks a slide can show: paragraphs, lists and quotes as-is; minor headings as bold lines. */
function toBlocks(el: Element, images: string[]): string[] {
  for (const img of Array.from(el.querySelectorAll("img"))) {
    const src = img.getAttribute("src");
    if (isSafeImageSrc(src)) images.push(src);
  }
  const tag = el.tagName.toLowerCase();
  if (tag === "img") {
    const src = el.getAttribute("src");
    if (isSafeImageSrc(src)) images.push(src);
    return [];
  }
  const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  if (/^h[3-6]$/.test(tag)) return text ? [`<p><strong>${escapeHtml(text)}</strong></p>`] : [];
  if (tag === "ul" || tag === "ol" || tag === "blockquote" || tag === "p") {
    const clone = el.cloneNode(true) as Element;
    for (const img of Array.from(clone.querySelectorAll("img"))) img.remove();
    return (clone.textContent ?? "").trim() ? [clone.outerHTML] : [];
  }
  if (tag === "div" || tag === "section" || tag === "article") return Array.from(el.children).flatMap((c) => toBlocks(c, images));
  // Tables, code and anything else: their text as a paragraph.
  return text ? [`<p>${escapeHtml(text)}</p>`] : [];
}

/** Splits document HTML on H1/H2 into slides: heading = title, following blocks = body, images carried over. */
export function docHtmlToSlides(html: string, docTitle: string, parse: (html: string) => Document = defaultParse): DraftSlide[] {
  const body = parse(html).body;
  const sections: Section[] = [{ title: docTitle, level: 0, blocks: [], images: [] }];
  for (const el of Array.from(body.children)) {
    const tag = el.tagName.toLowerCase();
    if (tag === "h1" || tag === "h2") {
      sections.push({ title: (el.textContent ?? "").replace(/\s+/g, " ").trim(), level: tag === "h1" ? 1 : 2, blocks: [], images: [] });
      continue;
    }
    const current = sections[sections.length - 1];
    current.blocks.push(...toBlocks(el, current.images));
  }

  const slides: DraftSlide[] = [];
  const [intro, ...rest] = sections;
  // Opening slide: the document title, with the text before the first heading (or the first H1 if it leads).
  const lead = !intro.blocks.length && !intro.images.length && rest[0]?.level === 1 ? rest.shift() : undefined;
  const opening = lead ?? intro;
  if (opening.blocks.length <= 1 && !opening.images.length) {
    slides.push({ layout: "title", html: { title: `<h1>${escapeHtml(opening.title || docTitle)}</h1>`, subtitle: opening.blocks[0] ?? "" } });
  } else {
    rest.unshift(opening);
  }

  for (const s of rest) {
    const title = `<h1>${escapeHtml(s.title)}</h1>`;
    const image = s.images[0] ? `<img src="${s.images[0].replace(/"/g, "&quot;")}">` : "";
    if (!s.blocks.length) {
      slides.push(image ? { layout: "image", html: { title, image } } : { layout: "section", html: { title } });
      continue;
    }
    for (let i = 0; i < s.blocks.length; i += MAX_BLOCKS) {
      const text = s.blocks.slice(i, i + MAX_BLOCKS).join("");
      const t = i ? `<h1>${escapeHtml(s.title)} (continued)</h1>` : title;
      slides.push(image && i === 0 ? { layout: "two-column", html: { title: t, left: text, right: image } } : { layout: "title-body", html: { title: t, body: text } });
    }
  }
  return slides;
}
