import { describe, expect, it } from "vitest";
import { AUTO_INTERVAL_MS, snapshotDue } from "./versions";

describe("snapshotDue", () => {
  it("is due with no previous snapshot", () => expect(snapshotDue(undefined)).toBe(true));
  it("waits out the interval", () => {
    const now = Date.parse("2026-01-01T12:00:00Z");
    expect(snapshotDue(new Date(now - AUTO_INTERVAL_MS + 1000).toISOString(), now)).toBe(false);
    expect(snapshotDue(new Date(now - AUTO_INTERVAL_MS).toISOString(), now)).toBe(true);
  });
});
