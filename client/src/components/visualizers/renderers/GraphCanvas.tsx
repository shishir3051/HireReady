"use client";

import { useId, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { ColorKey, GraphVisual } from "@/lib/types";
import { COLOR_KEYS, isColorKey, viz, vizInk, vizTint } from "../lib/colors";
import { asArray, clamp, isFiniteNumber, safeId, str, textWidth, truncate } from "../lib/utils";
import { T_FAST } from "../lib/motion";
import { EmptyCanvas, SvgFrame, type CanvasProps } from "./common";
import { ArrowMarker } from "./svgParts";

const SCALE = 4.4; // 0–100 → 0–440
const R = 17;
const LABEL_FONT = 12.5;
const BADGE_FONT = 10.5;

interface GNode {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
}

function prepare(visual: GraphVisual) {
  const nodes: GNode[] = [];
  const seen = new Set<string>();
  for (const n of asArray(visual?.nodes)) {
    if (!n) continue;
    const id = String(n.id);
    if (seen.has(id)) continue;
    seen.add(id);
    const label = truncate(n.label !== undefined && n.label !== null && n.label !== "" ? str(n.label) : id, 10);
    nodes.push({
      id,
      label,
      x: clamp(isFiniteNumber(n.x) ? n.x : 50, 0, 100) * SCALE,
      y: clamp(isFiniteNumber(n.y) ? n.y : 50, 0, 100) * SCALE,
      w: Math.max(R * 2, textWidth(label, LABEL_FONT) + 16),
    });
  }
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edges = asArray(visual?.edges)
    .filter((e) => e && byId.has(String(e.from)) && byId.has(String(e.to)))
    .map((e) => ({ from: String(e.from), to: String(e.to), weight: e.weight === undefined || e.weight === null ? undefined : str(e.weight) }));
  const directed = visual?.directed === true;
  const pairs = new Set(edges.map((e) => `${e.from}|${e.to}`));

  // bounding box (+ room for badges below and labels)
  const padX = 34;
  const padTop = 26;
  const padBottom = 40;
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs) - padX;
  const maxX = Math.max(...xs) + padX;
  const minY = Math.min(...ys) - padTop;
  const maxY = Math.max(...ys) + padBottom;
  return { nodes, byId, edges, directed, pairs, minX, minY, width: Math.max(maxX - minX, 120), height: Math.max(maxY - minY, 90) };
}

/** Undirected / directed graph at author-given positions with weights, highlights and badges. */
export function GraphCanvas({ visual, index, variant = "full" }: CanvasProps<GraphVisual>) {
  const uid = safeId(useId());
  const g = useMemo(() => prepare(visual), [visual]);
  const steps = asArray(visual?.steps);
  const step = steps[clamp(index, 0, steps.length - 1)];
  const thumb = variant === "thumb";

  if (g.nodes.length === 0) return <EmptyCanvas>empty graph</EmptyCanvas>;

  const nodeHl = new Map<string, ColorKey>();
  for (const h of asArray(step?.nodeHighlights)) {
    if (!h) continue;
    for (const id of asArray(h.ids)) nodeHl.set(String(id), isColorKey(h.color) ? h.color : "primary");
  }
  const edgeHl = new Map<string, ColorKey>();
  for (const h of asArray(step?.edgeHighlights)) {
    if (!h) continue;
    for (const e of asArray(h.edges)) {
      if (!Array.isArray(e) || e.length < 2) continue;
      const c = isColorKey(h.color) ? h.color : "primary";
      edgeHl.set(`${e[0]}|${e[1]}`, c);
      if (!g.directed) edgeHl.set(`${e[1]}|${e[0]}`, c);
    }
  }
  const badges = step?.nodeBadges && typeof step.nodeBadges === "object" ? step.nodeBadges : {};
  const marker = (c: ColorKey | "default") => `${uid}-g-${c}`;
  const ox = -g.minX;
  const oy = -g.minY;

  return (
    <SvgFrame width={g.width} height={g.height} variant={variant} label={`${g.directed ? "Directed" : "Undirected"} graph with ${g.nodes.length} nodes`} minScale={0.68} maxScale={1.12}>
      {g.directed ? (
        <defs>
          <ArrowMarker id={marker("default")} className="fill-muted" size={9} />
          {COLOR_KEYS.map((c) => (
            <ArrowMarker key={c} id={marker(c)} className={viz(c, "fill")} size={10} />
          ))}
        </defs>
      ) : null}
      <g transform={`translate(${ox} ${oy})`}>
        {/* edges */}
        {g.edges.map((e, k) => {
          const a = g.byId.get(e.from)!;
          const b = g.byId.get(e.to)!;
          const c = edgeHl.get(`${e.from}|${e.to}`);
          const self = e.from === e.to;
          let d: string;
          let mx: number;
          let my: number;
          if (self) {
            d = `M ${a.x - 8} ${a.y - R + 2} C ${a.x - 30} ${a.y - R - 34}, ${a.x + 30} ${a.y - R - 34}, ${a.x + 8} ${a.y - R + 1}`;
            mx = a.x;
            my = a.y - R - 26;
          } else {
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;
            // curve antiparallel directed edges so both stay visible
            const curved = g.directed && g.pairs.has(`${e.to}|${e.from}`);
            const bend = curved ? 16 : 0;
            const nx = -uy;
            const ny = ux;
            const startGap = R + 1;
            const endGap = R + (g.directed ? 3 : 1);
            const x1 = a.x + ux * startGap + nx * (bend * 0.35);
            const y1 = a.y + uy * startGap + ny * (bend * 0.35);
            const x2 = b.x - ux * endGap + nx * (bend * 0.35);
            const y2 = b.y - uy * endGap + ny * (bend * 0.35);
            const cx = (a.x + b.x) / 2 + nx * bend;
            const cy = (a.y + b.y) / 2 + ny * bend;
            d = curved ? `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}` : `M ${x1} ${y1} L ${x2} ${y2}`;
            // weight label: midpoint, nudged off the line
            const off = curved ? bend * 0.6 + 8 : 10;
            mx = (a.x + b.x) / 2 + nx * off;
            my = (a.y + b.y) / 2 + ny * off;
          }
          const wText = e.weight !== undefined ? truncate(e.weight, 8) : "";
          const ww = textWidth(wText, 10.5) + 8;
          return (
            <g key={`${e.from}|${e.to}|${k}`}>
              <path
                d={d}
                fill="none"
                strokeWidth={c ? 3 : 1.75}
                strokeLinecap="round"
                className={`transition-[stroke,stroke-width] duration-200 ${c ? viz(c, "stroke") : "stroke-muted/70"}`}
                markerEnd={g.directed ? `url(#${marker(c ?? "default")})` : undefined}
              />
              {wText && !thumb ? (
                <g>
                  <rect
                    x={mx - ww / 2}
                    y={my - 8}
                    width={ww}
                    height={16}
                    rx={4}
                    className={c ? viz(c, "strokeSoft") : "stroke-border"}
                    strokeWidth={1}
                    style={{ fill: c ? vizTint(c, 14) : "var(--surface)" }}
                  />
                  <text
                    x={mx}
                    y={my}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={10.5}
                    fontWeight={600}
                    className="font-mono"
                    style={{ fill: c ? vizInk(c) : "var(--muted)" }}
                  >
                    {wText}
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}

        {/* nodes */}
        {g.nodes.map((n) => {
          const c = nodeHl.get(n.id);
          const badge = Object.prototype.hasOwnProperty.call(badges, n.id) ? str((badges as Record<string, unknown>)[n.id]) : "";
          const bText = truncate(badge, 10);
          const bw = textWidth(bText, BADGE_FONT) + 10;
          return (
            <g key={n.id} transform={`translate(${n.x} ${n.y})`}>
              <title>{n.id}</title>
              <rect
                x={-n.w / 2}
                y={-R}
                width={n.w}
                height={R * 2}
                rx={R}
                strokeWidth={c ? 2.5 : 1.6}
                className={`transition-[fill,stroke] duration-200 ${c ? viz(c, "stroke") : "stroke-muted/70"}`}
                style={{ fill: c ? vizTint(c, c === "warning" ? 30 : 24) : "var(--surface)" }}
              />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={LABEL_FONT}
                fontWeight={700}
                className={`font-mono ${c === "muted" ? "fill-muted" : "fill-foreground"}`}
              >
                {n.label}
              </text>
              <AnimatePresence initial={false}>
                {bText && !thumb ? (
                  <motion.g
                    key={bText}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={T_FAST}
                  >
                    <rect
                      x={-bw / 2}
                      y={R + 5}
                      width={bw}
                      height={16}
                      rx={8}
                      className="fill-brand-soft stroke-brand/40"
                      strokeWidth={1}
                    />
                    <text
                      y={R + 13}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={BADGE_FONT}
                      fontWeight={650}
                      className="fill-brand font-mono"
                    >
                      {bText}
                    </text>
                  </motion.g>
                ) : null}
              </AnimatePresence>
            </g>
          );
        })}
      </g>
    </SvgFrame>
  );
}
