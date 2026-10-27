"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";
import type { ArrayVisual, ColorKey, GridVisual, Panel, StateVisual, TableVisual, Visual } from "@/lib/types";
import { isColorKey, viz, vizTint } from "../lib/colors";
import { typeMeta } from "../lib/steps";
import { asArray, cn, str, truncate } from "../lib/utils";
import { StepCanvas } from "../renderers";
import { VisualErrorBoundary } from "./ErrorBoundary";

/** Content is centred in a viewBox of at least minW × minH so tiny inputs don't blow up to giant cells. */
function MiniSvg({ w, h, children, minW = 220, minH = 120 }: { w: number; h: number; children: ReactNode; minW?: number; minH?: number }) {
  const vw = Math.max(1, w, minW);
  const vh = Math.max(1, h, minH);
  return (
    <svg viewBox={`0 0 ${vw} ${vh}`} preserveAspectRatio="xMidYMid meet" className="block h-full w-full" aria-hidden>
      <g transform={`translate(${(vw - Math.max(1, w)) / 2} ${(vh - Math.max(1, h)) / 2})`}>{children}</g>
    </svg>
  );
}

function cellStyle(c: ColorKey | undefined) {
  return {
    className: c ? viz(c, "stroke") : "stroke-border",
    style: { fill: c ? vizTint(c, 24) : "var(--surface)" },
  };
}

function MiniArray({ visual }: { visual: ArrayVisual }) {
  const rows = asArray(asArray(visual.steps)[0]?.arrays);
  const S = 26;
  const G = 4;
  const maxN = Math.max(1, ...rows.map((r) => asArray(r?.values).length));
  const w = maxN * (S + G) - G;
  const h = Math.max(1, rows.length) * (S + 12) - 12;
  return (
    <MiniSvg w={w + 4} h={h + 4}>
      {rows.map((row, r) => {
        const values = asArray(row?.values);
        const hl = new Map<number, ColorKey>();
        for (const x of asArray(row?.highlights)) for (const i of asArray(x?.indices)) hl.set(i, isColorKey(x?.color) ? x.color : "primary");
        const off = ((maxN - values.length) * (S + G)) / 2;
        return values.map((v, i) => {
          const cs = cellStyle(hl.get(i));
          const s = str(v);
          return (
            <g key={`${r}-${i}`} transform={`translate(${2 + off + i * (S + G)} ${2 + r * (S + 12)})`}>
              <rect width={S} height={S} rx={5} strokeWidth={1.5} className={cs.className} style={cs.style} />
              {s.length <= 3 ? (
                <text x={S / 2} y={S / 2} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600} className="fill-foreground font-mono">
                  {s}
                </text>
              ) : null}
            </g>
          );
        });
      })}
    </MiniSvg>
  );
}

function MiniGrid({ visual }: { visual: GridVisual }) {
  const step = asArray(visual.steps)[0];
  const grid = asArray(step?.grid).map((r) => asArray(r));
  const rows = grid.length;
  const cols = Math.max(1, ...grid.map((r) => r.length));
  const S = 16;
  const G = 2;
  const hl = new Map<string, ColorKey>();
  for (const x of asArray(step?.highlights))
    for (const c of asArray(x?.cells)) if (Array.isArray(c)) hl.set(`${c[0]},${c[1]}`, isColorKey(x?.color) ? x.color : "primary");
  const text = cols <= 9;
  return (
    <MiniSvg w={cols * (S + G) + 2} h={Math.max(1, rows) * (S + G) + 2} minW={160} minH={90}>
      {grid.map((row, r) =>
        Array.from({ length: cols }, (_, c) => {
          const cs = cellStyle(hl.get(`${r},${c}`));
          const v = row[c];
          const s = v === null || v === undefined ? "" : str(v);
          return (
            <g key={`${r}-${c}`} transform={`translate(${1 + c * (S + G)} ${1 + r * (S + G)})`}>
              <rect width={S} height={S} rx={3} strokeWidth={1} className={cs.className} style={cs.style} />
              {text && s.length <= 3 ? (
                <text x={S / 2} y={S / 2} textAnchor="middle" dominantBaseline="central" fontSize={8} fontWeight={600} className="fill-foreground font-mono">
                  {s}
                </text>
              ) : null}
            </g>
          );
        }),
      )}
    </MiniSvg>
  );
}

function MiniTable({ visual }: { visual: TableVisual }) {
  const tables = asArray(asArray(visual.steps)[0]?.tables).slice(0, 3);
  const RH = 12;
  const CW = 34;
  const gap = 12;
  let x = 0;
  const parts = tables.map((t, ti) => {
    const cols = Math.max(1, asArray(t?.columns).length);
    const rows = asArray(t?.rows).slice(0, 8);
    const hl = new Map<number, ColorKey>();
    for (const h of asArray(t?.highlightRows)) for (const r of asArray(h?.rows)) hl.set(r, isColorKey(h?.color) ? h.color : "primary");
    const w = cols * CW;
    const g = (
      <g key={ti} transform={`translate(${x} 0)`}>
        <rect width={w} height={RH} rx={2} className="fill-surface-2 stroke-border" strokeWidth={1} />
        {asArray(t?.columns).map((c, k) => (
          <text key={k} x={k * CW + 3} y={RH / 2} dominantBaseline="central" fontSize={6.5} fontWeight={700} className="fill-muted font-mono">
            {truncate(str(c), 7)}
          </text>
        ))}
        {rows.map((row, r) => {
          const c = hl.get(r);
          return (
            <g key={r} transform={`translate(0 ${(r + 1) * RH})`}>
              <rect width={w} height={RH} className={c ? viz(c, "strokeSoft") : "stroke-border"} strokeWidth={0.75} style={{ fill: c ? vizTint(c, 22) : "var(--surface)" }} />
              {asArray(row).map((v, k) => (
                <text key={k} x={k * CW + 3} y={RH / 2} dominantBaseline="central" fontSize={6.5} className="fill-foreground font-mono">
                  {truncate(v === null ? "NULL" : str(v), 7)}
                </text>
              ))}
            </g>
          );
        })}
      </g>
    );
    x += w + gap;
    return { g, h: (rows.length + 1) * RH };
  });
  return (
    <MiniSvg w={Math.max(1, x - gap)} h={Math.max(RH, ...parts.map((p) => p.h))}>
      {parts.map((p) => p.g)}
    </MiniSvg>
  );
}

function MiniState({ visual }: { visual: StateVisual }) {
  const panels = asArray(asArray(visual.steps)[0]?.panels).slice(0, 4) as Panel[];
  const PW = 92;
  const gap = 8;
  return (
    <MiniSvg w={Math.max(1, panels.length * (PW + gap) - gap)} h={96}>
      {panels.map((p, i) => {
        const items = p.kind === "map" ? asArray(p.entries).map((e) => `${e.key}:${e.value}`) : asArray(p.items).map((v) => str(v));
        return (
          <g key={i} transform={`translate(${i * (PW + gap)} 0)`}>
            <rect width={PW} height={96} rx={8} className="fill-surface stroke-border" strokeWidth={1} />
            <text x={8} y={14} fontSize={9} fontWeight={700} className="fill-muted font-mono">
              {truncate(str(p.title), 14)}
            </text>
            {items.slice(0, 4).map((s, k) => (
              <g key={k} transform={`translate(8 ${24 + k * 17})`}>
                <rect width={PW - 16} height={13} rx={3} className="fill-surface-2 stroke-border" strokeWidth={0.75} />
                <text x={4} y={6.5} dominantBaseline="central" fontSize={7.5} className="fill-foreground font-mono">
                  {truncate(s, 16)}
                </text>
              </g>
            ))}
          </g>
        );
      })}
    </MiniSvg>
  );
}

function ThumbBody({ visual }: { visual: Visual }) {
  switch (visual?.type) {
    case "array":
      return <MiniArray visual={visual} />;
    case "grid":
      return <MiniGrid visual={visual} />;
    case "table":
      return <MiniTable visual={visual} />;
    case "state":
      return <MiniState visual={visual} />;
    case "linked-list":
    case "tree":
    case "graph":
    case "timeline":
      return <StepCanvas visual={visual} index={0} variant="thumb" />;
    default:
      return <TypeIcon visual={visual} />;
  }
}

function TypeIcon({ visual }: { visual: Visual }) {
  const { icon: Icon, label } = typeMeta(visual?.type);
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted">
      <span className="inline-flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
        <Icon aria-hidden className="size-5" />
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
    </div>
  );
}

/** Tiny static preview of step 0 / first frame (type icon for diagram & comparison). No controls. */
export function Thumbnail({ visual, className }: { visual: Visual; className?: string }) {
  const { label } = typeMeta(visual?.type);
  return (
    <div
      role="img"
      aria-label={`${label} preview${visual?.title ? `: ${visual.title}` : ""}`}
      className={cn("relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-border bg-surface-2/50", className)}
    >
      <div className="pointer-events-none absolute inset-2 flex items-center justify-center [&>*]:max-h-full">
        <MotionConfig reducedMotion="always">
          <VisualErrorBoundary fallback={() => <TypeIcon visual={visual} />}>
            <ThumbBody visual={visual} />
          </VisualErrorBoundary>
        </MotionConfig>
      </div>
    </div>
  );
}
