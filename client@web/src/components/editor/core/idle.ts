/** Runs `fn` when the main thread is idle (at most `timeout` ms later); returns a cancel function. */
export function onIdle(fn: () => void, timeout = 1500): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(fn, { timeout });
    return () => window.cancelIdleCallback(handle);
  }
  const handle = setTimeout(fn, 50);
  return () => clearTimeout(handle);
}
