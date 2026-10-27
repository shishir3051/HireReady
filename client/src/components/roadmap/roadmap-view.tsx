"use client";

import { ArrowDown, CalendarCheck, Clock, ListChecks, LogIn, PartyPopper } from "lucide-react";
import type { Roadmap, RoadmapDay } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";
import { useProgress } from "@/components/providers";
import { PageHeader } from "@/components/layout/page";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Skeleton } from "@/components/ui/skeleton";
import { toneText } from "@/components/ui/badge";
import type { QuestionIndex } from "@/components/dashboard/question-index";
import { RoadmapDayCard } from "./roadmap-day-card";

export interface RoadmapViewProps {
  roadmap: Roadmap;
  questions: QuestionIndex;
  topicTitles: Record<string, string>;
}

function groupByWeek(days: RoadmapDay[]) {
  const weeks = new Map<number, RoadmapDay[]>();
  for (const d of [...days].sort((a, b) => a.day - b.day)) weeks.set(d.week, [...(weeks.get(d.week) ?? []), d]);
  return Array.from(weeks.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([week, list]) => ({ week, days: list }));
}

/** /roadmap body: overall progress, "up next", weeks of day cards with completion toggles. */
export function RoadmapView({ roadmap, questions, topicTitles }: RoadmapViewProps) {
  const { ready, isLoggedIn, roadmapDays, toggleRoadmapDay, status } = useProgress();
  const doneSet = new Set(ready ? roadmapDays : []);
  const days = [...roadmap.days].sort((a, b) => a.day - b.day);
  const weeks = groupByWeek(days);
  const completed = days.filter((d) => doneSet.has(d.day)).length;
  const upNext = ready ? (days.find((d) => !doneSet.has(d.day)) ?? null) : null;
  const allDone = ready && days.length > 0 && completed === days.length;
  const totalHours = days.reduce((s, d) => s + d.estimatedHours, 0);
  const hoursLeft = days.filter((d) => !doneSet.has(d.day)).reduce((s, d) => s + d.estimatedHours, 0);
  const allSlugs = Array.from(new Set(days.flatMap((d) => d.questionSlugs)));
  const solvedSlugs = ready ? allSlugs.filter((s) => status(s) === "solved").length : 0;

  return (
    <div className="pb-12">
      <PageHeader eyebrow={`${days.length}-day roadmap`} title={roadmap.title} description={roadmap.description} />

      {/* Overview */}
      <Card className="mb-5 overflow-hidden">
        <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
          <div className="flex items-center gap-4">
            {ready ? (
              <ProgressRing
                value={completed}
                max={days.length}
                tone={allDone ? "success" : "brand"}
                size={84}
                thickness={8}
                label="Roadmap progress"
                valueText={`${completed} of ${days.length} days complete`}
              >
                <span className="text-xl font-semibold tabular-nums">{Math.round((completed / Math.max(1, days.length)) * 100)}%</span>
              </ProgressRing>
            ) : (
              <Skeleton className="size-[84px] rounded-full" />
            )}
            <div className="md:hidden">
              <OverviewText ready={ready} completed={completed} total={days.length} allDone={allDone} />
            </div>
          </div>

          <div className="min-w-0 space-y-3">
            <div className="hidden md:block">
              <OverviewText ready={ready} completed={completed} total={days.length} allDone={allDone} />
            </div>
            <ProgressBar
              value={ready ? completed : 0}
              max={days.length}
              label="Days completed"
              tone={allDone ? "success" : "brand"}
              size="md"
              showValue={ready ? `${completed}/${days.length} days` : `0/${days.length} days`}
            />
            <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
              <div className="flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden />
                <dt className="sr-only">Hours</dt>
                <dd>
                  {ready && completed > 0
                    ? `~${formatNumber(Math.round(hoursLeft))}h left of ${formatNumber(Math.round(totalHours))}h`
                    : `~${formatNumber(Math.round(totalHours))}h in total`}
                </dd>
              </div>
              <div className="flex items-center gap-1">
                <ListChecks className="size-3.5" aria-hidden />
                <dt className="sr-only">Questions</dt>
                <dd>{ready && isLoggedIn ? `${solvedSlugs}/${allSlugs.length} roadmap questions solved` : `${allSlugs.length} questions`}</dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
            {!ready ? (
              <Skeleton className="h-9 w-44 rounded-lg" />
            ) : upNext ? (
              <ButtonLink href={`#day-${upNext.day}`} rightIcon={<ArrowDown aria-hidden />}>
                Up next: Day {upNext.day}
              </ButtonLink>
            ) : null}
            {ready && !isLoggedIn && (
              <ButtonLink href="/login?next=%2Froadmap" variant="outline" leftIcon={<LogIn aria-hidden />}>
                Log in to track days
              </ButtonLink>
            )}
          </div>
        </div>
        {ready && upNext && (
          <div className="border-t border-border bg-surface-2/40 px-4 py-2.5 text-sm sm:px-5">
            <span className="text-muted">Today&apos;s focus: </span>
            <a href={`#day-${upNext.day}`} className="font-medium hover:text-brand hover:underline">
              Day {upNext.day} — {upNext.title}
            </a>
          </div>
        )}
      </Card>

      {/* Week nav */}
      {weeks.length > 1 && (
        <nav
          aria-label="Weeks"
          className="sticky top-14 z-30 -mx-4 mb-5 border-b border-border bg-background/85 px-4 py-2 backdrop-blur-lg sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        >
          <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
            {weeks.map(({ week, days: list }) => {
              const done = list.filter((d) => doneSet.has(d.day)).length;
              const complete = ready && done === list.length;
              return (
                <li key={week} className="shrink-0">
                  <a
                    href={`#week-${week}`}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors hover:border-brand/40 hover:text-foreground",
                      complete ? "border-transparent" : "border-border bg-surface text-muted",
                    )}
                    style={complete ? { ...toneText("success"), backgroundColor: "color-mix(in oklch, var(--viz-success) 13%, transparent)" } : undefined}
                  >
                    {complete && <CalendarCheck className="size-3.5" aria-hidden />}
                    Week {week}
                    {ready && (
                      <span className="tabular-nums opacity-70">
                        {done}/{list.length}
                      </span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      <div className="space-y-8">
        {weeks.map(({ week, days: list }) => {
          const done = list.filter((d) => doneSet.has(d.day)).length;
          const hours = list.reduce((s, d) => s + d.estimatedHours, 0);
          const first = list[0]?.day ?? 0;
          const last = list[list.length - 1]?.day ?? 0;
          return (
            <section key={week} id={`week-${week}`} aria-labelledby={`week-${week}-title`} className="scroll-mt-28">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 id={`week-${week}-title`} className="text-lg font-semibold tracking-tight">
                    Week {week}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted">
                    Days {first}–{last} · ~{formatNumber(Math.round(hours * 10) / 10)}h
                  </p>
                </div>
                {ready && (
                  <ProgressBar
                    value={done}
                    max={list.length}
                    label={`Week ${week} progress`}
                    tone={done === list.length ? "success" : "brand"}
                    showValue={`${done}/${list.length} days`}
                    className="w-full max-w-56 sm:w-56"
                  />
                )}
              </div>
              <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {list.map((d) => (
                  <li key={d.day}>
                    <RoadmapDayCard
                      day={d}
                      done={doneSet.has(d.day)}
                      upNext={upNext?.day === d.day}
                      ready={ready}
                      questions={questions}
                      topicTitles={topicTitles}
                      status={status}
                      onToggle={(n) => void toggleRoadmapDay(n)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function OverviewText({ ready, completed, total, allDone }: { ready: boolean; completed: number; total: number; allDone: boolean }) {
  if (!ready) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }
  if (allDone) {
    return (
      <div>
        <p className="flex items-center gap-2 text-lg font-semibold" style={toneText("success")}>
          <PartyPopper className="size-5" aria-hidden /> Roadmap complete
        </p>
        <p className="text-sm text-muted">All {total} days done. Keep sharp with mock interviews.</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-lg font-semibold">
        {completed === 0 ? "Ready to start" : `${completed} of ${total} days complete`}
      </p>
      <p className="text-sm text-muted">
        {completed === 0 ? "About 2–3 focused hours a day. Check off each day as you finish it." : "Keep the streak going — one day at a time."}
      </p>
    </div>
  );
}
