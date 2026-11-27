import { describe, expect, it } from "vitest";
import { blobShaOf, putPdfBlob, readBody, sha256Hex } from "./blobs";

const sha = "a".repeat(64);

describe("pdf blobs", () => {
  it("reads bodies up to the limit and refuses larger ones", async () => {
    const ok = new Request("http://x", {
      method: "PUT",
      body: new Uint8Array(10),
    });
    expect((await readBody(ok, 10)).length).toBe(10);
    const big = new Request("http://x", {
      method: "PUT",
      body: new Uint8Array(11),
    });
    await expect(readBody(big, 10)).rejects.toMatchObject({
      code: "payload_too_large",
    });
    const declared = new Request("http://x", {
      method: "PUT",
      body: "x",
      headers: { "content-length": "99999999" },
    });
    await expect(readBody(declared, 10)).rejects.toMatchObject({
      code: "payload_too_large",
    });
  });

  it("refuses empty and non-PDF bytes before touching the database", async () => {
    await expect(putPdfBlob(new Uint8Array(), "u")).rejects.toMatchObject({
      code: "bad_request",
    });
    await expect(
      putPdfBlob(new TextEncoder().encode("<html>"), "u"),
    ).rejects.toMatchObject({ code: "validation_failed" });
  });

  it("only follows a PDF row's own blob address", () => {
    expect(blobShaOf({ kind: "pdf", data: { blob: { sha256: sha } } })).toBe(
      sha,
    );
    expect(
      blobShaOf({ kind: "sheet", data: { blob: { sha256: sha } } }),
    ).toBeNull();
    expect(
      blobShaOf({ kind: "pdf", data: { blob: { sha256: "../x" } } }),
    ).toBeNull();
    expect(blobShaOf({ kind: "pdf", data: null })).toBeNull();
  });

  it("hashes like the browser does", () => {
    expect(sha256Hex(new TextEncoder().encode("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
