"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { cn, formatNumber } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { addDays, useTodayUTC, utcDay } from "./use-today";

const LEVEL_MIX = [0, 28, 50, 74, 100];

function levelColor(level: number) {
  if (level === 0) return "var(--surface-2)";
  return `color-mix(in oklch, var(--brand) ${LEVEL_MIX[level]}%, var(--surface-2))`;
}

const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const dayFmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

interface Cell {
  i: number;
  date: string;
  count: number;
  future: boolean;
  week: number;
  dow: number;
}

function describe(cell: Cell) {
  const label = dayFmt.format(new Date(utcDay(cell.date)));
  return `${cell.count === 0 ? "No activity" : `${cell.count} ${cell.count === 1 ? "activity" : "activities"}`} on ${label}`;
}

/**
 * GitHub-style heatmap of the last `weeks` weeks (columns = weeks, rows = Sun→Sat, UTC days).
 * Hover a cell or focus the grid and use the arrow keys to read each day.
 */
export function ActivityHeatmap({ activity, weeks = 17 }: { activity: { date: string; count: number }[]; weeks?: number }) {
  const today = useTodayUTC();
  const [hover, setHover] = useState<number | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const summaryId = useId();

  if (!today) return <Skeleton className="h-40 w-full rounded-lg" />;

  const counts = new Map(activity.map((a) => [a.date, a.count]));
  const endDow = new Date(utcDay(today)).getUTCDay();
  const start = addDays(today, -((weeks - 1) * 7 + endDow));
  const cells: Cell[] = Array.from({ length: weeks * 7 }, (_, i) => {
    const date = addDays(start, i);
    const future = date > today;
    return { i, date, count: future ? 0 : (counts.get(date) ?? 0), future, week: Math.floor(i / 7), dow: i % 7 };
  });
  const lastIndex = (weeks - 1) * 7 + endDow;
  const visible = cells.filter((c) => !c.future);
  const max = Math.max(0, ...visible.map((c) => c.count));
  const level = (count: number) =>
    count <= 0 ? 0 : max <= 4 ? Math.min(4, count) : Math.max(1, Math.min(4, Math.ceil((count / max) * 4)));
  const activeDays = visible.filter((c) => c.count > 0).length;
  const total = visible.reduce((s, c) => s + c.count, 0);
  const busiest = visible.reduce<Cell | null>((best, c) => (c.count > (best?.count ?? 0) ? c : best), null);

  // month labels where the month changes between columns
  const months: { week: number; label: string }[] = [];
  for (let w = 0; w < weeks; w++) {
    const m = new Date(utcDay(cells[w * 7]!.date)).getUTCMonth();
    const prev = w > 0 ? new Date(utcDay(cells[(w - 1) * 7]!.date)).getUTCMonth() : -1;
    if (m !== prev) months.push({ week: w, label: monthFmt.format(new Date(utcDay(cells[w * 7]!.date))) });
  }
  if (months.length > 1 && months[1]!.week - months[0]!.week < 3) months.shift();

  const shownIndex = hover ?? active;
  const shown = shownIndex !== null ? cells[shownIndex] : undefined;

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const cur = active ?? lastIndex;
    let next = cur;
    if (e.key === "ArrowLeft") next = cur - 7;
    else if (e.key === "ArrowRight") next = cur + 7;
    else if (e.key === "ArrowUp") next = cur - 1;
    else if (e.key === "ArrowDown") next = cur + 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = lastIndex;
    else return;
    e.preventDefault();
    setHover(null);
    setActive(Math.max(0, Math.min(lastIndex, next)));
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
      <div className="min-w-0 flex-1 sm:max-w-[30rem]">
        <div className="flex gap-1.5">
          {/* weekday labels */}
          <div className="grid shrink-0 grid-rows-[auto_repeat(7,minmax(0,1fr))] gap-[3px] pr-0.5 text-[10px] leading-none text-muted" aria-hidden>
            <span className="h-3.5" />
            {WEEKDAY_LABELS.map((d, i) => (
              <span key={i} className="flex items-center">
                {d}
              </span>
            ))}
          </div>

          <div className="min-w-0 flex-1">
            {/* month labels */}
            <div className="mb-[3px] grid h-3.5 text-[10px] leading-none text-muted" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }} aria-hidden>
              {months.map((m) => (
                <span key={m.week} className="whitespace-nowrap" style={{ gridColumnStart: m.week + 1, gridRowStart: 1 }}>
                  {m.label}
                </span>
              ))}
            </div>

            <div className="relative">
              <div
                role="group"
                tabIndex={0}
                aria-label="Activity heatmap. Use the arrow keys to read each day."
                aria-describedby={summaryId}
                onKeyDown={onKeyDown}
                onFocus={() => setActive((a) => a ?? lastIndex)}
                onBlur={() => setActive(null)}
                onPointerLeave={() => setHover(null)}
                className="grid grid-flow-col gap-[3px] rounded-md outline-offset-4"
                style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))`, gridTemplateRows: "repeat(7, auto)" }}
              >
                {cells.map((c) => (
                  <span
                    key={c.date}
                    aria-hidden
                    onPointerEnter={() => !c.future && setHover(c.i)}
                    className={cn(
                      "aspect-square rounded-[3px] transition-[box-shadow,transform] duration-150",
                      c.future ? "opacity-0" : "ring-1 ring-inset ring-foreground/[0.04]",
                      shownIndex === c.i && "z-10 scale-110 ring-2 ring-foreground/70",
                    )}
                    style={{ backgroundColor: c.future ? "transparent" : levelColor(level(c.count)) }}
                  />
                ))}
              </div>

              {shown && !shown.future && (
                <div
                  className="pointer-events-none absolute z-20 w-max max-w-48 rounded-md border border-border bg-foreground px-2 py-1 text-center text-xs leading-snug text-background shadow-lg"
                  style={{
                    left: `${((shown.week + 0.5) / weeks) * 100}%`,
                    top: `${(shown.dow / 7) * 100}%`,
                    transform: `translate(${-(shown.week / Math.max(1, weeks - 1)) * 100}%, calc(-100% - 6px))`,
                  }}
                  aria-hidden
                >
                  <span className="font-semibold">
                    {shown.count === 0 ? "No activity" : `${shown.count} ${shown.count === 1 ? "activity" : "activities"}`}
                  </span>
                  <span className="block opacity-75">{dayFmt.format(new Date(utcDay(shown.date)))}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* legend */}
        <div className="mt-2.5 flex items-center justify-end gap-1 text-[10px] text-muted" aria-hidden>
          <span className="mr-0.5">Less</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className="size-2.5 rounded-[2px] ring-1 ring-inset ring-foreground/[0.04]" style={{ backgroundColor: levelColor(l) }} />
          ))}
          <span className="ml-0.5">More</span>
        </div>
        <p className="sr-only" aria-live="polite">
          {active !== null && cells[active] ? describe(cells[active]) : ""}
        </p>
      </div>

      <dl id={summaryId} className="grid shrink-0 grid-cols-3 gap-3 sm:w-40 sm:grid-cols-1">
        <div>
          <dt className="text-xs text-muted">Active days</dt>
          <dd className="text-lg font-semibold tabular-nums">
            {activeDays}
            <span className="text-xs font-normal text-muted"> / {visible.length}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Total actions</dt>
          <dd className="text-lg font-semibold tabular-nums">{formatNumber(total)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Busiest day</dt>
          <dd className="text-sm font-semibold">
            {busiest ? (
              <>
                {dayFmt.format(new Date(utcDay(busiest.date)))}
                <span className="block text-xs font-normal text-muted">{busiest.count} actions</span>
              </>
            ) : (
              <span className="font-normal text-muted">—</span>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}
