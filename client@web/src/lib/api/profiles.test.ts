import { describe, expect, it } from "vitest";
import { decodePhoto, isValidPhoto, MAX_PHOTO_CHARS } from "./profiles";

describe("profile photos", () => {
  it("accepts small image data URLs", () => {
    expect(isValidPhoto("data:image/webp;base64,UklGRg==")).toBe(true);
    expect(isValidPhoto("data:image/jpeg;base64,/9j/4AAQ")).toBe(true);
  });
  it("rejects other types, svg, scripts and oversize", () => {
    expect(isValidPhoto("data:image/svg+xml;base64,PHN2Zz4=")).toBe(false);
    expect(isValidPhoto("javascript:alert(1)")).toBe(false);
    expect(isValidPhoto(`data:image/png;base64,${"A".repeat(MAX_PHOTO_CHARS)}`)).toBe(false);
    expect(isValidPhoto(42)).toBe(false);
  });
  it("decodes to bytes and type", () => {
    const { type, bytes } = decodePhoto("data:image/png;base64,iVBORw==");
    expect(type).toBe("image/png");
    expect(bytes.length).toBe(4);
  });
});
