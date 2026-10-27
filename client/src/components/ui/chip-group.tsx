"use client";

import type { CSSProperties, ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneStyle, type Tone } from "./badge";

export interface ChipOption<T extends string> {
  value: T;
  label: ReactNode;
  /** tone used when selected (defaults to brand) */
  tone?: Tone;
  icon?: ReactNode;
  count?: number;
}

export interface ChipGroupProps<T extends string> {
  options: ChipOption<T>[];
  value: T[];
  onChange: (value: T[]) => void;
  /** accessible group name */
  label: string;
  className?: string;
}

/** Multi-select toggle chips (each chip is a pressed/unpressed button). */
export function ChipGroup<T extends string>({ options, value, onChange, label, className }: ChipGroupProps<T>) {
  function toggle(v: T) {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  }
  return (
    <div role="group" aria-label={label} className={cn("flex flex-wrap gap-1.5", className)}>
      {options.map((o) => {
        const pressed = value.includes(o.value);
        const style: CSSProperties | undefined = pressed ? toneStyle(o.tone ?? "brand") : undefined;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={pressed}
            onClick={() => toggle(o.value)}
            style={style}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors [&_svg]:size-3.5",
              pressed ? "" : "border-border bg-surface text-muted hover:border-muted/50 hover:text-foreground",
            )}
          >
            {pressed ? <Check aria-hidden /> : o.icon}
            {o.label}
            {o.count !== undefined && <span className="tabular-nums opacity-70">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
