"use client";

import { AnimatePresence, motion } from "motion/react";
import { Highlight, themes } from "prism-react-renderer";
import type { ColorKey, TableData, TableVisual } from "@/lib/types";
import { isColorKey, viz, vizTint } from "../lib/colors";
import { useIsDark } from "../lib/hooks";
import { asArray, clamp, cn, str } from "../lib/utils";
import { T } from "../lib/motion";
import { EmptyCanvas, type CanvasProps } from "./common";

function SqlBlock({ query }: { query: string }) {
  const dark = useIsDark();
  return (
    <Highlight code={query.trim()} language="sql" theme={dark ? themes.oneDark : themes.oneLight}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <pre className="max-h-48 overflow-auto rounded-lg border border-border bg-surface-2/70 px-3 py-2 font-mono text-[12.5px] leading-relaxed">
          {tokens.map((line, i) => {
            const lp = getLineProps({ line });
            return (
              <div key={i} className={lp.className}>
                {line.map((token, k) => {
                  const tp = getTokenProps({ token });
                  return (
                    <span key={k} className={tp.className} style={tp.style}>
                      {tp.children}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </pre>
      )}
    </Highlight>
  );
}

function SqlTable({ table }: { table: TableData }) {
  const columns = asArray(table?.columns).map((c) => str(c));
  const rows = asArray(table?.rows).map((r) => asArray(r));
  const hl = new Map<number, ColorKey>();
  for (const h of asArray(table?.highlightRows)) {
    if (!h) continue;
    for (const r of asArray(h.rows)) if (Number.isInteger(r)) hl.set(r, isColorKey(h.color) ? h.color : "primary");
  }
  const width = Math.max(columns.length, ...rows.map((r) => r.length), 1);
  return (
    <figure className="min-w-0 max-w-full overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
      <figcaption className="flex items-center justify-between gap-2 border-b border-border bg-surface-2/60 px-3 py-1.5">
        <span className="truncate font-mono text-xs font-semibold">{table?.name ? str(table.name) : "result"}</span>
        <span className="shrink-0 text-[10.5px] text-muted">
          {rows.length} {rows.length === 1 ? "row" : "rows"}
        </span>
      </figcaption>
      <div className="max-w-full overflow-x-auto">
        <table className="w-full border-collapse font-mono text-xs">
          <thead>
            <tr>
              {Array.from({ length: width }, (_, c) => (
                <th
                  key={c}
                  scope="col"
                  className="whitespace-nowrap border-b border-border px-3 py-1.5 text-left text-[11px] font-semibold text-muted"
                >
                  {columns[c] ?? ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {rows.length === 0 ? (
                <tr key="empty">
                  <td colSpan={width} className="px-3 py-3 text-center italic text-muted">
                    (no rows)
                  </td>
                </tr>
              ) : (
                rows.map((row, r) => {
                  const c = hl.get(r);
                  return (
                    <motion.tr
                      key={r}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={T}
                      className={cn("transition-colors duration-200", r > 0 && "border-t border-border/70")}
                      style={{ backgroundColor: c && c !== "muted" ? vizTint(c, c === "warning" ? 28 : 22) : undefined }}
                    >
                      {Array.from({ length: width }, (_, k) => {
                        const v = row[k];
                        const isNull = v === null;
                        return (
                          <td
                            key={k}
                            className={cn(
                              "relative max-w-[14rem] truncate whitespace-nowrap px-3 py-1.5 tabular-nums",
                              isNull ? "italic text-muted" : c === "muted" ? "text-muted line-through decoration-viz-muted/60" : "text-foreground",
                            )}
                            title={v === undefined ? undefined : str(v)}
                          >
                            {k === 0 && c ? (
                              <span aria-hidden className={cn("absolute inset-y-0 left-0 w-[3px]", viz(c, "bg"))} />
                            ) : null}
                            {v === undefined ? "" : isNull ? "NULL" : str(v)}
                          </td>
                        );
                      })}
                    </motion.tr>
                  );
                })
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </figure>
  );
}

/** SQL tables (inputs → result) with highlighted rows and an optional query above. */
export function TableCanvas({ visual, index }: CanvasProps<TableVisual>) {
  const steps = asArray(visual?.steps);
  const step = steps[clamp(index, 0, steps.length - 1)];
  const tables = asArray(step?.tables).filter(Boolean);
  const query = typeof step?.query === "string" ? step.query : "";
  return (
    <div className="flex w-full flex-col gap-3">
      {query.trim() ? <SqlBlock query={query} /> : null}
      {tables.length === 0 ? (
        <EmptyCanvas>no tables in this step</EmptyCanvas>
      ) : (
        <div className="flex flex-wrap items-start justify-center gap-3">
          {tables.map((t, i) => (
            <SqlTable key={`${i}-${str(t.name)}`} table={t} />
          ))}
        </div>
      )}
    </div>
  );
}
