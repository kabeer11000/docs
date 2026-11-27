// turndown's DOM implementation, so tests need no browser environment.
// @ts-expect-error its .d.ts declares module "domino" rather than the package name
import domino from "@mixmark-io/domino";
import { describe, expect, it } from "vitest";
import { sanitizeHtml, textToHtml, titleFromFilename } from "./import";
import { htmlToText } from "./standalone-html";

const parse = (html: string) => (domino as { createDocument(h: string): Document }).createDocument(html);

describe("sanitizeHtml", () => {
  it("drops scripts, handlers and unsafe urls", () => {
    const out = sanitizeHtml(
      '<p onclick="x()">Hi <a href="javascript:alert(1)">bad</a> <a href="https://ok.com">ok</a></p><script>alert(1)</script><img src="x" onerror="alert(1)"><iframe src="https://e.com"></iframe>',
      parse,
    );
    expect(out).toBe('<p>Hi <a>bad</a> <a href="https://ok.com">ok</a></p><img>');
  });

  it("unwraps unknown tags but keeps structure the editor understands", () => {
    const out = sanitizeHtml(
      '<section><h2 style="color:red">T</h2><font>x</font></section><ul data-type="taskList"><li data-type="taskItem" data-checked="true">a</li></ul><pre><code class="language-js">1</code></pre>',
      parse,
    );
    expect(out).toBe('<h2>T</h2>x<ul data-type="taskList"><li data-type="taskItem" data-checked="true">a</li></ul><pre><code class="language-js">1</code></pre>');
  });
});

it("keeps callout and math attributes", () => {
  const html = '<div data-callout="tip" onclick="x()"><p>t</p></div><span data-type="inline-math" data-latex="x" style="color:red"></span>';
  expect(sanitizeHtml(html, parse)).toBe('<div data-callout="tip"><p>t</p></div><span data-type="inline-math" data-latex="x"></span>');
});

describe("textToHtml", () => {
  it("makes paragraphs and line breaks, escaping markup", () => {
    expect(textToHtml("a <b>\nb\r\n\r\nc")).toBe("<p>a &lt;b&gt;<br>b</p><p>c</p>");
  });
});

describe("htmlToText", () => {
  it("keeps block structure and list markers", () => {
    const text = htmlToText(
      '<h1>T</h1><p>Body</p><ul><li><p>one</p><ul><li><p>deep</p></li></ul></li></ul><ol><li><p>first</p></li><li><p>second</p></li></ol>' +
        '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><div><p>done</p></div></li></ul><blockquote><p>q</p></blockquote>' +
        "<table><tbody><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></tbody></table>",
      parse,
    );
    expect(text).toBe("T\n\nBody\n\n- one\n  - deep\n1. first\n2. second\n[x] done\n\nq\n\na\tb\nc\td\n");
  });

  it("writes math as its LaTeX and reads inside callouts", () => {
    const text = htmlToText(
      '<p>So <span data-latex="x^2" data-type="inline-math"></span>.</p><div data-latex="a+b" data-type="block-math"></div><div data-callout="tip"><p>hint</p></div>',
      parse,
    );
    expect(text).toBe("So x^2.\n\na+b\n\nhint\n");
  });

  it("writes embeds as their title and address", () => {
    const text = htmlToText('<div data-embed="Loom"><iframe src="https://www.loom.com/embed/x"></iframe><a class="embed-link" href="https://www.loom.com/embed/x">Loom</a></div>', parse);
    expect(text).toBe("Loom: https://www.loom.com/embed/x\n");
  });
});

it("derives a title from the file name", () => {
  expect(titleFromFilename("Notes 2026.md")).toBe("Notes 2026");
  expect(titleFromFilename(".md")).toBe("Imported document");
});
