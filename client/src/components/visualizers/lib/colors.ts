import type { ColorKey } from "@/lib/types";

/**
 * Single source of truth for ColorKey → Tailwind classes.
 * Only the semantic viz tokens from globals.css are used, so light/dark both work.
 * All class strings are literal so Tailwind can see them.
 */
export interface VizClasses {
  /** solid fill (svg) */
  fill: string;
  /** translucent fill (svg) for node bodies */
  fillSoft: string;
  /** solid stroke (svg) */
  stroke: string;
  /** translucent stroke (svg) */
  strokeSoft: string;
  /** solid background */
  bg: string;
  /** translucent background for cells / chips */
  bgSoft: string;
  /** very light background for bands / rows */
  bgFaint: string;
  /** colored text (icons, arrows; use `ink` for readable text) */
  text: string;
  /** solid border */
  border: string;
  /** translucent border */
  borderSoft: string;
  /** focus/emphasis ring */
  ring: string;
}

const CLASSES: Record<ColorKey, VizClasses> = {
  primary: {
    fill: "fill-viz-primary",
    fillSoft: "fill-viz-primary/20",
    stroke: "stroke-viz-primary",
    strokeSoft: "stroke-viz-primary/50",
    bg: "bg-viz-primary",
    bgSoft: "bg-viz-primary/15",
    bgFaint: "bg-viz-primary/10",
    text: "text-viz-primary",
    border: "border-viz-primary",
    borderSoft: "border-viz-primary/40",
    ring: "ring-viz-primary/35",
  },
  success: {
    fill: "fill-viz-success",
    fillSoft: "fill-viz-success/20",
    stroke: "stroke-viz-success",
    strokeSoft: "stroke-viz-success/50",
    bg: "bg-viz-success",
    bgSoft: "bg-viz-success/15",
    bgFaint: "bg-viz-success/10",
    text: "text-viz-success",
    border: "border-viz-success",
    borderSoft: "border-viz-success/40",
    ring: "ring-viz-success/35",
  },
  warning: {
    fill: "fill-viz-warning",
    fillSoft: "fill-viz-warning/25",
    stroke: "stroke-viz-warning",
    strokeSoft: "stroke-viz-warning/50",
    bg: "bg-viz-warning",
    bgSoft: "bg-viz-warning/20",
    bgFaint: "bg-viz-warning/10",
    text: "text-viz-warning",
    border: "border-viz-warning",
    borderSoft: "border-viz-warning/45",
    ring: "ring-viz-warning/40",
  },
  danger: {
    fill: "fill-viz-danger",
    fillSoft: "fill-viz-danger/20",
    stroke: "stroke-viz-danger",
    strokeSoft: "stroke-viz-danger/50",
    bg: "bg-viz-danger",
    bgSoft: "bg-viz-danger/15",
    bgFaint: "bg-viz-danger/10",
    text: "text-viz-danger",
    border: "border-viz-danger",
    borderSoft: "border-viz-danger/40",
    ring: "ring-viz-danger/35",
  },
  info: {
    fill: "fill-viz-info",
    fillSoft: "fill-viz-info/20",
    stroke: "stroke-viz-info",
    strokeSoft: "stroke-viz-info/50",
    bg: "bg-viz-info",
    bgSoft: "bg-viz-info/15",
    bgFaint: "bg-viz-info/10",
    text: "text-viz-info",
    border: "border-viz-info",
    borderSoft: "border-viz-info/40",
    ring: "ring-viz-info/35",
  },
  muted: {
    fill: "fill-viz-muted",
    fillSoft: "fill-viz-muted/20",
    stroke: "stroke-viz-muted",
    strokeSoft: "stroke-viz-muted/50",
    bg: "bg-viz-muted",
    bgSoft: "bg-viz-muted/20",
    bgFaint: "bg-viz-muted/10",
    text: "text-viz-muted",
    border: "border-viz-muted",
    borderSoft: "border-viz-muted/50",
    ring: "ring-viz-muted/35",
  },
};

export const COLOR_KEYS: readonly ColorKey[] = ["primary", "warning", "success", "danger", "info", "muted"];

/** What each color means (CONTENT_GUIDE "Colors are semantic"). Used by the legend. */
export const COLOR_LABELS: Record<ColorKey, string> = {
  primary: "Current",
  warning: "Comparing / candidate",
  success: "Answer / done",
  danger: "Removed / invalid",
  info: "Visited / in window",
  muted: "Discarded",
};

export function isColorKey(x: unknown): x is ColorKey {
  return typeof x === "string" && x in CLASSES;
}

/** Class for a color + variant; unknown/undefined colors fall back to `fallback` (default primary). */
export function viz(color: ColorKey | undefined | null, variant: keyof VizClasses, fallback: ColorKey = "primary"): string {
  return CLASSES[isColorKey(color) ? color : fallback][variant];
}

/** Raw CSS color for inline styles (e.g. markers, gradients). */
export function vizVar(color: ColorKey | undefined | null, fallback: ColorKey = "primary"): string {
  return `var(--viz-${isColorKey(color) ? color : fallback})`;
}

/**
 * Readable "ink" text color: the viz color mixed toward the foreground so even
 * light colors (warning) keep contrast on light surfaces. Inline style value.
 */
export function vizInk(color: ColorKey | undefined | null, fallback: ColorKey = "primary"): string {
  return `color-mix(in oklch, ${vizVar(color, fallback)} 62%, var(--foreground))`;
}

/** Opaque tint of a viz color over the surface (for fills that must hide what is behind them). */
export function vizTint(color: ColorKey | undefined | null, pct = 16, base = "var(--surface)", fallback: ColorKey = "primary"): string {
  return `color-mix(in oklch, ${vizVar(color, fallback)} ${pct}%, ${base})`;
}

/** Default colors assigned to unnamed-color pointers / segments, in order of first appearance. */
export const AUTO_PALETTE: readonly ColorKey[] = ["primary", "warning", "success", "info", "danger", "muted"];

/** Builds a stable name → color map: explicit colors win, others rotate through AUTO_PALETTE. */
export function assignColors(entries: Iterable<{ name: string; color?: ColorKey | null }>): Map<string, ColorKey> {
  const explicit = new Map<string, ColorKey>();
  const order: string[] = [];
  for (const e of entries) {
    if (!order.includes(e.name)) order.push(e.name);
    if (isColorKey(e.color) && !explicit.has(e.name)) explicit.set(e.name, e.color);
  }
  const used = new Set(explicit.values());
  const out = new Map<string, ColorKey>();
  let k = 0;
  for (const name of order) {
    const ex = explicit.get(name);
    if (ex) {
      out.set(name, ex);
      continue;
    }
    // prefer palette colors not already claimed explicitly
    let pick: ColorKey | undefined;
    for (let tries = 0; tries < AUTO_PALETTE.length; tries++) {
      const c = AUTO_PALETTE[(k + tries) % AUTO_PALETTE.length];
      if (!used.has(c)) {
        pick = c;
        k = k + tries + 1;
        break;
      }
    }
    if (!pick) {
      pick = AUTO_PALETTE[k % AUTO_PALETTE.length];
      k += 1;
    }
    used.add(pick);
    out.set(name, pick);
  }
  return out;
}
