"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
  /** options with the same group are listed under a heading */
  group?: string;
  icon?: ReactNode;
}

export interface MultiSelectProps {
  /** trigger text, e.g. "Topics" */
  label: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
  /** panel alignment relative to the trigger on ≥sm screens */
  align?: "start" | "end";
}

/**
 * Dropdown with grouped checkboxes (used for the topic filter). On phones the panel is a bottom sheet.
 */
export function MultiSelect({
  label,
  options,
  value,
  onChange,
  searchable = true,
  searchPlaceholder = "Filter…",
  className,
  align = "start",
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
    const map = new Map<string, MultiSelectOption[]>();
    for (const o of filtered) {
      const g = o.group ?? "";
      map.set(g, [...(map.get(g) ?? []), o]);
    }
    return Array.from(map.entries());
  }, [options, query]);

  const selectedLabels = options.filter((o) => value.includes(o.value)).map((o) => o.label);

  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex h-9 w-full items-center gap-2 rounded-lg border bg-surface px-3 text-sm shadow-xs transition-colors hover:border-muted/50",
          value.length > 0 ? "border-brand/50" : "border-border",
        )}
      >
        <span className="min-w-0 flex-1 truncate text-left">
          {value.length === 0 ? (
            <span className="text-muted">{label}: All</span>
          ) : value.length === 1 ? (
            <>
              <span className="text-muted">{label}: </span>
              {selectedLabels[0]}
            </>
          ) : (
            <>
              <span className="text-muted">{label}: </span>
              {value.length} selected
            </>
          )}
        </span>
        {value.length > 0 && (
          <span className="grid min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-semibold leading-5 text-brand-foreground">
            {value.length}
          </span>
        )}
        <ChevronDown className={cn("size-4 shrink-0 text-muted transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            role="group"
            aria-label={label}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className={cn(
              "z-50 flex max-h-[70vh] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl",
              "max-sm:fixed max-sm:inset-x-3 max-sm:bottom-3",
              "sm:absolute sm:top-full sm:mt-2 sm:max-h-96 sm:w-80",
              align === "start" ? "sm:left-0" : "sm:right-0",
            )}
          >
            {searchable && (
              <div className="border-b border-border p-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    aria-label={`Filter ${label.toLowerCase()}`}
                    className="h-9 w-full rounded-md bg-surface-2 pl-8 pr-2 text-sm outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ring/40"
                  />
                </div>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
              {groups.length === 0 && <p className="px-3 py-4 text-center text-sm text-muted">No matches</p>}
              {groups.map(([group, items]) => (
                <div key={group || "_"} className="py-1">
                  {group && (
                    <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{group}</p>
                  )}
                  {items.map((o) => {
                    const checked = value.includes(o.value);
                    return (
                      <button
                        key={o.value}
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        onClick={() => toggle(o.value)}
                        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-surface-2"
                      >
                        <span
                          className={cn(
                            "grid size-4 shrink-0 place-items-center rounded border transition-colors",
                            checked ? "border-brand bg-brand text-brand-foreground" : "border-border bg-surface",
                          )}
                          aria-hidden
                        >
                          {checked && <Check className="size-3" strokeWidth={3} />}
                        </span>
                        {o.icon && <span className="text-muted [&_svg]:size-4">{o.icon}</span>}
                        <span className="min-w-0 flex-1 truncate">{o.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border p-2">
              <button
                type="button"
                onClick={() => onChange([])}
                disabled={value.length === 0}
                className="inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-medium text-muted hover:bg-surface-2 hover:text-foreground disabled:opacity-50"
              >
                <X className="size-3.5" aria-hidden /> Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                className="inline-flex h-8 items-center rounded-md bg-brand px-3 text-xs font-semibold text-brand-foreground hover:bg-brand/90"
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
