/**
 * Explicit DB → API mappers so responses match the contract exactly
 * (string ids, ISO dates, no _id/__v/internal fields, never passwordHash).
 */
import { toIso } from '../lib/dates';
import { compact, round1, uniq } from '../lib/util';
import type { MockSessionDoc, QuestionDoc, QuestionProgressDoc, QuizAttemptDoc, QuizQuestionDoc, RoadmapDoc, TopicDoc, UserDoc } from '../models';
import type {
  ApiMockSession,
  ApiQuestion,
  ApiQuestionProgress,
  ApiQuizAttempt,
  ApiQuizQuestion,
  ApiRoadmap,
  ApiTopic,
  ApiUser,
  AuthUser,
  QuestionSummary,
  VisualTypeT,
} from '../types/api';

type Lean<T> = T;

export function toUser(u: Pick<UserDoc, '_id' | 'name' | 'email' | 'createdAt'>): ApiUser {
  return { id: u._id.toString(), name: u.name, email: u.email, createdAt: toIso(u.createdAt) };
}

export function authUserToApi(u: AuthUser): ApiUser {
  return { id: u.id, name: u.name, email: u.email, createdAt: toIso(u.createdAt) };
}

const snippet = (s?: { language: string; code: string } | null) =>
  s ? ({ language: s.language, code: s.code } as NonNullable<ApiTopic['patterns']>[number]['template']) : undefined;

export function toTopic(t: Lean<TopicDoc>): ApiTopic {
  return compact({
    slug: t.slug,
    title: t.title,
    category: t.category,
    order: t.order,
    summary: t.summary,
    overview: t.overview,
    cheatsheet: (t.cheatsheet ?? []).map((c) => ({ title: c.title, points: c.points ?? [] })),
    patterns: t.patterns?.map((p) => compact({ name: p.name, whenToUse: p.whenToUse, template: snippet(p.template) })),
    estimatedHours: t.estimatedHours,
  }) as ApiTopic;
}

export function toQuestion(q: Lean<QuestionDoc>): ApiQuestion {
  const s = q.solution;
  return compact({
    slug: q.slug,
    title: q.title,
    topic: q.topic,
    difficulty: q.difficulty,
    kind: q.kind,
    frequency: q.frequency,
    tags: q.tags ?? [],
    pattern: q.pattern,
    prompt: q.prompt,
    examples: q.examples?.map((e) => compact({ input: e.input, output: e.output, explanation: e.explanation })),
    constraints: q.constraints,
    hints: q.hints ?? [],
    approaches: (q.approaches ?? []).map((a) => ({ name: a.name, idea: a.idea, time: a.time, space: a.space })),
    solution: compact({
      summary: s.summary,
      explanation: s.explanation,
      code: s.code?.map((c) => ({ language: c.language, code: c.code })),
      complexity: s.complexity ? { time: s.complexity.time, space: s.complexity.space } : undefined,
      keyPoints: s.keyPoints ?? [],
    }),
    visuals: q.visuals ?? [],
    pitfalls: q.pitfalls,
    followUps: q.followUps?.map((f) => ({ question: f.question, answer: f.answer })),
    related: q.related,
    order: q.order,
  }) as ApiQuestion;
}

/** Fields a list query must project to build a QuestionSummary (never full visuals/solution). */
export const QUESTION_SUMMARY_PROJECTION = {
  _id: 0,
  slug: 1,
  title: 1,
  topic: 1,
  difficulty: 1,
  kind: 1,
  frequency: 1,
  tags: 1,
  pattern: 1,
  'solution.summary': 1,
  'visuals.type': 1,
  order: 1,
} as const;

export type QuestionSummarySource = Pick<QuestionDoc, 'slug' | 'title' | 'topic' | 'difficulty' | 'kind' | 'frequency' | 'tags' | 'pattern' | 'order'> & {
  solution?: { summary?: string };
  visuals?: { type: VisualTypeT }[];
};

export function toQuestionSummary(q: QuestionSummarySource, topicTitle: string): QuestionSummary {
  return compact({
    slug: q.slug,
    title: q.title,
    topic: q.topic,
    topicTitle,
    difficulty: q.difficulty,
    kind: q.kind,
    frequency: q.frequency,
    tags: q.tags ?? [],
    pattern: q.pattern,
    summary: q.solution?.summary ?? '',
    visualTypes: uniq((q.visuals ?? []).map((v) => v.type)),
    order: q.order,
  }) as QuestionSummary;
}

export function toQuizQuestion(q: Lean<QuizQuestionDoc>): ApiQuizQuestion {
  return compact({
    id: q.id,
    question: q.question,
    code: snippet(q.code),
    options: q.options ?? [],
    answer: q.answer,
    explanation: q.explanation,
    difficulty: q.difficulty,
  }) as ApiQuizQuestion;
}

export function toRoadmap(r: Lean<RoadmapDoc>): ApiRoadmap {
  return {
    title: r.title,
    description: r.description,
    days: (r.days ?? []).map((d) => ({
      day: d.day,
      week: d.week,
      title: d.title,
      topics: d.topics ?? [],
      goals: d.goals ?? [],
      questionSlugs: d.questionSlugs ?? [],
      estimatedHours: d.estimatedHours,
    })),
  };
}

export function toQuestionProgress(p: Lean<QuestionProgressDoc>): ApiQuestionProgress {
  return {
    slug: p.questionSlug,
    status: p.status ?? 'todo',
    bookmarked: p.bookmarked ?? false,
    notes: p.notes ?? '',
    confidence: p.confidence ?? null,
    updatedAt: toIso(p.updatedAt),
  };
}

export function toQuizAttempt(a: Lean<QuizAttemptDoc>, topicTitle: string): ApiQuizAttempt {
  return {
    id: a._id.toString(),
    topic: a.topic,
    topicTitle,
    score: a.score,
    total: a.total,
    pct: a.pct,
    createdAt: toIso(a.createdAt),
  };
}

export function toMockSession(s: Lean<MockSessionDoc>): ApiMockSession {
  return {
    id: s._id.toString(),
    createdAt: toIso(s.createdAt),
    durationSec: s.durationSec,
    config: {
      count: s.config.count,
      kinds: s.config.kinds ?? [],
      topics: s.config.topics ?? [],
      difficulty: s.config.difficulty,
    },
    items: (s.items ?? []).map((i) => ({
      slug: i.slug,
      title: i.title,
      kind: i.kind,
      selfRating: i.selfRating,
      timeSpentSec: i.timeSpentSec,
      revealed: i.revealed,
    })),
    avgRating: round1(s.avgRating),
  };
}
