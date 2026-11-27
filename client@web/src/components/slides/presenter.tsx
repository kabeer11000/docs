"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NAV_KEYS, navigate } from "@/lib/slides/export";
import type { Deck } from "@/lib/slides/model";
import {
  isPresentMessage,
  type PresentMessage,
  presentChannel,
} from "@/lib/slides/present";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { fitScale, StaticSlide, useSize } from "./slide-view";

const TRANSITION_CSS = `
@keyframes slp-fade{from{opacity:0}to{opacity:1}}
@keyframes slp-slide-f{from{opacity:0;transform:translateX(8%)}to{opacity:1;transform:none}}
@keyframes slp-slide-b{from{opacity:0;transform:translateX(-8%)}to{opacity:1;transform:none}}
@keyframes slp-zoom{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:none}}
.slp-fade{animation:slp-fade 350ms ease-out both}
.slp-slide-f{animation:slp-slide-f 350ms cubic-bezier(.2,.8,.2,1) both}
.slp-slide-b{animation:slp-slide-b 350ms cubic-bezier(.2,.8,.2,1) both}
.slp-zoom{animation:slp-zoom 350ms cubic-bezier(.2,.8,.2,1) both}
@media (prefers-reduced-motion:reduce){.slp-fade,.slp-slide-f,.slp-slide-b,.slp-zoom{animation:none}}
`;

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Fullscreen slideshow. Esc (or leaving fullscreen) closes it; the counter shows only while the mouse moves.
 * Hold L for a laser pointer, B or . blacks out, F toggles fullscreen. With `withPresenterView`, a second
 * window shows notes, the next slide and a timer, kept in sync over a BroadcastChannel.
 */
export function Presenter({
  deck,
  documentId,
  start,
  withPresenterView = false,
  onClose,
}: {
  deck: Deck;
  documentId: string;
  start: number;
  withPresenterView?: boolean;
  onClose: () => void;
}) {
  const count = deck.slides.length;
  const [index, setIndex] = useState(() =>
    Math.max(0, Math.min(start, count - 1)),
  );
  const [direction, setDirection] = useState<"f" | "b">("f");
  const [chrome, setChrome] = useState(false);
  const [black, setBlack] = useState(false);
  const [laser, setLaser] = useState(false);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const togglingFullscreen = useRef(false);
  const startedAt = useRef(Date.now());
  const channelRef = useRef<BroadcastChannel | null>(null);
  const deckRef = useRef(deck);
  deckRef.current = deck;
  const indexRef = useRef(index);
  indexRef.current = index;

  const go = (next: (i: number) => number) =>
    setIndex((i) => {
      const n = Math.max(0, Math.min(count - 1, next(i)));
      if (n !== i) setDirection(n > i ? "f" : "b");
      return n;
    });
  const goRef = useRef(go);
  goRef.current = go;

  useEffect(() => {
    const el = ref.current;
    let entered = false;
    const onChange = () => {
      if (document.fullscreenElement) entered = true;
      else if (entered && !togglingFullscreen.current) onCloseRef.current();
      togglingFullscreen.current = false;
    };
    document.addEventListener("fullscreenchange", onChange);
    // Fails without a fresh gesture (e.g. the presenter view popup took it); the overlay still works.
    el?.requestFullscreen?.().catch(() => {});
    el?.focus();
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [ref]);

  // Presenter view: open the second window and answer it over the channel.
  useEffect(() => {
    if (!withPresenterView || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(presentChannel(documentId));
    channelRef.current = channel;
    channel.onmessage = (e: MessageEvent) => {
      const m = e.data;
      if (!isPresentMessage(m)) return;
      if (m.type === "hello")
        channel.postMessage({
          type: "state",
          deck: deckRef.current,
          index: indexRef.current,
          startedAt: startedAt.current,
        });
      else if (m.type === "next") goRef.current((i) => i + 1);
      else if (m.type === "prev") goRef.current((i) => i - 1);
      else if (m.type === "go") goRef.current(() => m.index);
    };
    const win = window.open(
      `/slides/${documentId}/presenter`,
      `slides-presenter-${documentId}`,
      "popup,width=1200,height=760",
    );
    if (!win)
      showToast.info(
        "Presenter view was blocked",
        "Allow pop-ups for this site to see notes and the next slide.",
      );
    return () => {
      channel.postMessage({ type: "end" } satisfies PresentMessage);
      channel.close();
      channelRef.current = null;
    };
  }, [withPresenterView, documentId]);

  useEffect(() => {
    channelRef.current?.postMessage({
      type: "state",
      deck,
      index,
      startedAt: startedAt.current,
    } satisfies PresentMessage);
  }, [deck, index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
      } else if (key === "l") {
        e.preventDefault();
        if (!e.repeat) setLaser(true);
      } else if (key === "b" || key === ".") {
        e.preventDefault();
        setBlack((b) => !b);
      } else if (key === "f") {
        e.preventDefault();
        togglingFullscreen.current = true;
        (document.fullscreenElement
          ? document.exitFullscreen()
          : (ref.current?.requestFullscreen() ?? Promise.reject())
        ).catch(() => {
          togglingFullscreen.current = false;
        });
      } else {
        const action = NAV_KEYS[e.key];
        if (!action) return;
        e.preventDefault();
        goRef.current((i) => navigate(action, i, count));
      }
      e.stopPropagation();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "l") setLaser(false);
    };
    const onBlur = () => setLaser(false);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", onBlur);
    };
  }, [count, ref]);

  useEffect(() => {
    if (!chrome) return;
    const t = setTimeout(() => setChrome(false), 2000);
    return () => clearTimeout(t);
  }, [chrome]);

  const slide = deck.slides[Math.min(index, count - 1)];
  const anim =
    deck.transition === "none" || reducedMotion()
      ? ""
      : deck.transition === "slide"
        ? `slp-slide-${direction}`
        : `slp-${deck.transition}`;

  return createPortal(
    // biome-ignore lint/a11y/useKeyWithClickEvents: keys are handled on window
    <div
      ref={ref}
      role="dialog"
      aria-label="Presentation"
      tabIndex={-1}
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black outline-none",
        (!chrome || laser) && "cursor-none",
      )}
      onMouseMove={(e) => {
        setChrome(true);
        if (laser) setPointer({ x: e.clientX, y: e.clientY });
      }}
      onClick={() => go((i) => navigate("next", i, count))}
    >
      <style>{TRANSITION_CSS}</style>
      {slide && w > 0 && (
        <div key={slide.id + index} className={anim}>
          <StaticSlide
            slide={slide}
            theme={deck.theme}
            scale={fitScale(w, h)}
          />
        </div>
      )}
      {black && (
        <div className="absolute inset-0 bg-black" aria-hidden="true" />
      )}
      {laser && pointer && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ff2d2d] ring-[6px] ring-[#ff2d2d]/30"
          style={{ left: pointer.x, top: pointer.y }}
        />
      )}
      <div
        className={cn(
          "pointer-events-none absolute right-4 bottom-4 rounded-full bg-black/60 px-3 py-1 font-sans text-[13px] text-white tabular-nums transition-opacity duration-150",
          chrome && !black ? "opacity-100" : "opacity-0",
        )}
      >
        {index + 1} / {count}
      </div>
    </div>,
    document.body,
  );
}
