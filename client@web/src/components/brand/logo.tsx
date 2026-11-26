import type { SVGProps } from "react";

/** Brand mark: the ink D with a highlighter stroke. Same artwork as public/logo.svg. */
export function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...props}>
      <path d="M7 3h11a9 9 0 0 1 9 9v8a9 9 0 0 1-9 9H7z" className="fill-[#2340B8] dark:fill-[#8BA2FF]" />
      <rect x="12" y="9" width="2.6" height="14" rx="1.3" className="fill-[#FFE36B] dark:fill-[#141619]" />
    </svg>
  );
}
