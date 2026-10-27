"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { ColorKey, TreeNode, TreeStep, TreeVisual } from "@/lib/types";
import { assignColors, isColorKey, viz, vizInk, vizTint } from "../lib/colors";
import { asArray, clamp, str, textWidth, truncate } from "../lib/utils";
import { T } from "../lib/motion";
import { EmptyCanvas, SvgFrame, TAG_H, type CanvasProps } from "./common";
import { SvgPointerTag } from "./svgParts";

const PAD = 14;
const NODE_H = 34;
const LEVEL_H = 70;
const VALUE_FONT = 13;
const MAX_LABEL = 14;

interface Layout {
  pos: Map<string, { slot: number; depth: number }>;
  edges: [string, string][];
  slots: number;
  depth: number;
}

/**
 * Binary trees (left/right): in-order x positions. N-ary trees (children): tidy layout —
 * leaves take consecutive slots, parents are centred over their children.
 * Nodes not reachable from `root` are laid out as extra trees to the right.
 */
export function layoutTree(step: TreeStep | undefined): Layout {
  const nodes = asArray(step?.nodes).filter(Boolean);
  const byId = new Map<string, TreeNode>();
  for (const n of nodes) if (!byId.has(String(n.id))) byId.set(String(n.id), n);
  const nary = nodes.some((n) => Array.isArray(n.children));
  const kidsOf = (n: TreeNode): (string | null)[] => {
    if (nary) {
      const kids = asArray(n.children).map((k) => (k === null || k === undefined ? null : String(k)));
      // tolerate (invalid) mixing: append left/right after children
      if (n.left) kids.push(String(n.left));
      if (n.right) kids.push(String(n.right));
      return kids;
    }
    return [n.left === null || n.left === undefined ? null : String(n.left), n.right === null || n.right === undefined ? null : String(n.right)];
  };

  const referenced = new Set<string>();
  for (const n of byId.values()) for (const k of kidsOf(n)) if (k) referenced.add(k);
  const roots: string[] = [];
  const rootId = step?.root === null || step?.root === undefined ? null : String(step.root);
  if (rootId && byId.has(rootId)) roots.push(rootId);
  for (const id of byId.keys()) if (id !== rootId && !referenced.has(id)) roots.push(id);

  const pos = new Map<string, { slot: number; depth: number }>();
  const edges: [string, string][] = [];
  const visited = new Set<string>();
  let slot = 0;
  let maxDepth = 0;

  const inorder = (id: string, depth: number, parent: string | null) => {
    if (visited.has(id) || !byId.has(id)) return;
    visited.add(id);
    if (parent) edges.push([parent, id]);
    const n = byId.get(id)!;
    const [l, r] = kidsOf(n);
    if (l) inorder(l, depth + 1, id);
    pos.set(id, { slot, depth });
    slot += 1;
    maxDepth = Math.max(maxDepth, depth);
    if (r) inorder(r, depth + 1, id);
  };

  const tidy = (id: string, depth: number): number => {
    visited.add(id);
    maxDepth = Math.max(maxDepth, depth);
    const n = byId.get(id)!;
    const xs: number[] = [];
    for (const k of kidsOf(n)) {
      if (!k || visited.has(k) || !byId.has(k)) continue;
      edges.push([id, k]);
      xs.push(tidy(k, depth + 1));
    }
    let x: number;
    if (xs.length === 0) {
      x = slot;
      slot += 1;
    } else {
      x = (xs[0] + xs[xs.length - 1]) / 2;
    }
    pos.set(id, { slot: x, depth });
    return x;
  };

  roots.forEach((id, i) => {
    if (visited.has(id)) return;
    if (i > 0 && slot > 0) slot += 0.5;
    if (nary) tidy(id, 0);
    else inorder(id, 0, null);
  });
  // anything left (pure cycles) — place on its own
  for (const id of byId.keys()) {
    if (visited.has(id)) continue;
    if (slot > 0) slot += 0.5;
    if (nary) tidy(id, 0);
    else inorder(id, 0, null);
  }
  return { pos, edges, slots: slot, depth: maxDepth };
}

function analyze(visual: TreeVisual) {
  let slots = 1;
  let depth = 0;
  let maxLabel = 1;
  const ptrEntries: { name: string; color?: ColorKey }[] = [];
  for (const s of asArray(visual?.steps)) {
    const l = layoutTree(s);
    slots = Math.max(slots, l.slots);
    depth = Math.max(depth, l.depth);
    for (const n of asArray(s?.nodes)) if (n) maxLabel = Math.max(maxLabel, Math.min(MAX_LABEL, str(n.value).length));
    for (const p of asArray(s?.pointers)) if (p) ptrEntries.push({ name: str(p.name), color: p.color });
  }
  const nodeW = Math.max(NODE_H, textWidth("x".repeat(maxLabel), VALUE_FONT) + 18);
  return { slots, depth, slotW: Math.max(46, nodeW + 12), pointerColors: assignColors(ptrEntries) };
}

/** Binary trees, BSTs, heaps, tries and recursion / decision trees. */
export function TreeCanvas({ visual, index, variant = "full" }: CanvasProps<TreeVisual>) {
  const meta = useMemo(() => analyze(visual), [visual]);
  const steps = asArray(visual?.steps);
  const step = steps[clamp(index, 0, steps.length - 1)];
  const layout = useMemo(() => layoutTree(step), [step]);
  const thumb = variant === "thumb";
  const nodes = asArray(step?.nodes).filter(Boolean);

  const ptrs = asArray(step?.pointers).filter(Boolean);
  const nullPtrs = ptrs.filter((p) => p.nodeId === null || p.nodeId === undefined || !layout.pos.has(String(p.nodeId)));

  if (layout.pos.size === 0) {
    return (
      <EmptyCanvas>
        empty tree (root = null)
        {nullPtrs.length ? ` · ${nullPtrs.map((p) => `${str(p.name)} = null`).join(" · ")}` : ""}
      </EmptyCanvas>
    );
  }

  const { slotW } = meta;
  const topLane = thumb ? 4 : TAG_H + 12;
  const width = PAD * 2 + Math.max(meta.slots, layout.slots) * slotW;
  const height = PAD * 2 + topLane + Math.max(meta.depth, layout.depth) * LEVEL_H + NODE_H;
  const offset = ((Math.max(meta.slots, layout.slots) - layout.slots) * slotW) / 2;
  const cxOf = (id: string) => PAD + offset + (layout.pos.get(id)?.slot ?? 0) * slotW + slotW / 2;
  const cyOf = (id: string) => PAD + topLane + (layout.pos.get(id)?.depth ?? 0) * LEVEL_H + NODE_H / 2;

  const hl = new Map<string, ColorKey>();
  for (const h of asArray(step?.highlights)) {
    if (!h) continue;
    for (const id of asArray(h.ids)) hl.set(String(id), isColorKey(h.color) ? h.color : "primary");
  }

  // pointers on the same node are merged into one tag ("lo, hi") to keep levels readable
  const tags = new Map<string, { names: string[]; color: ColorKey }>();
  for (const p of ptrs) {
    if (p.nodeId === null || p.nodeId === undefined || !layout.pos.has(String(p.nodeId))) continue;
    const id = String(p.nodeId);
    const name = str(p.name);
    const color = (isColorKey(p.color) ? p.color : meta.pointerColors.get(name)) ?? "primary";
    const t = tags.get(id);
    if (t) {
      if (!t.names.includes(name)) t.names.push(name);
    } else tags.set(id, { names: [name], color });
  }

  const seen = new Set<string>();
  const drawn = nodes.filter((n) => {
    const id = String(n.id);
    if (seen.has(id) || !layout.pos.has(id)) return false;
    seen.add(id);
    return true;
  });

  const svg = (
      <SvgFrame width={width} height={height} variant={variant} label={`Tree with ${drawn.length} nodes`} maxScale={1.15}>
        <AnimatePresence initial={false}>
          {layout.edges.map(([a, b]) => {
            const ca = hl.get(a);
            const cb = hl.get(b);
            const on = ca !== undefined && ca === cb && ca !== "muted";
            return (
              <motion.line
                key={`${a}->${b}`}
                initial={{ opacity: 0, x1: cxOf(a), y1: cyOf(a), x2: cxOf(b), y2: cyOf(b) }}
                animate={{ opacity: 1, x1: cxOf(a), y1: cyOf(a), x2: cxOf(b), y2: cyOf(b) }}
                exit={{ opacity: 0 }}
                transition={T}
                strokeWidth={on ? 2.5 : 1.6}
                strokeLinecap="round"
                className={`transition-[stroke] duration-200 ${on ? viz(ca, "stroke") : "stroke-muted/60"}`}
              />
            );
          })}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {drawn.map((n) => {
            const id = String(n.id);
            const c = hl.get(id);
            const full = str(n.value);
            const label = truncate(full, MAX_LABEL);
            const w = Math.max(NODE_H, textWidth(label, VALUE_FONT) + 18);
            return (
              <motion.g
                key={id}
                initial={{ opacity: 0, scale: 0.6, x: cxOf(id), y: cyOf(id) }}
                animate={{ opacity: 1, scale: 1, x: cxOf(id), y: cyOf(id) }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={T}
              >
                <title>{full}</title>
                <rect
                  x={-w / 2}
                  y={-NODE_H / 2}
                  width={w}
                  height={NODE_H}
                  rx={NODE_H / 2}
                  strokeWidth={c ? 2.25 : 1.5}
                  className={`transition-[fill,stroke] duration-200 ${c ? viz(c, "stroke") : "stroke-border"}`}
                  style={{ fill: c ? vizTint(c, c === "warning" ? 28 : 22) : "var(--surface)" }}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={VALUE_FONT}
                  fontWeight={650}
                  className={`font-mono ${c === "muted" ? "fill-muted" : "fill-foreground"}`}
                >
                  {label}
                </text>
              </motion.g>
            );
          })}
        </AnimatePresence>

        {!thumb &&
          [...tags.entries()].map(([id, t]) => (
            <SvgPointerTag
              key={`tag-${t.names[0]}`}
              name={t.names.join(", ")}
              color={t.color}
              cx={cxOf(id)}
              y={cyOf(id) - NODE_H / 2 - TAG_H - 8}
              arrow
            />
          ))}
      </SvgFrame>
  );
  if (thumb) return svg;
  return (
    <div className="flex w-full flex-col items-center gap-2">
      {svg}
      {nullPtrs.length > 0 ? (
        <ul className="flex flex-wrap justify-center gap-1.5">
          {nullPtrs.map((p, i) => {
            const name = str(p.name);
            const color = (isColorKey(p.color) ? p.color : meta.pointerColors.get(name)) ?? "primary";
            return (
              <li
                key={`${name}-${i}`}
                className={`rounded-md border px-1.5 font-mono text-[11px] font-semibold leading-5 ${viz(color, "borderSoft")}`}
                style={{ color: vizInk(color), backgroundColor: vizTint(color, 12) }}
              >
                {name} = null
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
