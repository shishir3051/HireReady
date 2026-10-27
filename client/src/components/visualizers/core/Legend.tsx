"use client";

import type { ColorKey } from "@/lib/types";
import { COLOR_LABELS, viz } from "../lib/colors";
import { cn } from "../lib/utils";

/** Compact legend for the semantic colors a visual actually uses. */
export function Legend({ colors, className }: { colors: ColorKey[]; className?: string }) {
  if (colors.length === 0) return null;
  return (
    <ul aria-label="Color legend" className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      {colors.map((c) => (
        <li key={c} className="flex items-center gap-1.5 text-[11px] text-muted">
          <span aria-hidden className={cn("size-2.5 rounded-[3px] border", viz(c, "bgSoft"), viz(c, "border"))} />
          {COLOR_LABELS[c]}
        </li>
      ))}
    </ul>
  );
}
