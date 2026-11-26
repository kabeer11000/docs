'use client';

import { useEffect, useRef } from 'react';

// Types `text` once after load. Writes to the DOM directly (no React state) so a visitor
// editing the surrounding contentEditable never fights a re-render.
export default function Typist({ name, text }: { name: string; text: string }) {
  const root = useRef<HTMLSpanElement>(null);
  const out = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    const target = out.current;
    if (!el || !target) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.dataset.state = 'done';
      return;
    }
    target.textContent = '';
    el.dataset.state = 'typing';
    let i = 0;
    let timer = window.setTimeout(function step() {
      i += 1;
      target.textContent = text.slice(0, i);
      if (i < text.length) {
        const ch = text[i - 1];
        timer = window.setTimeout(step, ch === ',' || ch === '.' ? 260 : 28 + Math.random() * 48);
      } else {
        timer = window.setTimeout(() => (el.dataset.state = 'idle'), 2400);
      }
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [text]);

  return (
    <span ref={root} className="typist" data-state="pending">
      <span ref={out}>{text}</span>
      <span className="caret" aria-hidden="true" contentEditable={false}>
        <span className="caret__flag">{name}</span>
      </span>
    </span>
  );
}
