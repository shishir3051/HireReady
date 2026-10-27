"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePracticeMode } from "./practice-mode";

export interface TocItem {
  id: string;
  label: string;
  /** hidden behind the practice-mode gate */
  gated?: boolean;
}

/** Sticky "On this page" navigation with scroll-spy. */
export function QuestionToc({ items }: { items: TocItem[] }) {
  const { hidden } = usePracticeMode();
  const [active, setActive] = useState<string | null>(null);
  const ids = items.map((i) => i.id).join(",");

  useEffect(() => {
    const elements = ids
      .split(",")
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null && el.offsetParent !== null);
    if (elements.length === 0) return;
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.set(e.target.id, e.boundingClientRect.top);
          else visible.delete(e.target.id);
        }
        const top = Array.from(visible.entries()).sort((a, b) => a[1] - b[1])[0];
        if (top) setActive(top[0]);
      },
      { rootMargin: "-72px 0px -55% 0px", threshold: 0 },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids, hidden]);

  return (
    <nav aria-label="On this page">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">On this page</p>
      <ul className="mt-3 space-y-0.5 border-l border-border">
        {items.map((item) => {
          const locked = hidden && item.gated;
          const isActive = active === item.id && !locked;
          return (
            <li key={item.id}>
              <a
                href={locked ? "#answer" : `#${item.id}`}
                aria-current={isActive ? "location" : undefined}
                className={cn(
                  "-ml-px flex items-center gap-2 border-l py-1.5 pl-3 text-sm transition-colors",
                  isActive
                    ? "border-brand font-medium text-foreground"
                    : "border-transparent text-muted hover:border-muted/50 hover:text-foreground",
                  locked && "text-muted/70",
                )}
              >
                {item.label}
                {locked && <Lock className="size-3" aria-label="hidden in practice mode" />}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
