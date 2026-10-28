"use client";

import { useId, useRef, type KeyboardEvent } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneStyle } from "@/components/ui/badge";
import { useLanguage } from "@/components/providers";
import {
  RATING_DESCRIPTIONS,
  RATING_DESCRIPTIONS_BN,
  RATING_LABELS,
  RATING_LABELS_BN,
  ratingTone,
} from "./constants";

export interface RatingInputProps {
  value: number | null;
  onChange: (value: number) => void;
  /** accessible group name */
  label: string;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
}

/**
 * 1–5 self-rating as a radiogroup with roving focus. Unlike SegmentedControl it supports "nothing selected yet"
 * (the first option is tabbable until a value is picked). Arrow keys move and select.
 */
export function RatingInput({ value, onChange, label, invalid, describedBy, className }: RatingInputProps) {
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const { lang } = useLanguage();
  const labels = lang === "bn" ? RATING_LABELS_BN : RATING_LABELS;
  const descriptions = lang === "bn" ? RATING_DESCRIPTIONS_BN : RATING_DESCRIPTIONS;

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const current = value ?? 0;
    let next = current;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = Math.min(5, current + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = Math.max(1, current === 0 ? 1 : current - 1);
    else if (e.key === "Home") next = 1;
    else if (e.key === "End") next = 5;
    else if (/^[1-5]$/.test(e.key)) next = Number(e.key);
    else return;
    e.preventDefault();
    onChange(next);
    refs.current[next - 1]?.focus();
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div
        role="radiogroup"
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={[describedBy, `${id}-desc`].filter(Boolean).join(" ")}
        onKeyDown={onKeyDown}
        className="grid grid-cols-5 gap-1.5 sm:gap-2"
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const checked = value === n;
          const filled = value !== null && n <= value;
          const tabbable = value === null ? n === 1 : checked;
          return (
            <button
              key={n}
              ref={(el) => {
                refs.current[n - 1] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={`${n} – ${labels[n]}: ${descriptions[n]}`}
              tabIndex={tabbable ? 0 : -1}
              onClick={() => onChange(n)}
              style={checked ? toneStyle(ratingTone(n)) : undefined}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border-2 px-1 py-2 text-center transition-[background-color,border-color,transform] duration-150 active:scale-[0.97]",
                checked ? "" : "border-border bg-surface hover:border-brand/40 hover:bg-surface-2/60",
                invalid && !checked && "border-viz-danger/50",
              )}
            >
              <span className="flex items-center gap-0.5" aria-hidden>
                <span className="text-lg font-semibold tabular-nums leading-none">{n}</span>
                <Star
                  className={cn("size-3.5", filled ? "fill-current" : "text-muted")}
                  style={!checked && filled && value !== null ? { color: `var(--viz-${ratingTone(value)})` } : undefined}
                />
              </span>
              <span className={cn("text-[11px] font-medium leading-tight sm:text-xs", !checked && "text-muted")} aria-hidden>
                {labels[n]}
              </span>
            </button>
          );
        })}
      </div>
      <p id={`${id}-desc`} className="min-h-4 text-xs text-muted" aria-live="polite">
        {value !== null ? descriptions[value] : ""}
      </p>
    </div>
  );
}
