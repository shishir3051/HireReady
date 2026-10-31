import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ServerCrash, Target } from "lucide-react";
import type { Category, QuizTopicSummary } from "@/lib/types";
import { api, getErrorMessage } from "@/lib/api";
import { CATEGORY_ORDER, LANG_COOKIE, type AppLang } from "@/lib/constants";
import { getDictionary } from "@/i18n/dictionary";
import type { Dictionary } from "@/i18n/en";
import { CATEGORY_ICONS } from "@/lib/icons";
import { formatNumber } from "@/lib/utils";
import { Container, PageHeader } from "@/components/layout/page";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { QuizOverview, QuizStatsProvider } from "@/components/quiz/quiz-stats";
import { QuizTopicCard } from "@/components/quiz/quiz-topic-card";
import { CategoryTabs } from "@/components/topics/category-tabs";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Quiz",
  description:
    "Multiple-choice quizzes for every interview topic with instant feedback and an explanation for each answer. Track your best score per topic.",
};

export default async function QuizPage() {
  const cookieStore = await cookies();
  const lang: AppLang = cookieStore.get(LANG_COOKIE)?.value === "bn" ? "bn" : "en";
  const dict = getDictionary(lang);

  let quizzes: QuizTopicSummary[] | null = null;
  let error: unknown = null;
  try {
    quizzes = (await api.quiz.list()).items;
  } catch (e) {
    error = e;
  }

  const header = (
    <PageHeader
      eyebrow={dict.quizPage.eyebrow}
      title={dict.quizPage.title}
      description={
        quizzes && quizzes.length > 0
          ? dict.quizPage.description
              .replace("{quizzes}", String(quizzes.length))
              .replace("{questions}", formatNumber(quizzes.reduce((s, q) => s + q.count, 0)))
          : dict.quizPage.descriptionFallback
      }
    />
  );

  if (!quizzes) {
    return (
      <Container size="wide" className="pb-12">
        {header}
        <EmptyState
          icon={ServerCrash}
          title={dict.quizPage.quizzesUnavailable}
          description={`We couldn't reach the HireReady API (${getErrorMessage(error)}). Please try again in a moment.`}
          action={
            <ButtonLink href="/quiz" variant="outline" size="sm" prefetch={false}>
              {dict.quizPage.tryAgain}
            </ButtonLink>
          }
        />
      </Container>
    );
  }

  if (quizzes.length === 0) {
    return (
      <Container size="wide" className="pb-12">
        {header}
        <EmptyState
          icon={Target}
          title={dict.quizPage.emptyTitle}
          description={dict.quizPage.emptyDesc}
          action={
            <ButtonLink href="/questions" size="sm">
              {dict.quizPage.browseQuestions}
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
      <Container size="wide" className="pb-12">
        {header}
        <div className="-mt-2 mb-5">
          <QuizOverview />
        </div>

        {groups.length > 1 && (
          <CategoryTabs
            ariaLabel={dict.quizPage.categoriesNav}
            items={groups.map(({ category, quizzes: list }) => ({
              category,
              label: dict.categories.labels[category] ?? category,
              count: list.length,
            }))}
          />
        )}

        <div className="space-y-8">
          {groups.map(({ category, quizzes: list }) => (
            <CategorySection key={category} category={category} quizzes={list} dict={dict} lang={lang} />
          ))}
        </div>
      </Container>
    </QuizStatsProvider>
  );
}

function CategorySection({
  category,
  quizzes,
  dict,
  lang,
}: {
  category: Category;
  quizzes: QuizTopicSummary[];
  dict: Dictionary;
  lang: AppLang;
}) {
  const Icon = CATEGORY_ICONS[category];
  const questions = quizzes.reduce((s, q) => s + q.count, 0);
  const catLabel = dict.categories.labels[category] ?? category;
  const catDesc = dict.categories.descriptions[category] ?? "";
  const countLabel =
    lang === "bn"
      ? `${quizzes.length}টি কুইজ · ${questions}টি প্রশ্ন`
      : `${quizzes.length} ${quizzes.length === 1 ? dict.quizPage.quizSingular : dict.quizPage.quizPlural} · ${questions} ${dict.quizPage.questionsLabel}`;

  return (
    <section aria-labelledby={`${category}-heading`} id={category} className="scroll-mt-28">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-surface text-brand">
            <Icon className="size-[18px]" aria-hidden />
          </span>
          <div>
            <h2 id={`${category}-heading`} className="text-lg font-semibold tracking-tight">
              {catLabel}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">{catDesc}</p>
          </div>
        </div>
        <p className="shrink-0 text-xs text-muted sm:text-right">{countLabel}</p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {quizzes.map((q) => (
          <li key={q.topic}>
            <QuizTopicCard quiz={q} />
          </li>
        ))}
      </ul>
    </section>
  );
}
