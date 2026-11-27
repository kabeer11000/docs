export interface StackItem {
  id: string;
  /** Where the card wants to be: the top of its highlighted text. */
  top: number;
  height: number;
}

/**
 * Margin layout: each card sits at its text when it can, never overlapping. The active card sits
 * exactly at its text; cards above it move up and cards below it move down to make room.
 */
export function stackCards(
  items: StackItem[],
  activeId: string | null,
  gap = 8,
): Map<string, number> {
  const sorted = [...items].sort((a, b) => a.top - b.top);
  const out = new Map<string, number>();
  const pivot = activeId ? sorted.findIndex((i) => i.id === activeId) : -1;
  const start = Math.max(pivot, 0);

  let floor = -Infinity;
  for (let i = start; i < sorted.length; i++) {
    const top = i === pivot ? sorted[i].top : Math.max(sorted[i].top, floor);
    out.set(sorted[i].id, top);
    floor = top + sorted[i].height + gap;
  }
  if (pivot > 0) {
    let ceiling = sorted[pivot].top - gap;
    for (let i = pivot - 1; i >= 0; i--) {
      const top = Math.min(sorted[i].top, ceiling - sorted[i].height);
      out.set(sorted[i].id, top);
      ceiling = top - gap;
    }
  }
  return out;
}

/** Text of one text node and the document position it starts at. */
export interface TextSegment {
  pos: number;
  text: string;
}

/**
 * Finds `quote` in the document text (segments joined without separators) and returns the
 * occurrence nearest to `near`, as document positions. Used when a comment's mark is gone.
 */
export function findQuote(
  segments: TextSegment[],
  quote: string,
  near: number,
): { from: number; to: number } | null {
  if (!quote) return null;
  const starts: number[] = [];
  let full = "";
  for (const s of segments) {
    starts.push(full.length);
    full += s.text;
  }
  // Document position of the character at string index `idx`.
  const posAt = (idx: number) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= idx) lo = mid;
      else hi = mid - 1;
    }
    return segments[lo].pos + idx - starts[lo];
  };
  let best: { from: number; to: number } | null = null;
  for (let i = full.indexOf(quote); i !== -1; i = full.indexOf(quote, i + 1)) {
    const from = posAt(i);
    if (!best || Math.abs(from - near) < Math.abs(best.from - near)) {
      best = { from, to: posAt(i + quote.length - 1) + 1 };
    }
  }
  return best;
}
