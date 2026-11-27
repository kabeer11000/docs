"use client";

import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import {
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { fitScale, StaticSlide, useSize } from "@/components/slides/slide-view";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Deck } from "@/lib/slides/model";
import {
  formatElapsed,
  isPresentMessage,
  type PresentMessage,
  presentChannel,
} from "@/lib/slides/present";

type View =
  | { status: "waiting" }
  | { status: "live"; deck: Deck; index: number }
  | { status: "ended" };

/** Presenter view: a second window driven by the presenting tab over a BroadcastChannel. No data fetching. */
export default function PresenterViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [view, setView] = useState<View>({ status: "waiting" });
  const channel = useRef<BroadcastChannel | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // Timer: counts from `base` (the show start until reset); `pausedAt` freezes the display.
  const [timer, setTimer] = useState<{
    base: number | null;
    pausedAt: number | null;
  }>({ base: null, pausedAt: null });

  useEffect(() => {
    document.title = "Presenter view";
    const ch = new BroadcastChannel(presentChannel(id));
    channel.current = ch;
    ch.onmessage = (e: MessageEvent) => {
      const m = e.data;
      if (!isPresentMessage(m)) return;
      if (m.type === "state") {
        setView({ status: "live", deck: m.deck, index: m.index });
        setStartedAt((s) => s ?? m.startedAt);
      } else if (m.type === "end") setView({ status: "ended" });
    };
    ch.postMessage({ type: "hello" } satisfies PresentMessage);
    return () => {
      ch.close();
      channel.current = null;
    };
  }, [id]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const send = useCallback(
    (m: PresentMessage) => channel.current?.postMessage(m),
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(e.key))
        send({ type: "next" });
      else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(e.key))
        send({ type: "prev" });
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [send]);

  const base = timer.base ?? startedAt ?? now;
  const elapsed = (timer.pausedAt ?? now) - base;
  const paused = timer.pausedAt !== null;
  const togglePause = () =>
    setTimer((t) =>
      t.pausedAt === null
        ? { base, pausedAt: Date.now() }
        : { base: base + (Date.now() - t.pausedAt), pausedAt: null },
    );
  const reset = () =>
    setTimer((t) => ({
      base: Date.now(),
      pausedAt: t.pausedAt === null ? null : Date.now(),
    }));

  if (view.status !== "live") {
    return (
      <main
        data-app="slides"
        className="flex h-dvh flex-col items-center justify-center gap-4 bg-background p-8 text-foreground"
      >
        <p className="font-display text-2xl font-semibold tracking-[-0.02em]">
          {view.status === "waiting"
            ? "Waiting for the presentation..."
            : "The presentation has ended"}
        </p>
        {view.status === "waiting" ? (
          <p className="text-sm text-muted-foreground">
            Start presenting from the editor and this window follows along.
          </p>
        ) : (
          <Button variant="app" onClick={() => window.close()}>
            Close window
          </Button>
        )}
      </main>
    );
  }

  const { deck, index } = view;
  const count = deck.slides.length;
  const current = deck.slides[Math.min(index, count - 1)];
  const next = deck.slides[index + 1];

  return (
    <main
      data-app="slides"
      className="grid h-dvh grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] gap-4 bg-background p-4 text-foreground"
    >
      <header className="col-span-2 flex items-center gap-2">
        <span className="font-display text-lg font-semibold tracking-[-0.02em]">
          Slide {index + 1}{" "}
          <span className="text-muted-foreground">of {count}</span>
        </span>
        <div className="ml-auto flex items-center gap-1">
          <span
            className={`mr-2 font-display text-2xl font-semibold tabular-nums ${paused ? "text-muted-foreground" : ""}`}
          >
            {formatElapsed(elapsed)}
          </span>
          <IconButton
            label={paused ? "Resume timer" : "Pause timer"}
            onClick={togglePause}
          >
            {paused ? <Play /> : <Pause />}
          </IconButton>
          <IconButton label="Reset timer" onClick={reset}>
            <RotateCcw />
          </IconButton>
          <span className="mx-2 h-6 w-px bg-border" />
          <IconButton
            label="Previous slide"
            onClick={() => send({ type: "prev" })}
            disabled={index === 0}
          >
            <ChevronLeft />
          </IconButton>
          <Button
            variant="app"
            onClick={() => send({ type: "next" })}
            disabled={index >= count - 1}
          >
            Next
            <ChevronRight />
          </Button>
        </div>
      </header>
      <section
        aria-label="Current slide"
        className="row-span-1 flex min-h-0 flex-col rounded-[14px] bg-card p-3 shadow-card"
      >
        <Fit>
          {(scale) =>
            current && (
              <StaticSlide
                slide={current}
                theme={deck.theme}
                scale={scale}
                className="rounded-[8px]"
              />
            )
          }
        </Fit>
      </section>
      <div className="flex min-h-0 flex-col gap-4">
        <section
          aria-label="Next slide"
          className="flex h-[38%] min-h-0 flex-col rounded-[14px] bg-card p-3 shadow-card"
        >
          <h2 className="mb-2 text-[13px] font-medium text-muted-foreground">
            Next
          </h2>
          {next ? (
            <Fit>
              {(scale) => (
                <StaticSlide
                  slide={next}
                  theme={deck.theme}
                  scale={scale}
                  className="rounded-[6px]"
                />
              )}
            </Fit>
          ) : (
            <p className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              End of the deck
            </p>
          )}
        </section>
        <section
          aria-label="Speaker notes"
          className="flex min-h-0 flex-1 flex-col rounded-[14px] bg-card p-4 shadow-card"
        >
          <h2 className="mb-2 text-[13px] font-medium text-muted-foreground">
            Notes
          </h2>
          <div className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap text-[20px] leading-relaxed">
            {current?.notes || (
              <span className="text-muted-foreground">
                No notes for this slide
              </span>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Fit({ children }: { children: (scale: number) => ReactNode }) {
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className="flex min-h-0 flex-1 items-center justify-center overflow-hidden"
    >
      {w > 0 && children(fitScale(w, h))}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          onClick={onClick}
          disabled={disabled}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
