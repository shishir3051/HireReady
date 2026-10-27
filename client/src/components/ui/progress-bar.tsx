import type { Difficulty } from "@/lib/types";
import { DIFFICULTIES, DIFFICULTY_LABELS } from "@/lib/constants";
import { cn, clamp } from "@/lib/utils";
import type { Tone } from "./badge";

const FILL: Record<Exclude<Tone, "neutral">, string> = {
  brand: "var(--brand)",
  primary: "var(--viz-primary)",
  success: "var(--viz-success)",
  warning: "var(--viz-warning)",
  danger: "var(--viz-danger)",
  info: "var(--viz-info)",
  muted: "var(--viz-muted)",
  easy: "var(--easy)",
  medium: "var(--medium)",
  hard: "var(--hard)",
};

export interface ProgressBarProps {
  value: number;
  max?: number;
  /** accessible name, e.g. "Arrays & Hashing progress" */
  label: string;
  tone?: Exclude<Tone, "neutral">;
  size?: "xs" | "sm" | "md";
  /** render "x / max" or a custom value text to the right */
  showValue?: boolean | string;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  tone = "brand",
  size = "sm",
  showValue = false,
  className,
}: ProgressBarProps) {
  const pct = max > 0 ? clamp((value / max) * 100, 0, 100) : 0;
  const valueText = typeof showValue === "string" ? showValue : `${value} / ${max}`;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${Math.round(pct)}%`}
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-surface-2",
          size === "xs" ? "h-1" : size === "sm" ? "h-1.5" : "h-2.5",
        )}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: FILL[tone] }}
        />
      </div>
      {showValue !== false && (
        <span className="shrink-0 text-xs font-medium tabular-nums text-muted">{valueText}</span>
      )}
    </div>
  );
}

/** Stacked easy/medium/hard bar with a legend for screen readers. */
export function DifficultyMixBar({
  counts,
  className,
  showLegend = false,
}: {
  counts: Record<Difficulty, number>;
  className?: string;
  showLegend?: boolean;
}) {
  const total = DIFFICULTIES.reduce((s, d) => s + (counts[d] ?? 0), 0);
  const description = DIFFICULTIES.map((d) => `${counts[d] ?? 0} ${DIFFICULTY_LABELS[d].toLowerCase()}`).join(", ");
  return (
    <div className={className}>
      <div
        className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full bg-surface-2"
        role="img"
        aria-label={`Difficulty mix: ${description}`}
      >
        {total > 0 &&
          DIFFICULTIES.map((d) =>
            counts[d] ? (
              <div
                key={d}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{ width: `${(counts[d] / total) * 100}%`, backgroundColor: `var(--${d})` }}
              />
            ) : null,
          )}
      </div>
      {showLegend && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted" aria-hidden>
          {DIFFICULTIES.map((d) => (
            <span key={d} className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: `var(--${d})` }} />
              {counts[d] ?? 0} {DIFFICULTY_LABELS[d]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
