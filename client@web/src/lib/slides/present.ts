import type { Deck } from "./model";

/** Messages between the presenting window and the presenter view, over BroadcastChannel. */
export type PresentMessage =
  | { type: "hello" }
  | { type: "state"; deck: Deck; index: number; startedAt: number }
  | { type: "go"; index: number }
  | { type: "next" }
  | { type: "prev" }
  | { type: "end" };

export const presentChannel = (documentId: string) =>
  `slides-present:${documentId}`;

export function isPresentMessage(x: unknown): x is PresentMessage {
  if (!x || typeof x !== "object") return false;
  const m = x as Record<string, unknown>;
  switch (m.type) {
    case "hello":
    case "next":
    case "prev":
    case "end":
      return true;
    case "go":
      return typeof m.index === "number" && Number.isInteger(m.index);
    case "state":
      return (
        typeof m.index === "number" &&
        typeof m.startedAt === "number" &&
        !!m.deck &&
        typeof m.deck === "object" &&
        Array.isArray((m.deck as { slides?: unknown }).slides)
      );
    default:
      return false;
  }
}

/** "12:05" under an hour, "1:02:03" after. Negative input counts as zero. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}
