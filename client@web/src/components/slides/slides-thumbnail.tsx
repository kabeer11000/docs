"use client";

import { useMemo } from "react";
import { getPreviewBlocks } from "@/components/home/paper-sheet";
import { normalizeDeck } from "@/lib/slides/model";
import { SlideView, useSize } from "./slide-view";

const firstImage = (html: string) => {
  const src = html.match(/<img\b[^>]*\bsrc="([^"]+)"/i)?.[1];
  return src && /^(data:image\/|https:\/\/)/i.test(src) ? src.replace(/&amp;/g, "&") : null;
};

/**
 * First slide of a stored deck for Home cards. Stored HTML is not trusted here, so regions render as plain
 * text blocks (and the first image), never as injected markup; no editor instances.
 */
export function SlidesThumbnail({ data }: { data: unknown }) {
  const deck = useMemo(() => normalizeDeck(data), [data]);
  const slide = deck.slides[0];
  const [ref, { w }] = useSize<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className="relative aspect-video w-full overflow-hidden rounded-[2px] bg-paper shadow-paper"
      aria-hidden="true"
    >
      {w > 0 && (
        <SlideView
          theme={deck.theme}
          layout={slide.layout}
          scale={w / 1280}
          className="pointer-events-none select-none"
          region={(r) => {
            const html = slide.html[r] ?? "";
            const img = r === "image" ? firstImage(html) : null;
            return (
              <div key={r} className="sl-r" data-region={r}>
                <div>
                  {img ? (
                    <img src={img} alt="" />
                  ) : (
                    getPreviewBlocks(html).map((b, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: static preview
                      <p key={i}>{b.kind === "li" ? `• ${b.text}` : b.text}</p>
                    ))
                  )}
                </div>
              </div>
            );
          }}
        />
      )}
    </div>
  );
}
