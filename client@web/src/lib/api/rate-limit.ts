// Fixed-window limiter per caller.
// ponytail: in-memory per process; with more than one instance each gets its own budget. Move to Redis/Mongo if we scale out.
export const RATE_LIMIT = 120;
export const RATE_WINDOW_MS = 60_000;

const windows = new Map<string, { start: number; count: number }>();

/** True when the request is allowed. */
export function takeToken(key: string, now = Date.now()): boolean {
  const w = windows.get(key);
  if (!w || now - w.start >= RATE_WINDOW_MS) {
    if (windows.size > 10_000) for (const [k, v] of windows) if (now - v.start >= RATE_WINDOW_MS) windows.delete(k);
    windows.set(key, { start: now, count: 1 });
    return true;
  }
  return ++w.count <= RATE_LIMIT;
}
