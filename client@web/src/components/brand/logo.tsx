import type { SVGProps } from "react";

// A squircle tile holding three lines of "text", one per app (docs, sheets, slides).
// Same artwork as public/logo.svg; the tile flips to light in dark mode.
const SQUIRCLE =
  "M16 1.5c7.9 0 10.6.4 12.3 2.2 1.8 1.7 2.2 4.4 2.2 12.3s-.4 10.6-2.2 12.3c-1.7 1.8-4.4 2.2-12.3 2.2s-10.6-.4-12.3-2.2C1.9 26.6 1.5 23.9 1.5 16s.4-10.6 2.2-12.3C5.4 1.9 8.1 1.5 16 1.5z";

export function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...props}>
      <path d={SQUIRCLE} className="fill-[#1D1D1F] dark:fill-[#F5F5F7]" />
      <rect x="8" y="9" width="16" height="3.4" rx="1.7" fill="#2997FF" />
      <rect x="8" y="14.3" width="12" height="3.4" rx="1.7" fill="#30D158" />
      <rect x="8" y="19.6" width="7.5" height="3.4" rx="1.7" fill="#FF9F0A" />
    </svg>
  );
}
