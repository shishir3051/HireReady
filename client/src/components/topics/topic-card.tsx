"use client";

import Link from "next/link";
import { ArrowUpRight, Clock, ListChecks, Target } from "lucide-react";
import type { TopicSummary } from "@/lib/types";
import { useT } from "@/components/providers";
import { Card } from "@/components/ui/card";
import { DifficultyMixBar } from "@/components/ui/progress-bar";
import { TopicCardProgress } from "./topic-progress";
import { TopicIcon } from "./topic-icon";

/** Topic tile for /topics and the landing page. Whole card is the link. */
export function TopicCard({ topic }: { topic: TopicSummary }) {
  const t = useT();

  return (
    <Card interactive className="group relative flex h-full flex-col p-4">
      <div className="flex items-start gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand transition-transform duration-300 group-hover:scale-105">
          <TopicIcon slug={topic.slug} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-snug">
            <Link
              href={`/topics/${topic.slug}`}
              className="outline-none after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"
            >
              {topic.title}
            </Link>
          </h3>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">{topic.summary}</p>
        </div>
        <ArrowUpRight
          className="size-4 shrink-0 text-muted opacity-0 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand group-hover:opacity-100"
          aria-hidden
        />
      </div>

      <div className="mt-auto space-y-3 pt-4">
        <DifficultyMixBar counts={topic.difficultyCounts} />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <ListChecks className="size-3.5" aria-hidden />
            {topic.questionCount} {t.common.questions}
          </span>
          {topic.quizCount > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Target className="size-3.5" aria-hidden />
              {topic.quizCount} MCQs
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden />~{topic.estimatedHours} {t.common.hours}
          </span>
          <span className="ml-auto inline-flex items-center gap-2" aria-hidden>
            {(["easy", "medium", "hard"] as const).map((d) =>
              topic.difficultyCounts[d] ? (
                <span key={d} className="inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: `var(--${d})` }} />
                  {topic.difficultyCounts[d]}
                </span>
              ) : null,
            )}
          </span>
        </div>

        <TopicCardProgress slug={topic.slug} total={topic.questionCount} title={topic.title} />
      </div>
    </Card>
  );
}
