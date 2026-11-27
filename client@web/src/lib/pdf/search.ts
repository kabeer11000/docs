// Find in page text. Text runs come from pdf.js getTextContent (PDF user space). Pure.

export interface TextRun {
  str: string;
  /** Text matrix [a, b, c, d, e, f]: e/f is the baseline origin, hypot(c, d) the font height. */
  transform: number[];
  width: number;
}

/** A match as a quadrilateral's two opposite corners in PDF user space. */
export type UserQuad = [number, number, number, number];

/**
 * Case-insensitive matches of `query` within each run, as user-space boxes. Characters are assumed
 * to share the run's width evenly.
 */
// ponytail: matches spanning two runs are not found; join runs per line if users miss phrases.
export function findMatches(runs: TextRun[], query: string): UserQuad[] {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return [];
  const out: UserQuad[] = [];
  for (const run of runs) {
    const text = run.str.toLocaleLowerCase();
    if (!text) continue;
    const [a, b, c, d, e, f] = run.transform;
    const height = Math.hypot(c, d) || 1;
    const len = Math.hypot(a, b) || 1;
    // Unit vectors along and across the baseline.
    const ux = a / len;
    const uy = b / len;
    const vx = c / height;
    const vy = d / height;
    for (
      let at = text.indexOf(q);
      at >= 0;
      at = text.indexOf(q, at + q.length)
    ) {
      const s = (run.width * at) / text.length;
      const t = (run.width * (at + q.length)) / text.length;
      const down = -0.22 * height;
      const up = 0.95 * height;
      out.push([
        e + ux * s + vx * down,
        f + uy * s + vy * down,
        e + ux * t + vx * up,
        f + uy * t + vy * up,
      ]);
    }
  }
  return out;
}
