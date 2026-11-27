import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { common, createLowlight } from "lowlight";
import { describe, expect, it } from "vitest";
import { CodeBlock, highlightDoc } from "./code-block";

const schema = getSchema([StarterKit.configure({ codeBlock: false }), CodeBlock]);
const ll = createLowlight(common);
const code = (text: string, language: string | null) => schema.nodes.codeBlock.create({ language }, schema.text(text));

describe("code highlighting", () => {
  it("decorates tokens at their exact positions", () => {
    const doc = schema.nodes.doc.create(null, [schema.nodes.paragraph.create(null, schema.text("intro")), code("const a = 1", "javascript")]);
    const decos = highlightDoc(doc, "codeBlock", ll).find();
    const start = doc.child(0).nodeSize + 1;
    expect(decos.length).toBeGreaterThan(0);
    // "const" is the first token: it starts right after the code block opens.
    expect(decos[0].from).toBe(start);
    expect(decos[0].to).toBe(start + "const".length);
    expect(doc.textBetween(decos[0].from, decos[0].to)).toBe("const");
  });

  it("leaves documents without code untouched", () => {
    const doc = schema.nodes.doc.create(null, [schema.nodes.paragraph.create(null, schema.text("plain"))]);
    expect(highlightDoc(doc, "codeBlock", ll).find()).toHaveLength(0);
  });

  it("does not throw on an unknown language", () => {
    const doc = schema.nodes.doc.create(null, [code("x = 1", "not-a-language")]);
    expect(() => highlightDoc(doc, "codeBlock", ll)).not.toThrow();
  });
});
