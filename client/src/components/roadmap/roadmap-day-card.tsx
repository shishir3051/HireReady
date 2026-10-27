"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Check, CircleCheck, Clock, Target } from "lucide-react";
import type { ProgressStatus, RoadmapDay } from "@/lib/types";
import { DIFFICULTY_LABELS } from "@/lib/constants";
import { cn, titleFromSlug } from "@/lib/utils";
import { Badge, toneText } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusGlyph } from "@/components/questions/progress-controls";
import { TopicIcon } from "@/components/topics/topic-icon";
import type { QuestionIndex } from "@/components/dashboard/question-index";

export interface RoadmapDayCardProps {
  day: RoadmapDay;
  done: boolean;
  upNext: boolean;
  /** progress has loaded (hide personal state until then) */
  ready: boolean;
  questions: QuestionIndex;
  topicTitles: Record<string, string>;
  status: (slug: string) => ProgressStatus;
  onToggle: (day: number) => void;
}

export function RoadmapDayCard({ day, done, upNext, ready, questions, topicTitles, status, onToggle }: RoadmapDayCardProps) {
  const solved = ready ? day.questionSlugs.filter((s) => status(s) === "solved").length : 0;
  const titleId = `day-${day.day}-title`;
  return (
    <article
      id={`day-${day.day}`}
      aria-labelledby={titleId}
      className={cn(
        "relative flex h-full scroll-mt-32 flex-col rounded-xl border bg-surface p-4 shadow-xs transition-[border-color,box-shadow] duration-300",
        upNext ? "border-brand/50 shadow-lg shadow-brand/10 ring-2 ring-brand/25" : "border-border",
      )}
      style={done ? { borderColor: "color-mix(in oklch, var(--viz-success) 40%, var(--border))" } : undefined}
    >
      <header className="flex items-start gap-3">
        <span
          className={cn(
            "relative grid size-12 shrink-0 place-items-center rounded-xl text-center leading-none transition-colors duration-300",
            done ? "text-brand-foreground" : upNext ? "bg-brand text-brand-foreground" : "bg-surface-2 text-foreground",
          )}
          style={done ? { backgroundColor: "var(--viz-success)" } : undefined}
          aria-hidden
        >
          {done ? (
            <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", bounce: 0.5, duration: 0.4 }}>
              <Check className="size-6" strokeWidth={3} />
            </motion.span>
          ) : (
            <span>
              <span className="block text-[10px] font-medium uppercase tracking-wider opacity-75">Day</span>
              <span className="block text-lg font-semibold tabular-nums">{day.day}</span>
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={titleId} className="font-semibold leading-snug">
            <span className="sr-only">Day {day.day}: </span>
            {day.title}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />~{day.estimatedHours}h
            </span>
            <span>
              {day.questionSlugs.length} {day.questionSlugs.length === 1 ? "question" : "questions"}
            </span>
            {done && (
              <span className="inline-flex items-center gap-1 font-medium" style={toneText("success")}>
                <CircleCheck className="size-3.5" aria-hidden /> Done
              </span>
            )}
          </p>
        </div>
        {upNext && (
          <Badge tone="brand" variant="solid" className="shrink-0">
            Up next
          </Badge>
        )}
      </header>

      {day.topics.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Topics">
          {day.topics.map((t) => (
            <li key={t}>
              <Link
                href={`/topics/${t}`}
                className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-surface-2/60 px-2.5 text-xs font-medium text-foreground/80 transition-colors hover:border-brand/40 hover:text-brand"
              >
                <TopicIcon slug={t} className="size-3.5" />
                {topicTitles[t] ?? titleFromSlug(t)}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {day.goals.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Goals</p>
          <ul className="mt-1.5 space-y-1">
            {day.goals.map((g) => (
              <li key={g} className="flex gap-2 text-sm leading-snug text-foreground/85">
                <Target className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {day.questionSlugs.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Practice</p>
            {ready && (
              <span className="text-xs tabular-nums text-muted">
                {solved}/{day.questionSlugs.length} solved
              </span>
            )}
          </div>
          <ul className="mt-1.5 space-y-0.5">
            {day.questionSlugs.map((slug) => {
              const q = questions[slug];
              const s = ready ? status(slug) : "todo";
              return (
                <li key={slug}>
                  <Link
                    href={`/questions/${slug}`}
                    className="group -mx-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-surface-2/70"
                  >
                    <StatusGlyph status={s} className="size-4" />
                    <span className={cn("min-w-0 flex-1 truncate group-hover:text-brand", s === "solved" && "text-muted")}>
                      {q?.title ?? titleFromSlug(slug)}
                    </span>
                    {q && (
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: `var(--${q.difficulty})` }}
                        title={DIFFICULTY_LABELS[q.difficulty]}
                        aria-hidden
                      />
                    )}
                    <span className="sr-only">
                      {q ? `, ${DIFFICULTY_LABELS[q.difficulty]}` : ""}
                      {ready && s !== "todo" ? `, ${s}` : ""}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-auto pt-4">
        <Button
          variant={done ? "ghost" : upNext ? "primary" : "outline"}
          size="sm"
          className="w-full"
          onClick={() => onToggle(day.day)}
          leftIcon={done ? <CircleCheck aria-hidden style={toneText("success")} /> : <Check aria-hidden />}
        >
          {done ? (
            <>
              Completed<span className="text-muted"> · undo</span>
              <span className="sr-only"> day {day.day}</span>
            </>
          ) : (
            `Mark day ${day.day} complete`
          )}
        </Button>
      </div>
    </article>
  );
}
