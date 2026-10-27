"use client";

/**
 * PUBLIC CONTRACT — other parts of the app import only from this file.
 * Exports and prop shapes are fixed; the implementation lives in ./core, ./renderers and ./lib.
 */
import type { Visual } from "@/lib/types";
import { Thumbnail } from "./core/Thumbnail";
import { Walkthrough } from "./core/Walkthrough";

export interface VisualWalkthroughProps {
  /** every visual of a question; rendered as tabs when there is more than one */
  visuals: Visual[];
  /** the question's javascript solution; steps with `codeLine` highlight that line in a synced code pane */
  code?: string;
  className?: string;
}

/** Interactive, step-by-step player for a question's visuals (prev/next/play/speed/keyboard). */
export function VisualWalkthrough({ visuals, code, className }: VisualWalkthroughProps) {
  return <Walkthrough visuals={visuals} code={code} className={className} />;
}

export interface VisualThumbnailProps {
  visual: Visual;
  className?: string;
}

/** Small static preview (first step / first frame) for cards and lists. */
export function VisualThumbnail({ visual, className }: VisualThumbnailProps) {
  return <Thumbnail visual={visual} className={className} />;
}
