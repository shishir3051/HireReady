"use client";

import type { ComparisonVisual } from "@/lib/types";
import { InlineMarkdown } from "../core/Markdown";
import { asArray, cn, str } from "../lib/utils";
import { EmptyCanvas } from "./common";

/** Side-by-side "X vs Y" table: bold aspect column, zebra rows, scrolls inside itself on mobile. */
export function ComparisonTable({ visual, className }: { visual: ComparisonVisual; className?: string }) {
  const columns = asArray(visual?.columns).map((c) => str(c));
  const rows = asArray(visual?.rows).map((r) => asArray(r).map((c) => str(c)));
  const width = Math.max(columns.length, ...rows.map((r) => r.length), 1);
  if (rows.length === 0) return <EmptyCanvas>no rows</EmptyCanvas>;
  return (
    <div className={cn("w-full overflow-x-auto overscroll-x-contain rounded-xl border border-border", className)}>
      <table className={cn("w-full border-collapse text-sm", width >= 3 ? "min-w-[36rem]" : "min-w-[22rem]")}>
        <thead>
          <tr className="bg-surface-2">
            {Array.from({ length: width }, (_, c) => (
              <th
                key={c}
                scope="col"
                className={cn(
                  "border-b border-border px-3 py-2.5 text-left align-bottom text-xs font-semibold uppercase tracking-wide",
                  c === 0 ? "w-[22%] text-muted" : "text-foreground",
                )}
              >
                {columns[c] ?? ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className={cn("align-top", r % 2 === 1 ? "bg-surface-2/50" : "bg-surface")}>
              {Array.from({ length: width }, (_, c) => {
                const text = row[c] ?? "";
                return c === 0 ? (
                  <th key={c} scope="row" className="border-t border-border/70 px-3 py-2.5 text-left font-semibold text-foreground">
                    <InlineMarkdown text={text} />
                  </th>
                ) : (
                  <td key={c} className="border-t border-border/70 px-3 py-2.5 leading-relaxed text-foreground/90">
                    <InlineMarkdown text={text} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
