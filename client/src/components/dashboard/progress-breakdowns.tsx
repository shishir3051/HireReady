"use client";

import { useState } from "react";
import Link from "next/link";
import type { Category, ProgressStats } from "@/lib/types";
import { CATEGORY_LABELS, CATEGORY_ORDER, DIFFICULTIES, DIFFICULTY_LABELS } from "@/lib/constants";
import { CATEGORY_ICONS } from "@/lib/icons";
import { ProgressRing } from "@/components/ui/progress-ring";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TopicIcon } from "@/components/topics/topic-icon";

/** Overall solved ring + one bar per difficulty. */
export function DifficultyBreakdown({ stats }: { stats: ProgressStats }) {
  const { solved, questions } = stats.totals;
  const pct = questions > 0 ? Math.round((solved / questions) * 100) : 0;
  return (
    <div className="flex items-center gap-5">
      <ProgressRing value={solved} max={Math.max(1, questions)} size={96} thickness={9} label="Questions solved" valueText={`${solved} of ${questions} solved`}>
        <span className="text-xl font-semibold tabular-nums">{pct}%</span>
        <span className="text-[10px] text-muted">solved</span>
      </ProgressRing>
      <ul className="min-w-0 flex-1 space-y-3">
        {DIFFICULTIES.map((d) => {
          const { solved: s, total } = stats.byDifficulty[d] ?? { solved: 0, total: 0 };
          const w = total > 0 ? (s / total) * 100 : 0;
          return (
            <li key={d}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span className="size-2 rounded-full" style={{ backgroundColor: `var(--${d})` }} aria-hidden />
                  {DIFFICULTY_LABELS[d]}
                </span>
                <span className="text-xs tabular-nums text-muted">
                  <span className="font-medium text-foreground">{s}</span> / {total}
                </span>
              </div>
              <div
                className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2"
                role="progressbar"
                aria-label={`${DIFFICULTY_LABELS[d]} solved`}
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={s}
                title={`${s} of ${total} ${DIFFICULTY_LABELS[d].toLowerCase()} questions solved`}
              >
                <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${w}%`, backgroundColor: `var(--${d})` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type TopicRow = ProgressStats["byTopic"][number];

/** Solved + attempted per topic, grouped by category. */
export function TopicBreakdown({ byTopic }: { byTopic: ProgressStats["byTopic"] }) {
  const rows = byTopic.filter((t) => t.total > 0);
  const started = rows.filter((t) => t.solved + t.attempted > 0);
  const [filter, setFilter] = useState<"started" | "all">(() => (started.length > 0 ? "started" : "all"));
  const list = filter === "started" ? started : rows;
  const groups = CATEGORY_ORDER.map((c) => ({ category: c, topics: list.filter((t) => t.category === c) })).filter(
    (g) => g.topics.length > 0,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-xs text-muted" aria-hidden>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm" style={{ backgroundColor: "var(--viz-success)" }} /> Solved
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm" style={{ backgroundColor: "var(--viz-warning)" }} /> Attempted
          </span>
        </div>
        <SegmentedControl
          label="Topics to show"
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "started", label: `Started (${started.length})`, disabled: started.length === 0 },
            { value: "all", label: `All (${rows.length})` },
          ]}
        />
      </div>

      {groups.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">No topics yet.</p>
      ) : (
        groups.map(({ category, topics }) => <CategoryGroup key={category} category={category} topics={topics} />)
      )}
    </div>
  );
}

function CategoryGroup({ category, topics }: { category: Category; topics: TopicRow[] }) {
  const Icon = CATEGORY_ICONS[category];
  const solved = topics.reduce((s, t) => s + t.solved, 0);
  const total = topics.reduce((s, t) => s + t.total, 0);
  return (
    <div>
      <h3 className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Icon className="size-3.5" aria-hidden />
          {CATEGORY_LABELS[category]}
        </span>
        <span className="font-medium normal-case tracking-normal tabular-nums">
          {solved}/{total}
        </span>
      </h3>
      <ul className="space-y-1">
        {topics.map((t) => {
          const solvedPct = (t.solved / t.total) * 100;
          const attemptedPct = (t.attempted / t.total) * 100;
          return (
            <li key={t.topic}>
              <Link
                href={`/topics/${t.topic}`}
                className="group -mx-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2/60 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto]"
              >
                <span className="col-start-1 row-start-1 flex min-w-0 items-center gap-2 text-sm">
                  <TopicIcon slug={t.topic} className="size-4 shrink-0 text-muted group-hover:text-brand" />
                  <span className="truncate group-hover:text-brand">{t.title}</span>
                </span>
                <span
                  className="col-span-2 col-start-1 row-start-2 flex h-2 gap-0.5 overflow-hidden rounded-full bg-surface-2 sm:col-span-1 sm:col-start-2 sm:row-start-1"
                  role="img"
                  aria-label={`${t.solved} solved and ${t.attempted} attempted of ${t.total}`}
                >
                  {t.solved > 0 && (
                    <span className="h-full rounded-full" style={{ width: `${solvedPct}%`, backgroundColor: "var(--viz-success)" }} />
                  )}
                  {t.attempted > 0 && (
                    <span className="h-full rounded-full" style={{ width: `${attemptedPct}%`, backgroundColor: "var(--viz-warning)" }} />
                  )}
                </span>
                <span className="col-start-2 row-start-1 text-right text-xs tabular-nums text-muted sm:col-start-3">
                  <span className="font-medium text-foreground">{t.solved}</span>/{t.total}
                  {t.attempted > 0 && <span className="hidden sm:inline"> · {t.attempted} tried</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
