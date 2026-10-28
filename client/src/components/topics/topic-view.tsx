import type { ReactNode } from "react";
import Link from "next/link";
import { BookOpenText, Clock, Lightbulb, ListChecks, Mic, NotebookTabs, Play, Puzzle, Target } from "lucide-react";
import type { TopicDetailResponse } from "@/lib/types";
import { CATEGORY_LABELS, DIFFICULTIES, DIFFICULTY_LABELS, type AppLang } from "@/lib/constants";
import { getDictionary, type Dictionary } from "@/i18n/dictionary";
import { Breadcrumbs, Container, SectionHeading } from "@/components/layout/page";
import { Markdown } from "@/components/markdown";
import { CodeBlock } from "@/components/code-block";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DifficultyMixBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { TopicProgressSummary } from "@/components/topics/topic-progress";
import { TopicQuestionList } from "@/components/topics/topic-question-list";
import { TopicIcon } from "@/components/topics/topic-icon";

/** Topic page body: hero, overview, cheat sheet, patterns, filterable question list, sidebar. */
export function TopicView({
  data,
  dict: dictProp,
  lang = "en",
}: {
  data: TopicDetailResponse;
  dict?: Dictionary;
  lang?: AppLang;
}) {
  const dict = dictProp ?? getDictionary(lang);
  const { topic, questions } = data;
  const firstQuestion = questions[0];
  const sections = [
    { id: "overview", label: dict.topicView.overview, show: Boolean(topic.overview) },
    { id: "cheatsheet", label: dict.topicView.cheatsheet, show: topic.cheatsheet.length > 0 },
    { id: "patterns", label: dict.topicView.patterns, show: (topic.patterns?.length ?? 0) > 0 },
    { id: "questions", label: dict.topicView.questions, show: true },
  ].filter((s) => s.show);

  const categoryLabel = dict.categories.labels[topic.category] ?? CATEGORY_LABELS[topic.category];

  return (
    <div className="pb-12">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border bg-surface/60">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(60rem 20rem at 85% -10%, var(--brand-soft), transparent 70%), radial-gradient(30rem 16rem at 0% 120%, color-mix(in oklch, var(--viz-info) 12%, transparent), transparent 70%)",
          }}
        />
        <Container size="wide" className="relative py-5 sm:py-8">
          <Breadcrumbs items={[{ href: "/topics", label: dict.nav.topics }, { label: topic.title }]} />
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand text-brand-foreground shadow-lg shadow-brand/25">
                <TopicIcon slug={topic.slug} className="size-7" />
              </span>
              <div className="min-w-0 space-y-2">
                <Link
                  href={`/topics#${topic.category}`}
                  className="text-sm font-medium text-brand hover:underline"
                >
                  {categoryLabel}
                </Link>
                <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">{topic.title}</h1>
                <p className="max-w-2xl text-pretty text-sm text-muted sm:text-base">{topic.summary}</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2 lg:max-w-md lg:justify-end">
              {firstQuestion && (
                <ButtonLink href={`/questions/${firstQuestion.slug}`} leftIcon={<Play aria-hidden />}>
                  {dict.topicView.startPracticing}
                </ButtonLink>
              )}
              {topic.quizCount > 0 && (
                <ButtonLink href={`/quiz/${topic.slug}`} variant="outline" leftIcon={<Target aria-hidden />}>
                  {dict.topicView.takeQuiz}
                </ButtonLink>
              )}
              <ButtonLink
                href={`/mock-interview?topics=${encodeURIComponent(topic.slug)}`}
                variant="outline"
                leftIcon={<Mic aria-hidden />}
              >
                {dict.topicView.mockInterview}
              </ButtonLink>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={<ListChecks aria-hidden />} label={dict.topicView.questions} value={String(topic.questionCount)} />
            <Stat icon={<Target aria-hidden />} label={dict.topicView.quizMCQs} value={String(topic.quizCount)} />
            <Stat icon={<Clock aria-hidden />} label={dict.topicView.studyTime} value={`~${topic.estimatedHours}h`} />
            <div className="rounded-xl border border-border bg-surface px-4 py-3">
              <dt className="text-xs text-muted">{dict.topicView.difficultyMix}</dt>
              <dd className="mt-2">
                <DifficultyMixBar counts={topic.difficultyCounts} />
                <p className="mt-1.5 flex gap-2 text-xs text-muted">
                  {DIFFICULTIES.map((d) => (
                    <span key={d}>
                      {topic.difficultyCounts[d]} {DIFFICULTY_LABELS[d].toLowerCase()}
                    </span>
                  ))}
                </p>
              </dd>
            </div>
          </dl>
        </Container>
      </div>

      <Container size="wide" className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-8">
          {topic.overview && (
            <section aria-labelledby="overview">
              <SectionHeading id="overview" title={dict.topicView.overview} icon={<BookOpenText aria-hidden />} />
              <Card className="p-4 sm:p-5">
                <Markdown>{topic.overview}</Markdown>
              </Card>
            </section>
          )}

          {topic.cheatsheet.length > 0 && (
            <section aria-labelledby="cheatsheet">
              <SectionHeading
                id="cheatsheet"
                title={dict.topicView.cheatsheet}
                description={dict.topicView.cheatsheetDesc}
                icon={<NotebookTabs aria-hidden />}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                {topic.cheatsheet.map((block) => (
                  <Card key={block.title} className="p-4">
                    <h3 className="font-semibold">{block.title}</h3>
                    <ul className="mt-3 space-y-2">
                      {block.points.map((point) => (
                        <li key={point} className="flex gap-2.5 text-sm leading-relaxed text-foreground/85">
                          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                          <Markdown size="sm" className="text-foreground/85">
                            {point}
                          </Markdown>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {topic.patterns && topic.patterns.length > 0 && (
            <section aria-labelledby="patterns">
              <SectionHeading
                id="patterns"
                title={dict.topicView.patterns}
                description={dict.topicView.patternsDesc}
                icon={<Puzzle aria-hidden />}
              />
              <div className="space-y-4">
                {topic.patterns.map((p) => (
                  <Card key={p.name} className="overflow-hidden">
                    <div className="space-y-2 p-4">
                      <h3 className="font-semibold">{p.name}</h3>
                      <p className="flex items-start gap-2 text-sm text-muted">
                        <Lightbulb className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                        <span>
                          <span className="font-medium text-foreground">{dict.topicView.whenToUse} </span>
                          {p.whenToUse}
                        </span>
                      </p>
                    </div>
                    {p.template && (
                      <div className="border-t border-border p-3">
                        <CodeBlock
                          code={p.template.code}
                          language={p.template.language}
                          title={`Template · ${p.template.language}`}
                          showLineNumbers
                        />
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="questions">
            <SectionHeading
              id="questions"
              title={dict.topicView.questions}
              description={lang === "bn" ? "মৌলিক বিষয় থেকে জটিল বিষয় পর্যন্ত সাজানো। প্রতিটিতে হিন্ট, ভিজ্যুয়াল ওয়াকথ্রু এবং মডেল উত্তর রয়েছে।" : "Ordered from fundamentals to the harder follow-ups. Each has hints, a visual walkthrough and a model answer."}
              icon={<ListChecks aria-hidden />}
            />
            <Card className="mb-4 p-4 empty:hidden lg:hidden">
              <TopicProgressSummary slugs={questions.map((q) => q.slug)} title={topic.title} />
            </Card>
            {questions.length > 0 ? (
              <TopicQuestionList questions={questions} />
            ) : (
              <EmptyState compact title={lang === "bn" ? "প্রশ্ন তৈরি করা হচ্ছে" : "Questions are on their way"} description={lang === "bn" ? "এই টপিকের প্রশ্ন শীঘ্রই আসবে।" : "Content for this topic is being written."} />
            )}
          </section>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            <Card className="p-4">
              <TopicProgressSummary slugs={questions.map((q) => q.slug)} title={topic.title} />
              <div className="mt-4 grid gap-2 border-t border-border pt-4 first:mt-0 first:border-0 first:pt-0">
                {topic.quizCount > 0 && (
                  <ButtonLink href={`/quiz/${topic.slug}`} variant="soft" size="sm" leftIcon={<Target aria-hidden />}>
                    {dict.topicView.takeQuiz}
                  </ButtonLink>
                )}
                <ButtonLink
                  href={`/mock-interview?topics=${encodeURIComponent(topic.slug)}`}
                  variant="outline"
                  size="sm"
                  leftIcon={<Mic aria-hidden />}
                >
                  {dict.topicView.mockInterview}
                </ButtonLink>
              </div>
            </Card>
            <nav aria-label="On this page" className="px-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{dict.topicView.onThisPage}</p>
              <ul className="mt-3 space-y-1 border-l border-border">
                {sections.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="-ml-px block border-l border-transparent py-1 pl-3 text-sm text-muted transition-colors hover:border-brand hover:text-foreground"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </aside>
      </Container>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <dt className="flex items-center gap-1.5 text-xs text-muted [&_svg]:size-3.5">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums tracking-tight">{value}</dd>
    </div>
  );
}
