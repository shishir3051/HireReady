"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { useIsMac } from "@/lib/storage";

export function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-surface-2 px-1 font-mono text-[11px] font-medium leading-none text-muted shadow-[inset_0_-1px_0_var(--border)]",
        className,
      )}
      {...props}
    />
  );
}

/** Platform modifier key: ⌘ on Apple devices, Ctrl elsewhere (Ctrl during SSR). */
export function ModKey({ className }: { className?: string }) {
  const mac = useIsMac();
  return (
    <Kbd className={className} aria-label={mac ? "Command" : "Control"}>
      {mac ? "⌘" : "Ctrl"}
    </Kbd>
  );
}
