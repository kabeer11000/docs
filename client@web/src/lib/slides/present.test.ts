import { describe, expect, it } from "vitest";
import { normalizeDeck } from "./model";
import { formatElapsed, isPresentMessage, presentChannel } from "./present";

describe("formatElapsed", () => {
  it("formats minutes and hours", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(-5000)).toBe("0:00");
    expect(formatElapsed(65_400)).toBe("1:05");
    expect(formatElapsed(12 * 60_000 + 5000)).toBe("12:05");
    expect(formatElapsed(3_723_000)).toBe("1:02:03");
  });
});

describe("isPresentMessage", () => {
  it("accepts valid messages and rejects junk", () => {
    const deck = normalizeDeck(null);
    for (const m of [
      { type: "hello" },
      { type: "next" },
      { type: "prev" },
      { type: "end" },
      { type: "go", index: 2 },
      { type: "state", deck, index: 0, startedAt: 1 },
    ]) {
      expect(isPresentMessage(m)).toBe(true);
    }
    for (const m of [
      null,
      "next",
      {},
      { type: "go" },
      { type: "go", index: 1.5 },
      { type: "state", deck: {}, index: 0, startedAt: 1 },
      { type: "boom" },
    ]) {
      expect(isPresentMessage(m)).toBe(false);
    }
    expect(presentChannel("abc")).toBe("slides-present:abc");
  });
});
