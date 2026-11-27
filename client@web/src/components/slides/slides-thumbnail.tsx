"use client";

import { useMemo } from "react";
import { getPreviewBlocks } from "@/components/home/paper-sheet";
import {
  elementClass,
  elementCss,
  elementMarkup,
  styleObject,
} from "@/lib/slides/elements";
import { normalizeDeck } from "@/lib/slides/model";
import { Markup, SlideView, useSize } from "./slide-view";

const firstImage = (html: string) => {
  const src = html.match(/<img\b[^>]*\bsrc="([^"]+)"/i)?.[1];
  return src && /^(data:image\/|https:\/\/)/i.test(src)
    ? src.replace(/&amp;/g, "&")
    : null;
};

/**
 * First slide of a stored deck for Home cards. Stored HTML is not trusted here, so regions and text boxes render
 * as plain text blocks (and the first image), never as injected markup. Shapes, icons, charts and images are
 * drawn from validated data (normalizeDeck), so their generated markup is safe. No editor instances.
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
          background={slide.background}
          scale={w / 1280}
          className="pointer-events-none select-none"
          region={(r) => {
            const html = slide.html[r] ?? "";
            const img = r === "image" ? firstImage(html) : null;
            return (
              <div key={r} className="sl-r" data-region={r}>
                <div>
                  {img ? (
                    // biome-ignore lint/performance/noImgElement: inline data image inside a scaled slide
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
        >
          {slide.elements.map((el) =>
            el.type === "text" ? (
              <div
                key={el.id}
                className={elementClass(el)}
                style={styleObject(elementCss(el))}
              >
                <div>
                  {getPreviewBlocks(el.html ?? "").map((b, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static preview
                    <p key={i}>{b.text}</p>
                  ))}
                </div>
              </div>
            ) : (
              <Markup
                key={el.id}
                html={elementMarkup(el)}
                className="contents"
              />
            ),
          )}
        </SlideView>
      )}
    </div>
  );
}
