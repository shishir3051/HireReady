import { SearchX } from "lucide-react";
import type { QuestionSummary } from "@/lib/types";
import { questionsHref, QUESTIONS_PAGE_SIZE, type QuestionFilters } from "@/lib/question-filters";
import { formatNumber } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination, QuestionList, QuestionRow } from "./question-list";

export interface QuestionResultsViewProps {
  items: QuestionSummary[];
  total: number;
  page: number;
  totalPages: number;
  filters: QuestionFilters;
  /** shown in the count line, e.g. "solved" */
  qualifier?: string;
}

/** Count line + list + pagination for /questions (server or client rendered). */
export function QuestionResultsView({ items, total, page, totalPages, filters, qualifier }: QuestionResultsViewProps) {
  if (total === 0 || items.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title={page > 1 && total > 0 ? "This page is empty" : "No questions match these filters"}
        description="Try a different search term, remove a filter or browse a topic instead."
        action={
          <>
            <ButtonLink href="/questions" variant="outline" size="sm">
              Clear filters
            </ButtonLink>
            <ButtonLink href="/topics" variant="ghost" size="sm">
              Browse topics
            </ButtonLink>
          </>
        }
      />
    );
  }
  const from = (page - 1) * QUESTIONS_PAGE_SIZE + 1;
  const to = from + items.length - 1;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted" role="status">
        Showing <span className="font-medium text-foreground">{formatNumber(from)}–{formatNumber(to)}</span> of{" "}
        <span className="font-medium text-foreground">{formatNumber(total)}</span>
        {qualifier ? ` ${qualifier}` : ""} {total === 1 ? "question" : "questions"}
        {filters.q ? (
          <>
            {" "}
            for “<span className="text-foreground">{filters.q}</span>”
          </>
        ) : null}
      </p>
      <QuestionList>
        {items.map((q) => (
          <QuestionRow key={q.slug} question={q} />
        ))}
      </QuestionList>
      <Pagination
        page={page}
        totalPages={totalPages}
        hrefForPage={(p) => questionsHref({ ...filters, page: p })}
        className="pt-2"
      />
    </div>
  );
}
