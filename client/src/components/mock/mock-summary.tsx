"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  BookOpen,
  CircleAlert,
  CircleCheck,
  Clock,
  Eye,
  LayoutDashboard,
  ListChecks,
  LoaderCircle,
  LogIn,
  RotateCcw,
  Settings2,
  Target,
  TrendingDown,
  Trophy,
} from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { Badge, DifficultyBadge, KindBadge, toneStyle, toneText } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { SectionHeading } from "@/components/layout/page";
import { TopicIcon } from "@/components/topics/topic-icon";
import { KIND_MINUTES, RATING_LABELS, ratingTone } from "./constants";
import type { MockRunItem } from "./mock-session";
import { RatingDots } from "./rating-dots";

export type SaveState =
  | { status: "idle" }
  | { status: "anonymous" }
  | { status: "saving" }
  | { status: "saved" }
  | { status: "error"; message: string };

export interface MockResult {
  items: MockRunItem[];
  /** questions in the session (may be more than items when ended early) */
  total: number;
  durationSec: number;
  endedEarly: boolean;
}

function verdict(avg: number) {
  if (avg >= 4.5) return { title: "Interview ready", message: "Clear, confident answers. Keep the streak going with harder questions." };
  if (avg >= 3.5) return { title: "Strong session", message: "Mostly solid. Tighten up the lower-rated answers below and you're there." };
  if (avg >= 2.5) return { title: "Good practice", message: "You got there on most questions. Study the weak topics, then run it again." };
  return { title: "Tough one — that's the point", message: "Every blank now is one you won't have in the real interview. Start with the weakest topic below." };
}

export function MockSummary({
  result,
  topicTitles,
  save,
  onRetrySave,
  onRestart,
  onNewSettings,
  starting = false,
}: {
  result: MockResult;
  topicTitles: Record<string, string>;
  save: SaveState;
  onRetrySave: () => void;
  onRestart: () => void;
  onNewSettings: () => void;
  /** a new session is being fetched (restart button spinner) */
  starting?: boolean;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  const { items } = result;
  const avg = items.reduce((s, i) => s + i.rating, 0) / Math.max(1, items.length);
  const avgRounded = Math.round(avg * 10) / 10;
  const tone = ratingTone(avg);
  const v = verdict(avg);
  const revealed = items.filter((i) => i.revealed).length;
  const avgTime = result.durationSec / Math.max(1, items.length);

  // weakest topics: lowest average rating first, only those below "Solid"
  const byTopic = new Map<string, MockRunItem[]>();
  for (const item of items) byTopic.set(item.question.topic, [...(byTopic.get(item.question.topic) ?? []), item]);
  const weak = Array.from(byTopic.entries())
    .map(([topic, list]) => ({ topic, list, avg: list.reduce((s, i) => s + i.rating, 0) / list.length }))
    .filter((t) => t.avg < 4)
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }}>
        <Card className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(40rem 14rem at 50% -20%, color-mix(in oklch, var(--viz-${tone}) 16%, transparent), transparent 70%)`,
            }}
          />
          <div className="relative flex flex-col items-center gap-4 p-4 text-center sm:p-6 md:flex-row md:gap-6 md:text-left">
            <ProgressRing
              value={avg}
              max={5}
              tone={tone}
              size={148}
              thickness={12}
              label="Average self-rating"
              valueText={`${avgRounded} out of 5`}
            >
              <span className="text-4xl font-semibold tabular-nums tracking-tight">{avgRounded.toFixed(1)}</span>
              <span className="text-xs text-muted">out of 5</span>
            </ProgressRing>
            <div className="min-w-0 flex-1 space-y-3">
              <p className="text-sm font-medium text-brand">
                Mock interview {result.endedEarly ? "· ended early" : "complete"}
              </p>
              <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none sm:text-3xl">
                {v.title}
              </h2>
              <p className="max-w-xl text-pretty text-muted">{v.message}</p>
              <SaveBanner save={save} onRetry={onRetrySave} />
            </div>
          </div>
          <dl className="relative grid grid-cols-2 border-t border-border sm:grid-cols-4">
            <Stat icon={<ListChecks aria-hidden />} label="Answered" value={`${items.length}/${result.total}`} />
            <Stat icon={<Clock aria-hidden />} label="Total time" value={formatDuration(result.durationSec)} />
            <Stat icon={<Target aria-hidden />} label="Avg per question" value={formatDuration(avgTime)} />
            <Stat icon={<Eye aria-hidden />} label="Answers revealed" value={`${revealed}/${items.length}`} />
          </dl>
        </Card>
      </motion.div>

      <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
        <Button size="lg" onClick={onRestart} loading={starting} leftIcon={<RotateCcw aria-hidden />}>
          New interview, same settings
        </Button>
        <Button size="lg" variant="outline" onClick={onNewSettings} leftIcon={<Settings2 aria-hidden />}>
          Change settings
        </Button>
        {save.status === "saved" && (
          <ButtonLink href="/dashboard" size="lg" variant="ghost" leftIcon={<LayoutDashboard aria-hidden />}>
            Dashboard
          </ButtonLink>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="mock-breakdown" className="min-w-0">
          <SectionHeading id="mock-breakdown" title="Question by question" description="Time against the suggested limit, and how you rated yourself." />
          <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {items.map((item, i) => (
              <BreakdownRow key={item.question.slug} item={item} index={i} topicTitle={topicTitles[item.question.topic]} />
            ))}
          </ol>
        </section>

        <section aria-labelledby="mock-weak" className="min-w-0">
          <SectionHeading id="mock-weak" title="Study next" icon={<TrendingDown aria-hidden />} />
          {weak.length === 0 ? (
            <Card className="flex flex-col items-center gap-2 p-4 text-center">
              <Trophy className="size-8" style={toneText("success")} aria-hidden />
              <p className="font-semibold">No weak spots this time</p>
              <p className="text-sm text-muted">Every topic averaged 4 or more. Try a harder difficulty next.</p>
            </Card>
          ) : (
            <ul className="space-y-3">
              {weak.map(({ topic, list, avg: topicAvg }) => (
                <li key={topic}>
                  <Card className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                        <TopicIcon slug={topic} className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold leading-snug">{topicTitles[topic] ?? topic}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          Average{" "}
                          <span className="font-medium tabular-nums" style={toneText(ratingTone(topicAvg))}>
                            {topicAvg.toFixed(1)}
                          </span>{" "}
                          over {list.length} {list.length === 1 ? "question" : "questions"}
                        </p>
                      </div>
                    </div>
                    <ul className="mt-3 space-y-1.5">
                      {[...list]
                        .sort((a, b) => a.rating - b.rating)
                        .map((item) => (
                          <li key={item.question.slug} className="flex items-center gap-2 text-sm">
                            <RatingDots rating={item.rating} />
                            <Link href={`/questions/${item.question.slug}`} className="min-w-0 flex-1 truncate hover:text-brand hover:underline">
                              {item.question.title}
                            </Link>
                          </li>
                        ))}
                    </ul>
                    <ButtonLink href={`/topics/${topic}`} size="sm" variant="soft" className="mt-3 w-full" leftIcon={<BookOpen aria-hidden />}>
                      Study {topicTitles[topic] ?? "this topic"}
                    </ButtonLink>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="border-border px-4 py-3 text-center odd:border-r sm:border-r sm:last:border-r-0 [&:nth-child(-n+2)]:border-b sm:[&:nth-child(-n+2)]:border-b-0">
      <dt className="flex items-center justify-center gap-1.5 text-xs text-muted [&_svg]:size-3.5">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums tracking-tight">{value}</dd>
    </div>
  );
}

function SaveBanner({ save, onRetry }: { save: SaveState; onRetry: () => void }) {
  if (save.status === "idle") return null;
  if (save.status === "saving") {
    return (
      <p className="flex items-center justify-center gap-2 text-sm text-muted md:justify-start" role="status">
        <LoaderCircle className="size-4 animate-spin" aria-hidden /> Saving your session…
      </p>
    );
  }
  if (save.status === "saved") {
    return (
      <p className="flex items-center justify-center gap-1.5 text-sm font-medium md:justify-start" style={toneText("success")} role="status">
        <CircleCheck className="size-4" aria-hidden /> Saved to your history and dashboard
      </p>
    );
  }
  if (save.status === "anonymous") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-brand/30 bg-brand-soft/40 p-3 text-sm sm:flex-row">
        <span className="flex items-center gap-2 text-left">
          <LogIn className="size-4 shrink-0 text-brand" aria-hidden />
          Log in to keep a history of your mock interviews and track your weak topics.
        </span>
        <ButtonLink href="/login?next=%2Fmock-interview" size="sm" className="shrink-0 sm:ml-auto">
          Log in
        </ButtonLink>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border px-3 py-2 text-sm sm:flex-row" style={toneStyle("danger")} role="alert">
      <span className="flex items-center gap-2">
        <CircleAlert className="size-4 shrink-0" aria-hidden />
        Couldn&apos;t save this session: {save.message}
      </span>
      <Button size="xs" variant="outline" onClick={onRetry} className="sm:ml-auto">
        Try again
      </Button>
    </div>
  );
}

function BreakdownRow({ item, index, topicTitle }: { item: MockRunItem; index: number; topicTitle?: string }) {
  const { question: q, rating, timeSec, revealed } = item;
  const suggested = KIND_MINUTES[q.kind] * 60;
  const scale = Math.max(suggested, timeSec, 1);
  const over = timeSec > suggested;
  const tone = ratingTone(rating);
  return (
    <li className="flex gap-3 px-4 py-3 sm:px-5">
      <span
        className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold tabular-nums"
        style={toneStyle(tone)}
        aria-hidden
      >
        {index + 1}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <Link href={`/questions/${q.slug}`} className="font-medium leading-snug hover:text-brand hover:underline">
            {q.title}
          </Link>
          <span className="flex shrink-0 items-center gap-2">
            <RatingDots rating={rating} />
            <span className="text-xs font-medium" style={toneText(tone)}>
              {RATING_LABELS[rating]}
            </span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <DifficultyBadge difficulty={q.difficulty} />
          <KindBadge kind={q.kind} />
          {topicTitle && <Badge variant="outline">{topicTitle}</Badge>}
          {revealed && (
            <Badge icon={<Eye aria-hidden />} title="You revealed the model answer">
              Revealed
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div
            className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-2"
            role="img"
            aria-label={`Time spent ${formatDuration(timeSec)} of ${formatDuration(suggested)} suggested`}
          >
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${(timeSec / scale) * 100}%`,
                backgroundColor: over ? "var(--viz-warning)" : "var(--brand)",
              }}
            />
            <span
              className="absolute inset-y-0 w-0.5 bg-foreground/40"
              style={{ left: `calc(${(suggested / scale) * 100}% - 1px)` }}
              aria-hidden
            />
          </div>
          <span className={cn("w-24 shrink-0 text-right text-xs tabular-nums text-muted")}>
            <span className="font-medium text-foreground" style={over ? toneText("warning") : undefined}>
              {formatDuration(timeSec)}
            </span>{" "}
            / {formatDuration(suggested)}
          </span>
        </div>
      </div>
    </li>
  );
}
