// Builds the downloadable PDF with pdf-lib: page order and rotation, form values flattened, annotations
// drawn as vector content (images embedded), sticky notes kept as real PDF comments.
// Heavy: import this module lazily (`await import("@/lib/pdf/export")`).
import {
  BlendMode,
  degrees,
  PDFBool,
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  type PDFFont,
  PDFHexString,
  PDFName,
  PDFOptionList,
  type PDFPage,
  PDFRadioGroup,
  PDFTextField,
  rgb,
  StandardFonts,
} from "pdf-lib";
import {
  arrowHead,
  NOTE_SIZE,
  TEXT_BASELINE,
  TEXT_LINE_HEIGHT,
} from "./annotations";
import { normRotation, toUser, type UserBox } from "./geometry";
import type {
  Annotation,
  FormValue,
  PdfData,
  Point,
  Rect,
  Rotation,
} from "./model";

const hex = (c: string) => {
  const n = Number.parseInt(c.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

/** Standard fonts only encode WinAnsi; anything else becomes "?". */
// ponytail: no font embedding for non-Latin text; embed a Unicode TTF via @pdf-lib/fontkit if users need it.
export const winAnsi = (s: string) =>
  s.replace(/[^\n\x20-\x7e\xa0-\xff]/g, "?");

const f = (n: number) => Number(n.toFixed(2));
const rectPath = (r: Rect) =>
  `M ${f(r.x)} ${f(r.y)} L ${f(r.x + r.w)} ${f(r.y)} L ${f(r.x + r.w)} ${f(r.y + r.h)} L ${f(r.x)} ${f(r.y + r.h)} Z`;
const linePath = (pts: Point[]) =>
  pts.map(([x, y], i) => `${i ? "L" : "M"} ${f(x)} ${f(y)}`).join(" ");

export function ellipsePath({ x, y, w, h }: Rect): string {
  const k = 0.5523;
  const rx = w / 2;
  const ry = h / 2;
  const cx = x + rx;
  const cy = y + ry;
  return [
    `M ${f(cx - rx)} ${f(cy)}`,
    `C ${f(cx - rx)} ${f(cy - ry * k)} ${f(cx - rx * k)} ${f(cy - ry)} ${f(cx)} ${f(cy - ry)}`,
    `C ${f(cx + rx * k)} ${f(cy - ry)} ${f(cx + rx)} ${f(cy - ry * k)} ${f(cx + rx)} ${f(cy)}`,
    `C ${f(cx + rx)} ${f(cy + ry * k)} ${f(cx + rx * k)} ${f(cy + ry)} ${f(cx)} ${f(cy + ry)}`,
    `C ${f(cx - rx * k)} ${f(cy + ry)} ${f(cx - rx)} ${f(cy + ry * k)} ${f(cx - rx)} ${f(cy)} Z`,
  ].join(" ");
}

function dataUrlBytes(url: string): { bytes: Uint8Array; png: boolean } {
  const [head, b64] = url.split(",", 2);
  const bin = atob(b64 ?? "");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, png: head.includes("image/png") };
}

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
}

/** Draws one annotation on `page`, whose page space has intrinsic rotation `rot` and crop box `box`. */
async function drawAnnotation(
  doc: PDFDocument,
  page: PDFPage,
  rot: Rotation,
  box: UserBox,
  a: Annotation,
  fonts: Fonts,
) {
  const origin = toUser(rot, box, [0, 0]);
  const path = (d: string, opts: Parameters<PDFPage["drawSvgPath"]>[1]) =>
    page.drawSvgPath(d, {
      x: origin[0],
      y: origin[1],
      rotate: degrees(rot),
      ...opts,
    });
  const at = (p: Point) => {
    const [x, y] = toUser(rot, box, p);
    return { x, y, rotate: degrees(rot) };
  };
  switch (a.type) {
    case "highlight":
      for (const r of a.rects)
        path(rectPath(r), {
          color: hex(a.color),
          opacity: 0.4,
          blendMode: BlendMode.Multiply,
        });
      return;
    case "underline":
    case "strike":
      for (const r of a.rects) {
        const y = a.type === "underline" ? r.y + r.h * 0.94 : r.y + r.h * 0.55;
        path(
          linePath([
            [r.x, y],
            [r.x + r.w, y],
          ]),
          {
            borderColor: hex(a.color),
            borderWidth: Math.max(0.75, r.h * 0.07),
          },
        );
      }
      return;
    case "ink":
      path(
        a.points.length === 1
          ? linePath([a.points[0], [a.points[0][0] + 0.01, a.points[0][1]]])
          : linePath(a.points),
        {
          borderColor: hex(a.color),
          borderWidth: a.width,
          borderLineCap: 1, // round
        },
      );
      return;
    case "rect":
    case "ellipse": {
      const d = a.type === "rect" ? rectPath(a.rect) : ellipsePath(a.rect);
      path(d, {
        ...(a.fill ? { color: hex(a.fill) } : {}),
        ...(a.width > 0
          ? { borderColor: hex(a.color), borderWidth: a.width }
          : {}),
      });
      return;
    }
    case "line":
    case "arrow":
      path(linePath([a.from, a.to]), {
        borderColor: hex(a.color),
        borderWidth: a.width,
        borderLineCap: 1,
      });
      if (a.type === "arrow")
        path(`${linePath(arrowHead(a.from, a.to, a.width))} Z`, {
          color: hex(a.color),
        });
      return;
    case "text": {
      if (!a.text.trim()) return;
      page.drawText(winAnsi(a.text), {
        ...at([a.rect.x, a.rect.y + a.size * TEXT_BASELINE]),
        size: a.size,
        font: fonts.regular,
        color: hex(a.color),
        lineHeight: a.size * TEXT_LINE_HEIGHT,
        maxWidth: Math.max(a.rect.w, a.size),
      });
      return;
    }
    case "stamp": {
      const { rect: r } = a;
      path(rectPath(r), {
        borderColor: hex(a.color),
        borderWidth: Math.max(1.5, r.h * 0.06),
      });
      const label = winAnsi(a.label);
      const size = Math.min(
        r.h * 0.5,
        (r.w * 0.86) / Math.max(1, fonts.bold.widthOfTextAtSize(label, 1)),
      );
      const width = fonts.bold.widthOfTextAtSize(label, size);
      page.drawText(label, {
        ...at([r.x + (r.w - width) / 2, r.y + r.h / 2 + size * 0.35]),
        size,
        font: fonts.bold,
        color: hex(a.color),
      });
      return;
    }
    case "image": {
      const { bytes, png } = dataUrlBytes(a.src);
      const image = png ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
      page.drawImage(image, {
        ...at([a.rect.x, a.rect.y + a.rect.h]),
        width: a.rect.w,
        height: a.rect.h,
      });
      return;
    }
    case "note": {
      // A real comment: PDF viewers show the icon and open the text.
      const p1 = toUser(rot, box, a.at);
      const p2 = toUser(rot, box, [a.at[0] + NOTE_SIZE, a.at[1] + NOTE_SIZE]);
      const c = hex(a.color);
      const annot = doc.context.obj({
        Type: "Annot",
        Subtype: "Text",
        Rect: [
          Math.min(p1[0], p2[0]),
          Math.min(p1[1], p2[1]),
          Math.max(p1[0], p2[0]),
          Math.max(p1[1], p2[1]),
        ],
        Contents: PDFHexString.fromText(a.text),
        Name: "Comment",
        C: [c.red, c.green, c.blue],
        F: 4,
      });
      page.node.addAnnot(doc.context.register(annot));
      return;
    }
  }
}

function fillForms(doc: PDFDocument, values: Record<string, FormValue>) {
  let form: ReturnType<PDFDocument["getForm"]>;
  try {
    form = doc.getForm();
  } catch {
    return;
  }
  if (!form.getFields().length) return;
  for (const [name, value] of Object.entries(values)) {
    const field = form.getFieldMaybe(name);
    if (!field) continue;
    const list = Array.isArray(value)
      ? value
      : typeof value === "string"
        ? [value]
        : [];
    try {
      if (field instanceof PDFTextField)
        field.setText(Array.isArray(value) ? value.join(", ") : String(value));
      else if (field instanceof PDFCheckBox)
        value === true ||
        (typeof value === "string" && value !== "Off" && value !== "")
          ? field.check()
          : field.uncheck();
      else if (field instanceof PDFRadioGroup) {
        const pick = list.find((v) => field.getOptions().includes(v));
        if (pick) field.select(pick);
      } else if (
        field instanceof PDFDropdown ||
        field instanceof PDFOptionList
      ) {
        const options = field.getOptions();
        const picks = list.filter((v) => options.includes(v));
        if (picks.length)
          field.select(field instanceof PDFDropdown ? picks[0] : picks);
      }
    } catch (e) {
      console.warn("[pdf] could not fill field", name, e);
    }
  }
  try {
    form.flatten();
  } catch (e) {
    // Fields stay interactive with the values set; viewers regenerate their appearance.
    console.warn("[pdf] could not flatten the form", e);
    form.acroForm.dict.set(PDFName.of("NeedAppearances"), PDFBool.True);
  }
}

const load = (bytes: Uint8Array) =>
  PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });

export interface ExportOptions {
  /** Only these pages, in file order (extract and split). Default: every page. */
  pageIds?: string[];
  title?: string;
}

/** The edited file as PDF bytes. `original` is the stored blob (null for a file of only blank pages). */
export async function exportPdf(
  original: Uint8Array | null,
  data: PdfData,
  opts: ExportOptions = {},
): Promise<Uint8Array> {
  const wanted = opts.pageIds ? new Set(opts.pageIds) : null;
  const refs = data.pages.filter((p) => !wanted || wanted.has(p.id));
  if (!refs.length) throw new Error("There are no pages to export");

  const out = await PDFDocument.create();
  if (opts.title) out.setTitle(opts.title);
  const fonts: Fonts = {
    regular: await out.embedFont(StandardFonts.Helvetica),
    bold: await out.embedFont(StandardFonts.HelveticaBold),
  };

  // Copy each source page once in a batch (shared resources stay shared); repeats get their own copy
  // so drawing on one duplicate never writes into the other's content.
  const copies = new Map<number, PDFPage[]>();
  if (refs.some((r) => r.src >= 0)) {
    if (!original) throw new Error("The original PDF is not loaded");
    const src = await load(original);
    fillForms(src, data.forms);
    const unique = [
      ...new Set(refs.filter((r) => r.src >= 0).map((r) => r.src)),
    ];
    const batch = await out.copyPages(src, unique);
    unique.forEach((s, i) => {
      copies.set(s, [batch[i]]);
    });
    const seen = new Map<number, number>();
    for (const r of refs) {
      if (r.src < 0) continue;
      const n = (seen.get(r.src) ?? 0) + 1;
      seen.set(r.src, n);
      if (n > 1)
        copies.get(r.src)?.push(...(await out.copyPages(src, [r.src])));
    }
  }

  const used = new Map<number, number>();
  for (const ref of refs) {
    let page: PDFPage;
    let rot: Rotation = 0;
    let box: UserBox;
    if (ref.src < 0) {
      const [w, h] = ref.size ?? [612, 792];
      page = out.addPage([w, h]);
      box = { x: 0, y: 0, w, h };
    } else {
      const n = used.get(ref.src) ?? 0;
      used.set(ref.src, n + 1);
      const copied = copies.get(ref.src)?.[n];
      if (!copied)
        throw new Error(`Page ${ref.src + 1} is missing from the original`);
      page = out.addPage(copied);
      rot = normRotation(page.getRotation().angle);
      const c = page.getCropBox();
      box = { x: c.x, y: c.y, w: c.width, h: c.height };
    }
    for (const a of data.annotations)
      if (a.pageId === ref.id)
        await drawAnnotation(out, page, rot, box, a, fonts);
    page.setRotation(degrees(normRotation(rot + ref.rotation)));
  }
  return out.save({ updateFieldAppearances: false });
}

/** Appends every page of `other` to `original`; the existing page indexes stay valid. */
export async function appendPdf(
  original: Uint8Array,
  other: Uint8Array,
): Promise<{ bytes: Uint8Array; start: number; count: number }> {
  const doc = await load(original);
  const extra = await load(other);
  const start = doc.getPageCount();
  const pages = await doc.copyPages(extra, extra.getPageIndices());
  for (const p of pages) doc.addPage(p);
  return {
    bytes: await doc.save({ updateFieldAppearances: false }),
    start,
    count: pages.length,
  };
}
