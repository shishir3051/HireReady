"use client";

import { useId, useMemo } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import type { ArrayRow, ArrayVisual, ColorKey } from "@/lib/types";
import { assignColors, isColorKey, viz, vizInk, vizTint } from "../lib/colors";
import { asArray, clamp, cn, isFiniteNumber, occurrenceKeys, safeId, str } from "../lib/utils";
import { T } from "../lib/motion";
import { EmptyCanvas, type CanvasProps } from "./common";

interface RowInfo {
  /** most pointers sharing one column in any step */
  pointerDepth: number;
  left: boolean;
  right: boolean;
  /** labelled ranges → bracket lanes */
  rangeLanes: number;
  maxLen: number;
}

/** -1 → left gutter, n → right gutter (anything beyond is clamped onto the gutters). */
function normIndex(index: unknown, n: number): number {
  const i = isFiniteNumber(index) ? Math.trunc(index) : 0;
  if (i < 0) return -1;
  if (i >= n) return n;
  return i;
}

function analyze(visual: ArrayVisual) {
  const rows: RowInfo[] = [];
  const pointerEntries: { name: string; color?: ColorKey }[] = [];
  for (const s of asArray(visual?.steps)) {
    asArray(s?.arrays).forEach((row, r) => {
      const info = (rows[r] ??= { pointerDepth: 0, left: false, right: false, rangeLanes: 0, maxLen: 1 });
      const values = asArray(row?.values);
      const n = values.length;
      const perCol = new Map<number, number>();
      for (const p of asArray(row?.pointers)) {
        if (!p) continue;
        pointerEntries.push({ name: str(p.name), color: p.color });
        const i = normIndex(p.index, n);
        if (i < 0) info.left = true;
        if (i >= n) info.right = true;
        perCol.set(i, (perCol.get(i) ?? 0) + 1);
      }
      info.pointerDepth = Math.max(info.pointerDepth, ...perCol.values(), 0);
      info.rangeLanes = Math.max(info.rangeLanes, asArray(row?.ranges).filter((g) => g && g.label).length);
      for (const v of values) info.maxLen = Math.max(info.maxLen, str(v).length);
    });
  }
  return { rows, pointerColors: assignColors(pointerEntries) };
}

export function ArrayCanvas({ visual, index }: CanvasProps<ArrayVisual>) {
  const uid = safeId(useId());
  const meta = useMemo(() => analyze(visual), [visual]);
  const steps = asArray(visual?.steps);
  const step = steps[clamp(index, 0, steps.length - 1)];
  const rows = asArray(step?.arrays);
  if (rows.length === 0) return <EmptyCanvas>no arrays in this step</EmptyCanvas>;
  return (
    <LayoutGroup id={uid}>
      <div className="flex w-full flex-col gap-6 @container">
        {rows.map((row, r) => (
          <ArrayRowView
            key={r}
            row={row}
            r={r}
            uid={uid}
            info={meta.rows[r] ?? { pointerDepth: 0, left: false, right: false, rangeLanes: 0, maxLen: 1 }}
            pointerColors={meta.pointerColors}
          />
        ))}
      </div>
    </LayoutGroup>
  );
}

const TAG_PX = 20;
const TAG_GAP_PX = 2;
const ARROW_PX = 9;

function ArrayRowView({
  row,
  r,
  uid,
  info,
  pointerColors,
}: {
  row: ArrayRow;
  r: number;
  uid: string;
  info: RowInfo;
  pointerColors: Map<string, ColorKey>;
}) {
  const values = asArray(row?.values);
  const n = values.length;
  const g = info.left ? 1 : 0;
  const cellCols = Math.max(n, 1);
  const totalCols = g + cellCols + (info.right ? 1 : 0);
  const colOf = (i: number) => (i < 0 ? 1 : i >= n ? g + cellCols + 1 : g + i + 1);
  const cellRem = info.maxLen <= 2 ? 2.75 : Math.min(7.5, 1.2 + info.maxLen * 0.6);
  const small = info.maxLen >= 4;

  // highlights: later entries win
  const hl = new Map<number, ColorKey>();
  for (const h of asArray(row?.highlights)) {
    if (!h) continue;
    for (const i of asArray(h.indices)) {
      if (Number.isInteger(i) && i >= 0 && i < n) hl.set(i, isColorKey(h.color) ? h.color : "primary");
    }
  }

  // pointers grouped per column (order preserved → stacked labels)
  const groups = new Map<number, { name: string; color: ColorKey }[]>();
  const seenNames = new Set<string>();
  for (const p of asArray(row?.pointers)) {
    if (!p) continue;
    const name = str(p.name);
    if (seenNames.has(name)) continue; // duplicate names would break layoutId
    seenNames.add(name);
    const col = colOf(normIndex(p.index, n));
    const list = groups.get(col) ?? [];
    list.push({ name, color: (isColorKey(p.color) ? p.color : pointerColors.get(name)) ?? "primary" });
    groups.set(col, list);
  }

  const ranges = asArray(row?.ranges)
    .filter(Boolean)
    .map((g0) => {
      if (n === 0) return null;
      const a = clamp(isFiniteNumber(g0.start) ? Math.trunc(g0.start) : 0, 0, n - 1);
      const b = clamp(isFiniteNumber(g0.end) ? Math.trunc(g0.end) : a, 0, n - 1);
      if (a > b) return null;
      return { start: a, end: b, color: (isColorKey(g0.color) ? g0.color : "info") as ColorKey, label: g0.label ? str(g0.label) : "" };
    })
    .filter((x): x is { start: number; end: number; color: ColorKey; label: string } => x !== null);
  const labelled = ranges.filter((x) => x.label);

  const keys = occurrenceKeys(values);
  const pointerLane = info.pointerDepth > 0 ? info.pointerDepth * (TAG_PX + TAG_GAP_PX) + ARROW_PX : 0;
  const gapRem = 0.375;
  const maxWidth = `${totalCols * cellRem + (totalCols - 1) * gapRem}rem`;
  const rowTemplate = [`${pointerLane}px`, "auto", "auto", ...Array.from({ length: info.rangeLanes }, () => "1.875rem")].join(" ");

  return (
    <div className="w-full overflow-x-auto overscroll-x-contain px-1 pb-1">
      <div className="mx-auto" style={{ maxWidth, minWidth: `${totalCols * 1.5 + (totalCols - 1) * gapRem}rem` }}>
        {row?.name ? (
          <div className="mb-1 font-mono text-xs font-semibold text-muted" style={{ paddingLeft: g ? `${cellRem + gapRem}rem` : 0 }}>
            {str(row.name)}
          </div>
        ) : null}
        <div
          className="grid gap-x-1.5"
          style={{ gridTemplateColumns: `repeat(${totalCols}, minmax(1.5rem, ${cellRem}rem))`, gridTemplateRows: rowTemplate }}
        >
          {/* pointer lane */}
          {[...groups.entries()].map(([col, list]) => (
            <div
              key={`pg-${col}`}
              className="flex flex-col items-center justify-end overflow-visible"
              style={{ gridColumn: col, gridRow: 1, gap: TAG_GAP_PX }}
            >
              {list.map((p, k) => (
                <motion.div
                  key={p.name}
                  layoutId={`${uid}-r${r}-p-${p.name}`}
                  layout="position"
                  transition={T}
                  className="relative z-20 flex flex-col items-center"
                >
                  <span
                    className={cn(
                      "whitespace-nowrap rounded-md border px-1.5 font-mono text-[11px] font-semibold leading-[18px] shadow-xs",
                      viz(p.color, "borderSoft"),
                    )}
                    style={{ color: vizInk(p.color), backgroundColor: vizTint(p.color, 14) }}
                  >
                    {p.name}
                  </span>
                  {k === list.length - 1 && (
                    <svg aria-hidden width="10" height={ARROW_PX} viewBox="0 0 10 9" className={viz(p.color, "fill")}>
                      <path d="M0 0h10L5 8z" />
                    </svg>
                  )}
                </motion.div>
              ))}
            </div>
          ))}

          {/* range bands behind the cells */}
          {ranges.map((rg, k) => (
            <motion.div
              key={`band-${k}`}
              layoutId={`${uid}-r${r}-band-${k}`}
              transition={T}
              aria-hidden
              className={cn("pointer-events-none z-0 -mx-1 -my-1.5 rounded-xl border-2", viz(rg.color, "borderSoft"), viz(rg.color, "bgFaint"))}
              style={{ gridColumn: `${colOf(rg.start)} / ${colOf(rg.end) + 1}`, gridRow: 2 }}
            />
          ))}

          {/* cells */}
          {n === 0 ? (
            <div
              className="z-10 flex h-10 items-center justify-center rounded-lg border-2 border-dashed border-border font-mono text-[11px] text-muted @md:h-11"
              style={{ gridColumn: g + 1, gridRow: 2 }}
            >
              [ ]
            </div>
          ) : null}
          <AnimatePresence initial={false}>
            {values.map((v, i) => {
              const c = hl.get(i);
              const s = str(v);
              return (
                <motion.div
                  key={keys[i]}
                  layout="position"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={T}
                  title={s}
                  className={cn(
                    "relative z-10 flex h-10 min-w-0 items-center justify-center rounded-lg border-2 px-0.5 font-mono font-semibold tabular-nums shadow-xs transition-colors duration-200 @md:h-11",
                    small ? "text-xs" : "text-sm @md:text-base",
                    c === undefined
                      ? "border-border text-foreground"
                      : c === "muted"
                        ? "border-dashed border-viz-muted text-muted opacity-60"
                        : cn(viz(c, "border"), "text-foreground"),
                  )}
                  style={{
                    gridColumn: colOf(i),
                    gridRow: 2,
                    backgroundColor: c === undefined || c === "muted" ? "var(--surface)" : vizTint(c, c === "warning" ? 24 : 18),
                  }}
                >
                  <span className="truncate">{s}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* indices */}
          {values.map((_, i) => (
            <span
              key={`ix-${i}`}
              aria-hidden
              className={cn("pt-1 text-center font-mono text-[10px] tabular-nums", hl.has(i) && hl.get(i) !== "muted" ? "font-semibold text-foreground" : "text-muted")}
              style={{ gridColumn: colOf(i), gridRow: 3 }}
            >
              {i}
            </span>
          ))}

          {/* labelled range brackets */}
          {labelled.map((rg, k) => (
            <motion.div
              key={`br-${k}`}
              layoutId={`${uid}-r${r}-br-${k}`}
              transition={T}
              className="flex min-w-0 flex-col items-center px-0.5 pt-1"
              style={{ gridColumn: `${colOf(rg.start)} / ${colOf(rg.end) + 1}`, gridRow: 4 + k }}
            >
              <span aria-hidden className={cn("h-1.5 w-full rounded-b-md border-x-2 border-b-2", viz(rg.color, "border"))} />
              <span className="mt-0.5 max-w-full truncate text-[10.5px] font-semibold" style={{ color: vizInk(rg.color) }} title={rg.label}>
                {rg.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
