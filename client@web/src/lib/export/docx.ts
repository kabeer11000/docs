import { PX_PER_IN, type PaperSettings, pageGeometry, sheetInches } from "../paper";
import { mathToMathml } from "./rich-nodes";

const DOCX_CSS = `
[data-page-break] { break-after: page; }
mark { background: #ffe36b; }
pre, code { font-family: Consolas, "Courier New", monospace; }
pre { background: #f1f2f4; }
[data-callout] p { border-left: 3px solid #686e76; background: #f1f2f4; padding-left: 8px; }
[data-callout="tip"] p { border-left-color: #16a34a; background: #eef8f1; }
[data-callout="warning"] p { border-left-color: #d97706; background: #fdf4e7; }
`;

const twip = (inches: number) => Math.round(inches * 1440);

/** Word document with the document's paper size and margins. docx is ~1.5 MB, so it loads on demand. */
export async function htmlToDocx(opts: { html: string; title: string; paper: PaperSettings }): Promise<Blob> {
  const [{ Document, Packer, PageOrientation }, { htmlToContent }] = await Promise.all([import("docx"), import("docx/html")]);
  const { paper } = opts;
  const portrait = sheetInches({ ...paper, orientation: "portrait" });
  const m = paper.margins;
  const doc = new Document({
    title: opts.title,
    sections: [
      {
        properties: {
          page: {
            size: {
              width: twip(portrait.width),
              height: twip(portrait.height),
              orientation: paper.orientation === "landscape" ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
            },
            margin: { top: twip(m.top), right: twip(m.right), bottom: twip(m.bottom), left: twip(m.left) },
          },
        },
        children: [
          ...htmlToContent(mathToMathml(opts.html), {
            stylesheet: DOCX_CSS,
            maxImageWidth: Math.floor((pageGeometry(paper).contentWidth / PX_PER_IN) * 96),
          }),
        ],
      },
    ],
  });
  return Packer.toBlob(doc);
}
