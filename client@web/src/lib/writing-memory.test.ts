import { describe, expect, it } from "vitest";
import { dayKey, recordWords, wordsWritten } from "./writing-memory";

describe("words written today", () => {
  it("counts growth from the first count of the day, per document", () => {
    let log = recordWords({}, "a", 100);
    log = recordWords(log, "a", 160);
    log = recordWords(log, "b", 0);
    log = recordWords(log, "b", 40);
    expect(wordsWritten(log)).toBe(100);
  });
  it("never goes negative when text is deleted", () => {
    const log = recordWords(recordWords({}, "a", 100), "a", 20);
    expect(wordsWritten(log)).toBe(0);
  });
  it("formats local days", () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
