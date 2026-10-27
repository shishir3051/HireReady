"use client";

import type { ReactNode } from "react";
import type { Visual } from "@/lib/types";
import { cn } from "../lib/utils";

export interface CanvasProps<V extends Visual> {
  visual: V;
  /** step / frame index (already clamped by the caller, but renderers clamp again) */
  index: number;
  /** "thumb" = tiny static preview (no pointer tags, no min widths) */
  variant?: "full" | "thumb";
}

/** Placeholder shown when a step has nothing to draw (empty list, root null...). */
export function EmptyCanvas({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-24 w-full items-center justify-center rounded-lg border border-dashed border-border px-4 py-6 text-center font-mono text-xs text-muted",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Wrapper for SVG canvases: scales via viewBox, keeps a legible minimum width and scrolls inside itself. */
export function SvgFrame({
  width,
  height,
  label,
  children,
  variant = "full",
  minScale = 0.6,
  maxScale = 1.25,
  className,
}: {
  width: number;
  height: number;
  label: string;
  children: ReactNode;
  variant?: "full" | "thumb";
  minScale?: number;
  maxScale?: number;
  className?: string;
}) {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  if (variant === "thumb") {
    return (
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" className={cn("block h-full w-full", className)} aria-hidden>
        {children}
      </svg>
    );
  }
  return (
    <div className="w-full overflow-x-auto overscroll-x-contain">
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${w} ${h}`}
        className={cn("mx-auto block h-auto w-full select-none", className)}
        style={{ minWidth: Math.round(w * minScale), maxWidth: Math.round(w * maxScale) }}
      >
        {children}
      </svg>
    </div>
  );
}

/** Pointer tag geometry shared by SVG renderers. */
export const TAG_H = 17;
export const TAG_GAP = 3;
export const TAG_FONT = 10.5;
