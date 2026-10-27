"use client";

import { useCallback, useId, useRef, useState, type KeyboardEvent } from "react";
import { MotionConfig } from "motion/react";
import type { Visual } from "@/lib/types";
import { typeMeta } from "../lib/steps";
import { asArray, clamp, cn, safeId } from "../lib/utils";
import { VisualErrorBoundary } from "./ErrorBoundary";
import { VisualStage } from "./Stage";

function Tabs({
  visuals,
  active,
  onSelect,
  idBase,
}: {
  visuals: Visual[];
  active: number;
  onSelect: (i: number) => void;
  idBase: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const n = visuals.length;
    let next = -1;
    if (e.key === "ArrowRight") next = (active + 1) % n;
    else if (e.key === "ArrowLeft") next = (active - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    if (next < 0) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect(next);
    refs.current[next]?.focus();
    refs.current[next]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div
        role="tablist"
        aria-label="Visuals"
        onKeyDown={onKeyDown}
        className="inline-flex min-w-max items-center gap-1 rounded-xl border border-border bg-surface-2/70 p-1"
      >
        {visuals.map((v, i) => {
          const { icon: Icon, label } = typeMeta(v?.type);
          const selected = i === active;
          return (
            <button
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${idBase}-tab-${i}`}
              aria-selected={selected}
              aria-controls={`${idBase}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(i)}
              title={v?.title}
              className={cn(
                "inline-flex h-8 max-w-[16rem] items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-[background-color,color,box-shadow] duration-200",
                selected ? "bg-surface text-foreground shadow-xs ring-1 ring-border" : "text-muted hover:text-foreground",
              )}
            >
              <Icon aria-hidden className={cn("size-3.5 shrink-0", selected ? "text-brand" : "")} />
              <span className="truncate">{v?.title || label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Walkthrough({ visuals, code, className }: { visuals: Visual[]; code?: string; className?: string }) {
  const list = asArray(visuals).filter((v) => v && typeof v === "object");
  const idBase = safeId(useId());
  const [rawActive, setActive] = useState(0);
  const [steps, setSteps] = useState<Record<string, number>>({});
  const active = clamp(rawActive, 0, Math.max(0, list.length - 1));
  const visual = list[active];
  const stageKey = visual ? `${active}:${visual.type}:${visual.title}` : "none";
  const onStepChange = useCallback((i: number) => setSteps((s) => (s[stageKey] === i ? s : { ...s, [stageKey]: i })), [stageKey]);

  if (!visual) {
    return (
      <div className={cn("rounded-2xl border border-dashed border-border bg-surface p-4 text-center text-sm text-muted", className)}>
        No visual walkthrough for this question yet.
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className={cn("flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-surface p-3 shadow-sm sm:p-4", className)}>
        {list.length > 1 ? <Tabs visuals={list} active={active} onSelect={setActive} idBase={idBase} /> : null}
        <div
          id={`${idBase}-panel`}
          role={list.length > 1 ? "tabpanel" : undefined}
          aria-labelledby={list.length > 1 ? `${idBase}-tab-${active}` : undefined}
          className="min-w-0"
        >
          <VisualErrorBoundary key={stageKey} label={typeMeta(visual.type).label.toLowerCase()}>
            <VisualStage key={stageKey} visual={visual} code={code} initialStep={steps[stageKey] ?? 0} onStepChange={onStepChange} />
          </VisualErrorBoundary>
        </div>
      </div>
    </MotionConfig>
  );
}
