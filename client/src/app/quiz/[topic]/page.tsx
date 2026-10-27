import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookOpen, Clock, ListChecks, ServerCrash, Target } from "lucide-react";
import { api, getErrorMessage, orNull } from "@/lib/api";
import type { QuizResponse } from "@/lib/types";
import { firstParam, titleFromSlug } from "@/lib/utils";
import { Breadcrumbs, Container } from "@/components/layout/page";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TopicIcon } from "@/components/topics/topic-icon";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { quizMinutes } from "@/components/quiz/score";

type Props = {
  params: Promise<{ topic: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { topic } = await params;
  try {
    const { items } = await api.quiz.list();
    const entry = items.find((q) => q.topic === topic);
    if (!entry) return { title: `${titleFromSlug(topic)} quiz` };
    return {
      title: `${entry.title} quiz`,
      description: `${entry.count} multiple-choice interview questions on ${entry.title}, with instant feedback and an explanation for every answer.`,
    };
  } catch {
    return { title: `${titleFromSlug(topic)} quiz` };
  }
}

export default async function QuizTopicPage({ params, searchParams }: Props) {
  const { topic } = await params;
  const shuffle = firstParam((await searchParams).shuffle) === "true";

  let data: QuizResponse | null = null;
  let error: unknown = null;
  try {
    data = await orNull(api.quiz.get(topic, { shuffle }));
  } catch (e) {
    error = e;
  }
  if (!error && !data) notFound();

  const title = data?.topic.title ?? titleFromSlug(topic);

  return (
    <Container size="narrow" className="pb-12 pt-4 sm:pt-5">
      <Breadcrumbs
        items={[
          { href: "/quiz", label: "Quiz" },
          { label: title },
        ]}
      />

      <header className="mb-5 mt-4 flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand text-brand-foreground shadow-lg shadow-brand/25">
          <TopicIcon slug={topic} className="size-6" />
        </span>
        <div className="min-w-0 space-y-1.5">
          <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">{title} quiz</h1>
          {data && data.items.length > 0 && (
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5">
                <ListChecks className="size-4" aria-hidden />
                {data.items.length} questions
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4" aria-hidden />~{quizMinutes(data.items.length)} min
              </span>
            </p>
          )}
        </div>
      </header>

      {error || !data ? (
        <EmptyState
          icon={ServerCrash}
          title="This quiz is unavailable right now"
          description={`We couldn't reach the HireReady API (${getErrorMessage(error)}). Please try again in a moment.`}
          action={
            <ButtonLink href={`/quiz/${topic}`} variant="outline" size="sm" prefetch={false}>
              Try again
            </ButtonLink>
          }
        />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No quiz questions for this topic yet"
          description="They are being written. Study the topic in the meantime."
          action={
            <ButtonLink href={`/topics/${topic}`} size="sm" leftIcon={<BookOpen aria-hidden />}>
              Study {title}
            </ButtonLink>
          }
        />
      ) : (
        <QuizRunner key={`${topic}:${shuffle}`} quiz={data} shuffledFromUrl={shuffle} />
      )}
    </Container>
  );
}
