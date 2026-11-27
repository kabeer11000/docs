import { describe, expect, it } from "vitest";
import { htmlToMarkdown, markdownToHtml } from "./markdown";

describe("htmlToMarkdown", () => {
  it("converts headings and paragraphs", () => {
    expect(htmlToMarkdown("<h1>Title</h1><p>Body text</p><h2>Sub</h2><h3>Third</h3>")).toBe(
      "# Title\n\nBody text\n\n## Sub\n\n### Third\n",
    );
  });

  it("converts marks and links", () => {
    const md = htmlToMarkdown(
      '<p><strong>bold</strong> <em>it</em> <s>gone</s> <code>x()</code> <a href="https://a.b/c">link</a></p>',
    );
    expect(md).toBe("**bold** *it* ~~gone~~ `x()` [link](https://a.b/c)\n");
  });

  it("converts nested lists (editor markup with <p> in <li>)", () => {
    const md = htmlToMarkdown(
      "<ul><li><p>one</p><ul><li><p>child</p></li></ul></li><li><p>two</p></li></ul><ol><li><p>first</p></li><li><p>second</p></li></ol>",
    );
    expect(md).toMatch(/^- one\n {2,4}- child\n- two\n\n1\. first\n2\. second\n$/);
  });

  it("converts editor task lists", () => {
    const html =
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>done</p></div></li>' +
      '<li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>todo</p></div></li></ul>';
    expect(htmlToMarkdown(html)).toBe("- [x] done\n- [ ] todo\n");
  });

  it("converts editor tables with a header row", () => {
    const html =
      "<table><tbody><tr><th><p>Name</p></th><th><p>Qty</p></th></tr><tr><td><p>Apple</p></td><td><p>3</p></td></tr></tbody></table>";
    expect(htmlToMarkdown(html)).toBe("| Name | Qty |\n| --- | --- |\n| Apple | 3 |\n");
  });

  it("converts code blocks with language, quotes, rules and images", () => {
    const md = htmlToMarkdown(
      '<pre><code class="language-ts">const a = 1;\n</code></pre><blockquote><p>quoted</p></blockquote><hr><p><img src="https://x.y/i.png" alt="pic"></p>',
    );
    expect(md).toBe("```ts\nconst a = 1;\n```\n\n> quoted\n\n---\n\n![pic](https://x.y/i.png)\n");
  });

  it("keeps page breaks as raw html", () => {
    expect(htmlToMarkdown('<p>a</p><div data-page-break="true"></div><p>b</p>')).toContain('<div data-page-break="true"></div>');
  });
});

describe("markdownToHtml", () => {
  it("parses headings, marks, links and code", () => {
    const html = markdownToHtml("# Hi\n\nSome **bold** and ~~old~~ [x](https://e.com)\n\n```js\nlet a\n```\n");
    expect(html).toContain("<h1>Hi</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<del>old</del>");
    expect(html).toContain('<a href="https://e.com">x</a>');
    expect(html).toContain('<pre><code class="language-js">let a\n</code></pre>');
  });

  it("emits editor task list markup", () => {
    const html = markdownToHtml("- [x] done\n- [ ] todo\n");
    expect(html).toBe(
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="true">done</li><li data-type="taskItem" data-checked="false">todo</li></ul>',
    );
  });

  it("parses tables", () => {
    const html = markdownToHtml("| a | b |\n| - | - |\n| 1 | 2 |\n");
    expect(html).toContain("<th>a</th>");
    expect(html).toContain("<td>2</td>");
  });

  it("drops raw html (no script injection)", () => {
    const html = markdownToHtml('hello <script>alert(1)</script> <img src=x onerror="alert(1)">');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror");
  });
});

describe("round trip md -> html -> md", () => {
  const cases = [
    "# Title\n\nParagraph with **bold**, *italic*, ~~strike~~ and `code`.\n",
    "- one\n- two\n\n1. first\n2. second\n",
    "- [x] done\n- [ ] todo\n",
    "| Name | Qty |\n| --- | --- |\n| Apple | 3 |\n",
    "```ts\nconst a = 1;\n```\n",
    "> quoted\n\n---\n\n[link](https://example.com) and ![img](https://example.com/a.png)\n",
  ];
  for (const md of cases) {
    it(JSON.stringify(md.slice(0, 24)), () => {
      expect(htmlToMarkdown(markdownToHtml(md))).toBe(md);
    });
  }
});

describe("rich blocks to markdown", () => {
  it("keeps the code block language", () => {
    expect(htmlToMarkdown('<pre><code class="language-python">print(1)\n</code></pre>')).toBe("```python\nprint(1)\n```\n");
  });

  it("writes highlights, sub and superscript", () => {
    expect(htmlToMarkdown("<p><mark>key</mark> H<sub>2</sub>O x<sup>2</sup></p>")).toBe("==key== H<sub>2</sub>O x<sup>2</sup>\n");
  });

  it("writes callouts as GitHub alerts", () => {
    expect(htmlToMarkdown('<div data-callout="warning" class="callout"><p>Careful</p><p>Two</p></div><p>after</p>')).toBe(
      "> [!WARNING]\n> Careful\n> \n> Two\n\nafter\n",
    );
  });

  it("writes inline and block math", () => {
    const html =
      '<p>Energy <span data-latex="E = mc^2" data-type="inline-math"></span> here, <span data-latex="a_1 &lt; b" data-type="inline-math"></span></p><div data-latex="\\sum_i x_i" data-type="block-math"></div>';
    expect(htmlToMarkdown(html)).toBe("Energy $E = mc^2$ here, $a_1 < b$\n\n$$\n\\sum_i x_i\n$$\n");
  });
});

describe("embeds and diagrams to markdown", () => {
  const embed =
    '<div data-embed="YouTube" class="embed" style="--embed-aspect: 16/9"><iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" title="YouTube" sandbox="allow-scripts"></iframe>' +
    '<a class="embed-link" href="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" target="_blank" rel="noopener noreferrer">YouTube</a></div>';

  it("writes an embed as a link", () => {
    expect(htmlToMarkdown(`<p>before</p>${embed}<p>after</p>`)).toBe(
      "before\n\n[YouTube](https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ)\n\nafter\n",
    );
  });

  it("writes a diagram as a mermaid fence and reads it back as one", () => {
    const html = '<div data-diagram="" class="diagram"><pre><code class="language-mermaid">flowchart LR\n  A --&gt; B</code></pre></div>';
    const md = htmlToMarkdown(html);
    expect(md).toBe("```mermaid\nflowchart LR\n  A --> B\n```\n");
    expect(markdownToHtml(md)).toContain('<code class="language-mermaid">');
  });
});
