// Small local memory of how you write: where you were in each document, and how much you wrote today.
// Local to this browser on purpose; nothing here is worth a network round trip.

export type DayLog = Record<string, { base: number; now: number }>;

export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** The first count seen today is the baseline; deleting below it never goes negative. */
export function recordWords(log: DayLog, docId: string, words: number): DayLog {
  return { ...log, [docId]: { base: log[docId]?.base ?? words, now: words } };
}

export const wordsWritten = (log: DayLog) =>
  Object.values(log).reduce((sum, { base, now }) => sum + Math.max(0, now - base), 0);

const read = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: memory is a nicety */
  }
};

const LOG_PREFIX = "docs.words.";
export const loadDay = (day = dayKey()) => read<DayLog>(LOG_PREFIX + day, {});
export function saveDay(log: DayLog, day = dayKey()) {
  write(LOG_PREFIX + day, log);
  // Keep a week of history, drop the rest.
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k?.startsWith(LOG_PREFIX) && k.slice(LOG_PREFIX.length) < dayKey(new Date(Date.now() - 7 * 864e5))) localStorage.removeItem(k);
  }
}

export type Spot = { from: number; top: number };
export const loadSpot = (docId: string) => read<Spot | null>(`docs.spot.${docId}`, null);
export const saveSpot = (docId: string, spot: Spot) => write(`docs.spot.${docId}`, spot);
