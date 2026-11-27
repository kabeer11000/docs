"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NAV_KEYS, navigate } from "@/lib/slides/export";
import type { Deck } from "@/lib/slides/model";
import { cn } from "@/lib/utils";
import { fitScale, StaticSlide, useSize } from "./slide-view";

/** Fullscreen slideshow. Esc (leaving fullscreen) closes it; the counter shows only while the mouse moves. */
export function Presenter({ deck, start, onClose }: { deck: Deck; start: number; onClose: () => void }) {
  const [index, setIndex] = useState(() => Math.min(start, deck.slides.length - 1));
  const [chrome, setChrome] = useState(false);
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const count = deck.slides.length;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const el = ref.current;
    let entered = false;
    const onChange = () => {
      if (document.fullscreenElement) entered = true;
      else if (entered) onCloseRef.current();
    };
    document.addEventListener("fullscreenchange", onChange);
    el?.requestFullscreen?.().catch(() => {});
    el?.focus();
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [ref]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      const action = NAV_KEYS[e.key];
      if (!action) return;
      e.preventDefault();
      e.stopPropagation();
      setIndex((i) => navigate(action, i, count));
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [count]);

  useEffect(() => {
    if (!chrome) return;
    const t = setTimeout(() => setChrome(false), 2000);
    return () => clearTimeout(t);
  }, [chrome]);

  const slide = deck.slides[Math.min(index, count - 1)];

  return createPortal(
    // biome-ignore lint/a11y/useKeyWithClickEvents: keys are handled on window
    <div
      ref={ref}
      role="dialog"
      aria-label="Presentation"
      tabIndex={-1}
      className={cn("fixed inset-0 z-[100] flex items-center justify-center bg-black outline-none", !chrome && "cursor-none")}
      onMouseMove={() => setChrome(true)}
      onClick={() => setIndex((i) => navigate("next", i, count))}
    >
      {slide && w > 0 && <StaticSlide slide={slide} theme={deck.theme} scale={fitScale(w, h)} />}
      <div
        className={cn(
          "pointer-events-none absolute bottom-4 right-4 rounded-md bg-black/60 px-2.5 py-1 font-sans text-[13px] tabular-nums text-white transition-opacity duration-150",
          chrome ? "opacity-100" : "opacity-0",
        )}
      >
        {index + 1} / {count}
      </div>
    </div>,
    document.body,
  );
}
