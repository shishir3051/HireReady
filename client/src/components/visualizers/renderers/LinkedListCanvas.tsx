"use client";

import { useId, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { ColorKey, LinkedListStep, LinkedListVisual } from "@/lib/types";
import { assignColors, isColorKey, viz, vizTint } from "../lib/colors";
import { asArray, clamp, safeId, str, textWidth, truncate } from "../lib/utils";
import { T } from "../lib/motion";
import { EmptyCanvas, SvgFrame, TAG_GAP, TAG_H, type CanvasProps } from "./common";
import { ArrowMarker, SvgPointerTag } from "./svgParts";

const PAD = 14;
const NEXT_W = 18;
const NODE_H = 38;
const GAP = 52;
const NULL_W = 44;
const NULL_GAP = 30;
const VALUE_FONT = 13;

function arcDepth(i: number, j: number): number {
  return i === j ? 30 : 24 + 13 * Math.min(Math.abs(i - j), 7);
}

function nodeIds(step: LinkedListStep | undefined): Set<string> {
  return new Set(asArray(step?.nodes).map((n) => String(n?.id)));
}

function analyze(visual: LinkedListVisual) {
  let maxN = 0;
  let maxLen = 1;
  let maxTags = 0;
  let maxDepth = 0;
  let nullSlot = false;
  const ptrEntries: { name: string; color?: ColorKey }[] = [];
  for (const s of asArray(visual?.steps)) {
    const nodes = asArray(s?.nodes).filter(Boolean);
    maxN = Math.max(maxN, nodes.length);
    const ids = nodeIds(s);
    const order = new Map<string, number>();
    nodes.forEach((n, i) => {
      if (!order.has(String(n.id))) order.set(String(n.id), i);
      maxLen = Math.max(maxLen, str(n.value).length);
    });
    nodes.forEach((n, i) => {
      if (n.next === null || n.next === undefined) return;
      const j = order.get(String(n.next));
      if (j === undefined || j === i + 1) return;
      maxDepth = Math.max(maxDepth, arcDepth(i, j));
    });
    const perNode = new Map<string, number>();
    if (s?.head && ids.has(String(s.head))) perNode.set(String(s.head), 1);
    for (const p of asArray(s?.pointers)) {
      if (!p) continue;
      ptrEntries.push({ name: str(p.name), color: p.color });
      const target = p.nodeId === null || p.nodeId === undefined || !ids.has(String(p.nodeId)) ? "\u0000null" : String(p.nodeId);
      if (target === "\u0000null") nullSlot = true;
      perNode.set(target, (perNode.get(target) ?? 0) + 1);
    }
    maxTags = Math.max(maxTags, ...perNode.values(), 0);
  }
  const valueW = Math.round(Math.min(120, Math.max(38, 14 + textWidth("x".repeat(maxLen), VALUE_FONT))));
  return { maxN, valueW, maxTags, maxDepth, nullSlot, pointerColors: assignColors(ptrEntries) };
}

/** Singly linked list: nodes left→right in the given order, `next` arrows (straight / curved), null, pointer tags. */
export function LinkedListCanvas({ visual, index, variant = "full" }: CanvasProps<LinkedListVisual>) {
  const uid = safeId(useId());
  const meta = useMemo(() => analyze(visual), [visual]);
  const steps = asArray(visual?.steps);
  const step = steps[clamp(index, 0, steps.length - 1)];
  const nodes = asArray(step?.nodes).filter(Boolean);
  const thumb = variant === "thumb";

  if (nodes.length === 0) {
    const ptrs = asArray(step?.pointers).filter(Boolean);
    return (
      <EmptyCanvas>
        empty list (head = null)
        {ptrs.length ? ` · ${ptrs.map((p) => `${str(p.name)} = null`).join(" · ")}` : ""}
      </EmptyCanvas>
    );
  }

  const { valueW, nullSlot } = meta;
  const nodeW = valueW + NEXT_W;
  const nullSlotW = nullSlot && !thumb ? NULL_W + NULL_GAP : 0;
  const topLane = thumb ? 6 : meta.maxTags > 0 ? meta.maxTags * (TAG_H + TAG_GAP) + 12 : 8;
  const bottomLane = meta.maxDepth > 0 ? meta.maxDepth + 10 : 8;
  const maxN = Math.max(meta.maxN, nodes.length);
  const width = PAD * 2 + nullSlotW + maxN * nodeW + (maxN - 1) * GAP + GAP;
  const height = PAD + topLane + NODE_H + bottomLane + PAD / 2;
  const y0 = PAD + topLane;
  const yMid = y0 + NODE_H / 2;
  const yBot = y0 + NODE_H;

  const order = new Map<string, number>();
  nodes.forEach((n, i) => {
    if (!order.has(String(n.id))) order.set(String(n.id), i);
  });
  const xOf = (i: number) => PAD + nullSlotW + i * (nodeW + GAP);

  const hl = new Map<string, ColorKey>();
  for (const h of asArray(step?.highlights)) {
    if (!h) continue;
    for (const id of asArray(h.ids)) hl.set(String(id), isColorKey(h.color) ? h.color : "primary");
  }

  // links
  type Link = { key: string; d: string; nullAt?: number };
  const links: Link[] = [];
  const seenKeys = new Set<string>();
  nodes.forEach((n, i) => {
    if (order.get(String(n.id)) !== i) return; // duplicate id: draw first only
    const sx = xOf(i) + valueW + NEXT_W / 2;
    if (n.next === null || n.next === undefined) {
      links.push({ key: `${n.id}->null`, d: `M ${sx} ${yMid} L ${sx + NEXT_W / 2 + 16} ${yMid}`, nullAt: i });
      return;
    }
    const j = order.get(String(n.next));
    if (j === undefined) return;
    const key = `${n.id}->${n.next}`;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    if (j === i + 1) {
      const x2 = xOf(j) - 2;
      const dx = x2 - sx;
      links.push({ key, d: `M ${sx} ${yMid} C ${sx + dx * 0.4} ${yMid}, ${x2 - dx * 0.4} ${yMid}, ${x2} ${yMid}` });
    } else {
      const tx = xOf(j) + valueW / 2;
      const depth = arcDepth(i, j);
      const bend = i === j ? 22 : 0;
      links.push({
        key,
        d: `M ${sx} ${yBot} C ${sx + bend} ${yBot + depth}, ${tx - bend} ${yBot + depth}, ${tx} ${yBot + 3}`,
      });
    }
  });

  // pointer tags per target (head first)
  const tagsByTarget = new Map<string, { name: string; color: ColorKey; brand?: boolean }[]>();
  const pushTag = (target: string, t: { name: string; color: ColorKey; brand?: boolean }) => {
    const list = tagsByTarget.get(target) ?? [];
    if (list.some((x) => x.name === t.name)) return;
    list.push(t);
    tagsByTarget.set(target, list);
  };
  if (step?.head && order.has(String(step.head))) pushTag(String(step.head), { name: "head", color: "primary", brand: true });
  for (const p of asArray(step?.pointers)) {
    if (!p) continue;
    const name = str(p.name);
    const target = p.nodeId !== null && p.nodeId !== undefined && order.has(String(p.nodeId)) ? String(p.nodeId) : "\u0000null";
    pushTag(target, { name, color: (isColorKey(p.color) ? p.color : meta.pointerColors.get(name)) ?? "primary" });
  }
  const markerId = `${uid}-ll-arrow`;
  const maxChars = Math.max(2, Math.floor((valueW - 8) / (VALUE_FONT * 0.61)));

  return (
    <SvgFrame width={width} height={height} variant={variant} label={`Linked list with ${nodes.length} nodes`}>
      <defs>
        <ArrowMarker id={markerId} className="fill-muted" />
      </defs>

      {nullSlot && !thumb ? (
        <g>
          <rect
            x={PAD}
            y={y0 + 6}
            width={NULL_W}
            height={NODE_H - 12}
            rx={6}
            className="fill-surface-2 stroke-border"
            strokeDasharray="4 3"
          />
          <text x={PAD + NULL_W / 2} y={yMid} textAnchor="middle" dominantBaseline="central" fontSize={11} className="fill-muted font-mono">
            null
          </text>
        </g>
      ) : null}

      {/* links under nodes */}
      <AnimatePresence initial={false}>
        {links.map((l) => (
          <motion.g key={l.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={T}>
            <motion.path
              initial={false}
              animate={{ d: l.d }}
              transition={T}
              fill="none"
              strokeWidth={1.75}
              strokeLinecap="round"
              className="stroke-muted"
              markerEnd={`url(#${markerId})`}
            />
            {l.nullAt !== undefined && !thumb ? (
              <motion.text
                initial={false}
                animate={{ x: xOf(l.nullAt) + nodeW + 21 }}
                transition={T}
                y={yMid}
                dominantBaseline="central"
                fontSize={10.5}
                className="fill-muted font-mono"
              >
                null
              </motion.text>
            ) : null}
          </motion.g>
        ))}
      </AnimatePresence>

      {/* nodes */}
      <AnimatePresence initial={false}>
        {nodes.map((n, i) => {
          if (order.get(String(n.id)) !== i) return null;
          const c = hl.get(String(n.id));
          const label = str(n.value);
          return (
            <motion.g
              key={String(n.id)}
              initial={{ opacity: 0, x: xOf(i), y: y0 + 10 }}
              animate={{ opacity: 1, x: xOf(i), y: y0 }}
              exit={{ opacity: 0, y: y0 + 10 }}
              transition={T}
            >
              <title>{`${label} (id ${n.id})`}</title>
              <rect
                x={0}
                y={0}
                width={nodeW}
                height={NODE_H}
                rx={8}
                strokeWidth={c ? 2 : 1.5}
                className={`transition-[fill,stroke] duration-200 ${c ? viz(c, "stroke") : "stroke-border"}`}
                style={{ fill: c ? vizTint(c, c === "warning" ? 26 : 20) : "var(--surface)" }}
              />
              <line x1={valueW} x2={valueW} y1={5} y2={NODE_H - 5} className="stroke-border" strokeWidth={1.25} />
              <circle cx={valueW + NEXT_W / 2} cy={NODE_H / 2} r={2.6} className="fill-muted" />
              <text
                x={valueW / 2}
                y={NODE_H / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={VALUE_FONT}
                fontWeight={650}
                className={`font-mono ${c === "muted" ? "fill-muted" : "fill-foreground"}`}
              >
                {truncate(label, maxChars)}
              </text>
            </motion.g>
          );
        })}
      </AnimatePresence>

      {/* pointer tags */}
      {!thumb &&
        [...tagsByTarget.entries()].flatMap(([target, list]) => {
          const isNull = target === "\u0000null";
          const i = isNull ? -1 : (order.get(target) ?? -1);
          const cx = isNull ? PAD + NULL_W / 2 : xOf(i) + valueW / 2;
          return list.map((t, k) => {
            const level = list.length - 1 - k; // first tag on top
            const y = y0 - 9 - TAG_H - level * (TAG_H + TAG_GAP) + (isNull ? 6 : 0);
            return <SvgPointerTag key={`${t.brand ? "brand" : "tag"}-${t.name}`} name={t.name} color={t.color} brand={t.brand} cx={cx} y={y} arrow={level === 0} />;
          });
        })}
    </SvgFrame>
  );
}
