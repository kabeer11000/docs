import JSZip from "jszip";
import {
  type Deck,
  type Layout,
  newSlideId,
  normalizeDeck,
  type Slide,
  type SlideElement,
} from "./model";
import { SLIDE_H, SLIDE_W } from "./styles";

/**
 * PowerPoint (.pptx) import: slide order from presentation.xml, text frames (title/body by placeholder type,
 * paragraphs, bullets, bold/italic/underline/colour), pictures as free images, notes, solid backgrounds.
 * Any slide size is fitted onto the 16:9 canvas without distortion. Parsing is namespace-agnostic (localName),
 * so it runs on the browser's DOMParser and on xmldom in tests.
 */

const EMU_PER_PT = 12700;
const IMAGE_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  svg: "image/svg+xml",
};

type El = Element;

const parseXml = (xml: string): Document =>
  new DOMParser().parseFromString(xml, "application/xml");
const kids = (el: El | null | undefined, name: string): El[] =>
  el
    ? Array.from(el.childNodes).filter(
        (n): n is El => n.nodeType === 1 && (n as El).localName === name,
      )
    : [];
const kid = (el: El | null | undefined, name: string): El | null =>
  kids(el, name)[0] ?? null;
const at = (el: El | null | undefined, ...names: string[]) =>
  names.reduce<El | null>((e, n) => kid(e, n), el ?? null);
const relAttr = (el: El | null, name: string) =>
  el?.getAttribute(`r:${name}`) ||
  el?.getAttributeNS(
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    name,
  ) ||
  "";

/** Box in EMU. */
export interface EmuBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ParsedShape =
  | {
      kind: "text";
      ph: string | null;
      idx: number;
      box: EmuBox | null;
      html: string;
      text: string;
      size?: number;
    }
  | { kind: "pic"; rId: string; box: EmuBox | null };

type Transform = (b: EmuBox) => EmuBox;
const identity: Transform = (b) => b;

function readXfrm(xfrm: El | null): EmuBox | null {
  const off = kid(xfrm, "off");
  const ext = kid(xfrm, "ext");
  if (!off || !ext) return null;
  return {
    x: Number(off.getAttribute("x")) || 0,
    y: Number(off.getAttribute("y")) || 0,
    w: Number(ext.getAttribute("cx")) || 0,
    h: Number(ext.getAttribute("cy")) || 0,
  };
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function runHtml(r: El): string {
  const text = kids(r, "t")
    .map((t) => t.textContent ?? "")
    .join("");
  if (!text) return "";
  const pr = kid(r, "rPr");
  let html = esc(text);
  const color = at(pr, "solidFill", "srgbClr")?.getAttribute("val");
  if (color && /^[0-9a-f]{6}$/i.test(color))
    html = `<span style="color: #${color.toUpperCase()}">${html}</span>`;
  const on = (a: string) => {
    const v = pr?.getAttribute(a);
    return v === "1" || v === "true";
  };
  if (pr?.getAttribute("strike") && pr.getAttribute("strike") !== "noStrike")
    html = `<s>${html}</s>`;
  if (pr?.getAttribute("u") && pr.getAttribute("u") !== "none")
    html = `<u>${html}</u>`;
  if (on("i")) html = `<em>${html}</em>`;
  if (on("b")) html = `<strong>${html}</strong>`;
  return html;
}

/** A text body's paragraphs as editor HTML; consecutive bullet paragraphs become one list. */
export function textBodyToHtml(
  txBody: El | null,
  defaultBullets: boolean,
): { html: string; text: string; size?: number } {
  const out: string[] = [];
  const lines: string[] = [];
  let list: "ul" | "ol" | null = null;
  let size: number | undefined;
  for (const p of kids(txBody, "p")) {
    const pPr = kid(p, "pPr");
    const bullet = kid(pPr, "buNone")
      ? null
      : kid(pPr, "buAutoNum")
        ? "ol"
        : kid(pPr, "buChar") || defaultBullets
          ? "ul"
          : null;
    let inner = "";
    let text = "";
    for (const c of Array.from(p.childNodes) as El[]) {
      if (c.nodeType !== 1) continue;
      if (c.localName === "r" || c.localName === "fld") {
        inner += runHtml(c);
        text += kids(c, "t")
          .map((t) => t.textContent ?? "")
          .join("");
        const sz = Number(kid(c, "rPr")?.getAttribute("sz"));
        if (!size && sz) size = sz / 100;
      } else if (c.localName === "br") {
        inner += "<br>";
        text += "\n";
      }
    }
    lines.push(text);
    const algn = pPr?.getAttribute("algn");
    const style =
      algn === "ctr"
        ? ' style="text-align: center"'
        : algn === "r"
          ? ' style="text-align: right"'
          : "";
    const tag = bullet && text.trim() ? bullet : null;
    if (tag !== list) {
      if (list) out.push(`</${list}>`);
      if (tag) out.push(`<${tag}>`);
      list = tag;
    }
    out.push(
      tag ? `<li><p${style}>${inner}</p></li>` : `<p${style}>${inner}</p>`,
    );
  }
  if (list) out.push(`</${list}>`);
  // Trailing empty paragraphs are layout padding in PowerPoint.
  let html = out.join("");
  while (html.endsWith("<p></p>")) html = html.slice(0, -7);
  return { html, text: lines.join("\n").trim(), size };
}

const SKIP_PH = new Set(["dt", "ftr", "sldNum", "hdr", "sldImg"]);

function walk(tree: El, tf: Transform, out: ParsedShape[]) {
  for (const node of Array.from(tree.childNodes) as El[]) {
    if (node.nodeType !== 1) continue;
    if (node.localName === "sp") {
      const ph = at(node, "nvSpPr", "nvPr", "ph");
      const type = ph ? ph.getAttribute("type") || "body" : null;
      if (type && SKIP_PH.has(type)) continue;
      const box = readXfrm(at(node, "spPr", "xfrm"));
      const { html, text, size } = textBodyToHtml(
        kid(node, "txBody"),
        type === "body" || type === "obj",
      );
      if (!text) continue;
      out.push({
        kind: "text",
        ph: type,
        idx: Number(ph?.getAttribute("idx")) || 0,
        box: box && tf(box),
        html,
        text,
        ...(size ? { size } : {}),
      });
    } else if (node.localName === "pic") {
      const rId = relAttr(at(node, "blipFill", "blip"), "embed");
      const box = readXfrm(at(node, "spPr", "xfrm"));
      if (rId) out.push({ kind: "pic", rId, box: box && tf(box) });
    } else if (node.localName === "grpSp") {
      // Children are placed in the group's own coordinate space (chOff/chExt), mapped onto off/ext.
      const xfrm = at(node, "grpSpPr", "xfrm");
      const outer = readXfrm(xfrm);
      const chOff = kid(xfrm, "chOff");
      const chExt = kid(xfrm, "chExt");
      let child = tf;
      if (outer && chOff && chExt) {
        const cx = Number(chOff.getAttribute("x")) || 0;
        const cy = Number(chOff.getAttribute("y")) || 0;
        const sx = outer.w / (Number(chExt.getAttribute("cx")) || outer.w || 1);
        const sy = outer.h / (Number(chExt.getAttribute("cy")) || outer.h || 1);
        child = (b) =>
          tf({
            x: outer.x + (b.x - cx) * sx,
            y: outer.y + (b.y - cy) * sy,
            w: b.w * sx,
            h: b.h * sy,
          });
      }
      walk(node, child, out);
    }
  }
}

/** Shapes and solid background of one slide's XML. */
export function parseSlideXml(xml: string): {
  shapes: ParsedShape[];
  background?: string;
} {
  const doc = parseXml(xml);
  const cSld = kid(doc.documentElement, "cSld");
  const shapes: ParsedShape[] = [];
  const tree = kid(cSld, "spTree");
  if (tree) walk(tree, identity, shapes);
  const bg = at(cSld, "bg", "bgPr", "solidFill", "srgbClr")?.getAttribute(
    "val",
  );
  return {
    shapes,
    ...(bg && /^[0-9a-f]{6}$/i.test(bg)
      ? { background: `#${bg.toUpperCase()}` }
      : {}),
  };
}

/** Plain text of a notes slide (its body placeholder). */
export function parseNotesXml(xml: string): string {
  const shapes: ParsedShape[] = [];
  const tree = kid(kid(parseXml(xml).documentElement, "cSld"), "spTree");
  if (tree) walk(tree, identity, shapes);
  return shapes
    .filter(
      (s): s is Extract<ParsedShape, { kind: "text" }> =>
        s.kind === "text" && s.ph === "body",
    )
    .map((s) => s.text)
    .join("\n")
    .trim();
}

/** Relationship id -> absolute part path (and type) from a .rels file next to `partPath`. */
export function parseRels(
  xml: string,
  partPath: string,
): Map<string, { target: string; type: string }> {
  const dir = partPath.slice(0, partPath.lastIndexOf("/"));
  const map = new Map<string, { target: string; type: string }>();
  for (const r of kids(parseXml(xml).documentElement, "Relationship")) {
    const target = r.getAttribute("Target") ?? "";
    if (r.getAttribute("TargetMode") === "External") continue;
    map.set(r.getAttribute("Id") ?? "", {
      target: resolvePart(dir, target),
      type: r.getAttribute("Type") ?? "",
    });
  }
  return map;
}

export function resolvePart(dir: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const parts = dir ? dir.split("/") : [];
  for (const seg of target.split("/")) {
    if (seg === "..") parts.pop();
    else if (seg && seg !== ".") parts.push(seg);
  }
  return parts.join("/");
}

/** Slide size (EMU) and slide relationship ids in show order. */
export function parsePresentationXml(xml: string): {
  size: { cx: number; cy: number };
  slideRIds: string[];
} {
  const root = parseXml(xml).documentElement;
  const sz = kid(root, "sldSz");
  const size = {
    cx: Number(sz?.getAttribute("cx")) || 12192000,
    cy: Number(sz?.getAttribute("cy")) || 6858000,
  };
  return {
    size,
    slideRIds: kids(kid(root, "sldIdLst"), "sldId").map((s) =>
      relAttr(s, "id"),
    ),
  };
}

/** Maps EMU boxes on a slide of `size` onto the 1280x720 canvas in percent, letterboxed. */
export function fitter(size: { cx: number; cy: number }) {
  const k = Math.min(SLIDE_W / size.cx, SLIDE_H / size.cy);
  const ox = (SLIDE_W - size.cx * k) / 2;
  const oy = (SLIDE_H - size.cy * k) / 2;
  const r = (v: number) => Math.round(v * 100) / 100;
  return {
    box: (b: EmuBox) => ({
      x: r(((ox + b.x * k) / SLIDE_W) * 100),
      y: r(((oy + b.y * k) / SLIDE_H) * 100),
      w: r(((b.w * k) / SLIDE_W) * 100),
      h: r(((b.h * k) / SLIDE_H) * 100),
    }),
    /** Points to canvas pixels. */
    pt: (pt: number) => Math.round(pt * EMU_PER_PT * k),
  };
}

type TextShape = Extract<ParsedShape, { kind: "text" }>;

/** One parsed slide as a deck slide: placeholders fill layout regions, everything else becomes free elements. */
export function shapesToSlide(
  parsed: { shapes: ParsedShape[]; background?: string },
  size: { cx: number; cy: number },
  images: Map<string, string>,
  notes: string,
): Slide {
  const fit = fitter(size);
  const texts = parsed.shapes.filter((s): s is TextShape => s.kind === "text");
  const title = texts.find((s) => s.ph === "title" || s.ph === "ctrTitle");
  const sub = texts.find((s) => s.ph === "subTitle");
  const byX = (a: TextShape, b: TextShape) =>
    a.box && b.box ? a.box.x - b.box.x : a.idx - b.idx;
  const bodies = texts
    .filter((s) => s.ph === "body" || s.ph === "obj")
    .sort(byX);
  const free = texts.filter(
    (s) => s !== title && s !== sub && !bodies.includes(s),
  );
  const pics = parsed.shapes.filter((s) => s.kind === "pic");

  let layout: Layout;
  const html: Record<string, string> = {};
  let slots: string[] = [];
  if (title?.ph === "ctrTitle" || (title && sub && !bodies.length)) {
    layout = "title";
    if (sub) html.subtitle = sub.html;
  } else if (bodies.length >= 3) {
    layout = "three-column";
    slots = ["left", "middle", "right"];
  } else if (bodies.length === 2) {
    layout = "two-column";
    slots = ["left", "right"];
  } else if (bodies.length === 1) {
    layout = title ? "title-body" : "blank";
    slots = ["body"];
  } else if (title && !free.length && !pics.length) layout = "section";
  else layout = title ? "title-body" : "blank";
  if (title) html.title = title.html;
  if (sub && layout !== "title") free.push(sub);
  bodies.forEach((b, i) => {
    if (i < slots.length) html[slots[i]] = b.html;
    else free.push(b);
  });

  const elements: SlideElement[] = [];
  for (const s of parsed.shapes) {
    if (s.kind === "pic") {
      const src = images.get(s.rId);
      if (!src) continue;
      const box = s.box ? fit.box(s.box) : { x: 30, y: 25, w: 40, h: 50 };
      elements.push({ id: newSlideId(), type: "image", ...box, src });
    } else if (free.includes(s) && s.box) {
      elements.push({
        id: newSlideId(),
        type: "text",
        ...fit.box(s.box),
        html: s.html,
        ...(s.size ? { size: fit.pt(s.size) } : {}),
      });
    } else if (free.includes(s)) {
      // Unplaced extra text joins the main text region.
      const key = slots[0] ?? (layout === "title" ? "subtitle" : "body");
      html[key] = (html[key] ?? "") + s.html;
    }
  }
  return {
    id: newSlideId(),
    layout,
    notes,
    html,
    elements,
    ...(parsed.background ? { background: parsed.background } : {}),
  };
}

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(
    (i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

async function mediaToDataUrl(
  zip: JSZip,
  path: string,
): Promise<string | null> {
  const file = zip.file(path);
  const mime = IMAGE_TYPES[path.split(".").pop()?.toLowerCase() ?? ""];
  if (!file || !mime) return null; // emf/wmf/tiff cannot be shown in a browser.
  if (typeof document !== "undefined" && mime !== "image/svg+xml") {
    try {
      const { downscaleImage } = await import(
        "@/components/editor/extensions/image-drop"
      );
      const blob = await file.async("blob");
      return await downscaleImage(
        new File([blob], path.split("/").pop() ?? "image", { type: mime }),
      );
    } catch {
      return null;
    }
  }
  return `data:${mime};base64,${await file.async("base64")}`;
}

/** A .pptx file as deck data (normalized; at least one slide). Throws if the file is not a presentation. */
export async function pptxToDeck(buf: ArrayBuffer): Promise<Deck> {
  const zip = await JSZip.loadAsync(buf);
  const read = (p: string) =>
    zip.file(p)?.async("string") ?? Promise.resolve(null);
  const presXml = await read("ppt/presentation.xml");
  if (!presXml) throw new Error("This file is not a PowerPoint presentation");
  const presRels = parseRels(
    (await read("ppt/_rels/presentation.xml.rels")) ?? "<Relationships/>",
    "ppt/presentation.xml",
  );
  const { size, slideRIds } = parsePresentationXml(presXml);
  const mediaCache = new Map<string, Promise<string | null>>();

  const slides: Slide[] = [];
  for (const rId of slideRIds) {
    const path = presRels.get(rId)?.target;
    const xml = path ? await read(path) : null;
    if (!path || !xml) continue;
    const name = path.split("/").pop() ?? "";
    const rels = parseRels(
      (await read(path.replace(name, `_rels/${name}.rels`))) ??
        "<Relationships/>",
      path,
    );
    const parsed = parseSlideXml(xml);
    const images = new Map<string, string>();
    for (const s of parsed.shapes) {
      if (s.kind !== "pic") continue;
      const target = rels.get(s.rId)?.target;
      if (!target) continue;
      if (!mediaCache.has(target))
        mediaCache.set(target, mediaToDataUrl(zip, target));
      const src = await mediaCache.get(target);
      if (src) images.set(s.rId, src);
    }
    const notesPath = [...rels.values()].find((r) =>
      r.type.endsWith("/notesSlide"),
    )?.target;
    const notesXml = notesPath ? await read(notesPath) : null;
    slides.push(
      shapesToSlide(
        parsed,
        size,
        images,
        notesXml ? parseNotesXml(notesXml) : "",
      ),
    );
  }

  // A dark deck gets the dark theme so text without explicit colours stays readable.
  const bgs = slides.map((s) => s.background).filter((b): b is string => !!b);
  const dark =
    bgs.length > slides.length / 2 &&
    bgs.filter((b) => luminance(b) < 0.4).length > bgs.length / 2;
  return normalizeDeck({
    version: 1,
    aspect: "16:9",
    theme: dark ? "night" : "paper",
    transition: "none",
    slides,
  });
}
