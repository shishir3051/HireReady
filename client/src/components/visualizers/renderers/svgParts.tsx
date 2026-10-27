"use client";

import { motion } from "motion/react";
import type { ColorKey } from "@/lib/types";
import { viz, vizInk, vizTint } from "../lib/colors";
import { textWidth } from "../lib/utils";
import { T } from "../lib/motion";
import { TAG_FONT, TAG_H } from "./common";

export function tagWidth(name: string): number {
  return Math.max(22, textWidth(name, TAG_FONT) + 12);
}

/**
 * Pointer label (e.g. `curr`, `slow`) drawn in SVG. (cx, y) = top-center.
 * `arrow` draws a small triangle under the tag pointing at the element below.
 */
export function SvgPointerTag({
  name,
  color,
  cx,
  y,
  arrow,
  brand,
}: {
  name: string;
  color: ColorKey;
  cx: number;
  y: number;
  arrow?: boolean;
  /** brand-styled (used for `head` / `root`) */
  brand?: boolean;
}) {
  const w = tagWidth(name);
  return (
    <motion.g initial={false} animate={{ x: cx, y }} transition={T}>
      <rect
        x={-w / 2}
        y={0}
        width={w}
        height={TAG_H}
        rx={5}
        className={brand ? "stroke-brand/50" : viz(color, "strokeSoft")}
        strokeWidth={1}
        style={{ fill: brand ? "var(--brand-soft)" : vizTint(color, 14) }}
      />
      <text
        x={0}
        y={TAG_H / 2}
        dominantBaseline="central"
        textAnchor="middle"
        fontSize={TAG_FONT}
        fontWeight={650}
        className="font-mono"
        style={{ fill: brand ? "var(--brand)" : vizInk(color) }}
      >
        {name}
      </text>
      {arrow ? (
        <path d={`M -4.5 ${TAG_H + 1.5} L 4.5 ${TAG_H + 1.5} L 0 ${TAG_H + 7} Z`} className={brand ? "fill-brand" : viz(color, "fill")} />
      ) : null}
    </motion.g>
  );
}

/** Arrowhead marker; reference with `url(#id)`. */
export function ArrowMarker({ id, className, size = 7 }: { id: string; className: string; size?: number }) {
  return (
    <marker
      id={id}
      viewBox="0 0 10 10"
      refX={9}
      refY={5}
      markerWidth={size}
      markerHeight={size}
      markerUnits="userSpaceOnUse"
      orient="auto-start-reverse"
    >
      <path d="M 0 0 L 10 5 L 0 10 z" className={className} />
    </marker>
  );
}
