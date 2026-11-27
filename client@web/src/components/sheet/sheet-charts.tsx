"use client";

import { BarChart3, LineChart, PieChart, X } from "lucide-react";
import { type PointerEvent as ReactPointerEvent, useRef, useState } from "react";
import {
  CHART_COLORS,
  type ChartData,
  type ChartType,
  chartData,
  niceTicks,
  pieSlices,
  rangeLabel,
  type SheetChart,
} from "@/lib/sheet/chart";
import { cn } from "@/lib/utils";

const HEADER = 36;
const LEGEND = 26;
const TYPE_ICONS: Record<ChartType, typeof BarChart3> = { bar: BarChart3, line: LineChart, pie: PieChart };
const TYPE_LABELS: Record<ChartType, string> = { bar: "Bar chart", line: "Line chart", pie: "Pie chart" };

interface LayerProps {
  charts: SheetChart[];
  /** Changes whenever cells may have changed; makes the cards re-read their values. */
  version: number;
  /** Cell values for a chart's range, read live from the engine (null when its sheet is gone). */
  readValues: (chart: SheetChart) => unknown[][] | null;
  dark: boolean;
  editable: boolean;
  onChange: (chart: SheetChart) => void;
  onDelete: (id: string) => void;
}

/** Floating chart cards over the grid. The layer itself lets pointer events through to the grid. */
export function SheetCharts({ charts, version, readValues, dark, editable, onChange, onDelete }: LayerProps) {
  if (!charts.length) return null;
  return (
    <div data-version={version} className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {charts.map((chart) => {
        const values = readValues(chart);
        if (!values) return null;
        return (
          <ChartCard
            key={chart.id}
            chart={chart}
            data={chartData(values)}
            colors={dark ? CHART_COLORS.dark : CHART_COLORS.light}
            editable={editable}
            onChange={onChange}
            onDelete={onDelete}
          />
        );
      })}
    </div>
  );
}

interface CardProps {
  chart: SheetChart;
  data: ChartData;
  colors: readonly string[];
  editable: boolean;
  onChange: (chart: SheetChart) => void;
  onDelete: (id: string) => void;
}

function ChartCard({ chart, data, colors, editable, onChange, onDelete }: CardProps) {
  // While dragging or resizing, the card follows the pointer locally and is saved once on release.
  const [live, setLive] = useState<SheetChart | null>(null);
  const drag = useRef<{ mode: "move" | "resize"; px: number; py: number; start: SheetChart } | null>(null);
  const c = live ?? chart;

  const begin = (mode: "move" | "resize") => (e: ReactPointerEvent<HTMLElement>) => {
    if (!editable || e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { mode, px: e.clientX, py: e.clientY, start: chart };
  };
  const move = (e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    setLive(
      d.mode === "move"
        ? { ...d.start, x: Math.max(0, d.start.x + dx), y: Math.max(0, d.start.y + dy) }
        : { ...d.start, w: Math.max(240, d.start.w + dx), h: Math.max(180, d.start.h + dy) },
    );
  };
  const end = () => {
    if (!drag.current) return;
    drag.current = null;
    if (live && (live.x !== chart.x || live.y !== chart.y || live.w !== chart.w || live.h !== chart.h)) onChange(live);
    setLive(null);
  };

  const legend = c.type === "pie" ? pieSlices(data).map((s) => s.label) : data.series.length > 1 ? data.series.map((s) => s.name) : [];
  const plotW = c.w - 24;
  const plotH = c.h - HEADER - (legend.length ? LEGEND : 0) - 12;
  const empty = c.type === "pie" ? !pieSlices(data).length : !data.series.length;
  const title = c.type === "pie" || data.series.length === 1 ? data.series[0]?.name : undefined;

  return (
    <section
      aria-label={`Chart of ${rangeLabel(c.range)}`}
      className={cn(
        "pointer-events-auto absolute flex flex-col overflow-hidden rounded-[14px] border border-border bg-card text-card-foreground shadow-float",
        live && "select-none",
      )}
      style={{ left: c.x, top: c.y, width: c.w, height: c.h }}
    >
      <header
        className={cn("flex h-9 shrink-0 items-center gap-1 pr-1.5 pl-3", editable && "cursor-grab active:cursor-grabbing")}
        onPointerDown={begin("move")}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
          {title || "Chart"} <span className="font-normal text-muted-foreground">{rangeLabel(c.range)}</span>
        </span>
        {editable &&
          (Object.keys(TYPE_ICONS) as ChartType[]).map((type) => {
            const Icon = TYPE_ICONS[type];
            return (
              <button
                key={type}
                type="button"
                aria-label={TYPE_LABELS[type]}
                title={TYPE_LABELS[type]}
                aria-pressed={c.type === type}
                onClick={() => c.type !== type && onChange({ ...chart, type })}
                className={cn(
                  "press flex size-7 items-center justify-center rounded-[8px] text-muted-foreground hover:bg-accent hover:text-foreground",
                  c.type === type && "bg-app-soft text-app hover:bg-app-soft hover:text-app",
                )}
              >
                <Icon className="size-4" />
              </button>
            );
          })}
        {editable && (
          <button
            type="button"
            aria-label="Delete chart"
            title="Delete chart"
            onClick={() => onDelete(chart.id)}
            className="press flex size-7 items-center justify-center rounded-[8px] text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </header>
      <div className="relative min-h-0 flex-1 px-3 pb-3">
        {empty ? (
          <p className="flex h-full items-center justify-center text-center text-[13px] text-muted-foreground">
            No numbers in {rangeLabel(c.range)} yet
          </p>
        ) : (
          <svg width={plotW} height={plotH} viewBox={`0 0 ${plotW} ${plotH}`} className="block overflow-visible" role="img" aria-label={`${TYPE_LABELS[c.type]} of ${rangeLabel(c.range)}`}>
            {c.type === "pie" ? (
              <Pie data={data} colors={colors} w={plotW} h={plotH} />
            ) : (
              <Cartesian data={data} colors={colors} w={plotW} h={plotH} line={c.type === "line"} />
            )}
          </svg>
        )}
        {!empty && legend.length > 0 && (
          <ul className="absolute right-3 bottom-2 left-3 flex h-5 items-center gap-3 overflow-hidden text-[12px] text-muted-foreground">
            {legend.map((name, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: entries are positional (names can repeat) and the colour follows the index
              <li key={`${name}-${i}`} className="flex min-w-0 shrink-0 items-center gap-1.5">
                <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: colors[i] }} />
                <span className="max-w-28 truncate">{name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {editable && (
        <div
          aria-hidden="true"
          className="absolute right-0 bottom-0 size-4 cursor-nwse-resize"
          onPointerDown={begin("resize")}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        />
      )}
    </section>
  );
}

const fmt = (n: number) => (Math.abs(n) >= 1e6 ? `${Number((n / 1e6).toPrecision(3))}M` : Math.abs(n) >= 1e4 ? `${Number((n / 1e3).toPrecision(3))}k` : String(Number(n.toPrecision(6))));
const short = (s: string) => (s.length > 10 ? `${s.slice(0, 9)}...` : s);

function Cartesian({ data, colors, w, h, line }: { data: ChartData; colors: readonly string[]; w: number; h: number; line: boolean }) {
  const all = data.series.flatMap((s) => s.values);
  const ticks = niceTicks(Math.min(...all), Math.max(...all));
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const left = 40;
  const bottom = 20;
  const pw = Math.max(1, w - left);
  const ph = Math.max(1, h - bottom - 4);
  const y = (v: number) => 4 + ph - ((v - lo) / (hi - lo)) * ph;
  const n = data.labels.length;
  const band = pw / Math.max(1, n);
  const every = Math.max(1, Math.ceil((n * 64) / pw));
  const cx = (i: number) => left + band * i + band / 2;

  return (
    <g className="text-[11px]">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={left} x2={w} y1={y(t)} y2={y(t)} className={t === 0 ? "stroke-foreground/30" : "stroke-border"} strokeWidth={1} />
          <text x={left - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground tabular-nums">
            {fmt(t)}
          </text>
        </g>
      ))}
      {data.labels.map((label, i) =>
        i % every === 0 ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: axis labels are positional and can repeat
          <text key={`${label}-${i}`} x={cx(i)} y={h - 4} textAnchor="middle" className="fill-muted-foreground">
            {short(label)}
          </text>
        ) : null,
      )}
      {line
        ? data.series.map((s, si) => (
            <g key={s.name}>
              <polyline
                fill="none"
                stroke={colors[si]}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={s.values.map((v, i) => `${cx(i)},${y(v)}`).join(" ")}
              />
              {s.values.map((v, i) => (
                <circle key={`${s.name}-${data.labels[i]}-${i}`} cx={cx(i)} cy={y(v)} r={n <= 40 ? 4 : 8} fill={n <= 40 ? colors[si] : "transparent"} className="stroke-card" strokeWidth={n <= 40 ? 2 : 0}>
                  <title>{`${data.labels[i]}, ${s.name}: ${v}`}</title>
                </circle>
              ))}
            </g>
          ))
        : data.series.map((s, si) => {
            const inner = band * 0.72;
            const bw = Math.max(1, inner / data.series.length - 2);
            return s.values.map((v, i) => {
              const x = left + band * i + (band - inner) / 2 + si * (bw + 2);
              const top = Math.min(y(v), y(0));
              return (
                <rect key={`${s.name}-${data.labels[i]}-${i}`} x={x} y={top} width={bw} height={Math.max(0, Math.abs(y(v) - y(0)))} rx={Math.min(3, bw / 2)} fill={colors[si]}>
                  <title>{`${data.labels[i]}, ${s.name}: ${v}`}</title>
                </rect>
              );
            });
          })}
    </g>
  );
}

function Pie({ data, colors, w, h }: { data: ChartData; colors: readonly string[]; w: number; h: number }) {
  const slices = pieSlices(data);
  const total = slices.reduce((n, s) => n + s.value, 0);
  const r = Math.max(10, Math.min(w, h) / 2 - 4);
  const cx = w / 2;
  const cy = h / 2;
  let angle = -Math.PI / 2;
  return (
    <g>
      {slices.map((s, i) => {
        const sweep = (s.value / total) * Math.PI * 2;
        const a0 = angle;
        angle += sweep;
        const title = <title>{`${s.label}: ${s.value} (${Math.round((s.value / total) * 100)}%)`}</title>;
        if (slices.length === 1) {
          return (
            <circle key={s.label} cx={cx} cy={cy} r={r} fill={colors[0]}>
              {title}
            </circle>
          );
        }
        const p = (a: number) => `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
        return (
          <path
            key={`${s.label}-${i}`}
            d={`M${cx},${cy} L${p(a0)} A${r},${r} 0 ${sweep > Math.PI ? 1 : 0} 1 ${p(angle)} Z`}
            fill={colors[i]}
            className="stroke-card"
            strokeWidth={2}
            strokeLinejoin="round"
          >
            {title}
          </path>
        );
      })}
    </g>
  );
}
