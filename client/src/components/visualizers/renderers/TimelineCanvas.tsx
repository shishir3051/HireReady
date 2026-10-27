"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { ColorKey, TimelineSegment, TimelineVisual } from "@/lib/types";
import { assignColors, isColorKey, viz, vizInk, vizTint } from "../lib/colors";
import { asArray, clamp, isFiniteNumber, str, textWidth, truncate } from "../lib/utils";
import { T } from "../lib/motion";
import { EmptyCanvas, SvgFrame, type CanvasProps } from "./common";

const PAD = 12;
const LANE_H = 38;
const BAR_H = 26;
const PLOT_W = 600;
const AXIS_H = 30;
const LABEL_FONT = 11;

function niceStep(span: number, maxTicks = 12): number {
  const raw = span / maxTicks;
  const pow = 10 ** Math.floor(Math.log10(Math.max(raw, 1e-9)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * pow >= raw) return m * pow;
  return 10 * pow;
}

function segOk(s: TimelineSegment | null | undefined): s is TimelineSegment {
  return !!s && isFiniteNumber(s.start) && isFiniteNumber(s.end);
}

function analyze(visual: TimelineVisual) {
  const lanes: string[] = [];
  let min = Infinity;
  let max = -Infinity;
  const labels: { name: string; color?: ColorKey }[] = [];
  for (const st of asArray(visual?.steps)) {
    for (const s of asArray(st?.segments)) {
      if (!segOk(s)) continue;
      const lane = s.lane === undefined || s.lane === null ? "" : str(s.lane);
      if (!lanes.includes(lane)) lanes.push(lane);
      min = Math.min(min, s.start, s.end);
      max = Math.max(max, s.start, s.end);
      labels.push({ name: str(s.label), color: s.color });
    }
  }
  if (!Number.isFinite(min)) {
    min = 0;
    max = 1;
  }
  if (min > 0) min = 0;
  if (max <= min) max = min + 1;
  const named = lanes.some((l) => l !== "");
  const laneLabelW = named ? Math.min(140, Math.max(...lanes.map((l) => textWidth(l, LABEL_FONT, false))) + 16) : 0;
  return { lanes: lanes.length ? lanes : [""], min, max, laneLabelW, autoColors: assignColors(labels.map((l) => ({ name: l.name }))) };
}

/** Gantt chart: lanes as rows, time axis, labelled segments that animate in step by step. */
export function TimelineCanvas({ visual, index, variant = "full" }: CanvasProps<TimelineVisual>) {
  const meta = useMemo(() => analyze(visual), [visual]);
  const steps = asArray(visual?.steps);
  const step = steps[clamp(index, 0, steps.length - 1)];
  const segments = asArray(step?.segments).filter(segOk);
  const thumb = variant === "thumb";
  const unit = typeof visual?.unit === "string" ? visual.unit : "";

  const { lanes, min, max, laneLabelW } = meta;
  const x0 = PAD + laneLabelW;
  const sx = (t: number) => x0 + ((clamp(t, min, max) - min) / (max - min)) * PLOT_W;
  const width = x0 + PLOT_W + PAD + 14;
  const plotH = lanes.length * LANE_H;
  const height = PAD + plotH + AXIS_H + (thumb ? 0 : 4);
  const tick = niceStep(max - min);
  const ticks: number[] = [];
  for (let t = Math.ceil(min / tick) * tick; t <= max + 1e-9 && ticks.length < 60; t += tick) ticks.push(Number(t.toFixed(6)));
  const now = segments.length ? Math.max(...segments.map((s) => Math.max(s.start, s.end))) : null;

  if (steps.length === 0) return <EmptyCanvas>empty timeline</EmptyCanvas>;

  return (
    <SvgFrame width={width} height={height} variant={variant} label={`Timeline with ${segments.length} segments`} minScale={0.62} maxScale={1.4}>
      {/* lanes */}
      {lanes.map((lane, i) => (
        <g key={`lane-${i}`}>
          <rect x={x0} y={PAD + i * LANE_H} width={PLOT_W} height={LANE_H} className={i % 2 ? "fill-surface-2/60" : "fill-transparent"} />
          {laneLabelW > 0 ? (
            <text
              x={x0 - 8}
              y={PAD + i * LANE_H + LANE_H / 2}
              textAnchor="end"
              dominantBaseline="central"
              fontSize={LABEL_FONT}
              fontWeight={600}
              className="fill-muted"
            >
              {truncate(lane, 20)}
            </text>
          ) : null}
        </g>
      ))}

      {/* grid + axis */}
      {ticks.map((t) => (
        <g key={`t-${t}`}>
          <line x1={sx(t)} x2={sx(t)} y1={PAD} y2={PAD + plotH} className="stroke-border" strokeDasharray="2 4" strokeWidth={1} />
          <line x1={sx(t)} x2={sx(t)} y1={PAD + plotH} y2={PAD + plotH + 5} className="stroke-muted" strokeWidth={1} />
          {!thumb ? (
            <text x={sx(t)} y={PAD + plotH + 16} textAnchor="middle" fontSize={10.5} className="fill-muted font-mono">
              {Number.isInteger(t) ? t : t.toFixed(1)}
            </text>
          ) : null}
        </g>
      ))}
      <line x1={x0} x2={x0 + PLOT_W} y1={PAD + plotH} y2={PAD + plotH} className="stroke-muted" strokeWidth={1.25} />
      {unit && !thumb ? (
        <text x={x0 + PLOT_W + 6} y={PAD + plotH + 16} fontSize={10.5} fontWeight={600} className="fill-muted">
          {truncate(unit, 8)}
        </text>
      ) : null}

      {/* segments */}
      <AnimatePresence initial={false}>
        {segments.map((s, k) => {
          const lane = s.lane === undefined || s.lane === null ? "" : str(s.lane);
          const li = Math.max(0, lanes.indexOf(lane));
          const a = sx(Math.min(s.start, s.end));
          const b = sx(Math.max(s.start, s.end));
          const w = Math.max(2, b - a);
          const label = str(s.label);
          const color: ColorKey = isColorKey(s.color) ? s.color : (meta.autoColors.get(label) ?? "primary");
          const y = PAD + li * LANE_H + (LANE_H - BAR_H) / 2;
          const fits = textWidth(label, LABEL_FONT) + 8 <= w;
          const shown = fits ? label : truncate(label, Math.floor((w - 6) / (LABEL_FONT * 0.61)));
          return (
            <motion.g
              key={`${lane}|${label}|${s.start}|${s.end}|${k}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={T}
            >
              <title>{`${label}: ${s.start}–${s.end}${unit ? ` ${unit}` : ""}${lane ? ` (${lane})` : ""}`}</title>
              <motion.rect
                x={a}
                y={y}
                height={BAR_H}
                rx={6}
                initial={{ width: 0 }}
                animate={{ width: w }}
                transition={T}
                strokeWidth={1.5}
                className={viz(color, "stroke")}
                style={{ fill: vizTint(color, color === "warning" ? 34 : 26) }}
              />
              {!thumb && shown.length > 0 && w > 14 ? (
                <motion.text
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ ...T, delay: 0.08 }}
                  x={a + w / 2}
                  y={y + BAR_H / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={LABEL_FONT}
                  fontWeight={650}
                  className="font-mono"
                  style={{ fill: vizInk(color) }}
                >
                  {shown}
                </motion.text>
              ) : null}
            </motion.g>
          );
        })}
      </AnimatePresence>

      {/* "now" cursor at the latest end time */}
      {now !== null && !thumb ? (
        <motion.g initial={false} animate={{ x: sx(now) }} transition={T}>
          <line x1={0} x2={0} y1={PAD - 4} y2={PAD + plotH} className="stroke-brand" strokeWidth={1.5} strokeDasharray="3 3" />
          <circle cx={0} cy={PAD - 4} r={3} className="fill-brand" />
        </motion.g>
      ) : null}
    </SvgFrame>
  );
}
