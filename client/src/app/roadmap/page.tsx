import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Map as MapIcon, ServerCrash } from "lucide-react";
import { api, getErrorMessage, orFallback, orNull } from "@/lib/api";
import type { Roadmap } from "@/lib/types";
import { LANG_COOKIE, type AppLang } from "@/lib/constants";
import { getDictionary } from "@/i18n/dictionary";
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
  const cookieStore = await cookies();
  const lang: AppLang = cookieStore.get(LANG_COOKIE)?.value === "bn" ? "bn" : "en";
  const dict = getDictionary(lang);

  let roadmap: Roadmap | null = null;
  let error: unknown = null;
  try {
    roadmap = await orNull(api.roadmap.get());
  } catch (e) {
    error = e;
  }

  if (!roadmap) {
    return (
      <Container size="wide" className="pb-12">
        <PageHeader eyebrow={dict.roadmapPage.eyebrow} title={dict.roadmapPage.title} />
        {error ? (
          <EmptyState
            icon={ServerCrash}
            title={dict.roadmapPage.unavailableTitle}
            description={`We couldn't reach the HireReady API (${getErrorMessage(error)}). Please try again in a moment.`}
            action={
              <ButtonLink href="/roadmap" variant="outline" size="sm" prefetch={false}>
                {dict.common.tryAgain}
              </ButtonLink>
            }
          />
        ) : (
          <EmptyState
            icon={MapIcon}
            title={dict.roadmapPage.notPublishedTitle}
            description={dict.roadmapPage.notPublishedDesc}
            action={
              <>
                <ButtonLink href="/topics" size="sm">
                  {dict.roadmapPage.browseTopics}
                </ButtonLink>
                <ButtonLink href="/questions" size="sm" variant="outline">
                  {dict.hero.ctaSecondary}
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
    <Container size="wide">
      <RoadmapView roadmap={roadmap} questions={questions ?? {}} topicTitles={topicTitles} lang={lang} />
    </Container>
  );
}
