import { describe, expect, it } from "vitest";
import { firstName, partOfDay } from "./greeting";

describe("greeting", () => {
  it("names the part of the day", () => {
    expect(partOfDay(4)).toBe("evening");
    expect(partOfDay(5)).toBe("morning");
    expect(partOfDay(12)).toBe("afternoon");
    expect(partOfDay(18)).toBe("evening");
  });

  it("uses the first name, then the email, then nothing", () => {
    expect(firstName({ displayName: "  Sana Malik ", email: "s@x.com" })).toBe(
      "Sana",
    );
    expect(firstName({ displayName: "", email: "kabeer@x.com" })).toBe(
      "kabeer",
    );
    expect(firstName(null)).toBe("");
  });
});
