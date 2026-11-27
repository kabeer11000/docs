import { DOMParser as XmlDomParser } from "@xmldom/xmldom";
import JSZip from "jszip";
import { beforeAll, describe, expect, it } from "vitest";
import {
  fitter,
  parseNotesXml,
  parsePresentationXml,
  parseRels,
  parseSlideXml,
  pptxToDeck,
  resolvePart,
  shapesToSlide,
  textBodyToHtml,
} from "./pptx-import";

beforeAll(() => {
  // Node has no DOMParser; xmldom stands in for the browser's.
  globalThis.DOMParser ??= XmlDomParser as unknown as typeof DOMParser;
});

const NS =
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';

const sp = (ph: string | null, paras: string, xfrm = "") =>
  `<p:sp><p:nvSpPr><p:cNvPr id="2" name="s"/><p:cNvSpPr/><p:nvPr>${ph ?? ""}</p:nvPr></p:nvSpPr><p:spPr>${xfrm}</p:spPr><p:txBody><a:bodyPr/>${paras}</p:txBody></p:sp>`;
const xfrm = (x: number, y: number, cx: number, cy: number) =>
  `<a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>`;
const p = (runs: string, pPr = "") => `<a:p>${pPr}${runs}</a:p>`;
const r = (t: string, rPr = "") => `<a:r>${rPr}<a:t>${t}</a:t></a:r>`;
const slideXml = (shapes: string, bg = "") =>
  `<?xml version="1.0"?><p:sld ${NS}><p:cSld>${bg}<p:spTree>${shapes}</p:spTree></p:cSld></p:sld>`;
const pic = (rId: string, box: string) =>
  `<p:pic><p:nvPicPr><p:cNvPr id="4" name="p"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${rId}"/></p:blipFill><p:spPr>${box}</p:spPr></p:pic>`;

const parse = (xml: string) =>
  new DOMParser().parseFromString(xml, "application/xml").documentElement;

describe("textBodyToHtml", () => {
  it("keeps formatting, alignment and groups bullets into lists", () => {
    const body = parse(
      `<p:txBody ${NS}>${p(r("Big", '<a:rPr b="1" i="1" sz="4400"/>') + r(" &amp; red", '<a:rPr u="sng"><a:solidFill><a:srgbClr val="ff0000"/></a:solidFill></a:rPr>'), '<a:pPr algn="ctr"/>')}${p(r("one"), '<a:pPr><a:buChar char="-"/></a:pPr>')}${p(r("two"), '<a:pPr><a:buChar char="-"/></a:pPr>')}${p(r("n1"), '<a:pPr><a:buAutoNum type="arabicPeriod"/></a:pPr>')}${p(r("plain &lt;x&gt;"), "<a:pPr><a:buNone/></a:pPr>")}<a:p/></p:txBody>`,
    );
    const out = textBodyToHtml(body, false);
    expect(out.html).toBe(
      '<p style="text-align: center"><strong><em>Big</em></strong><u><span style="color: #FF0000"> &amp; red</span></u></p>' +
        "<ul><li><p>one</p></li><li><p>two</p></li></ul><ol><li><p>n1</p></li></ol><p>plain &lt;x&gt;</p>",
    );
    expect(out.text).toBe("Big & red\none\ntwo\nn1\nplain <x>");
    expect(out.size).toBe(44);
  });

  it("uses bullets by default in body placeholders, unless switched off", () => {
    const body = parse(
      `<p:txBody ${NS}>${p(r("a"))}${p(r("b"), "<a:pPr><a:buNone/></a:pPr>")}</p:txBody>`,
    );
    expect(textBodyToHtml(body, true).html).toBe(
      "<ul><li><p>a</p></li></ul><p>b</p>",
    );
  });
});

describe("parseSlideXml", () => {
  it("reads placeholders, free text, pictures, groups and the background", () => {
    const xml = slideXml(
      sp('<p:ph type="title"/>', p(r("Hello"))) +
        sp('<p:ph idx="1"/>', p(r("Point"))) +
        sp('<p:ph type="sldNum"/>', p(r("3"))) +
        sp(null, p(r("Note")), xfrm(100, 200, 300, 400)) +
        sp(null, "<a:p/>", xfrm(0, 0, 1, 1)) +
        pic("rId2", xfrm(10, 20, 30, 40)) +
        `<p:grpSp><p:grpSpPr><a:xfrm><a:off x="1000" y="1000"/><a:ext cx="200" cy="200"/><a:chOff x="0" y="0"/><a:chExt cx="100" cy="100"/></a:xfrm></p:grpSpPr>${pic("rId3", xfrm(10, 10, 50, 50))}</p:grpSp>`,
      '<p:bg><p:bgPr><a:solidFill><a:srgbClr val="0e1014"/></a:solidFill></p:bgPr></p:bg>',
    );
    const { shapes, background } = parseSlideXml(xml);
    expect(background).toBe("#0E1014");
    expect(
      shapes.map((s) =>
        s.kind === "text" ? `${s.ph}:${s.text}` : `pic:${s.rId}`,
      ),
    ).toEqual([
      "title:Hello",
      "body:Point",
      "null:Note",
      "pic:rId2",
      "pic:rId3",
    ]);
    expect(shapes[1]).toMatchObject({ html: "<ul><li><p>Point</p></li></ul>" });
    expect(shapes[2]).toMatchObject({
      box: { x: 100, y: 200, w: 300, h: 400 },
    });
    expect(shapes[4]).toMatchObject({
      box: { x: 1020, y: 1020, w: 100, h: 100 },
    });
  });
});

describe("presentation parts", () => {
  it("reads slide order, size, rels and notes", () => {
    expect(
      parsePresentationXml(
        `<p:presentation ${NS}><p:sldIdLst><p:sldId id="257" r:id="rId9"/><p:sldId id="256" r:id="rId2"/></p:sldIdLst><p:sldSz cx="9144000" cy="6858000"/></p:presentation>`,
      ),
    ).toEqual({
      size: { cx: 9144000, cy: 6858000 },
      slideRIds: ["rId9", "rId2"],
    });
    const rels = parseRels(
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="x/image" Target="../media/image1.png"/><Relationship Id="rId2" Type="x/hyperlink" Target="https://x.dev" TargetMode="External"/></Relationships>',
      "ppt/slides/slide1.xml",
    );
    expect([...rels.entries()]).toEqual([
      ["rId1", { target: "ppt/media/image1.png", type: "x/image" }],
    ]);
    expect(resolvePart("ppt", "/ppt/slides/slide2.xml")).toBe(
      "ppt/slides/slide2.xml",
    );
    expect(resolvePart("ppt", "./slides/slide2.xml")).toBe(
      "ppt/slides/slide2.xml",
    );
    expect(
      parseNotesXml(
        `<p:notes ${NS}><p:cSld><p:spTree>${sp('<p:ph type="sldImg"/>', "")}${sp('<p:ph type="body" idx="1"/>', p(r("Say hi")) + p(r("Then go")))}</p:spTree></p:cSld></p:notes>`,
      ),
    ).toBe("Say hi\nThen go");
  });

  it("letterboxes a 4:3 slide onto the 16:9 canvas", () => {
    const fit = fitter({ cx: 9144000, cy: 6858000 });
    expect(fit.box({ x: 0, y: 0, w: 9144000, h: 6858000 })).toEqual({
      x: 12.5,
      y: 0,
      w: 75,
      h: 100,
    });
    expect(fit.pt(18)).toBe(24);
  });
});

describe("shapesToSlide", () => {
  const size = { cx: 12192000, cy: 6858000 };
  const text = (ph: string | null, t: string, idx = 0, x = 0) => ({
    kind: "text" as const,
    ph,
    idx,
    box: { x, y: 0, w: 1219200, h: 685800 },
    html: `<p>${t}</p>`,
    text: t,
  });

  it("picks a layout from the placeholders", () => {
    const layout = (shapes: ReturnType<typeof text>[]) =>
      shapesToSlide({ shapes }, size, new Map(), "").layout;
    expect(layout([text("ctrTitle", "T"), text("subTitle", "S")])).toBe(
      "title",
    );
    expect(layout([text("title", "T")])).toBe("section");
    expect(layout([text("title", "T"), text("body", "B")])).toBe("title-body");
    expect(
      layout([
        text("title", "T"),
        text("body", "R", 2, 600),
        text("body", "L", 1, 10),
      ]),
    ).toBe("two-column");
    expect(
      layout([
        text("title", "T"),
        text("body", "1"),
        text("body", "2"),
        text("body", "3"),
      ]),
    ).toBe("three-column");
    expect(layout([text("body", "B")])).toBe("blank");
  });

  it("fills regions, sorts columns by position and keeps free shapes", () => {
    const slide = shapesToSlide(
      {
        shapes: [
          text("title", "T"),
          text("body", "R", 2, 6000000),
          text("body", "L", 1, 10),
          text(null, "Free"),
          { kind: "pic", rId: "rId5", box: null },
          { kind: "pic", rId: "gone", box: null },
        ],
        background: "#FFFFFF",
      },
      size,
      new Map([["rId5", "data:image/png;base64,AA"]]),
      "notes",
    );
    expect(slide).toMatchObject({
      layout: "two-column",
      notes: "notes",
      background: "#FFFFFF",
      html: { title: "<p>T</p>", left: "<p>L</p>", right: "<p>R</p>" },
    });
    expect(slide.elements).toEqual([
      expect.objectContaining({
        type: "text",
        html: "<p>Free</p>",
        x: 0,
        y: 0,
        w: 10,
        h: 10,
      }),
      expect.objectContaining({
        type: "image",
        src: "data:image/png;base64,AA",
      }),
    ]);
  });
});

describe("pptxToDeck", () => {
  const rel = (id: string, type: string, target: string) =>
    `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"/>`;
  const rels = (inner: string) =>
    `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${inner}</Relationships>`;

  it("reads a whole presentation in show order with images and notes", async () => {
    const zip = new JSZip();
    zip.file(
      "ppt/presentation.xml",
      `<?xml version="1.0"?><p:presentation ${NS}><p:sldIdLst><p:sldId id="256" r:id="rId3"/><p:sldId id="257" r:id="rId2"/></p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/></p:presentation>`,
    );
    zip.file(
      "ppt/_rels/presentation.xml.rels",
      rels(
        rel("rId2", "slide", "slides/slide1.xml") +
          rel("rId3", "slide", "slides/slide2.xml"),
      ),
    );
    zip.file(
      "ppt/slides/slide1.xml",
      slideXml(
        sp('<p:ph type="title"/>', p(r("Second"))) +
          pic("rId1", xfrm(0, 0, 6096000, 3429000)),
      ),
    );
    zip.file(
      "ppt/slides/_rels/slide1.xml.rels",
      rels(
        rel("rId1", "image", "../media/image1.png") +
          rel("rId4", "notesSlide", "../notesSlides/notesSlide1.xml"),
      ),
    );
    zip.file("ppt/media/image1.png", "iVBORw0KGgo=", { base64: true });
    zip.file(
      "ppt/notesSlides/notesSlide1.xml",
      `<p:notes ${NS}><p:cSld><p:spTree>${sp('<p:ph type="body"/>', p(r("Remember")))}</p:spTree></p:cSld></p:notes>`,
    );
    zip.file(
      "ppt/slides/slide2.xml",
      slideXml(
        sp('<p:ph type="ctrTitle"/>', p(r("First"))) +
          sp('<p:ph type="subTitle" idx="1"/>', p(r("Sub"))),
      ),
    );
    const deck = await pptxToDeck(
      await zip.generateAsync({ type: "arraybuffer" }),
    );
    expect(deck.theme).toBe("paper");
    expect(deck.slides).toHaveLength(2);
    expect(deck.slides[0]).toMatchObject({
      layout: "title",
      html: { title: "<p>First</p>", subtitle: "<p>Sub</p>" },
      notes: "",
    });
    expect(deck.slides[1]).toMatchObject({
      layout: "title-body",
      html: { title: "<p>Second</p>" },
      notes: "Remember",
    });
    expect(deck.slides[1].elements[0]).toMatchObject({
      type: "image",
      x: 0,
      y: 0,
      w: 50,
      h: 50,
      src: "data:image/png;base64,iVBORw0KGgo=",
    });
  });

  it("rejects files that are not presentations", async () => {
    const zip = new JSZip();
    zip.file("word/document.xml", "<w/>");
    await expect(
      pptxToDeck(await zip.generateAsync({ type: "arraybuffer" })),
    ).rejects.toThrow(/not a PowerPoint/);
  });
});
