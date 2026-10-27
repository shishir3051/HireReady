import type { Difficulty, Frequency, QuestionKind } from "@/lib/types";
import type { QuestionListQuery } from "@/lib/api";
import { DIFFICULTIES, FREQUENCIES, KINDS, SORT_OPTIONS, type QuestionSort, type StatusFilter } from "@/lib/constants";
import { firstParam, listParam } from "@/lib/utils";

/** Filters of the /questions page — all of them live in the URL search params. */
export interface QuestionFilters {
  q: string;
  topic: string[];
  difficulty: Difficulty[];
  kind: QuestionKind[];
  frequency: Frequency[];
  status: StatusFilter;
  sort: QuestionSort;
  page: number;
}

export const QUESTIONS_PAGE_SIZE = 20;

export const DEFAULT_FILTERS: QuestionFilters = {
  q: "",
  topic: [],
  difficulty: [],
  kind: [],
  frequency: [],
  status: "all",
  sort: "default",
  page: 1,
};

const STATUS_VALUES: StatusFilter[] = ["all", "solved", "unsolved", "attempted", "bookmarked"];
const SORT_VALUES = SORT_OPTIONS.map((o) => o.value) as QuestionSort[];

type ParamSource = Record<string, string | string[] | undefined> | URLSearchParams;

function get(source: ParamSource, key: string): string | string[] | undefined {
  if (source instanceof URLSearchParams) {
    const all = source.getAll(key);
    return all.length > 1 ? all : (all[0] ?? undefined);
  }
  return source[key];
}

/** Parse (and sanitise) filters from Next.js `searchParams` or a URLSearchParams. */
export function parseQuestionFilters(source: ParamSource): QuestionFilters {
  const status = firstParam(get(source, "status")) as StatusFilter | undefined;
  const sort = firstParam(get(source, "sort")) as QuestionSort | undefined;
  const page = Number.parseInt(firstParam(get(source, "page")) ?? "1", 10);
  return {
    q: (firstParam(get(source, "q")) ?? "").slice(0, 120),
    topic: listParam(get(source, "topic")).filter((t) => /^[a-z0-9-]+$/.test(t)),
    difficulty: listParam(get(source, "difficulty"), DIFFICULTIES),
    kind: listParam(get(source, "kind"), KINDS),
    frequency: listParam(get(source, "frequency"), FREQUENCIES),
    status: status && STATUS_VALUES.includes(status) ? status : "all",
    sort: sort && SORT_VALUES.includes(sort) ? sort : "default",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Serialise filters back into a query string (defaults omitted). Leading "?" included when non-empty. */
export function questionFiltersToSearch(filters: Partial<QuestionFilters>): string {
  const f = { ...DEFAULT_FILTERS, ...filters };
  const params = new URLSearchParams();
  if (f.q.trim()) params.set("q", f.q.trim());
  if (f.topic.length) params.set("topic", f.topic.join(","));
  if (f.difficulty.length) params.set("difficulty", f.difficulty.join(","));
  if (f.kind.length) params.set("kind", f.kind.join(","));
  if (f.frequency.length) params.set("frequency", f.frequency.join(","));
  if (f.status !== "all") params.set("status", f.status);
  if (f.sort !== "default") params.set("sort", f.sort);
  if (f.page > 1) params.set("page", String(f.page));
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function questionsHref(filters: Partial<QuestionFilters>) {
  return `/questions${questionFiltersToSearch(filters)}`;
}

/** API query for GET /api/questions (status is applied client-side). */
export function filtersToApiQuery(filters: QuestionFilters, overrides: Partial<QuestionListQuery> = {}): QuestionListQuery {
  return {
    q: filters.q || undefined,
    topic: filters.topic,
    difficulty: filters.difficulty,
    kind: filters.kind,
    frequency: filters.frequency,
    sort: filters.sort,
    page: filters.page,
    limit: QUESTIONS_PAGE_SIZE,
    ...overrides,
  };
}

export function activeFilterCount(filters: QuestionFilters) {
  return (
    (filters.q ? 1 : 0) +
    filters.topic.length +
    filters.difficulty.length +
    filters.kind.length +
    filters.frequency.length +
    (filters.status !== "all" ? 1 : 0)
  );
}
