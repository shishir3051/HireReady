import { api } from "@/lib/api";
import type { Difficulty, QuestionKind } from "@/lib/types";

/** Just enough to render a question link (progress and roadmap only know slugs). */
export interface QuestionRef {
  slug: string;
  title: string;
  topic: string;
  topicTitle: string;
  difficulty: Difficulty;
  kind: QuestionKind;
}

export type QuestionIndex = Record<string, QuestionRef>;

const PAGE_SIZE = 100;
const MAX_PAGES = 20;

/**
 * Server helper: every question summary (GET /api/questions, 100 per page, cached 60s like other content)
 * reduced to a slug → QuestionRef map. Pass `only` to keep a subset (keeps the client payload small).
 */
export async function fetchQuestionIndex(only?: Iterable<string>): Promise<QuestionIndex> {
  const first = await api.questions.list({ limit: PAGE_SIZE });
  const pages = Math.min(first.totalPages, MAX_PAGES);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, pages - 1) }, (_, i) => api.questions.list({ limit: PAGE_SIZE, page: i + 2 })),
  );
  const keep = only ? new Set(only) : null;
  const index: QuestionIndex = {};
  for (const page of [first, ...rest]) {
    for (const q of page.items) {
      if (keep && !keep.has(q.slug)) continue;
      index[q.slug] = {
        slug: q.slug,
        title: q.title,
        topic: q.topic,
        topicTitle: q.topicTitle,
        difficulty: q.difficulty,
        kind: q.kind,
      };
    }
  }
  return index;
}
