import type { Metadata } from "next";
import { cookies } from "next/headers";
import { api, orFallback } from "@/lib/api";
import { LANG_COOKIE, type AppLang } from "@/lib/constants";
import { getDictionary } from "@/i18n/dictionary";
import { filtersToApiQuery, parseQuestionFilters } from "@/lib/question-filters";
import { formatNumber } from "@/lib/utils";
import { Container, PageHeader } from "@/components/layout/page";
import { QuestionFilters } from "@/components/questions/question-filters";
import { QuestionResultsView } from "@/components/questions/question-results";
import { StatusFilteredResults } from "@/components/questions/status-filtered-results";

export const metadata: Metadata = {
  title: "Question bank",
  description:
    "Every interview question on HireReady — coding, concepts, SQL, design and behavioral — searchable and filterable, each with a model answer and visual walkthrough.",
};

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const cookieStore = await cookies();
  const lang: AppLang = cookieStore.get(LANG_COOKIE)?.value === "bn" ? "bn" : "en";
  const dict = getDictionary(lang);
  const filters = parseQuestionFilters(await searchParams);
  const [topics, results] = await Promise.all([
    orFallback(api.topics.list()),
    filters.status === "all" ? api.questions.list(filtersToApiQuery(filters)) : Promise.resolve(null),
  ]);

  return (
    <Container size="wide" className="pb-12">
      <PageHeader
        eyebrow={dict.questionsPage.eyebrow}
        title={dict.questionsPage.title}
        description={
          results && !filters.q && filters.topic.length + filters.difficulty.length + filters.kind.length + filters.frequency.length === 0
            ? dict.questionsPage.description.replace("{count}", formatNumber(results.total))
            : dict.questionsPage.descriptionFallback
        }
      />
      <QuestionFilters filters={filters} topics={topics?.items ?? []} dict={dict} lang={lang}>
        {results ? (
          <QuestionResultsView
            items={results.items}
            total={results.total}
            page={results.page}
            totalPages={results.totalPages}
            filters={filters}
            dict={dict}
            lang={lang}
          />
        ) : (
          <StatusFilteredResults filters={filters} dict={dict} lang={lang} />
        )}
      </QuestionFilters>
    </Container>
  );
}
