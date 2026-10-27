"use client";

import { motion } from "motion/react";
import type { Scalar } from "@/lib/types";
import { cn, str } from "../lib/utils";
import { T_FAST } from "../lib/motion";

function valueClass(v: Scalar): string {
  if (v === null) return "italic text-muted";
  if (typeof v === "boolean") return v ? "text-viz-success" : "text-viz-danger";
  if (typeof v === "number") return "tabular-nums";
  return "";
}

/** Watch box: the step's variables; values that changed since the previous step are tinted. */
export function VarsBox({
  vars,
  prevVars,
  className,
}: {
  vars: Record<string, Scalar> | undefined;
  prevVars?: Record<string, Scalar>;
  className?: string;
}) {
  const entries = vars ? Object.entries(vars) : [];
  return (
    <section aria-label="Variables" className={cn("min-w-0 rounded-xl border border-border bg-surface px-2.5 py-2 shadow-xs", className)}>
      <header className="mb-1.5 flex items-baseline justify-between gap-2">
        <h4 className="text-[10px] font-medium uppercase tracking-wider text-muted">Watch</h4>
      </header>
      {entries.length === 0 ? (
        <span className="text-xs italic text-muted">no variables</span>
      ) : (
        <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-2 gap-y-1 font-mono text-xs">
          {entries.map(([k, v]) => {
            const changed = prevVars !== undefined && (!(k in prevVars) || !Object.is(prevVars[k], v));
            return (
              <div key={k} className="contents">
                <dt className="truncate py-0.5 text-muted" title={k}>
                  {k}
                </dt>
                <dd
                  className={cn(
                    "min-w-0 rounded px-1 py-0.5 transition-colors duration-200",
                    changed ? "bg-brand-soft" : "bg-transparent",
                  )}
                >
                  <motion.span
                    key={str(v)}
                    initial={{ opacity: 0.2, y: -3 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={T_FAST}
                    className={cn("block break-all font-semibold text-foreground", valueClass(v))}
                  >
                    {typeof v === "string" ? v : str(v)}
                  </motion.span>
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </section>
  );
}
