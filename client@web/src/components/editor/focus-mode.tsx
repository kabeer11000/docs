"use client";

import { atom } from "nanostores";
import { useStore } from "@nanostores/react";
import { useEffect } from "react";

/** Focus mode hides everything but the page (sidebar, header, toolbar). CSS lives in global.css under [data-focus]. */
export const $focusMode = atom(false);
export const toggleFocusMode = () => $focusMode.set(!$focusMode.get());

export function FocusMode() {
  const on = useStore($focusMode);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        toggleFocusMode();
      } else if (e.key === "Escape" && $focusMode.get() && !document.querySelector("[role=dialog],[role=search]")) {
        $focusMode.set(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (on) root.dataset.focus = "";
    else delete root.dataset.focus;
    return () => {
      delete root.dataset.focus;
    };
  }, [on]);

  // Leaving the document always leaves focus mode.
  useEffect(() => () => $focusMode.set(false), []);

  if (!on) return null;
  return (
    <button
      type="button"
      onClick={() => $focusMode.set(false)}
      className="fixed top-3 right-4 z-40 rounded-md px-2.5 py-1 text-xs text-muted-foreground opacity-0 transition-opacity duration-150 hover:bg-accent hover:text-foreground hover:opacity-100 focus-visible:opacity-100"
    >
      Exit focus <kbd className="ml-1 font-sans">Esc</kbd>
    </button>
  );
}
