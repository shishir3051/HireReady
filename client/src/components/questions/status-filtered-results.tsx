"use client";

import { LogIn, RotateCcw } from "lucide-react";
import { api, getErrorMessage, type QuestionListQuery } from "@/lib/api";
import { useApiQuery } from "@/lib/hooks";
import type { QuestionProgress, QuestionSummary } from "@/lib/types";
import { filtersToApiQuery, questionsHref, QUESTIONS_PAGE_SIZE, type QuestionFilters } from "@/lib/question-filters";
import type { StatusFilter } from "@/lib/constants";
import { useProgress } from "@/components/providers/progress-provider";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { QuestionResultsView } from "./question-results";

/** Fetch every page of GET /api/questions for a query (limit 100 per request). */
async function fetchAll(query: QuestionListQuery, signal: AbortSignal) {
  const first = await api.questions.list({ ...query, page: 1, limit: 100 }, { signal });
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) =>
      api.questions.list({ ...query, page: i + 2, limit: 100 }, { signal }),
    ),
  );
  return [first, ...rest].flatMap((p) => p.items);
}

function matches(status: StatusFilter, p: QuestionProgress | undefined) {
  switch (status) {
    case "solved":
      return p?.status === "solved";
    case "attempted":
      return p?.status === "attempted";
    case "unsolved":
      return p?.status !== "solved";
    case "bookmarked":
      return p?.bookmarked === true;
    default:
      return true;
  }
}

const QUALIFIER: Record<StatusFilter, string | undefined> = {
  all: undefined,
  solved: "solved",
  attempted: "attempted",
  unsolved: "unsolved",
  bookmarked: "bookmarked",
};

/**
 * /questions results when a progress-status filter is active. The API cannot filter by personal
 * progress, so this loads every question matching the other filters and filters/paginates locally.
 */
export function StatusFilteredResults({ filters }: { filters: QuestionFilters }) {
  const { ready, isLoggedIn, progress } = useProgress();
  const query = filtersToApiQuery(filters, { page: 1 });
  const key = isLoggedIn ? `all-questions:${JSON.stringify({ ...query, page: undefined, limit: undefined })}` : null;
  const { data, loading, error, reload } = useApiQuery<QuestionSummary[]>(key, (signal) => fetchAll(query, signal), {
    keepPrevious: true,
  });

  if (!ready || (isLoggedIn && loading && !data)) {
    return (
      <div className="space-y-3" aria-busy>
        <Skeleton className="h-4 w-48" />
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0 sm:px-5">
              <Skeleton className="size-4 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <EmptyState
        icon={LogIn}
        title="Log in to filter by your progress"
        description="Solved, attempted and bookmarked filters use the progress saved to your account."
        action={
          <>
            <ButtonLink href={`/login?next=${encodeURIComponent(questionsHref(filters))}`} size="sm">
              Log in
            </ButtonLink>
            <ButtonLink href={questionsHref({ ...filters, status: "all" })} variant="outline" size="sm">
              Show all questions
            </ButtonLink>
          </>
        }
      />
    );
  }

  if (error && !data) {
    return (
      <EmptyState
        icon={RotateCcw}
        title="Couldn't load questions"
        description={getErrorMessage(error)}
        action={
          <Button size="sm" variant="outline" onClick={reload}>
            Try again
          </Button>
        }
      />
    );
  }

  const filtered = (data ?? []).filter((q) => matches(filters.status, progress[q.slug]));
  const totalPages = Math.max(1, Math.ceil(filtered.length / QUESTIONS_PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const items = filtered.slice((page - 1) * QUESTIONS_PAGE_SIZE, page * QUESTIONS_PAGE_SIZE);

  return (
    <QuestionResultsView
      items={items}
      total={filtered.length}
      page={page}
      totalPages={totalPages}
      filters={filters}
      qualifier={QUALIFIER[filters.status]}
    />
  );
}
