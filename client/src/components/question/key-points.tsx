"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/markdown";

/** Interviewer checklist — tick each point you would mention (local, for self-review). */
export function KeyPoints({ points }: { points: string[] }) {
  const [checked, setChecked] = useState<boolean[]>(() => points.map(() => false));
  const count = checked.filter(Boolean).length;
  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 sm:px-5">
        <p className="text-sm text-muted">Would you mention all of these?</p>
        <span className="text-xs font-medium tabular-nums text-muted" aria-live="polite">
          {count}/{points.length}
        </span>
      </div>
      <ul className="divide-y divide-border">
        {points.map((point, i) => {
          const on = checked[i] ?? false;
          return (
            <li key={i}>
              <label className="flex cursor-pointer items-start gap-3 px-4 py-2.5 transition-colors hover:bg-surface-2/50 sm:px-5">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={on}
                  onChange={() => setChecked((prev) => prev.map((v, j) => (j === i ? !v : v)))}
                />
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                    on ? "border-transparent bg-viz-success text-brand-foreground" : "border-border bg-surface",
                  )}
                >
                  {on && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                <Markdown size="sm" className={cn("flex-1 transition-colors", on && "text-muted")}>
                  {point}
                </Markdown>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
