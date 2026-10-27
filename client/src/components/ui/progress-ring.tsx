import type { ReactNode } from "react";
import { cn, clamp } from "@/lib/utils";
import type { Tone } from "./badge";

const STROKE: Record<Exclude<Tone, "neutral">, string> = {
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

export interface ProgressRingProps {
  value: number;
  max?: number;
  /** accessible name, e.g. "Quiz score". Omit together with `decorative` when the value is printed next to it. */
  label?: string;
  /** hide from assistive tech (the value is already readable as text nearby) */
  decorative?: boolean;
  /** custom aria-valuetext (defaults to the percentage) */
  valueText?: string;
  tone?: Exclude<Tone, "neutral">;
  /** outer size in px */
  size?: number;
  /** stroke width in px */
  thickness?: number;
  /** centre content (score, icon…) */
  children?: ReactNode;
  className?: string;
}

/** Circular progress meter (SVG). Server-safe; animates value changes with a CSS transition. */
export function ProgressRing({
  value,
  max = 100,
  label,
  decorative = false,
  valueText,
  tone = "brand",
  size = 64,
  thickness = 6,
  children,
  className,
}: ProgressRingProps) {
  const pct = max > 0 ? clamp(value / max, 0, 1) : 0;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const a11y = decorative
    ? { "aria-hidden": true as const }
    : {
        role: "progressbar" as const,
        "aria-label": label,
        "aria-valuemin": 0,
        "aria-valuemax": max,
        "aria-valuenow": value,
        "aria-valuetext": valueText ?? `${Math.round(pct * 100)}%`,
      };
  return (
    <div className={cn("relative inline-grid shrink-0 place-items-center", className)} style={{ width: size, height: size }} {...a11y}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={STROKE[tone]}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.22, 1, 0.36, 1), stroke 300ms" }}
          opacity={pct === 0 ? 0 : 1}
        />
      </svg>
      {children !== undefined && <div className="relative grid place-items-center text-center">{children}</div>}
    </div>
  );
}
