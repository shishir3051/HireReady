"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Panel, Value } from "@/lib/types";
import { asArray, cn, occurrenceKeys, str } from "../lib/utils";
import { POP, T } from "../lib/motion";

type Size = "md" | "lg";

const KIND_LABEL: Record<Panel["kind"], string> = {
  stack: "stack",
  queue: "queue",
  map: "map",
  set: "set",
  heap: "heap",
  list: "list",
  output: "output",
};

const chipBase =
  "inline-flex max-w-full items-center justify-center rounded-md border font-mono tabular-nums transition-colors duration-200";
const chipIdle = "border-border bg-surface-2 text-foreground";
const chipHot = "border-viz-primary bg-viz-primary/15 text-foreground ring-2 ring-viz-primary/25";

function Empty() {
  return <span className="py-1 text-xs italic text-muted">empty</span>;
}

function useHighlightSet(panel: Panel): Set<number> {
  if (panel.kind === "map") return new Set();
  return new Set(asArray(panel.highlight).filter((n) => typeof n === "number"));
}

/** One side panel (stack, queue, map, set, heap, list, output). */
export function PanelCard({ panel, size = "md", className }: { panel: Panel; size?: Size; className?: string }) {
  const kind = (panel?.kind ?? "list") as Panel["kind"];
  return (
    <section
      aria-label={`${panel?.title ?? kind} (${KIND_LABEL[kind] ?? kind})`}
      className={cn("min-w-0 rounded-xl border border-border bg-surface px-2.5 py-2 shadow-xs", className)}
    >
      <header className="mb-1.5 flex items-baseline justify-between gap-2">
        <h4 className="truncate font-mono text-xs font-semibold text-foreground">{panel?.title || kind}</h4>
        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted">
          {KIND_LABEL[kind] ?? kind}
        </span>
      </header>
      <PanelBody panel={panel} size={size} />
    </section>
  );
}

function PanelBody({ panel, size }: { panel: Panel; size: Size }) {
  const hot = useHighlightSet(panel);
  const chipSize = size === "lg" ? "h-8 min-w-8 px-2 text-sm" : "h-7 min-w-7 px-1.5 text-xs";
  switch (panel?.kind) {
    case "stack":
      return <StackBody items={asArray(panel.items)} hot={hot} chipSize={chipSize} />;
    case "queue":
      return <QueueBody items={asArray(panel.items)} hot={hot} chipSize={chipSize} />;
    case "map":
      return <MapBody panel={panel} size={size} />;
    case "heap":
      return <HeapBody items={asArray(panel.items)} hot={hot} chipSize={chipSize} />;
    case "set":
    case "list":
    case "output":
    default:
      return (
        <ChipsBody
          items={asArray((panel as { items?: Value[] })?.items)}
          hot={hot}
          chipSize={chipSize}
          braces={panel?.kind === "set" ? ["{", "}"] : panel?.kind === "list" ? ["[", "]"] : null}
        />
      );
  }
}

function StackBody({ items, hot, chipSize }: { items: Value[]; hot: Set<number>; chipSize: string }) {
  const keys = occurrenceKeys(items);
  const order = items.map((_, i) => i).reverse(); // top first
  return (
    <div className="rounded-b-lg border-x-2 border-b-2 border-border px-1.5 pb-1.5 pt-1">
      {items.length === 0 ? (
        <div className="flex justify-center">
          <Empty />
        </div>
      ) : (
        <ol className="flex flex-col gap-1">
          <AnimatePresence initial={false} mode="popLayout">
            {order.map((i, pos) => (
              <motion.li
                key={keys[i]}
                layout
                {...POP}
                transition={T}
                className={cn(chipBase, chipSize, "w-full justify-between gap-2", hot.has(i) ? chipHot : chipIdle)}
              >
                <span className="truncate" title={str(items[i])}>
                  {str(items[i])}
                </span>
                {pos === 0 && (
                  <span className="shrink-0 rounded bg-brand-soft px-1 font-sans text-[9px] font-bold uppercase tracking-wider text-brand">
                    top
                  </span>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}
    </div>
  );
}

function QueueBody({ items, hot, chipSize }: { items: Value[]; hot: Set<number>; chipSize: string }) {
  const keys = occurrenceKeys(items);
  if (items.length === 0) return <Empty />;
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-0.5">
      <ol className="flex w-max items-start gap-1">
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((v, i) => (
            <motion.li key={keys[i]} layout {...POP} transition={T} className="flex flex-col items-center gap-0.5">
              <span className={cn(chipBase, chipSize, hot.has(i) ? chipHot : chipIdle)}>
                <span className="max-w-[8rem] truncate" title={str(v)}>
                  {str(v)}
                </span>
              </span>
              <span className="h-3 text-[9px] font-bold uppercase leading-3 tracking-wider text-brand">
                {i === 0 && items.length === 1 ? "front·back" : i === 0 ? "front" : i === items.length - 1 ? "back" : ""}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </div>
  );
}

function HeapBody({ items, hot, chipSize }: { items: Value[]; hot: Set<number>; chipSize: string }) {
  const keys = occurrenceKeys(items);
  if (items.length === 0) return <Empty />;
  return (
    <ol className="flex flex-wrap gap-1">
      <AnimatePresence initial={false} mode="popLayout">
        {items.map((v, i) => (
          <motion.li key={keys[i]} layout {...POP} transition={T} className="flex flex-col items-center gap-0.5">
            <span className={cn(chipBase, chipSize, hot.has(i) ? chipHot : chipIdle, i === 0 && !hot.has(i) && "border-brand/50")}>
              <span className="max-w-[8rem] truncate" title={str(v)}>
                {str(v)}
              </span>
            </span>
            <span className="font-mono text-[9px] leading-3 text-muted">{i}</span>
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  );
}

function ChipsBody({
  items,
  hot,
  chipSize,
  braces,
}: {
  items: Value[];
  hot: Set<number>;
  chipSize: string;
  braces: [string, string] | null;
}) {
  const keys = occurrenceKeys(items);
  if (items.length === 0) {
    return braces ? <span className="font-mono text-xs text-muted">{`${braces[0]} ${braces[1]}`}</span> : <Empty />;
  }
  return (
    <ul className="flex flex-wrap items-center gap-1">
      <AnimatePresence initial={false} mode="popLayout">
        {items.map((v, i) => (
          <motion.li key={keys[i]} layout {...POP} transition={T} className="max-w-full">
            <span className={cn(chipBase, chipSize, hot.has(i) ? chipHot : chipIdle)}>
              <span className="truncate" title={str(v)}>
                {str(v)}
              </span>
            </span>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function MapBody({ panel, size }: { panel: Extract<Panel, { kind: "map" }>; size: Size }) {
  const entries = asArray(panel.entries).filter((e) => e && typeof e === "object");
  const hot = new Set(asArray(panel.highlight).map((k) => String(k)));
  if (entries.length === 0) return <span className="font-mono text-xs text-muted">{"{ }"}</span>;
  // duplicate keys are schema-valid: disambiguate React keys
  const keys = occurrenceKeys(entries.map((e) => String(e.key)));
  return (
    <ul className={cn("flex flex-col gap-1 font-mono", size === "lg" ? "text-sm" : "text-xs")}>
      <AnimatePresence initial={false} mode="popLayout">
        {entries.map((e, i) => {
          const isHot = hot.has(String(e.key));
          return (
            <motion.li
              key={keys[i]}
              layout
              {...POP}
              transition={T}
              className={cn(
                "grid grid-cols-[minmax(0,auto)_auto_minmax(0,1fr)] items-center gap-1.5 rounded-md border px-2 py-1 transition-colors duration-200",
                isHot ? "border-viz-primary bg-viz-primary/15 ring-2 ring-viz-primary/25" : "border-border bg-surface-2",
              )}
            >
              <span className="truncate font-semibold" title={str(e.key)}>
                {str(e.key)}
              </span>
              <span aria-hidden className="text-muted">
                →
              </span>
              <span className="truncate" title={str(e.value)}>
                {str(e.value)}
              </span>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
