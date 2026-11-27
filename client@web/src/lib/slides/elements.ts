import { ICON_NODES } from "./icon-data";
import {
  BACKGROUNDS,
  type ChartData,
  isSafeImageSrc,
  type Paint,
  type SlideElement,
  type ThemeDef,
} from "./model";
import { FONT_STACK, SLIDE_H, SLIDE_W } from "./styles";

/**
 * Markup for free elements as plain strings, so the editor, thumbnails, present mode, PDF/HTML export and the
 * published page all draw them the same way. Every value that reaches markup is validated (paints are theme
 * names or hex, icons come from a fixed table, numbers are numbers) or escaped.
 */

export const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const n = (v: number) => Math.round(v * 100) / 100;

export function paintCss(
  p: Paint | undefined,
  fallback = "var(--sl-fg)",
): string {
  if (!p) return fallback;
  if (p === "accent" || p === "fg" || p === "bg") return `var(--sl-${p})`;
  if (p === "none") return "none";
  return /^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(p) ? p : fallback;
}

/** RRGGBB for PowerPoint, or null for "none". 8-digit hex drops its alpha. */
export function paintHex(
  p: Paint | undefined,
  theme: ThemeDef,
  fallback = theme.fg,
): string | null {
  const v = p ?? fallback;
  if (v === "none") return null;
  const raw =
    v === "accent"
      ? theme.accent
      : v === "fg"
        ? theme.fg
        : v === "bg"
          ? theme.bg
          : v;
  return /^#[0-9a-f]{6}/i.test(raw)
    ? raw.slice(1, 7).toUpperCase()
    : theme.fg.slice(1).toUpperCase();
}

export const elementPx = (el: Pick<SlideElement, "w" | "h">) => ({
  W: (el.w / 100) * SLIDE_W,
  H: (el.h / 100) * SLIDE_H,
});

function shapeBody(el: SlideElement, W: number, H: number): string {
  const fill = paintCss(el.color ?? "accent");
  const stroke = paintCss(el.stroke ?? "none");
  const sw = el.strokeWidth ?? (el.stroke && el.stroke !== "none" ? 4 : 0);
  const i = sw / 2;
  const style = `fill:${fill};stroke:${stroke};stroke-width:${sw}`;
  const poly = (pts: [number, number][]) =>
    `<polygon points="${pts.map(([x, y]) => `${n(x)},${n(y)}`).join(" ")}" style="${style};stroke-linejoin:round"/>`;
  switch (el.shape) {
    case "rounded":
    case "rect": {
      const r =
        el.radius ?? (el.shape === "rounded" ? Math.min(W, H) * 0.2 : 0);
      return `<rect x="${n(i)}" y="${n(i)}" width="${n(Math.max(0, W - sw))}" height="${n(Math.max(0, H - sw))}" rx="${n(Math.min(r, W / 2, H / 2))}" style="${style}"/>`;
    }
    case "circle":
      return `<ellipse cx="${n(W / 2)}" cy="${n(H / 2)}" rx="${n(Math.max(0, W / 2 - i))}" ry="${n(Math.max(0, H / 2 - i))}" style="${style}"/>`;
    case "triangle":
      return poly([
        [W / 2, i],
        [W - i, H - i],
        [i, H - i],
      ]);
    case "line":
      return `<line x1="0" y1="${n(H / 2)}" x2="${n(W)}" y2="${n(H / 2)}" style="stroke:${fill === "none" ? "var(--sl-fg)" : fill};stroke-width:${el.strokeWidth ?? 6};stroke-linecap:round"/>`;
    case "arrow": {
      const head = Math.min(W * 0.4, H);
      return poly([
        [i, H * 0.32],
        [W - head, H * 0.32],
        [W - head, i],
        [W - i, H / 2],
        [W - head, H - i],
        [W - head, H * 0.68],
        [i, H * 0.68],
      ]);
    }
    case "star": {
      const pts: [number, number][] = [];
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5;
        const r = k % 2 ? 0.42 : 1;
        pts.push([
          W / 2 + Math.cos(a) * (W / 2 - i) * r,
          H / 2 + Math.sin(a) * (H / 2 - i) * r,
        ]);
      }
      return poly(pts);
    }
    case "bubble": {
      const B = H * 0.78;
      const r = Math.min(el.radius ?? Math.min(W, B) * 0.2, W / 2, B / 2);
      const d = `M${n(r + i)},${n(i)} H${n(W - r - i)} Q${n(W - i)},${n(i)} ${n(W - i)},${n(r + i)} V${n(B - r)} Q${n(W - i)},${n(B)} ${n(W - r - i)},${n(B)} H${n(W * 0.36)} L${n(W * 0.2)},${n(H - i)} L${n(W * 0.22)},${n(B)} H${n(r + i)} Q${n(i)},${n(B)} ${n(i)},${n(B - r)} V${n(r + i)} Q${n(i)},${n(i)} ${n(r + i)},${n(i)} Z`;
      return `<path d="${d}" style="${style};stroke-linejoin:round"/>`;
    }
    default:
      return "";
  }
}

export function shapeSvg(el: SlideElement): string {
  const { W, H } = elementPx(el);
  return `<svg viewBox="0 0 ${n(W)} ${n(H)}" width="100%" height="100%" preserveAspectRatio="none" overflow="visible" aria-hidden="true">${shapeBody(el, W, H)}</svg>`;
}

export const hasIcon = (name: string | undefined): name is string =>
  !!name && Object.hasOwn(ICON_NODES, name);

export function iconSvg(name: string, color?: Paint, strokeWidth = 2): string {
  const nodes = hasIcon(name) ? ICON_NODES[name] : [];
  const body = nodes
    .map(
      ([tag, attrs]) =>
        `<${tag} ${Object.entries(attrs)
          .map(([k, v]) => `${k}="${esc(String(v))}"`)
          .join(" ")}/>`,
    )
    .join("");
  return `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" style="color:${paintCss(color, "var(--sl-accent)")}" aria-hidden="true">${body}</svg>`;
}

/** Chart colours from one base colour (CSS). */
export const chartPalette = (base: string) => [
  base,
  `color-mix(in srgb,${base} 55%,var(--sl-fg))`,
  `color-mix(in srgb,${base} 45%,var(--sl-bg))`,
  "color-mix(in srgb,var(--sl-fg) 70%,var(--sl-bg))",
  `color-mix(in srgb,${base} 25%,var(--sl-fg))`,
  "color-mix(in srgb,var(--sl-fg) 35%,var(--sl-bg))",
];

const fmt = (v: number) =>
  Math.abs(v) >= 1000 ? v.toLocaleString("en-US") : String(n(v));

export function chartSvg(
  chart: ChartData,
  W: number,
  H: number,
  color?: Paint,
): string {
  const base = paintCss(color, "var(--sl-accent)");
  const pal = chartPalette(base);
  const text = (
    x: number,
    y: number,
    s: string,
    anchor = "middle",
    size = 18,
    extra = "",
  ) =>
    `<text x="${n(x)}" y="${n(y)}" text-anchor="${anchor}" font-size="${size}" style="fill:currentColor${extra}">${esc(s)}</text>`;
  const { labels, values } = chart;
  let body = "";
  if (chart.kind === "pie") {
    const total = values.reduce((a, v) => a + Math.max(0, v), 0) || 1;
    const R = Math.max(1, Math.min(H, W * 0.55) / 2 - 4);
    const cx = R + 4;
    const cy = H / 2;
    let a0 = -Math.PI / 2;
    values.forEach((v, k) => {
      const frac = Math.max(0, v) / total;
      if (frac <= 0) return;
      const a1 = a0 + frac * Math.PI * 2;
      const fill = pal[k % pal.length];
      if (frac >= 0.9999)
        body += `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(R)}" style="fill:${fill}"/>`;
      else {
        const large = a1 - a0 > Math.PI ? 1 : 0;
        const p = (a: number) =>
          `${n(cx + Math.cos(a) * R)},${n(cy + Math.sin(a) * R)}`;
        body += `<path d="M${n(cx)},${n(cy)} L${p(a0)} A${n(R)},${n(R)} 0 ${large} 1 ${p(a1)} Z" style="fill:${fill};stroke:var(--sl-bg);stroke-width:2"/>`;
      }
      a0 = a1;
    });
    const lx = cx + R + 28;
    const step = Math.min(40, (H - 8) / Math.max(1, labels.length));
    labels.forEach((l, k) => {
      const y = H / 2 - (step * labels.length) / 2 + step * k + step / 2;
      body += `<rect x="${n(lx)}" y="${n(y - 8)}" width="16" height="16" rx="4" style="fill:${pal[k % pal.length]}"/>`;
      body += text(lx + 26, y + 6, `${l}  ${fmt(values[k])}`, "start", 18);
    });
  } else {
    const padL = 8;
    const padB = 34;
    const padT = 26;
    const plotW = W - padL * 2;
    const plotH = Math.max(1, H - padB - padT);
    const max = Math.max(...values, 0) || 1;
    const min = Math.min(...values, 0);
    const span = max - min || 1;
    const y = (v: number) => padT + plotH - ((v - min) / span) * plotH;
    const slot = plotW / Math.max(1, labels.length);
    body += `<line x1="${padL}" y1="${n(y(0))}" x2="${n(W - padL)}" y2="${n(y(0))}" style="stroke:currentColor;stroke-opacity:.25;stroke-width:2"/>`;
    if (chart.kind === "bar") {
      values.forEach((v, k) => {
        const bw = slot * 0.62;
        const x = padL + slot * k + (slot - bw) / 2;
        const top = Math.min(y(v), y(0));
        body += `<rect x="${n(x)}" y="${n(top)}" width="${n(bw)}" height="${n(Math.max(1, Math.abs(y(v) - y(0))))}" rx="${n(Math.min(8, bw / 4))}" style="fill:${pal[0]}"/>`;
        body += text(
          x + bw / 2,
          top - 8,
          fmt(v),
          "middle",
          16,
          ";fill-opacity:.8",
        );
      });
    } else {
      const pts = values.map(
        (v, k) => [padL + slot * k + slot / 2, y(v)] as const,
      );
      body += `<polyline points="${pts.map(([a, b]) => `${n(a)},${n(b)}`).join(" ")}" style="fill:none;stroke:${pal[0]};stroke-width:5;stroke-linejoin:round;stroke-linecap:round"/>`;
      pts.forEach(([a, b], k) => {
        body += `<circle cx="${n(a)}" cy="${n(b)}" r="7" style="fill:var(--sl-bg);stroke:${pal[0]};stroke-width:4"/>`;
        body += text(
          a,
          b - 14,
          fmt(values[k]),
          "middle",
          16,
          ";fill-opacity:.8",
        );
      });
    }
    labels.forEach((l, k) => {
      body += text(
        padL + slot * k + slot / 2,
        H - 8,
        l,
        "middle",
        17,
        ";fill-opacity:.7",
      );
    });
  }
  return `<svg viewBox="0 0 ${n(W)} ${n(H)}" width="100%" height="100%" font-family="inherit" aria-hidden="true">${body}</svg>`;
}

/** Inline style declarations for an element's box and text styling. */
export function elementCss(el: SlideElement): Record<string, string> {
  const css: Record<string, string> = {
    left: `${el.x}%`,
    top: `${el.y}%`,
    width: `${el.w}%`,
    height: `${el.h}%`,
  };
  if (el.rotation) css.transform = `rotate(${n(el.rotation)}deg)`;
  if (el.opacity !== undefined) css.opacity = String(el.opacity);
  if (el.type === "text") {
    if (el.font === "title") {
      css["font-family"] = "var(--sl-title-font)";
      css["font-weight"] = "var(--sl-title-weight)";
      css["line-height"] = "1.08";
      css["letter-spacing"] = "-0.02em";
    } else if (el.font && el.font !== "body")
      css["font-family"] = FONT_STACK[el.font];
    if (el.size) css["font-size"] = `${el.size}px`;
    if (el.align) css["text-align"] = el.align;
    if (el.color) css.color = paintCss(el.color);
  }
  return css;
}

export const cssText = (css: Record<string, string>) =>
  Object.entries(css)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");

/** The drawing inside an element's box (text boxes return their HTML, editor output). */
export function elementInner(el: SlideElement): string {
  switch (el.type) {
    case "image":
      return isSafeImageSrc(el.src)
        ? `<img src="${esc(el.src)}" alt="" draggable="false"${el.fit === "cover" ? ' style="object-fit:cover"' : ""}>`
        : "";
    case "text":
      return `<div>${el.html ?? ""}</div>`;
    case "shape":
      return shapeSvg(el);
    case "icon":
      return iconSvg(el.icon ?? "", el.color, el.strokeWidth);
    case "chart": {
      const { W, H } = elementPx(el);
      return el.chart ? chartSvg(el.chart, W, H, el.color) : "";
    }
    default:
      return "";
  }
}

export const elementClass = (el: SlideElement) => `sl-el sl-el-${el.type}`;

export function elementMarkup(el: SlideElement): string {
  return `<div class="${elementClass(el)}" style="${esc(cssText(elementCss(el)))}">${elementInner(el)}</div>`;
}

/** CSS background for a slide's override, or undefined for the theme's own. */
export function backgroundCss(bg: string | undefined): string | undefined {
  if (!bg) return undefined;
  if (/^#[0-9a-f]{6}$/i.test(bg)) return bg;
  return Object.hasOwn(BACKGROUNDS, bg) ? BACKGROUNDS[bg].css : undefined;
}

export function backgroundHex(bg: string | undefined, theme: ThemeDef): string {
  if (bg && /^#[0-9a-f]{6}$/i.test(bg)) return bg.slice(1).toUpperCase();
  const preset =
    bg && Object.hasOwn(BACKGROUNDS, bg) ? BACKGROUNDS[bg].base : "bg";
  return paintHex(preset, theme, theme.bg) ?? theme.bg.slice(1).toUpperCase();
}

/** CSS declarations (kebab-case) as a React style object. */
export const styleObject = (css: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(css).map(([k, v]) => [
      k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()),
      v,
    ]),
  );
