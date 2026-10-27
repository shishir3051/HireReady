"use client";

import { useState, type ReactNode, type Ref } from "react";
import { motion } from "motion/react";
import {
  BookOpen,
  CircleAlert,
  CircleCheck,
  CircleX,
  Clock,
  Flag,
  LayoutGrid,
  LoaderCircle,
  LogIn,
  RotateCcw,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { QuizAttemptResult, QuizQuestion } from "@/lib/types";
import { cn, formatDuration } from "@/lib/utils";
import { Markdown } from "@/components/markdown";
import { CodeBlock } from "@/components/code-block";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, DifficultyBadge, toneStyle, toneText } from "@/components/ui/badge";
import { ProgressRing } from "@/components/ui/progress-ring";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineText } from "./inline-text";
import type { QuizSelection } from "./quiz-question";
import { scoreTone, scoreVerdict } from "./score";

export type SubmitState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "done"; result: QuizAttemptResult; previousBest: number | null }
  | { status: "error"; message: string };

export interface QuizResultsProps {
  topic: { slug: string; title: string };
  items: QuizQuestion[];
  answers: QuizSelection[];
  durationSec: number;
  submit: SubmitState;
  loggedIn: boolean;
  retrying: boolean;
  onRetry: () => void;
  onResubmit: () => void;
  headingRef?: Ref<HTMLHeadingElement>;
}

export function QuizResults({
  topic,
  items,
  answers,
  durationSec,
  submit,
  loggedIn,
  retrying,
  onRetry,
  onResubmit,
  headingRef,
}: QuizResultsProps) {
  const [filter, setFilter] = useState<"all" | "missed">("all");
  const rows = items.map((q, i) => {
    const selected = answers[i] ?? -1;
    return { q, i, selected, correct: selected === q.answer, skipped: selected === -1 };
  });
  const score = rows.filter((r) => r.correct).length;
  const skipped = rows.filter((r) => r.skipped).length;
  const wrong = rows.length - score - skipped;
  const pct = rows.length ? Math.round((score / rows.length) * 100) : 0;
  const tone = scoreTone(pct);
  const verdict = scoreVerdict(pct);
  const missed = rows.filter((r) => !r.correct);
  const visible = filter === "missed" ? missed : rows;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }}>
        <Card className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              background: `radial-gradient(40rem 14rem at 50% -20%, color-mix(in oklch, var(--viz-${tone}) 16%, transparent), transparent 70%)`,
            }}
          />
          <div className="relative flex flex-col items-center gap-4 p-4 text-center sm:p-6 md:flex-row md:items-center md:gap-6 md:text-left">
            <ProgressRing
              value={score}
              max={rows.length}
              tone={tone}
              size={148}
              thickness={12}
              label="Your score"
              valueText={`${score} of ${rows.length} correct, ${pct}%`}
            >
              <span className="text-4xl font-semibold tabular-nums tracking-tight">{pct}%</span>
              <span className="text-xs text-muted tabular-nums">
                {score}/{rows.length}
              </span>
            </ProgressRing>
            <div className="min-w-0 flex-1 space-y-3">
              <p className="text-sm font-medium text-brand">{topic.title} quiz</p>
              <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none sm:text-3xl">
                {verdict.title}
              </h2>
              <p className="max-w-xl text-pretty text-muted">{verdict.message}</p>
              <SaveStatus submit={submit} loggedIn={loggedIn} topicSlug={topic.slug} pct={pct} onResubmit={onResubmit} />
            </div>
          </div>
          <dl className="relative grid grid-cols-2 border-t border-border sm:grid-cols-4">
            <ResultStat icon={<CircleCheck aria-hidden />} label="Correct" value={score} tone="success" />
            <ResultStat icon={<CircleX aria-hidden />} label="Incorrect" value={wrong} tone="danger" />
            <ResultStat icon={<Flag aria-hidden />} label="Skipped" value={skipped} tone="warning" />
            <ResultStat icon={<Clock aria-hidden />} label="Time" value={formatDuration(durationSec)} />
          </dl>
        </Card>
      </motion.div>

      <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
        <Button onClick={onRetry} loading={retrying} leftIcon={<RotateCcw aria-hidden />} size="lg">
          Retry shuffled
        </Button>
        <ButtonLink href={`/topics/${topic.slug}`} variant="outline" size="lg" leftIcon={<BookOpen aria-hidden />}>
          Study this topic
        </ButtonLink>
        <ButtonLink href="/quiz" variant="ghost" size="lg" leftIcon={<LayoutGrid aria-hidden />}>
          All quizzes
        </ButtonLink>
      </div>

      <section aria-labelledby="quiz-review" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="quiz-review" className="text-base font-semibold tracking-tight sm:text-lg">
              Review your answers
            </h2>
            <p className="text-sm text-muted">Read the explanation for every question — especially the ones you got right by guessing.</p>
          </div>
          <SegmentedControl
            label="Show"
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: `All (${rows.length})` },
              { value: "missed", label: `Missed (${missed.length})`, disabled: missed.length === 0 },
            ]}
          />
        </div>

        {visible.length === 0 ? (
          <EmptyState compact icon={Trophy} title="Nothing missed" description="Every answer was correct. Nice work." />
        ) : (
          <ol className="space-y-4">
            {visible.map(({ q, i, selected, correct, skipped: isSkipped }) => (
              <li key={q.id}>
                <ReviewCard q={q} number={i + 1} selected={selected} correct={correct} skipped={isSkipped} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function ResultStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  tone?: "success" | "danger" | "warning";
}) {
  return (
    <div className="border-border px-4 py-3 text-center odd:border-r sm:border-r sm:last:border-r-0 [&:nth-child(-n+2)]:border-b sm:[&:nth-child(-n+2)]:border-b-0">
      <dt className="flex items-center justify-center gap-1.5 text-xs text-muted [&_svg]:size-3.5" style={tone ? toneText(tone) : undefined}>
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums tracking-tight">{value}</dd>
    </div>
  );
}

function SaveStatus({
  submit,
  loggedIn,
  topicSlug,
  pct,
  onResubmit,
}: {
  submit: SubmitState;
  loggedIn: boolean;
  topicSlug: string;
  pct: number;
  onResubmit: () => void;
}) {
  const next = encodeURIComponent(`/quiz/${topicSlug}`);
  if (submit.status === "idle" || submit.status === "saving") {
    return (
      <p className="flex items-center justify-center gap-2 text-sm text-muted md:justify-start" role="status">
        <LoaderCircle className="size-4 animate-spin" aria-hidden /> Checking your answers…
      </p>
    );
  }
  if (submit.status === "error") {
    return (
      <div
        className="flex flex-col items-center gap-2 rounded-lg border px-3 py-2 text-sm sm:flex-row md:items-center"
        style={toneStyle("danger")}
        role="alert"
      >
        <span className="flex items-center gap-2">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          Your score couldn&apos;t be saved: {submit.message}
        </span>
        <Button size="xs" variant="outline" onClick={onResubmit} className="sm:ml-auto">
          Try again
        </Button>
      </div>
    );
  }
  const { result, previousBest } = submit;
  if (!result.saved) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-brand/30 bg-brand-soft/40 p-3 text-sm sm:flex-row md:items-center">
        <span className="flex items-center gap-2 text-left">
          <LogIn className="size-4 shrink-0 text-brand" aria-hidden />
          {loggedIn ? "Your session expired — log in again to save this score." : "Log in to save your score and track your best per topic."}
        </span>
        <span className="flex shrink-0 gap-2 sm:ml-auto">
          <ButtonLink href={`/login?next=${next}`} size="sm">
            Log in
          </ButtonLink>
          {!loggedIn && (
            <ButtonLink href={`/register?next=${next}`} size="sm" variant="outline">
              Sign up
            </ButtonLink>
          )}
        </span>
      </div>
    );
  }
  const isBest = previousBest === null || pct > previousBest;
  return (
    <p className="flex flex-wrap items-center justify-center gap-2 text-sm md:justify-start" role="status">
      <span className="inline-flex items-center gap-1.5 font-medium" style={toneText("success")}>
        <CircleCheck className="size-4" aria-hidden /> Saved to your dashboard
      </span>
      {isBest && pct > 0 && (
        <Badge tone="brand" icon={<Sparkles aria-hidden />}>
          {previousBest === null ? "First score on this topic" : `New best (was ${previousBest}%)`}
        </Badge>
      )}
    </p>
  );
}

function ReviewCard({
  q,
  number,
  selected,
  correct,
  skipped,
}: {
  q: QuizQuestion;
  number: number;
  selected: number;
  correct: boolean;
  skipped: boolean;
}) {
  const tone = correct ? "success" : skipped ? "warning" : "danger";
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <span
          className="grid size-8 shrink-0 place-items-center rounded-full border text-xs font-semibold tabular-nums"
          style={toneStyle(tone)}
          aria-hidden
        >
          {number}
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="min-w-0 flex-1 font-medium leading-snug">
              <span className="sr-only">
                Question {number}, {correct ? "correct" : skipped ? "skipped" : "incorrect"}:{" "}
              </span>
              <InlineText text={q.question} />
            </h3>
            <DifficultyBadge difficulty={q.difficulty} />
          </div>
          {q.code && <CodeBlock code={q.code.code} language={q.code.language} copyable={false} maxHeight="16rem" />}
          <ul className="space-y-1.5 text-sm">
            {q.options.map((option, i) => {
              const isAnswer = i === q.answer;
              const isPicked = i === selected;
              if (!isAnswer && !isPicked) return null;
              return (
                <li
                  key={i}
                  className="flex items-start gap-2 rounded-lg border px-3 py-2"
                  style={toneStyle(isAnswer ? "success" : "danger")}
                >
                  {isAnswer ? (
                    <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
                  ) : (
                    <CircleX className="mt-0.5 size-4 shrink-0" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1 text-foreground [overflow-wrap:anywhere]">
                    <InlineText text={option} />
                  </span>
                  <span className="shrink-0 text-xs font-medium">
                    {isAnswer && isPicked ? "Your answer" : isAnswer ? "Correct answer" : "Your answer"}
                  </span>
                </li>
              );
            })}
            {skipped && (
              <li className={cn("flex items-center gap-2 px-1 text-xs")} style={toneText("warning")}>
                <Flag className="size-3.5" aria-hidden /> You skipped this one
              </li>
            )}
          </ul>
          <Markdown size="sm" className="text-muted">
            {q.explanation}
          </Markdown>
        </div>
      </div>
    </Card>
  );
}
