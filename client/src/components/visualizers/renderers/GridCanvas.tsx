"use client";

import { motion } from "motion/react";
import type { ColorKey, GridVisual } from "@/lib/types";
import { isColorKey, viz, vizTint } from "../lib/colors";
import { asArray, clamp, cn, str } from "../lib/utils";
import { T_FAST } from "../lib/motion";
import { EmptyCanvas, type CanvasProps } from "./common";

/** Matrix / DP table with sticky row & column labels and highlighted cells. */
export function GridCanvas({ visual, index }: CanvasProps<GridVisual>) {
  const steps = asArray(visual?.steps);
  const step = steps[clamp(index, 0, steps.length - 1)];
  const grid = asArray(step?.grid).map((row) => asArray(row));
  const rows = grid.length;
  const cols = grid.reduce((m, r) => Math.max(m, r.length), 0);
  if (rows === 0 || cols === 0) return <EmptyCanvas>empty grid</EmptyCanvas>;

  const rowLabels = asArray(visual?.rowLabels);
  const colLabels = asArray(visual?.colLabels);
  const hl = new Map<string, ColorKey>();
  for (const h of asArray(step?.highlights)) {
    if (!h) continue;
    for (const cell of asArray(h.cells)) {
      if (!Array.isArray(cell)) continue;
      const [r, c] = cell;
      if (Number.isInteger(r) && Number.isInteger(c)) hl.set(`${r},${c}`, isColorKey(h.color) ? h.color : "primary");
    }
  }

  // scale: big cells for small boards, compact cells for DP tables
  const dense = cols > 9 || rows > 9;
  const medium = !dense && (cols > 6 || rows > 6);
  const cellSize = dense ? "h-8 min-w-8 text-[11px]" : medium ? "h-9 min-w-9 text-xs" : "h-11 min-w-11 text-sm";
  const labelCls = "font-mono text-[10.5px] font-medium text-muted";

  return (
    <div className="w-full">
      <div className="mx-auto max-h-[30rem] w-fit max-w-full overflow-auto overscroll-contain rounded-lg">
        <table className="border-separate border-spacing-1 font-mono">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 bg-surface" aria-hidden />
              {Array.from({ length: cols }, (_, c) => (
                <th key={c} scope="col" className={cn("sticky top-0 z-20 bg-surface px-1 pb-0.5 text-center", labelCls)}>
                  <span className="block max-w-[7rem] truncate" title={colLabels[c] ?? String(c)}>
                    {colLabels[c] ?? c}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, r) => (
              <tr key={r}>
                <th scope="row" className={cn("sticky left-0 z-10 bg-surface pr-1.5 text-right", labelCls)}>
                  <span className="block max-w-[7rem] truncate" title={rowLabels[r] ?? String(r)}>
                    {rowLabels[r] ?? r}
                  </span>
                </th>
                {Array.from({ length: cols }, (_, c) => {
                  const v = c < row.length ? row[c] : null;
                  const color = hl.get(`${r},${c}`);
                  const s = v === null || v === undefined ? "" : str(v);
                  return (
                    <td
                      key={c}
                      title={s || undefined}
                      className={cn(
                        "rounded-md border-2 px-1 text-center font-semibold tabular-nums shadow-xs transition-colors duration-200",
                        cellSize,
                        color === undefined
                          ? "border-border text-foreground"
                          : color === "muted"
                            ? "border-viz-muted/50 text-muted"
                            : cn(viz(color, "border"), "text-foreground"),
                      )}
                      style={{
                        backgroundColor:
                          color === undefined
                            ? "var(--surface)"
                            : color === "muted"
                              ? vizTint("muted", 14)
                              : vizTint(color, color === "warning" ? 24 : 18),
                      }}
                    >
                      <motion.span
                        key={s}
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={T_FAST}
                        className="mx-auto block max-w-[6rem] truncate"
                      >
                        {s}
                      </motion.span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
