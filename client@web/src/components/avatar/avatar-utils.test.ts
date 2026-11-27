import { describe, expect, it } from "vitest";
import {
  AVATAR_HUES,
  avatarHue,
  dataUrlBytes,
  initials,
  isRealPhoto,
  outputSize,
  squareCrop,
} from "./avatar-utils";

describe("isRealPhoto", () => {
  it("rejects empty and placeholder paths", () => {
    expect(isRealPhoto(undefined)).toBe(false);
    expect(isRealPhoto(null)).toBe(false);
    expect(isRealPhoto("  ")).toBe(false);
    expect(isRealPhoto("/avatars/avatar-3.png")).toBe(false);
    expect(isRealPhoto("/avatars/avatar-12.webp")).toBe(false);
  });
  it("accepts urls, data urls and app paths", () => {
    expect(isRealPhoto("https://lh3.googleusercontent.com/a/x")).toBe(true);
    expect(isRealPhoto("data:image/webp;base64,AAAA")).toBe(true);
    expect(isRealPhoto("blob:http://localhost/1")).toBe(true);
    expect(isRealPhoto("/uploads/me.jpg")).toBe(true);
  });
  it("rejects non-image data and odd schemes", () => {
    expect(isRealPhoto("data:text/html;base64,AAAA")).toBe(false);
    expect(isRealPhoto("javascript:alert(1)")).toBe(false);
  });
});

describe("initials", () => {
  it("uses first and last word", () => {
    expect(initials("Sana Mir")).toBe("SM");
    expect(initials("ada augusta king lovelace")).toBe("AL");
    expect(initials("  Plato ")).toBe("P");
  });
  it("falls back to the email", () => {
    expect(initials(null, "kabeer.khan@example.com")).toBe("KK");
    expect(initials("", "zed@example.com")).toBe("Z");
    expect(initials("jo_ann@example.com")).toBe("JA");
  });
  it("handles non-latin and symbols", () => {
    expect(initials("élodie durand")).toBe("ÉD");
    expect(initials("(Bot) 42")).toBe("B4");
  });
  it("never returns empty", () => {
    expect(initials()).toBe("?");
    expect(initials("!!!", "@")).toBe("?");
  });
});

describe("avatarHue", () => {
  it("is deterministic and case-insensitive", () => {
    expect(avatarHue("User@Example.com")).toBe(avatarHue("user@example.com"));
  });
  it("always picks from the palette", () => {
    for (const seed of ["a", "b", "c", "d", "e", "f", "g", "123", ""]) {
      expect(AVATAR_HUES).toContain(avatarHue(seed));
    }
  });
  it("spreads different seeds", () => {
    const hues = new Set(
      Array.from({ length: 50 }, (_, i) => avatarHue(`user-${i}`)),
    );
    expect(hues.size).toBeGreaterThan(6);
  });
});

describe("crop math", () => {
  it("centres a square on landscape and portrait images", () => {
    expect(squareCrop(400, 300)).toEqual({ sx: 50, sy: 0, size: 300 });
    expect(squareCrop(300, 500)).toEqual({ sx: 0, sy: 100, size: 300 });
    expect(squareCrop(256, 256)).toEqual({ sx: 0, sy: 0, size: 256 });
  });
  it("downscales but never upscales", () => {
    expect(outputSize(1024)).toBe(256);
    expect(outputSize(120)).toBe(120);
    expect(outputSize(0)).toBe(1);
  });
  it("measures data urls", () => {
    // "hello" = aGVsbG8=
    expect(dataUrlBytes("data:image/png;base64,aGVsbG8=")).toBe(5);
    expect(dataUrlBytes("data:image/png;base64,aGVsbG8h")).toBe(6);
  });
});
