"use client";

import type { Ref } from "react";
import { motion } from "motion/react";
import { ArrowRight, CircleCheck, CircleX, Flag, SkipForward } from "lucide-react";
import type { QuizQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/markdown";
import { CodeBlock } from "@/components/code-block";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DifficultyBadge, toneStyle, toneText } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { InlineText } from "./inline-text";

/** -1 = skipped, null = not answered yet */
export type QuizSelection = number | null;

export interface QuizQuestionCardProps {
  item: QuizQuestion;
  index: number;
  total: number;
  selected: QuizSelection;
  onSelect: (option: number) => void;
  onSkip: () => void;
  onContinue: () => void;
  headingRef?: Ref<HTMLHeadingElement>;
  continueRef?: Ref<HTMLButtonElement>;
}

/** One multiple-choice question: prompt, optional code, big option buttons, instant feedback. */
export function QuizQuestionCard({
  item,
  index,
  total,
  selected,
  onSelect,
  onSkip,
  onContinue,
  headingRef,
  continueRef,
}: QuizQuestionCardProps) {
  const answered = selected !== null;
  const correct = answered && selected === item.answer;
  const isLast = index === total - 1;
  const headingId = `quiz-q-${item.id}`;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-2/40 px-4 py-2.5 sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          Question <span className="tabular-nums text-foreground">{index + 1}</span> of{" "}
          <span className="tabular-nums">{total}</span>
        </p>
        <DifficultyBadge difficulty={item.difficulty} />
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <h2
          ref={headingRef}
          id={headingId}
          tabIndex={-1}
          className="text-pretty text-lg font-semibold leading-snug tracking-tight outline-none sm:text-xl"
        >
          <InlineText text={item.question} />
        </h2>

        {item.code && (
          <CodeBlock code={item.code.code} language={item.code.language} showLineNumbers copyable={false} maxHeight="22rem" />
        )}

        <ol className="grid gap-2" aria-labelledby={headingId}>
          {item.options.map((option, i) => {
            const isAnswer = i === item.answer;
            const isPicked = i === selected;
            const state = !answered ? "idle" : isAnswer ? "correct" : isPicked ? "wrong" : "dim";
            return (
              <li key={i}>
                <button
                  type="button"
                  disabled={answered}
                  onClick={() => onSelect(i)}
                  style={state === "correct" ? toneStyle("success") : state === "wrong" ? toneStyle("danger") : undefined}
                  className={cn(
                    "group flex min-h-12 w-full items-start gap-3 rounded-xl border-2 px-3.5 py-2.5 text-left text-[15px] leading-relaxed transition-[background-color,border-color,opacity,transform] duration-150",
                    state === "idle" &&
                      "border-border bg-surface hover:border-brand/50 hover:bg-brand-soft/40 active:scale-[0.995]",
                    state === "dim" && "border-border bg-surface opacity-55",
                    answered && "cursor-default",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-px grid size-7 shrink-0 place-items-center rounded-lg border font-mono text-xs font-semibold transition-colors",
                      state === "idle" && "border-border bg-surface-2 text-muted group-hover:border-brand/40 group-hover:text-brand",
                      state === "dim" && "border-border bg-surface-2 text-muted",
                      (state === "correct" || state === "wrong") && "border-current bg-transparent",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className={cn("min-w-0 flex-1 pt-0.5 [overflow-wrap:anywhere]", answered && "text-foreground")}>
                    <InlineText text={option} />
                  </span>
                  {state === "correct" && <CircleCheck className="mt-1 size-5 shrink-0" aria-hidden />}
                  {state === "wrong" && <CircleX className="mt-1 size-5 shrink-0" aria-hidden />}
                  {answered && (
                    <span className="sr-only">
                      {isAnswer ? "(correct answer)" : ""}
                      {isPicked ? "(your answer)" : ""}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>

        {answered && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="rounded-xl border p-4"
            style={toneStyle(correct ? "success" : selected === -1 ? "warning" : "danger")}
          >
            <p className="flex items-center gap-2 font-semibold">
              {correct ? (
                <CircleCheck className="size-5" aria-hidden />
              ) : selected === -1 ? (
                <Flag className="size-5" aria-hidden />
              ) : (
                <CircleX className="size-5" aria-hidden />
              )}
              {correct ? "Correct!" : selected === -1 ? "Skipped" : "Not quite"}
            </p>
            {!correct && (
              <p className="mt-2 text-sm text-foreground">
                <span className="font-medium">Answer {item.answer + 1}:</span>{" "}
                <InlineText text={item.options[item.answer] ?? ""} />
              </p>
            )}
            <Markdown size="sm" className="mt-2 text-foreground/90">
              {item.explanation}
            </Markdown>
          </motion.div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-2/40 px-4 py-2.5 sm:px-5">
        <p className="hidden items-center gap-1.5 text-xs text-muted sm:flex">
          {answered ? (
            <>
              <Kbd>Enter</Kbd> {isLast ? "to see your results" : "for the next question"}
            </>
          ) : (
            <>
              <Kbd>1</Kbd>–<Kbd>{Math.min(9, item.options.length)}</Kbd> to answer
            </>
          )}
        </p>
        <div className="ml-auto flex items-center gap-2">
          {!answered ? (
            <Button variant="ghost" size="sm" onClick={onSkip} leftIcon={<SkipForward aria-hidden />}>
              Skip
            </Button>
          ) : (
            <Button ref={continueRef} onClick={onContinue} rightIcon={<ArrowRight aria-hidden />}>
              {isLast ? "See results" : "Next question"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

/** Thin segmented bar: one segment per question, coloured by result. */
export function QuizProgress({
  items,
  answers,
  index,
}: {
  items: QuizQuestion[];
  answers: QuizSelection[];
  index: number;
}) {
  const answeredCount = answers.filter((a) => a !== null).length;
  const correctCount = answers.filter((a, i) => a !== null && a === items[i]?.answer).length;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          <span className="font-medium tabular-nums text-foreground">{answeredCount}</span> of{" "}
          <span className="tabular-nums">{items.length}</span> answered
        </span>
        <span className="inline-flex items-center gap-1 font-medium tabular-nums" style={toneText("success")}>
          <CircleCheck className="size-3.5" aria-hidden />
          {correctCount} correct
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Quiz progress"
        aria-valuemin={0}
        aria-valuemax={items.length}
        aria-valuenow={answeredCount}
        aria-valuetext={`${answeredCount} of ${items.length} answered, ${correctCount} correct`}
        className={cn("flex", items.length > 30 ? "gap-px" : "gap-1")}
      >
        {items.map((q, i) => {
          const a = answers[i];
          const color =
            a === null || a === undefined
              ? i === index
                ? "var(--brand)"
                : undefined
              : a === q.answer
                ? "var(--viz-success)"
                : a === -1
                  ? "var(--viz-warning)"
                  : "var(--viz-danger)";
          return (
            <span
              key={q.id}
              className={cn(
                "h-1.5 flex-1 rounded-full bg-surface-2 transition-colors duration-300",
                i === index && a === null && "animate-pulse",
              )}
              style={color ? { backgroundColor: color } : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
