import type { Metadata } from "next";
import { ServerCrash } from "lucide-react";
import type { Category, TopicSummary } from "@/lib/types";
import { api, getErrorMessage } from "@/lib/api";
import { CATEGORY_DESCRIPTIONS, CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/constants";
import { CATEGORY_ICONS } from "@/lib/icons";
import { formatNumber } from "@/lib/utils";
import { Container, PageHeader } from "@/components/layout/page";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TopicCard } from "@/components/topics/topic-card";
import { TopicsProgressProvider } from "@/components/topics/topic-progress";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Topics",
  description:
    "29 interview topics for new-grad software engineers: data structures & algorithms, CS fundamentals, web & languages, engineering practices and behavioral rounds.",
};

export default async function TopicsPage() {
  let topics: TopicSummary[] | null = null;
  let error: unknown = null;
  try {
    topics = (await api.topics.list()).items;
  } catch (e) {
    error = e;
  }

  if (!topics) {
    return (
      <Container className="pb-12">
        <PageHeader eyebrow="Topics" title="Everything you need for your first interview" />
        <EmptyState
          icon={ServerCrash}
          title="Topics are unavailable right now"
          description={`We couldn't reach the HireReady API (${getErrorMessage(error)}). Please try again in a moment.`}
          action={
            <ButtonLink href="/topics" variant="outline" size="sm" prefetch={false}>
              Try again
            </ButtonLink>
          }
        />
      </Container>
    );
  }

  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    topics: topics.filter((t) => t.category === category).sort((a, b) => a.order - b.order),
  })).filter((g) => g.topics.length > 0);

  const totalQuestions = topics.reduce((s, t) => s + t.questionCount, 0);
  const totalHours = topics.reduce((s, t) => s + t.estimatedHours, 0);

  return (
    <Container className="pb-12">
      <PageHeader
        eyebrow="Topics"
        title="Everything you need for your first interview"
        description={`${topics.length} topics · ${formatNumber(totalQuestions)} questions · about ${formatNumber(totalHours)} hours of focused study. Start with the fundamentals, then work through the patterns interviewers love.`}
      />

      <nav aria-label="Categories" className="sticky top-14 z-30 -mx-4 mb-5 border-b border-border bg-background/85 px-4 py-2.5 backdrop-blur-lg sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {groups.map(({ category, topics: list }) => {
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

      <TopicsProgressProvider>
        <div className="space-y-8">
          {groups.map(({ category, topics: list }) => (
            <CategorySection key={category} category={category} topics={list} />
          ))}
        </div>
      </TopicsProgressProvider>
    </Container>
  );
}

function CategorySection({ category, topics }: { category: Category; topics: TopicSummary[] }) {
  const Icon = CATEGORY_ICONS[category];
  const questions = topics.reduce((s, t) => s + t.questionCount, 0);
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
          {topics.length} topics · {questions} questions
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((t) => (
          <li key={t.slug}>
            <TopicCard topic={t} />
          </li>
        ))}
      </ul>
    </section>
  );
}
