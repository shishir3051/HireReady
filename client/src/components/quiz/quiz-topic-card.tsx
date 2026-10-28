"use client";

import Link from "next/link";
import { Clock, ListChecks } from "lucide-react";
import type { QuizTopicSummary } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { TopicIcon } from "@/components/topics/topic-icon";
import { useLanguage } from "@/components/providers";
import { QuizBestScore } from "./quiz-stats";
import { quizMinutes } from "./score";

/** Topic tile on /quiz. The whole card links to the quiz; the best score loads on the client. */
export function QuizTopicCard({ quiz }: { quiz: QuizTopicSummary }) {
  const { lang } = useLanguage();
  return (
    <Card interactive className="group relative flex h-full flex-col p-4">
      <div className="flex items-start gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand transition-transform duration-300 group-hover:scale-105">
          <TopicIcon slug={quiz.topic} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-snug">
            <Link
              href={`/quiz/${quiz.topic}`}
              className="outline-none after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"
            >
              {quiz.title}
            </Link>
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <ListChecks className="size-3.5" aria-hidden />
              {lang === "bn" ? `${quiz.count}টি প্রশ্ন` : `${quiz.count} ${quiz.count === 1 ? "question" : "questions"}`}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />~{quizMinutes(quiz.count)} {lang === "bn" ? "মিনিট" : "min"}
            </span>
          </p>
        </div>
      </div>
      <div className="mt-auto pt-4">
        <QuizBestScore topic={quiz.topic} title={quiz.title} />
      </div>
    </Card>
  );
}
