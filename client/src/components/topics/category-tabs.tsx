"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import type { Category } from "@/lib/types";
import { CATEGORY_ICONS } from "@/lib/icons";
import { cn } from "@/lib/utils";

export interface CategoryTabItem {
  category: Category;
  label: string;
  count: number;
}

export function CategoryTabs({
  items,
  ariaLabel = "Categories",
}: {
  items: CategoryTabItem[];
  ariaLabel?: string;
}) {
  const [active, setActive] = useState<Category>(items[0]?.category ?? "dsa");

  useEffect(() => {
    if (typeof window === "undefined" || items.length === 0) return;

    const hash = window.location.hash.replace("#", "") as Category;
    if (items.some((i) => i.category === hash)) {
      setActive(hash);
    }

    const elements = items
      .map((i) => document.getElementById(i.category))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) {
          setActive(visible[0].target.id as Category);
        }
      },
      {
        rootMargin: "-110px 0px -65% 0px",
        threshold: [0, 0.25, 0.5],
      },
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav
      aria-label={ariaLabel}
      className="sticky top-14 z-30 -mx-4 mb-6 border-b border-border bg-background/90 px-4 py-2.5 backdrop-blur-md sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 lg:-mx-12 lg:px-12 xl:-mx-16 xl:px-16 2xl:-mx-20 2xl:px-20"
    >
      <div className="inline-flex max-w-full overflow-x-auto rounded-xl border border-border bg-surface-2/70 p-1 shadow-2xs [scrollbar-width:none]">
        <ul role="tablist" className="flex items-center gap-1">
          {items.map(({ category, label, count }) => {
            const Icon = CATEGORY_ICONS[category];
            const isActive = active === category;
            return (
              <li key={category} role="presentation" className="shrink-0">
                <a
                  role="tab"
                  aria-selected={isActive}
                  href={`#${category}`}
                  onClick={() => setActive(category)}
                  className={cn(
                    "relative inline-flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-medium transition-colors",
                    isActive
                      ? "font-semibold text-foreground"
                      : "text-muted hover:bg-surface/60 hover:text-foreground",
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="category-tab-active"
                      className="absolute inset-0 rounded-lg border border-border/80 bg-surface shadow-xs"
                      transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                      aria-hidden
                    />
                  )}
                  <Icon
                    className={cn(
                      "relative size-3.5 shrink-0 transition-colors",
                      isActive ? "text-brand" : "text-muted",
                    )}
                    aria-hidden
                  />
                  <span className="relative whitespace-nowrap">{label}</span>
                  <span
                    className={cn(
                      "relative inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1.5 font-mono text-[11px] font-semibold tabular-nums transition-colors",
                      isActive
                        ? "bg-brand-soft text-brand"
                        : "bg-surface/80 text-muted",
                    )}
                  >
                    {count}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

