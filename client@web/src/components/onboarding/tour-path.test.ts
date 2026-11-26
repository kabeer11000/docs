import { describe, expect, it } from "vitest";
import { seenKey, tourForPath } from "./tour-config";

describe("tourForPath", () => {
  it("runs the home tour only on /home", () => {
    expect(tourForPath("/home")).toBe("home");
    expect(tourForPath("/vault")).toBeNull();
    expect(tourForPath("/")).toBeNull();
  });

  it("runs the editor tour on a document but not its templates page", () => {
    expect(tourForPath("/document/abc123")).toBe("editor");
    expect(tourForPath("/document/abc123/")).toBe("editor");
    expect(tourForPath("/document/abc123/templates")).toBeNull();
  });
});

describe("seenKey", () => {
  it("is scoped per tour and per user", () => {
    expect(seenKey("home", "u1")).not.toBe(seenKey("home", "u2"));
    expect(seenKey("home", "u1")).not.toBe(seenKey("editor", "u1"));
  });
});
