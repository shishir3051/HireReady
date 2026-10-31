import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ServerCrash } from "lucide-react";
import type { Category, TopicSummary } from "@/lib/types";
import { api, getErrorMessage } from "@/lib/api";
import { CATEGORY_ORDER, LANG_COOKIE, type AppLang } from "@/lib/constants";
import { CATEGORY_ICONS } from "@/lib/icons";
import { getDictionary } from "@/i18n/dictionary";
import { formatNumber } from "@/lib/utils";
import { Container, PageHeader } from "@/components/layout/page";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TopicCard } from "@/components/topics/topic-card";
import { CategoryTabs } from "@/components/topics/category-tabs";
import { TopicsProgressProvider } from "@/components/topics/topic-progress";
import type { Dictionary } from "@/i18n/en";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Topics",
  description:
    "29 interview topics for new-grad software engineers: data structures & algorithms, CS fundamentals, web & languages, engineering practices and behavioral rounds.",
};

export default async function TopicsPage() {
  const cookieStore = await cookies();
  const lang: AppLang = cookieStore.get(LANG_COOKIE)?.value === "bn" ? "bn" : "en";
  const dict = getDictionary(lang);

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
        <PageHeader eyebrow={dict.nav.topics} title={dict.categories.title} />
        <EmptyState
          icon={ServerCrash}
          title={dict.common.error}
          description={`We couldn't reach the HireReady API (${getErrorMessage(error)}). Please try again in a moment.`}
          action={
            <ButtonLink href="/topics" variant="outline" size="sm" prefetch={false}>
              {dict.common.tryAgain}
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
    <Container size="wide" className="pb-12">
      <PageHeader
        eyebrow={dict.nav.topics}
        title={dict.categories.title}
        description={
          lang === "bn"
            ? `${topics.length}টি টপিক · ${formatNumber(totalQuestions)}টি প্রশ্ন · প্রায় ${formatNumber(totalHours)} ঘণ্টার ফোকাসড স্টাডি প্ল্যান। বেসিক দিয়ে শুরু করে ইন্টারভিউয়ারদের প্রিয় কমন প্যাটার্নগুলো আয়ত্ত করুন।`
            : `${topics.length} topics · ${formatNumber(totalQuestions)} questions · about ${formatNumber(totalHours)} hours of focused study. Start with the fundamentals, then work through the patterns interviewers love.`
        }
      />

      <CategoryTabs
        ariaLabel="Categories"
        items={groups.map(({ category, topics: list }) => ({
          category,
          label: dict.categories.labels[category] || category,
          count: list.length,
        }))}
      />

      <TopicsProgressProvider>
        <div className="space-y-8">
          {groups.map(({ category, topics: list }) => (
            <CategorySection key={category} category={category} topics={list} dict={dict} />
          ))}
        </div>
      </TopicsProgressProvider>
    </Container>
  );
}

function CategorySection({
  category,
  topics,
  dict,
}: {
  category: Category;
  topics: TopicSummary[];
  dict: Dictionary;
}) {
  const Icon = CATEGORY_ICONS[category];
  const questions = topics.reduce((s, t) => s + t.questionCount, 0);
  const label = dict.categories.labels[category] || category;
  const description = dict.categories.descriptions[category];

  return (
    <section aria-labelledby={`${category}-heading`} id={category} className="scroll-mt-28">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-surface text-brand">
            <Icon className="size-[18px]" aria-hidden />
          </span>
          <div>
            <h2 id={`${category}-heading`} className="text-lg font-semibold tracking-tight">
              {label}
            </h2>
            {description && <p className="mt-1 max-w-2xl xl:max-w-3xl text-sm text-muted">{description}</p>}
          </div>
        </div>
        <p className="shrink-0 text-xs text-muted sm:text-right">
          {topics.length} {dict.common.topics} · {questions} {dict.common.questions}
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {topics.map((t) => (
          <li key={t.slug}>
            <TopicCard topic={t} />
          </li>
        ))}
      </ul>
    </section>
  );
}
