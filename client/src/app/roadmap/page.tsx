import type { Metadata } from "next";
import { Map as MapIcon, ServerCrash } from "lucide-react";
import { api, getErrorMessage, orFallback, orNull } from "@/lib/api";
import type { Roadmap } from "@/lib/types";
import { Container, PageHeader } from "@/components/layout/page";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { fetchQuestionIndex } from "@/components/dashboard/question-index";
import { RoadmapView } from "@/components/roadmap/roadmap-view";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "30-Day Roadmap",
  description:
    "A day-by-day interview study plan for new graduates: DSA patterns, CS fundamentals, the web stack and behavioral answers, with practice questions for every day.",
};

export default async function RoadmapPage() {
  let roadmap: Roadmap | null = null;
  let error: unknown = null;
  try {
    roadmap = await orNull(api.roadmap.get());
  } catch (e) {
    error = e;
  }

  if (!roadmap) {
    return (
      <Container className="pb-12">
        <PageHeader eyebrow="Roadmap" title="30-day interview roadmap" />
        {error ? (
          <EmptyState
            icon={ServerCrash}
            title="The roadmap is unavailable right now"
            description={`We couldn't reach the HireReady API (${getErrorMessage(error)}). Please try again in a moment.`}
            action={
              <ButtonLink href="/roadmap" variant="outline" size="sm" prefetch={false}>
                Try again
              </ButtonLink>
            }
          />
        ) : (
          <EmptyState
            icon={MapIcon}
            title="The roadmap hasn't been published yet"
            description="The day-by-day plan is still being put together. Start with the topics in order — they follow the same path."
            action={
              <>
                <ButtonLink href="/topics" size="sm">
                  Browse topics
                </ButtonLink>
                <ButtonLink href="/questions" size="sm" variant="outline">
                  Practice questions
                </ButtonLink>
              </>
            }
          />
        )}
      </Container>
    );
  }

  const slugs = new Set(roadmap.days.flatMap((d) => d.questionSlugs));
  const [questions, topics] = await Promise.all([orFallback(fetchQuestionIndex(slugs)), orFallback(api.topics.list())]);
  const topicTitles = Object.fromEntries((topics?.items ?? []).map((t) => [t.slug, t.title]));

  return (
    <Container>
      <RoadmapView roadmap={roadmap} questions={questions ?? {}} topicTitles={topicTitles} />
    </Container>
  );
}
