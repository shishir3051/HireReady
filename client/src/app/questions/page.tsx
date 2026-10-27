import type { Metadata } from "next";
import { api, orFallback } from "@/lib/api";
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
  const filters = parseQuestionFilters(await searchParams);
  const [topics, results] = await Promise.all([
    orFallback(api.topics.list()),
    filters.status === "all" ? api.questions.list(filtersToApiQuery(filters)) : Promise.resolve(null),
  ]);

  return (
    <Container className="pb-12">
      <PageHeader
        eyebrow="Question bank"
        title="Practice the questions juniors actually get asked"
        description={
          results && !filters.q && filters.topic.length + filters.difficulty.length + filters.kind.length + filters.frequency.length === 0
            ? `${formatNumber(results.total)} questions across DSA, CS fundamentals, web, system design and behavioral rounds — each with a model answer and a visual walkthrough.`
            : "Coding, concept, SQL, design and behavioral questions — each with a model answer and a visual walkthrough."
        }
      />
      <QuestionFilters filters={filters} topics={topics?.items ?? []}>
        {results ? (
          <QuestionResultsView
            items={results.items}
            total={results.total}
            page={results.page}
            totalPages={results.totalPages}
            filters={filters}
          />
        ) : (
          <StatusFilteredResults filters={filters} />
        )}
      </QuestionFilters>
    </Container>
  );
}
