// @ts-expect-error its .d.ts declares module "domino" rather than the package name
import domino from "@mixmark-io/domino";
import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it, vi } from "vitest";

const { createDocument } = domino as { createDocument(h: string): Document };
vi.stubGlobal("document", createDocument("<html><body></body></html>"));
vi.stubGlobal("window", { DOMParser: class { parseFromString = (h: string) => createDocument(h) } });

const { schemaHtml } = await import("./stored-preview");
const schema = getSchema([StarterKit]);

describe("stored preview markup", () => {
  it("renders stored HTML the way the editor schema serializes it", () => {
    expect(schemaHtml(schema, "<h2>Title</h2><p>Hello <strong>world</strong></p>")).toBe(
      "<h2>Title</h2><p>Hello <strong>world</strong></p>",
    );
  });

  it("drops anything the schema does not know (scripts, handlers, unknown tags)", () => {
    const out = schemaHtml(schema, '<p onclick="x()">Hi<script>alert(1)</script><iframe src="https://x"></iframe></p><img src=x onerror="y()">') ?? "";
    expect(out).toContain("Hi");
    expect(out).not.toMatch(/script|onclick|onerror|iframe/);
  });

  it("returns null for an empty document so the empty editor shows instead", () => {
    expect(schemaHtml(schema, "")).toBeNull();
    expect(schemaHtml(schema, "<p></p>")).toBeNull();
  });
});
