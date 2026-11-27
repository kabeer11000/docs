// Undo/redo over immutable snapshots. Pure.

export interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

export const LIMIT = 100;

export const historyOf = <T>(present: T): History<T> => ({
  past: [],
  present,
  future: [],
});

/**
 * Records `next` as a new step. `base` is the state the step started from (defaults to the present);
 * pass it when the present was updated live during a drag, so the whole drag undoes as one step.
 */
export function commit<T>(
  h: History<T>,
  next: T,
  base: T = h.present,
): History<T> {
  if (next === base) return h.present === base ? h : { ...h, present: base };
  return { past: [...h.past, base].slice(-LIMIT), present: next, future: [] };
}

/** Shows `next` without recording a step (live previews). */
export const preview = <T>(h: History<T>, next: T): History<T> =>
  next === h.present ? h : { ...h, present: next };

export function undo<T>(h: History<T>): History<T> {
  if (!h.past.length) return h;
  return {
    past: h.past.slice(0, -1),
    present: h.past[h.past.length - 1],
    future: [h.present, ...h.future],
  };
}

export function redo<T>(h: History<T>): History<T> {
  if (!h.future.length) return h;
  return {
    past: [...h.past, h.present],
    present: h.future[0],
    future: h.future.slice(1),
  };
}
