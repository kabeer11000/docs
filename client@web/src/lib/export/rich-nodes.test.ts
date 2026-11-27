import { describe, expect, it } from "vitest";
import { diagramSvgs, diagramsToSvg, mathToMathml, replaceMath } from "./rich-nodes";

describe("mathToMathml", () => {
  it("renders inline and block math nodes as MathML", () => {
    const out = mathToMathml(
      '<p>a <span data-latex="x &lt; y" data-type="inline-math"></span></p><div data-type="block-math" data-latex="\\frac{1}{2}"></div>',
    );
    expect(out).toContain('<span data-type="inline-math"><span class="katex"><math');
    expect(out).toContain('<annotation encoding="application/x-tex">x &lt; y</annotation>');
    expect(out).toContain('<div data-type="block-math"><span class="katex"><math');
    expect(out).toContain('display="block"');
    expect(out).toContain("<mfrac>");
    expect(out).not.toContain("data-latex");
  });

  it("leaves other HTML alone and survives bad LaTeX", () => {
    expect(mathToMathml("<p>$5 and <span>x</span></p>")).toBe("<p>$5 and <span>x</span></p>");
    expect(mathToMathml('<span data-latex="\\frac{" data-type="inline-math"></span>')).toContain("katex-error");
  });
});

describe("replaceMath", () => {
  it("decodes the attribute and reports block vs inline", () => {
    const seen: [string, boolean][] = [];
    replaceMath('<span data-latex="a &amp; &quot;b&quot;" data-type="inline-math"></span><div data-latex="c" data-type="block-math"></div>', (l, b) => {
      seen.push([l, b]);
      return "";
    });
    expect(seen).toEqual([
      ['a & "b"', false],
      ["c", true],
    ]);
  });
});

describe("diagramsToSvg", () => {
  it("swaps diagrams the editor rendered for their SVG and leaves the rest", () => {
    diagramSvgs.set("graph TD\n  A --> B", "<svg id=\"x\"></svg>");
    const html =
      '<div data-diagram="" class="diagram"><pre><code class="language-mermaid">graph TD\n  A --&gt; B</code></pre></div>' +
      '<div data-diagram="" class="diagram"><pre><code class="language-mermaid">pie</code></pre></div>';
    expect(diagramsToSvg(html)).toBe(
      '<div data-diagram=""><svg id="x"></svg></div><div data-diagram="" class="diagram"><pre><code class="language-mermaid">pie</code></pre></div>',
    );
  });
});
