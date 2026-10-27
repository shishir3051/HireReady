"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowRight,
  CircleAlert,
  Clock,
  ExternalLink,
  Eye,
  Flag,
  Lightbulb,
  NotebookPen,
  Pause,
  Play,
  Sparkles,
  Square,
  Timer,
  Waypoints,
} from "lucide-react";
import type { Question } from "@/lib/types";
import { cn, formatDuration } from "@/lib/utils";
import { VisualWalkthrough } from "@/components/visualizers";
import { Markdown } from "@/components/markdown";
import { CodeTabs } from "@/components/code-tabs";
import { Hints } from "@/components/question/hints";
import { KeyPoints } from "@/components/question/key-points";
import { Complexity, Constraints, Examples, SayThisFirst } from "@/components/question/question-sections";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { Badge, DifficultyBadge, KindBadge, toneStyle, toneText, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { ProgressRing } from "@/components/ui/progress-ring";
import { KIND_MINUTES } from "./constants";
import { RatingInput } from "./rating-input";

export interface MockRunItem {
  question: Question;
  rating: number;
  timeSec: number;
  revealed: boolean;
}

interface Run {
  notes: string;
  revealed: boolean;
  rating: number | null;
  /** committed time on this question (ms) */
  timeMs: number;
}

export interface MockSessionProps {
  questions: Question[];
  topicTitles: Record<string, string>;
  /** Date.now() when the session started (set by the start handler) */
  startedAt: number;
  /** all (or, when ended early, the rated) questions */
  onFinish: (items: MockRunItem[], endedEarly: boolean) => void;
  /** ended before rating anything */
  onDiscard: () => void;
}

type FocusTarget = "question" | "answer" | "rating" | null;

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** The interview itself: prompt, timers, scratch notes, reveal, mandatory self-rating, next. */
export function MockSessionView({ questions, topicTitles, startedAt, onFinish, onDiscard }: MockSessionProps) {
  const [index, setIndex] = useState(0);
  const [runs, setRuns] = useState<Run[]>(() =>
    questions.map(() => ({ notes: "", revealed: false, rating: null, timeMs: 0 })),
  );
  const [segmentStart, setSegmentStart] = useState<number | null>(startedAt);
  const [now, setNow] = useState(startedAt);
  const [ratingError, setRatingError] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const focusRef = useRef<FocusTarget>("question");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const answerRef = useRef<HTMLHeadingElement>(null);
  const ratingRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const paused = segmentStart === null;

  // Tick while running (timestamps keep it accurate even when the tab is throttled).
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [paused]);

  useEffect(() => {
    const target = focusRef.current;
    if (!target) return;
    focusRef.current = null;
    const behavior: ScrollBehavior = reducedMotion() ? "auto" : "smooth";
    if (target === "question") {
      headingRef.current?.focus({ preventScroll: true });
      const top = topRef.current?.getBoundingClientRect().top ?? 0;
      if (top < 0) window.scrollTo({ top: window.scrollY + top - 72, behavior });
    } else if (target === "answer") {
      answerRef.current?.focus({ preventScroll: true });
      answerRef.current?.scrollIntoView({ block: "start", behavior });
    } else {
      ratingRef.current?.querySelector<HTMLElement>('[role="radio"][tabindex="0"]')?.focus({ preventScroll: true });
      ratingRef.current?.scrollIntoView({ block: "center", behavior });
    }
  });

  const question = questions[index]!;
  const run = runs[index]!;
  const live = segmentStart !== null ? Math.max(0, now - segmentStart) : 0;
  const questionMs = run.timeMs + live;
  const totalMs = runs.reduce((s, r) => s + r.timeMs, 0) + live;
  const limitMs = KIND_MINUTES[question.kind] * 60_000;
  const remainingMs = limitMs - questionMs;
  const over = remainingMs < 0;
  const timerTone: Exclude<Tone, "neutral"> = over ? "danger" : remainingMs <= limitMs * 0.2 ? "warning" : "brand";
  const isLast = index === questions.length - 1;
  const ratedCount = runs.filter((r) => r.rating !== null).length;
  const jsCode = question.solution.code?.find((c) => c.language === "javascript")?.code;
  const timeNotice = over ? "Time's up for this question — start wrapping up." : remainingMs <= 60_000 ? "One minute left." : "";

  function commit(list: Run[], at: number): Run[] {
    if (segmentStart === null) return list;
    const add = Math.max(0, at - segmentStart);
    return list.map((r, i) => (i === index ? { ...r, timeMs: r.timeMs + add } : r));
  }

  function patchRun(patch: Partial<Run>) {
    setRuns((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function togglePause() {
    const t = Date.now();
    if (paused) {
      setSegmentStart(t);
    } else {
      setRuns((prev) => commit(prev, t));
      setSegmentStart(null);
    }
    setNow(t);
  }

  /** rated questions only (Next requires a rating, so a completed session includes every question) */
  function toItems(list: Run[]): MockRunItem[] {
    return list.flatMap((r, i) =>
      r.rating === null
        ? []
        : [{ question: questions[i]!, rating: r.rating, timeSec: Math.round(r.timeMs / 1000), revealed: r.revealed }],
    );
  }

  function next() {
    if (run.rating === null) {
      setRatingError(true);
      focusRef.current = "rating";
      return;
    }
    const t = Date.now();
    const committed = commit(runs, t);
    if (isLast) {
      onFinish(toItems(committed), false);
      return;
    }
    setRuns(committed);
    setIndex(index + 1);
    setSegmentStart(t);
    setNow(t);
    setRatingError(false);
    focusRef.current = "question";
  }

  function endNow() {
    setConfirmEnd(false);
    const committed = commit(runs, Date.now());
    const items = toItems(committed);
    if (items.length === 0) onDiscard();
    else onFinish(items, true);
  }

  return (
    <div ref={topRef} className="scroll-mt-20">
      {/* Session bar */}
      <div className="sticky top-14 z-30 -mx-4 mb-4 border-b border-border bg-background/90 px-4 py-2.5 backdrop-blur-lg sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted">
              Question <span className="tabular-nums text-foreground">{index + 1}</span> of{" "}
              <span className="tabular-nums">{questions.length}</span>
            </p>
            <div
              className="mt-1.5 flex gap-1"
              role="progressbar"
              aria-label="Interview progress"
              aria-valuemin={0}
              aria-valuemax={questions.length}
              aria-valuenow={index}
              aria-valuetext={`Question ${index + 1} of ${questions.length}`}
            >
              {questions.map((q, i) => (
                <span
                  key={q.slug}
                  className={cn("h-1.5 flex-1 rounded-full bg-surface-2 transition-colors duration-300")}
                  style={
                    i < index
                      ? { backgroundColor: "var(--viz-success)" }
                      : i === index
                        ? { backgroundColor: "var(--brand)" }
                        : undefined
                  }
                />
              ))}
            </div>
          </div>

          <div className="hidden items-center gap-1.5 text-sm text-muted md:flex" title="Total interview time">
            <Clock className="size-4" aria-hidden />
            <span className="sr-only">Total time</span>
            <span className="font-mono tabular-nums text-foreground" role="timer" aria-live="off">
              {formatDuration(totalMs / 1000)}
            </span>
          </div>

          <div className="flex items-center gap-2" title={`Suggested time for a ${question.kind} question: ${KIND_MINUTES[question.kind]} min`}>
            <ProgressRing
              value={Math.min(questionMs, limitMs)}
              max={limitMs}
              tone={timerTone}
              size={34}
              thickness={4}
              decorative
            >
              <Timer className="size-3.5" style={toneText(timerTone)} aria-hidden />
            </ProgressRing>
            <div className="leading-tight">
              <p className="font-mono text-sm font-semibold tabular-nums" style={over || timerTone === "warning" ? toneText(timerTone) : undefined} role="timer" aria-live="off">
                <span className="sr-only">Time left on this question: </span>
                {over ? `+${formatDuration(-remainingMs / 1000)}` : formatDuration(remainingMs / 1000)}
              </p>
              <p className="text-[11px] text-muted">{over ? "over time" : "left"}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={togglePause}
              aria-label={paused ? "Resume interview" : "Pause interview"}
              title={paused ? "Resume" : "Pause"}
            >
              {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmEnd(true)} leftIcon={<Square aria-hidden />}>
              <span className="hidden sm:inline">End</span>
              <span className="sr-only sm:hidden">End interview</span>
            </Button>
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {timeNotice}
        </p>
      </div>

      <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-5">
        <motion.div
          key={question.slug}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="min-w-0 space-y-4"
          inert={paused}
        >
          {/* Question */}
          <Card className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <DifficultyBadge difficulty={question.difficulty} />
              <KindBadge kind={question.kind} />
              <Badge variant="outline">{topicTitles[question.topic] ?? question.topic}</Badge>
              <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted">
                <Timer className="size-3.5" aria-hidden /> {KIND_MINUTES[question.kind]} min suggested
              </span>
            </div>
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="mt-3 text-balance text-xl font-semibold tracking-tight outline-none sm:text-2xl"
            >
              {question.title}
            </h2>
            <div className="mt-3 space-y-4">
              <Markdown>{question.prompt}</Markdown>
              {question.examples && question.examples.length > 0 && <Examples examples={question.examples} />}
              {question.constraints && question.constraints.length > 0 && <Constraints constraints={question.constraints} />}
            </div>
            {question.hints.length > 0 && !run.revealed && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <Lightbulb className="size-4 text-brand" aria-hidden /> Interviewer nudges
                </p>
                <Hints key={question.slug} hints={question.hints} />
              </div>
            )}
          </Card>

          {/* Scratch notes */}
          <Card className="p-4 sm:p-5">
            <label htmlFor={`notes-${question.slug}`} className="flex items-center gap-2 text-sm font-medium">
              <NotebookPen className="size-4 text-brand" aria-hidden /> Scratch notes
            </label>
            <p className="mt-1 text-xs text-muted">Private to this session — nothing is saved. Outline before you speak.</p>
            <Textarea
              id={`notes-${question.slug}`}
              value={run.notes}
              onChange={(e) => patchRun({ notes: e.target.value })}
              placeholder={
                question.kind === "behavioral"
                  ? "Situation…\nTask…\nAction…\nResult…"
                  : question.kind === "coding" || question.kind === "sql"
                    ? "Clarifying questions…\nBrute force…\nOptimise…\nEdge cases / tests…"
                    : "Definition…\nExample…\nTrade-offs…"
              }
              className="mt-3 min-h-36 font-mono text-[13px]"
              spellCheck={false}
            />
          </Card>

          {/* Model answer */}
          {!run.revealed ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface/60 px-4 py-6 text-center">
              <span className="grid size-11 place-items-center rounded-full bg-brand-soft text-brand">
                <Eye className="size-5" aria-hidden />
              </span>
              <div className="max-w-md space-y-1">
                <p className="font-semibold">Answer out loud first</p>
                <p className="text-sm text-muted">
                  Then compare with the model answer, its key points and the visual walkthrough before rating yourself.
                </p>
              </div>
              <Button
                variant="soft"
                onClick={() => {
                  patchRun({ revealed: true });
                  focusRef.current = "answer";
                }}
                leftIcon={<Eye aria-hidden />}
              >
                Reveal model answer
              </Button>
            </div>
          ) : (
            <motion.section
              aria-labelledby={`answer-${question.slug}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2
                  id={`answer-${question.slug}`}
                  ref={answerRef}
                  tabIndex={-1}
                  className="flex scroll-mt-32 items-center gap-2 text-lg font-semibold tracking-tight outline-none"
                >
                  <Sparkles className="size-5 text-brand" aria-hidden /> Model answer
                </h2>
                <a
                  href={`/questions/${question.slug}`}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                >
                  Full question page <ExternalLink className="size-3.5" aria-hidden />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </div>
              <SayThisFirst summary={question.solution.summary} />

              {question.solution.keyPoints.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">What the interviewer listens for</h3>
                  <KeyPoints key={question.slug} points={question.solution.keyPoints} />
                </div>
              )}

              {question.visuals.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-brand/30 bg-surface shadow-lg shadow-brand/5">
                  <div
                    className="flex items-center gap-2 border-b border-brand/20 px-4 py-2.5"
                    style={{
                      background:
                        "linear-gradient(90deg, color-mix(in oklch, var(--brand-soft) 90%, transparent), color-mix(in oklch, var(--viz-info) 10%, transparent))",
                    }}
                  >
                    <Waypoints className="size-4 text-brand" aria-hidden />
                    <h3 className="text-sm font-semibold">Visual walkthrough</h3>
                  </div>
                  <div className="p-3 sm:p-4">
                    <VisualWalkthrough key={question.slug} visuals={question.visuals} code={jsCode} />
                  </div>
                </div>
              )}

              <Accordion>
                <AccordionItem title="Full explanation & code" headingLevel={3}>
                  <div className="space-y-4 pb-1">
                    <Markdown size="sm">{question.solution.explanation}</Markdown>
                    {question.solution.code && question.solution.code.length > 0 && <CodeTabs snippets={question.solution.code} />}
                    {question.solution.complexity && <Complexity complexity={question.solution.complexity} />}
                  </div>
                </AccordionItem>
              </Accordion>
            </motion.section>
          )}
        </motion.div>

        {/* Rating + next */}
        <aside className="lg:sticky lg:top-32 lg:self-start" inert={paused}>
          <Card className="p-4">
            <p id={`rate-${question.slug}`} className="font-semibold">
              How did you do?
            </p>
            <p className="mt-0.5 text-xs text-muted">Rate yourself honestly — it drives your weak-topic list.</p>
            <div ref={ratingRef} className="mt-3">
              <RatingInput
                key={question.slug}
                label={`Self-rating for ${question.title}`}
                value={run.rating}
                onChange={(v) => {
                  patchRun({ rating: v });
                  setRatingError(false);
                }}
                invalid={ratingError}
                describedBy={ratingError ? `rate-error-${question.slug}` : undefined}
              />
            </div>
            {ratingError && (
              <p
                id={`rate-error-${question.slug}`}
                className="mt-1 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium"
                style={toneStyle("danger")}
                role="alert"
              >
                <CircleAlert className="size-3.5" aria-hidden /> Rate this answer before moving on.
              </p>
            )}
            <Button
              size="lg"
              variant={run.rating === null ? "secondary" : "primary"}
              className="mt-3 w-full"
              onClick={next}
              rightIcon={isLast ? <Flag aria-hidden /> : <ArrowRight aria-hidden />}
            >
              {isLast ? "Finish interview" : "Next question"}
            </Button>
            {run.rating === null && !ratingError && (
              <p className="mt-2 text-center text-xs text-muted">Pick a rating to continue</p>
            )}
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden /> On this question
              </span>
              <span className="font-mono tabular-nums text-foreground">{formatDuration(questionMs / 1000)}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs text-muted md:hidden">
              <span>Total</span>
              <span className="font-mono tabular-nums text-foreground">{formatDuration(totalMs / 1000)}</span>
            </div>
          </Card>
        </aside>

        {/* Paused overlay */}
        {paused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-20 flex items-start justify-center rounded-2xl bg-background/70 pt-12 backdrop-blur-md"
          >
            <Card className="mx-4 flex max-w-sm flex-col items-center gap-3 p-4 text-center shadow-xl">
              <span className="grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
                <Pause className="size-6" aria-hidden />
              </span>
              <p className="font-semibold">Interview paused</p>
              <p className="text-sm text-muted">The timers are stopped. Resume when you&apos;re ready.</p>
              <Button onClick={togglePause} leftIcon={<Play aria-hidden />} autoFocus>
                Resume
              </Button>
            </Card>
          </motion.div>
        )}
      </div>

      <Dialog
        open={confirmEnd}
        onOpenChange={setConfirmEnd}
        title="End the interview now?"
        description={
          ratedCount > 0
            ? `Your summary will include the ${ratedCount} ${ratedCount === 1 ? "question" : "questions"} you rated. Unrated questions are dropped.`
            : "You haven't rated any answers yet, so nothing will be saved."
        }
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmEnd(false)}>
              Keep going
            </Button>
            <Button variant="danger" onClick={endNow}>
              {ratedCount > 0 ? "End and see summary" : "Discard session"}
            </Button>
          </>
        }
      />
    </div>
  );
}
