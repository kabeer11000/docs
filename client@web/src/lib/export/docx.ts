import { PX_PER_IN, type PaperSettings, pageGeometry, sheetInches } from "../paper";

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
          ...htmlToContent(opts.html, {
            stylesheet: "[data-page-break] { break-after: page; }",
            maxImageWidth: Math.floor((pageGeometry(paper).contentWidth / PX_PER_IN) * 96),
          }),
        ],
      },
    ],
  });
  return Packer.toBlob(doc);
}
