"use client";

import { useId, type KeyboardEvent, type ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** accessible name of the radio group */
  label: string;
  size?: "sm" | "md";
  className?: string;
  /** stretch options to fill the width */
  fullWidth?: boolean;
}

/** Single-choice control (radiogroup semantics, arrow-key navigation, animated thumb). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
  className,
  fullWidth,
}: SegmentedControlProps<T>) {
  const id = useId();

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const enabled = options.filter((o) => !o.disabled);
    const index = enabled.findIndex((o) => o.value === value);
    let next = index;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % enabled.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (index - 1 + enabled.length) % enabled.length;
    else return;
    e.preventDefault();
    const option = enabled[next];
    if (!option) return;
    onChange(option.value);
    const el = e.currentTarget.querySelector<HTMLButtonElement>(`[data-value="${CSS.escape(option.value)}"]`);
    el?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        "inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-border bg-surface-2 p-0.5 [scrollbar-width:none]",
        fullWidth && "flex w-full",
        className,
      )}
    >
      {options.map((o) => {
        const checked = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={checked}
            data-value={o.value}
            tabIndex={checked ? 0 : -1}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors disabled:opacity-50 [&_svg]:size-4",
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-sm",
              fullWidth && "flex-1",
              checked ? "text-foreground" : "text-muted hover:text-foreground",
            )}
          >
            {checked && (
              <motion.span
                layoutId={`${id}-thumb`}
                aria-hidden
                transition={{ type: "spring", bounce: 0.15, duration: 0.3 }}
                className="absolute inset-0 rounded-md border border-border bg-surface shadow-xs"
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {o.icon}
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
