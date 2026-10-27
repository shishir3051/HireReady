"use client";

import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TooltipProps {
  content: ReactNode;
  /** a single focusable element (button, link) — receives aria-describedby */
  children: ReactElement<{ "aria-describedby"?: string }>;
  side?: "top" | "bottom";
  align?: "center" | "start" | "end";
  className?: string;
}

/**
 * Lightweight CSS tooltip shown on hover and keyboard focus. The trigger still needs its own
 * accessible name (aria-label / text); the tooltip is wired up as its description.
 */
export function Tooltip({ content, children, side = "top", align = "center", className }: TooltipProps) {
  const id = useId();
  const trigger = isValidElement(children)
    ? cloneElement(children, {
        "aria-describedby": [children.props["aria-describedby"], id].filter(Boolean).join(" "),
      })
    : children;
  return (
    <span className="group/tooltip relative inline-flex">
      {trigger}
      <span
        role="tooltip"
        id={id}
        className={cn(
          "pointer-events-none absolute z-50 hidden w-max max-w-56 rounded-md border border-border bg-foreground px-2 py-1 text-center text-xs font-medium leading-snug text-background shadow-lg group-focus-within/tooltip:block group-hover/tooltip:block",
          side === "top" ? "bottom-full mb-2" : "top-full mt-2",
          align === "center" && "left-1/2 -translate-x-1/2",
          align === "start" && "left-0",
          align === "end" && "right-0",
          className,
        )}
      >
        {content}
      </span>
    </span>
  );
}
