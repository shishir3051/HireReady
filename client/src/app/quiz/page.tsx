import type { Metadata } from "next";
import { ServerCrash, Target } from "lucide-react";
import type { Category, QuizTopicSummary } from "@/lib/types";
import { api, getErrorMessage } from "@/lib/api";
import { CATEGORY_DESCRIPTIONS, CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/constants";
import { CATEGORY_ICONS } from "@/lib/icons";
import { formatNumber } from "@/lib/utils";
import { Container, PageHeader } from "@/components/layout/page";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { QuizOverview, QuizStatsProvider } from "@/components/quiz/quiz-stats";
import { QuizTopicCard } from "@/components/quiz/quiz-topic-card";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Quiz",
  description:
    "Multiple-choice quizzes for every interview topic with instant feedback and an explanation for each answer. Track your best score per topic.",
};

export default async function QuizPage() {
  let quizzes: QuizTopicSummary[] | null = null;
  let error: unknown = null;
  try {
    quizzes = (await api.quiz.list()).items;
  } catch (e) {
    error = e;
  }

  const header = (
    <PageHeader
      eyebrow="Quiz"
      title="Test yourself, one topic at a time"
      description={
        quizzes && quizzes.length > 0
          ? `${quizzes.length} topic quizzes · ${formatNumber(quizzes.reduce((s, q) => s + q.count, 0))} questions. Instant feedback with the reasoning behind every answer. Use the number keys to answer and Enter to continue.`
          : "Multiple-choice questions with instant feedback and the reasoning behind every answer."
      }
    />
  );

  if (!quizzes) {
    return (
      <Container className="pb-12">
        {header}
        <EmptyState
          icon={ServerCrash}
          title="Quizzes are unavailable right now"
          description={`We couldn't reach the HireReady API (${getErrorMessage(error)}). Please try again in a moment.`}
          action={
            <ButtonLink href="/quiz" variant="outline" size="sm" prefetch={false}>
              Try again
            </ButtonLink>
          }
        />
      </Container>
    );
  }

  if (quizzes.length === 0) {
    return (
      <Container className="pb-12">
        {header}
        <EmptyState
          icon={Target}
          title="No quizzes yet"
          description="Quiz questions are being written. In the meantime, practice with the question bank."
          action={
            <ButtonLink href="/questions" size="sm">
              Browse questions
            </ButtonLink>
          }
        />
      </Container>
    );
  }

  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    quizzes: quizzes.filter((q) => q.category === category),
  })).filter((g) => g.quizzes.length > 0);

  return (
    <QuizStatsProvider>
      <Container className="pb-12">
        {header}
        <div className="-mt-2 mb-5">
          <QuizOverview />
        </div>

        {groups.length > 1 && (
          <nav
            aria-label="Categories"
            className="sticky top-14 z-30 -mx-4 mb-5 border-b border-border bg-background/85 px-4 py-2.5 backdrop-blur-lg sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
          >
            <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
              {groups.map(({ category, quizzes: list }) => {
                const Icon = CATEGORY_ICONS[category];
                return (
                  <li key={category} className="shrink-0">
                    <a
                      href={`#${category}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-xs font-medium text-muted transition-colors hover:border-brand/40 hover:text-foreground"
                    >
                      <Icon className="size-3.5" aria-hidden />
                      {CATEGORY_LABELS[category]}
                      <span className="tabular-nums opacity-70">{list.length}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        <div className="space-y-8">
          {groups.map(({ category, quizzes: list }) => (
            <CategorySection key={category} category={category} quizzes={list} />
          ))}
        </div>
      </Container>
    </QuizStatsProvider>
  );
}

function CategorySection({ category, quizzes }: { category: Category; quizzes: QuizTopicSummary[] }) {
  const Icon = CATEGORY_ICONS[category];
  const questions = quizzes.reduce((s, q) => s + q.count, 0);
  return (
    <section aria-labelledby={`${category}-heading`} id={category} className="scroll-mt-28">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-surface text-brand">
            <Icon className="size-[18px]" aria-hidden />
          </span>
          <div>
            <h2 id={`${category}-heading`} className="text-lg font-semibold tracking-tight">
              {CATEGORY_LABELS[category]}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">{CATEGORY_DESCRIPTIONS[category]}</p>
          </div>
        </div>
        <p className="shrink-0 text-xs text-muted sm:text-right">
          {quizzes.length} {quizzes.length === 1 ? "quiz" : "quizzes"} · {questions} questions
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quizzes.map((q) => (
          <li key={q.topic}>
            <QuizTopicCard quiz={q} />
          </li>
        ))}
      </ul>
    </section>
  );
}
