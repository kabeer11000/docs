import { describe, expect, it } from "vitest";
import { appendHtml, docHtml, exportHtml, htmlToPlainText, stripActiveHtml, toStoredHtml, wordCount } from "./content";
import { kindFilter, newDocument, newFolder, serializeFile, titleSearch } from "./documents";
import { ApiError } from "./errors";
import { bearerToken, generateApiKey, hashApiKey, isApiKey, keyDisplayPrefix } from "./keys";
import { accessFor, accessibleFilter, canRead, canWrite, isOwner } from "./permissions";
import { RATE_LIMIT, RATE_WINDOW_MS, takeToken } from "./rate-limit";
import {
  appendSchema,
  createFileSchema,
  createFolderSchema,
  createKeySchema,
  listFilesQuery,
  MAX_BODY_BYTES,
  parseInput,
  parseQuery,
  putCellsSchema,
  readJson,
  updateFileSchema,
} from "./validation";

describe("API keys", () => {
  it("generates keys in the documented format", () => {
    const key = generateApiKey();
    expect(key).toMatch(/^kd_live_[A-Za-z0-9_-]{43}$/);
    expect(isApiKey(key)).toBe(true);
    expect(generateApiKey()).not.toBe(key);
  });

  it("tells keys apart from JWTs and junk", () => {
    expect(isApiKey("eyJhbGciOiJFUzI1NiJ9.eyJ1c2VyX2lkIjoiMSJ9.sig")).toBe(false);
    expect(isApiKey("kd_live_short")).toBe(false);
    expect(isApiKey(`kd_test_${"a".repeat(43)}`)).toBe(false);
    expect(isApiKey(`kd_live_${"a".repeat(43)}x`)).toBe(false);
  });

  it("hashes with sha256 hex, deterministically", () => {
    expect(hashApiKey("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    const key = generateApiKey();
    expect(hashApiKey(key)).toBe(hashApiKey(key));
    expect(hashApiKey(key)).not.toContain(key);
  });

  it("shows a 12 character prefix", () => {
    const key = generateApiKey();
    expect(keyDisplayPrefix(key)).toHaveLength(12);
    expect(keyDisplayPrefix(key).startsWith("kd_live_")).toBe(true);
  });

  it("parses bearer headers", () => {
    expect(bearerToken("Bearer abc.def")).toBe("abc.def");
    expect(bearerToken("bearer   tok ")).toBe("tok");
    expect(bearerToken("Basic abc")).toBeNull();
    expect(bearerToken("Bearer")).toBeNull();
    expect(bearerToken("Bearer a b")).toBeNull();
    expect(bearerToken(null)).toBeNull();
  });
});

describe("permissions", () => {
  const owner = { id: "u-owner", email: "owner@x.io" };
  const doc = {
    owner: owner.id,
    sharing: {
      sharedWith: [
        { userId: owner.id, email: owner.email, access: "owner", status: "active" },
        { userId: "u-ed", email: "ed@x.io", access: "editor", status: "active" },
        { email: "view@x.io", access: "viewer", status: "active" },
        { userId: "u-sign", access: "signer", status: "active" },
        { userId: "u-pending", access: "editor", status: "pending" },
      ],
    },
  };

  it("matches the app's rules", () => {
    expect(accessFor(doc, owner)).toBe("owner");
    expect(accessFor(doc, { id: "u-ed" })).toBe("editor");
    expect(accessFor(doc, { id: "someone", email: "view@x.io" })).toBe("viewer");
    expect(accessFor(doc, { id: "u-sign" })).toBe("signer");
    expect(accessFor(doc, { id: "u-pending" })).toBeNull();
    expect(accessFor(doc, { id: "stranger", email: "s@x.io" })).toBeNull();
    expect(accessFor(null, owner)).toBeNull();
  });

  it("does not match a share with an empty email for callers without email", () => {
    const d = { owner: "o", sharing: { sharedWith: [{ email: "", access: "editor", status: "active" }] } };
    expect(accessFor(d, { id: "x" })).toBeNull();
    expect(accessFor(d, { id: "x", email: "" })).toBeNull();
  });

  it("an 'owner' share entry for someone else grants nothing", () => {
    const d = { owner: "o", sharing: { sharedWith: [{ userId: "x", access: "owner", status: "active" }] } };
    expect(accessFor(d, { id: "x" })).toBeNull();
  });

  it("derives capabilities", () => {
    expect([canRead("viewer"), canWrite("viewer"), isOwner("viewer")]).toEqual([true, false, false]);
    expect([canRead("signer"), canWrite("signer")]).toEqual([true, false]);
    expect([canWrite("editor"), isOwner("editor")]).toEqual([true, false]);
    expect([canWrite("owner"), isOwner("owner")]).toEqual([true, true]);
    expect([canRead(null), canWrite(null), isOwner(null)]).toEqual([false, false, false]);
  });

  it("builds the list filter for owned and actively shared files", () => {
    expect(accessibleFilter({ id: "u1", email: "a@b.c" })).toEqual({
      $or: [{ owner: "u1" }, { "sharing.sharedWith": { $elemMatch: { status: "active", $or: [{ userId: "u1" }, { email: "a@b.c" }] } } }],
    });
    expect(accessibleFilter({ id: "u1" }).$or[1]).toEqual({ "sharing.sharedWith": { $elemMatch: { status: "active", $or: [{ userId: "u1" }] } } });
  });
});

describe("request validation", () => {
  const invalid = (fn: () => unknown) => {
    try {
      fn();
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(422);
      return (e as ApiError).message;
    }
    throw new Error("expected a validation error");
  };

  it("creates docs by default with html format", () => {
    expect(parseInput(createFileSchema, {})).toEqual({ kind: "doc", format: "html" });
    expect(parseInput(createFileSchema, { title: "  Notes ", content: "# Hi", format: "markdown" })).toMatchObject({ title: "Notes", format: "markdown" });
  });

  it("rejects content on sheets, data on docs, unknown kinds and fields", () => {
    expect(invalid(() => parseInput(createFileSchema, { kind: "sheet", content: "x" }))).toContain("content");
    expect(invalid(() => parseInput(createFileSchema, { kind: "doc", data: {} }))).toContain("data");
    invalid(() => parseInput(createFileSchema, { kind: "pdf" }));
    invalid(() => parseInput(createFileSchema, { title: "" }));
    invalid(() => parseInput(createFileSchema, { title: "x".repeat(501) }));
    invalid(() => parseInput(createFileSchema, { owner: "someone-else" }));
    invalid(() => parseInput(createFileSchema, { format: "docx" }));
  });

  it("accepts data for sheets and slides", () => {
    expect(parseInput(createFileSchema, { kind: "slides", data: { slides: [] } }).data).toEqual({ slides: [] });
  });

  it("requires something to update", () => {
    invalid(() => parseInput(updateFileSchema, {}));
    invalid(() => parseInput(updateFileSchema, { sharing: {} }));
    expect(parseInput(updateFileSchema, { title: "New" }).title).toBe("New");
  });

  it("append takes exactly one of html or markdown", () => {
    invalid(() => parseInput(appendSchema, {}));
    invalid(() => parseInput(appendSchema, { html: "<p>a</p>", markdown: "a" }));
    expect(parseInput(appendSchema, { markdown: "a" })).toEqual({ markdown: "a" });
  });

  it("validates cell writes", () => {
    expect(parseInput(putCellsSchema, { values: [[1, "a", true, null]] }).values).toHaveLength(1);
    invalid(() => parseInput(putCellsSchema, { values: [] }));
    invalid(() => parseInput(putCellsSchema, { values: [1, 2] }));
    invalid(() => parseInput(putCellsSchema, { values: [[{ v: 1 }]] }));
  });

  it("validates folders and keys", () => {
    expect(parseInput(createFolderSchema, { name: " Reports " }).name).toBe("Reports");
    invalid(() => parseInput(createFolderSchema, { name: "   " }));
    invalid(() => parseInput(createKeySchema, {}));
    invalid(() => parseInput(createKeySchema, { name: "x".repeat(101) }));
  });

  it("parses list queries with defaults and bounds", () => {
    expect(parseQuery(listFilesQuery, "http://x/api/v1/files")).toEqual({ limit: 50 });
    expect(parseQuery(listFilesQuery, "http://x/api/v1/files?kind=sheet&limit=10&cursor=20&q=")).toEqual({ kind: "sheet", limit: 10, cursor: "20" });
    invalid(() => parseQuery(listFilesQuery, "http://x/api/v1/files?limit=0"));
    invalid(() => parseQuery(listFilesQuery, "http://x/api/v1/files?limit=101"));
    invalid(() => parseQuery(listFilesQuery, "http://x/api/v1/files?cursor=abc"));
    invalid(() => parseQuery(listFilesQuery, "http://x/api/v1/files?kind=pdf"));
  });

  it("reads JSON bodies and enforces the size cap", async () => {
    const req = (body: string, headers: Record<string, string> = {}) => new Request("http://x", { method: "POST", body, headers });
    await expect(readJson(req('{"a":1}'))).resolves.toEqual({ a: 1 });
    await expect(readJson(req("{nope"))).rejects.toMatchObject({ status: 400, code: "bad_request" });
    await expect(readJson(req("{}", { "content-length": String(MAX_BODY_BYTES + 1) }))).rejects.toMatchObject({ status: 413 });
    await expect(readJson(req(JSON.stringify({ a: "x".repeat(MAX_BODY_BYTES) })))).rejects.toMatchObject({ status: 413 });
  });
});

describe("content conversion", () => {
  it("converts markdown to editor HTML", () => {
    const html = toStoredHtml("# Title\n\nSome **bold** text\n\n- [x] done", "markdown");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain('data-type="taskItem"');
  });

  it("drops raw HTML in markdown", () => {
    expect(toStoredHtml("hi <script>alert(1)</script>", "markdown")).not.toContain("<script");
  });

  it("strips active content from HTML input", () => {
    const html = stripActiveHtml('<p onclick="x()">a</p><script>alert(1)</script><iframe src="x"></iframe><a href="javascript:alert(1)">l</a><img src=x onerror=alert(1)>');
    expect(html).not.toMatch(/script|iframe|onclick|onerror|javascript:/i);
    expect(html).toContain("<p>a</p>");
  });

  it("exports markdown and plain text", () => {
    const html = "<h2>Plan</h2><p>Ship &amp; test</p><ul><li><p>one</p></li><li><p>two</p></li></ul><table><tr><td><p>a</p></td><td><p>b</p></td></tr></table>";
    expect(exportHtml(html, "html")).toBe(html);
    const md = exportHtml(html, "markdown");
    expect(md).toContain("## Plan");
    expect(md).toContain("- one");
    expect(htmlToPlainText(html)).toBe("Plan\n\nShip & test\n\n- one\n- two\n\na\tb");
  });

  it("decodes numeric entities and math in text export", () => {
    expect(htmlToPlainText('<p>&#169; &#x2014; <span data-type="inline-math" data-latex="x^2"></span></p>')).toBe("© — x^2");
  });

  it("reads doc HTML from stored content", () => {
    expect(docHtml("<p>x</p>")).toBe("<p>x</p>");
    expect(docHtml({ type: "doc", content: [] })).toBe("");
    expect(docHtml(undefined)).toBe("");
    expect(docHtml({ type: "doc", content: [{ type: "paragraph" }] })).toBeNull();
  });

  it("appends after dropping the empty trailing paragraph", () => {
    expect(appendHtml("<p>a</p><p></p>", "<p>b</p>")).toBe("<p>a</p><p>b</p>");
    expect(appendHtml("", "<p>b</p>")).toBe("<p>b</p>");
    expect(appendHtml("<p>a</p>", "<p>b</p>")).toBe("<p>a</p><p>b</p>");
  });

  it("counts words like the editor", () => {
    expect(wordCount("<p>one two</p>\n<p>three</p>")).toBe(3);
    expect(wordCount("<p></p>")).toBe(0);
  });
});

describe("document builders", () => {
  const user = { id: "u1", email: "a@b.c" };

  it("builds docs in the app's shape", () => {
    const doc = newDocument(user, { kind: "doc", parent: "u1", html: "<p>x</p>", wordCount: 1 });
    expect(doc.kind).toBeUndefined();
    expect(doc.title).toBe("Untitled document");
    expect(doc.pages[0].content).toBe("<p>x</p>");
    expect(doc.owner).toBe("u1");
    expect(doc.location).toBe("u1");
    expect(doc.parents).toEqual(["u1"]);
    expect(doc.sharing.sharedWith).toEqual([expect.objectContaining({ userId: "u1", access: "owner", status: "active", email: "a@b.c" })]);
    expect(accessFor(doc, user)).toBe("owner");
  });

  it("builds sheets with kind and data", () => {
    const doc = newDocument(user, { kind: "sheet", parent: "f1", title: "Budget" });
    expect(doc).toMatchObject({ kind: "sheet", data: null, title: "Budget", parents: ["f1"] });
    expect(doc.pages[0].content).toEqual({ type: "doc", content: [] });
  });

  it("builds folders in the app's shape", () => {
    const f = newFolder(user, { name: "R", parent: "u1" });
    expect(f).toMatchObject({ name: "R", parents: ["u1"], permissions: { owner: "u1" } });
  });

  it("serializes files without internals", () => {
    const doc = newDocument(user, { kind: "doc", parent: "u1", html: "<p>x</p>" });
    const summary = serializeFile(doc, "owner");
    expect(summary).not.toHaveProperty("content");
    expect(summary).not.toHaveProperty("sharing");
    expect(serializeFile(doc, "owner", true)).toMatchObject({ kind: "doc", content: "<p>x</p>", folderId: "u1" });
    const sheet = newDocument(user, { kind: "sheet", parent: "u1", data: { a: 1 } });
    expect(serializeFile(sheet, "viewer", true)).toMatchObject({ kind: "sheet", data: { a: 1 }, access: "viewer" });
  });

  it("filters kinds, treating missing kind as doc", () => {
    expect(kindFilter("doc")).toEqual({ kind: { $in: [null, "doc"] } });
    expect(kindFilter("slides")).toEqual({ kind: "slides" });
  });

  it("escapes title search input", () => {
    const { $regex } = titleSearch("a.b*(c)").title;
    expect(new RegExp($regex).test("xa.b*(c)y")).toBe(true);
    expect(new RegExp($regex).test("aXb")).toBe(false);
  });
});

describe("rate limit", () => {
  it("allows RATE_LIMIT requests per window, then resets", () => {
    const key = `test-${Math.random()}`;
    const t = 1_000_000;
    for (let i = 0; i < RATE_LIMIT; i++) expect(takeToken(key, t)).toBe(true);
    expect(takeToken(key, t + 1)).toBe(false);
    expect(takeToken(key, t + RATE_WINDOW_MS)).toBe(true);
  });
});
