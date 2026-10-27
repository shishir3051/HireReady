"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Bookmark, Check, Clock, Map as MapIcon, Mic, PartyPopper, Play, Target } from "lucide-react";
import type { MockSession, ProgressStatus, QuestionProgress, QuizAttempt, Roadmap } from "@/lib/types";
import { cn, formatDuration, timeAgo, titleFromSlug } from "@/lib/utils";
import { Badge, DifficultyBadge, toneText } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusGlyph } from "@/components/questions/progress-controls";
import { TopicIcon } from "@/components/topics/topic-icon";
import { formatSessionDate } from "@/components/mock/mock-history";
import { RatingDots } from "@/components/mock/rating-dots";
import { scoreTone } from "@/components/quiz/score";
import type { QuestionIndex } from "./question-index";

function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-11 rounded-lg" />
      ))}
    </div>
  );
}

function InlineEmpty({ icon: Icon, children, action }: { icon: typeof Target; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-4 text-center">
      <Icon className="size-5 text-muted" aria-hidden />
      <p className="text-sm text-muted">{children}</p>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------- continue & bookmarks

export function ContinueList({ items, index }: { items: QuestionProgress[]; index: QuestionIndex }) {
  if (items.length === 0) {
    return (
      <InlineEmpty
        icon={Play}
        action={
          <ButtonLink href="/questions" size="sm" variant="soft">
            Find a question
          </ButtonLink>
        }
      >
        Questions you&apos;ve started but not solved show up here.
      </InlineEmpty>
    );
  }
  return (
    <ul className="-mx-2 space-y-0.5">
      {items.map((p) => {
        const q = index[p.slug];
        return (
          <li key={p.slug}>
            <Link href={`/questions/${p.slug}`} className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2/60">
              <StatusGlyph status="attempted" className="size-4" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium group-hover:text-brand">{q?.title ?? titleFromSlug(p.slug)}</span>
                <span className="block truncate text-xs text-muted">
                  {q ? `${q.topicTitle} · ` : ""}
                  {timeAgo(p.updatedAt)}
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function BookmarkList({
  items,
  index,
  status,
}: {
  items: QuestionProgress[];
  index: QuestionIndex;
  status: (slug: string) => ProgressStatus;
}) {
  if (items.length === 0) {
    return <InlineEmpty icon={Bookmark}>Bookmark tricky questions to revisit them before the interview.</InlineEmpty>;
  }
  return (
    <ul className="-mx-2 space-y-0.5">
      {items.map((p) => {
        const q = index[p.slug];
        return (
          <li key={p.slug}>
            <Link href={`/questions/${p.slug}`} className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2/60">
              <StatusGlyph status={status(p.slug)} className="size-4" />
              <span className="min-w-0 flex-1 truncate text-sm group-hover:text-brand">{q?.title ?? titleFromSlug(p.slug)}</span>
              {q && <DifficultyBadge difficulty={q.difficulty} className="shrink-0" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------- quizzes

export function RecentQuizzes({ items, loading, error }: { items: QuizAttempt[] | undefined; loading: boolean; error: unknown }) {
  if (!items) {
    if (loading) return <ListSkeleton />;
    return <p className="text-sm text-muted">{error ? "Couldn't load your quiz history." : ""}</p>;
  }
  if (items.length === 0) {
    return (
      <InlineEmpty
        icon={Target}
        action={
          <ButtonLink href="/quiz" size="sm" variant="soft">
            Take a quiz
          </ButtonLink>
        }
      >
        No quizzes yet. Ten minutes a day keeps the facts fresh.
      </InlineEmpty>
    );
  }
  const trend = items.slice(0, 12).reverse();
  return (
    <div className="space-y-4">
      {trend.length >= 3 && <Sparkline values={trend.map((t) => t.pct)} />}
      <ul className="-mx-2 space-y-0.5">
        {items.slice(0, 5).map((a) => (
          <li key={a.id}>
            <Link href={`/quiz/${a.topic}`} className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2/60">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                <TopicIcon slug={a.topic} className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium group-hover:text-brand">{a.topicTitle}</span>
                <span className="block text-xs text-muted">{timeAgo(a.createdAt)}</span>
              </span>
              <Badge tone={scoreTone(a.pct)} className="shrink-0 tabular-nums">
                {a.score}/{a.total} · {a.pct}%
              </Badge>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Small trend line of quiz percentages (oldest → newest). Decorative: the list below carries the numbers. */
function Sparkline({ values }: { values: number[] }) {
  const w = 240;
  const h = 44;
  const pad = 4;
  const step = (w - pad * 2) / Math.max(1, values.length - 1);
  const y = (v: number) => pad + (1 - v / 100) * (h - pad * 2);
  const points = values.map((v, i) => `${pad + i * step},${y(v)}`).join(" ");
  const last = values[values.length - 1] ?? 0;
  const avg = Math.round(values.reduce((s, v) => s + v, 0) / values.length);
  return (
    <div className="flex items-center gap-4 rounded-lg bg-surface-2/50 px-3 py-2">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-11 min-w-0 flex-1" preserveAspectRatio="none" aria-hidden>
        <line x1={pad} x2={w - pad} y1={y(80)} y2={y(80)} stroke="var(--border)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        <polyline points={points} fill="none" stroke="var(--brand)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <p className="shrink-0 text-right text-xs leading-tight text-muted">
        <span className="block text-sm font-semibold tabular-nums text-foreground">{last}%</span>
        last · avg {avg}%
      </p>
      <span className="sr-only">
        Your last {values.length} quiz scores averaged {avg}%, most recent {last}%.
      </span>
    </div>
  );
}

// ---------------------------------------------------------------- mock sessions

export function RecentMocks({ items, loading, error }: { items: MockSession[] | undefined; loading: boolean; error: unknown }) {
  if (!items) {
    if (loading) return <ListSkeleton />;
    return <p className="text-sm text-muted">{error ? "Couldn't load your mock interviews." : ""}</p>;
  }
  if (items.length === 0) {
    return (
      <InlineEmpty
        icon={Mic}
        action={
          <ButtonLink href="/mock-interview" size="sm" variant="soft">
            Start a mock interview
          </ButtonLink>
        }
      >
        Practice answering against the clock, then rate yourself.
      </InlineEmpty>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {items.slice(0, 4).map((s) => (
        <li key={s.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">{formatSessionDate(s.createdAt)}</span>
            <span className="flex items-center gap-1.5 text-xs text-muted">
              {s.items.length} questions
              <span aria-hidden>·</span>
              <Clock className="size-3" aria-hidden />
              {formatDuration(s.durationSec)}
            </span>
          </span>
          <RatingDots rating={s.avgRating} showLabel />
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- roadmap

export function NextRoadmapDay({
  roadmap,
  doneDays,
  status,
  onToggle,
  topicTitles,
}: {
  roadmap: Roadmap | null;
  topicTitles: Record<string, string>;
  doneDays: number[];
  status: (slug: string) => ProgressStatus;
  onToggle: (day: number) => void;
}) {
  if (!roadmap || roadmap.days.length === 0) {
    return (
      <InlineEmpty
        icon={MapIcon}
        action={
          <ButtonLink href="/roadmap" size="sm" variant="soft">
            Open roadmap
          </ButtonLink>
        }
      >
        The study plan isn&apos;t available right now.
      </InlineEmpty>
    );
  }
  const days = [...roadmap.days].sort((a, b) => a.day - b.day);
  const done = new Set(doneDays);
  const completed = days.filter((d) => done.has(d.day)).length;
  const next = days.find((d) => !done.has(d.day));
  if (!next) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <PartyPopper className="size-7" style={toneText("success")} aria-hidden />
        <p className="font-semibold">Roadmap complete</p>
        <p className="text-sm text-muted">All {days.length} days done. Keep sharp with mock interviews.</p>
      </div>
    );
  }
  const solved = next.questionSlugs.filter((s) => status(s) === "solved").length;
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand text-center leading-none text-brand-foreground" aria-hidden>
          <span>
            <span className="block text-[9px] font-medium uppercase tracking-wider opacity-80">Day</span>
            <span className="block text-base font-semibold tabular-nums">{next.day}</span>
          </span>
        </span>
        <div className="min-w-0">
          <p className="font-semibold leading-snug">
            <span className="sr-only">Day {next.day}: </span>
            {next.title}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
            <span>Week {next.week}</span>
            <span aria-hidden>·</span>
            <span>~{next.estimatedHours}h</span>
            <span aria-hidden>·</span>
            <span className={cn(solved > 0 && "font-medium text-foreground")}>
              {solved}/{next.questionSlugs.length} solved
            </span>
          </p>
        </div>
      </div>
      {next.topics.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Topics">
          {next.topics.map((t) => (
            <li key={t}>
              <Link
                href={`/topics/${t}`}
                className="inline-flex h-6 items-center gap-1 rounded-full border border-border bg-surface-2/60 px-2 text-[11px] font-medium text-foreground/80 hover:border-brand/40 hover:text-brand"
              >
                <TopicIcon slug={t} className="size-3" />
                {topicTitles[t] ?? titleFromSlug(t)}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <ProgressBar
        value={completed}
        max={days.length}
        label="Roadmap progress"
        size="xs"
        showValue={`${completed}/${days.length} days`}
        className="mt-auto"
      />
      <div className="flex gap-2">
        <ButtonLink href={`/roadmap#day-${next.day}`} size="sm" className="flex-1" rightIcon={<ArrowRight aria-hidden />}>
          Open day {next.day}
        </ButtonLink>
        <Button size="sm" variant="outline" onClick={() => onToggle(next.day)} leftIcon={<Check aria-hidden />}>
          Done
          <span className="sr-only"> with day {next.day}</span>
        </Button>
      </div>
    </div>
  );
}

