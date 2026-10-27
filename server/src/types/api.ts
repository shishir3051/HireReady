/**
 * Response shapes of the REST API. Mirrors `client/src/lib/types.ts` (the contract);
 * content shapes come from the zod content schema.
 */
import type { z } from 'zod';
import type { Category, Difficulty, Frequency, QuestionKind, QuestionT, QuizQuestionT, RoadmapT, TopicT } from '../content/schema';

export type DifficultyT = z.infer<typeof Difficulty>;
export type QuestionKindT = z.infer<typeof QuestionKind>;
export type FrequencyT = z.infer<typeof Frequency>;
export type CategoryT = z.infer<typeof Category>;
export type VisualTypeT = QuestionT['visuals'][number]['type'];

export const DIFFICULTIES: DifficultyT[] = ['easy', 'medium', 'hard'];
export const KINDS: QuestionKindT[] = ['coding', 'concept', 'sql', 'design', 'behavioral'];
export const FREQUENCIES: FrequencyT[] = ['very-high', 'high', 'medium'];
export const CATEGORIES: CategoryT[] = ['dsa', 'cs-fundamentals', 'web', 'engineering', 'career'];
export const PROGRESS_STATUSES = ['todo', 'attempted', 'solved'] as const;
export type ProgressStatusT = (typeof PROGRESS_STATUSES)[number];

export type ApiQuestion = QuestionT & { order: number };
export type ApiTopic = TopicT;
export type ApiQuizQuestion = QuizQuestionT;
export type ApiRoadmap = RoadmapT;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface TopicStats {
  questionCount: number;
  difficultyCounts: Record<DifficultyT, number>;
  quizCount: number;
}
export type TopicSummary = Pick<TopicT, 'slug' | 'title' | 'category' | 'order' | 'summary' | 'estimatedHours'> & TopicStats;

export interface QuestionSummary {
  slug: string;
  title: string;
  topic: string;
  topicTitle: string;
  difficulty: DifficultyT;
  kind: QuestionKindT;
  frequency: FrequencyT;
  tags: string[];
  pattern?: string;
  summary: string;
  visualTypes: VisualTypeT[];
  order: number;
}

export interface NavRef {
  slug: string;
  title: string;
}

export interface TopicDetailResponse {
  topic: TopicT & TopicStats;
  questions: QuestionSummary[];
}

export interface QuestionDetailResponse {
  question: ApiQuestion;
  topic: { slug: string; title: string; category: CategoryT };
  prev: NavRef | null;
  next: NavRef | null;
}

export interface PlatformStats {
  topics: number;
  questions: number;
  quizQuestions: number;
  visuals: number;
  byKind: Record<QuestionKindT, number>;
  byDifficulty: Record<DifficultyT, number>;
  byCategory: Record<CategoryT, number>;
}

export interface QuizTopicSummary {
  topic: string;
  title: string;
  category: CategoryT;
  count: number;
}

export interface QuizResponse {
  topic: { slug: string; title: string };
  items: QuizQuestionT[];
}

export interface QuizAttemptResult {
  score: number;
  total: number;
  pct: number;
  results: { questionId: string; selected: number; answer: number; correct: boolean }[];
  saved: boolean;
}

export interface ApiQuizAttempt {
  id: string;
  topic: string;
  topicTitle: string;
  score: number;
  total: number;
  pct: number;
  createdAt: string;
}

export interface ApiQuestionProgress {
  slug: string;
  status: ProgressStatusT;
  bookmarked: boolean;
  notes: string;
  confidence: number | null;
  updatedAt: string;
}

export interface ProgressSnapshot {
  questions: ApiQuestionProgress[];
  roadmapDays: number[];
}

export interface ProgressStats {
  totals: { solved: number; attempted: number; bookmarked: number; questions: number };
  byTopic: { topic: string; title: string; category: CategoryT; solved: number; attempted: number; total: number }[];
  byDifficulty: Record<DifficultyT, { solved: number; total: number }>;
  streak: { current: number; longest: number };
  activity: { date: string; count: number }[];
  quiz: {
    attempts: number;
    avgPct: number;
    bestByTopic: { topic: string; title: string; bestPct: number; attempts: number }[];
  };
  mock: { sessions: number; avgRating: number; totalMinutes: number };
  roadmap: { completedDays: number; totalDays: number };
}

export interface MockConfig {
  count: number;
  kinds: QuestionKindT[];
  topics: string[];
  difficulty: DifficultyT | 'mixed';
}
export interface MockSessionItem {
  slug: string;
  title: string;
  kind: QuestionKindT;
  selfRating: number;
  timeSpentSec: number;
  revealed: boolean;
}
export interface ApiMockSession {
  id: string;
  createdAt: string;
  durationSec: number;
  config: MockConfig;
  items: MockSessionItem[];
  avgRating: number;
}

/** Authenticated user attached to `req.user` by the auth middleware. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}
