import { SearchX } from "lucide-react";
import type { QuestionSummary } from "@/lib/types";
import { questionsHref, QUESTIONS_PAGE_SIZE, type QuestionFilters } from "@/lib/question-filters";
import { formatNumber } from "@/lib/utils";
import { getDictionary, type Dictionary } from "@/i18n/dictionary";
import type { AppLang } from "@/lib/constants";
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
  dict?: Dictionary;
  lang?: AppLang;
}

/** Count line + list + pagination for /questions (server or client rendered). */
export function QuestionResultsView({
  items,
  total,
  page,
  totalPages,
  filters,
  qualifier,
  dict: dictProp,
  lang: langProp,
}: QuestionResultsViewProps) {
  const lang = langProp ?? "en";
  const dict = dictProp ?? getDictionary(lang);

  if (total === 0 || items.length === 0) {
    const isBookmarkedEmpty = filters.status === "bookmarked";
    return (
      <EmptyState
        icon={SearchX}
        title={
          isBookmarkedEmpty
            ? dict.questionsPage.results.emptyBookmarkedTitle
            : page > 1 && total > 0
              ? dict.questionsPage.results.emptyPageTitle
              : dict.questionsPage.results.emptyTitle
        }
        description={
          isBookmarkedEmpty
            ? dict.questionsPage.results.emptyBookmarkedDesc
            : dict.questionsPage.results.emptyDesc
        }
        action={
          <>
            <ButtonLink href="/questions" variant="outline" size="sm">
              {dict.questionsPage.results.clearFilters}
            </ButtonLink>
            <ButtonLink href="/topics" variant="ghost" size="sm">
              {dict.questionsPage.results.browseTopics}
            </ButtonLink>
          </>
        }
      />
    );
  }
  const from = (page - 1) * QUESTIONS_PAGE_SIZE + 1;
  const to = from + items.length - 1;
  const qualifierText = qualifier
    ? ((dict.questionsPage.qualifiers as Record<string, string>)[filters.status] ?? `${qualifier} `)
    : "";
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted" role="status">
        {lang === "bn"
          ? dict.questionsPage.results.showing
              .replace("{from}", formatNumber(from))
              .replace("{to}", formatNumber(to))
              .replace("{total}", formatNumber(total))
              .replace("{qualifier}", qualifierText)
          : `${dict.questionsPage.results.showing
              .replace("{from}", formatNumber(from))
              .replace("{to}", formatNumber(to))
              .replace("{total}", formatNumber(total))
              .replace("{qualifier}", qualifierText ? `${qualifierText.trim()} ` : "")}`}
        {filters.q ? (
          <>
            {" "}
            {dict.questionsPage.results.forQuery.replace("{q}", filters.q)}
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
        previousLabel={dict.questionsPage.results.previous}
        nextLabel={dict.questionsPage.results.next}
      />
    </div>
  );
}
