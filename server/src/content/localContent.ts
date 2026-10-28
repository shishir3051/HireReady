import fs from 'node:fs';
import path from 'node:path';
import { notFound } from '../lib/errors';
import { escapeRegex, shuffle, uniq } from '../lib/util';
import type { QuestionDoc, QuizQuestionDoc, TopicDoc } from '../models';
import {
  CATEGORIES,
  DIFFICULTIES,
  KINDS,
  type ApiQuestion,
  type ApiRoadmap,
  type CategoryT,
  type DifficultyT,
  type Paginated,
  type PlatformStats,
  type QuestionDetailResponse,
  type QuestionSummary,
  type QuizResponse,
  type QuizTopicSummary,
  type TopicDetailResponse,
  type TopicStats,
  type TopicSummary,
} from '../types/api';
import type { QuestionListQuery, QuizTopicQuery, RandomQuery } from '../validators/schemas';
import { toQuestion, toQuestionSummary, toQuizQuestion, toRoadmap, toTopic } from '../services/mappers';
import type { TopicRef } from '../services/topic.service';
import type { ContentFileT, RoadmapT } from './schema';
import { CONTENT_DIR, ROADMAP_FILE } from './validate';

export interface LocalStore {
  topics: (TopicDoc & { stats: TopicStats })[];
  topicsBySlug: Map<string, TopicDoc & { stats: TopicStats }>;
  questions: QuestionDoc[];
  questionsBySlug: Map<string, QuestionDoc>;
  questionsByTopic: Map<string, QuestionDoc[]>;
  quizByTopic: Map<string, QuizQuestionDoc[]>;
  roadmap: RoadmapT | null;
}

let store: LocalStore | null = null;

const DIFF_RANK: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
const FREQ_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

export function loadStore(): LocalStore {
  if (store) return store;

  const topics: (TopicDoc & { stats: TopicStats })[] = [];
  const topicsBySlug = new Map<string, TopicDoc & { stats: TopicStats }>();
  const questions: QuestionDoc[] = [];
  const questionsBySlug = new Map<string, QuestionDoc>();
  const questionsByTopic = new Map<string, QuestionDoc[]>();
  const quizByTopic = new Map<string, QuizQuestionDoc[]>();

  if (fs.existsSync(CONTENT_DIR)) {
    const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json')).sort();
    for (const file of files) {
      try {
        const fullPath = path.join(CONTENT_DIR, file);
        const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8')) as ContentFileT;
        const diffCounts: Record<DifficultyT, number> = { easy: 0, medium: 0, hard: 0 };
        const topicQuestions: QuestionDoc[] = [];

        parsed.questions.forEach((q, order) => {
          const qDoc = {
            ...q,
            order,
            topicOrder: parsed.topic.order,
          } as unknown as QuestionDoc;
          questions.push(qDoc);
          questionsBySlug.set(q.slug, qDoc);
          topicQuestions.push(qDoc);
          if (q.difficulty in diffCounts) {
            diffCounts[q.difficulty as DifficultyT]++;
          }
        });

        questionsByTopic.set(parsed.topic.slug, topicQuestions);

        const quizQuestions: QuizQuestionDoc[] = parsed.quiz.map((qz, order) => ({
          ...qz,
          topic: parsed.topic.slug,
          order,
        })) as unknown as QuizQuestionDoc[];
        quizByTopic.set(parsed.topic.slug, quizQuestions);

        const stats: TopicStats = {
          questionCount: parsed.questions.length,
          difficultyCounts: diffCounts,
          quizCount: parsed.quiz.length,
        };

        const topicDoc = {
          ...parsed.topic,
          category: parsed.topic.category as CategoryT,
          stats,
        } as unknown as TopicDoc & { stats: TopicStats };

        topics.push(topicDoc);
        topicsBySlug.set(parsed.topic.slug, topicDoc);
      } catch (err) {
        console.error(`[local-content] Error reading ${file}:`, err);
      }
    }
    topics.sort((a, b) => a.order - b.order);
  }

  let roadmap: RoadmapT | null = null;
  if (fs.existsSync(ROADMAP_FILE)) {
    try {
      roadmap = JSON.parse(fs.readFileSync(ROADMAP_FILE, 'utf8')) as RoadmapT;
    } catch (err) {
      console.error('[local-content] Error reading roadmap.json:', err);
    }
  }

  store = {
    topics,
    topicsBySlug,
    questions,
    questionsBySlug,
    questionsByTopic,
    quizByTopic,
    roadmap,
  };
  return store;
}

export function getLocalTopicRefs(): Map<string, TopicRef> {
  const s = loadStore();
  const map = new Map<string, TopicRef>();
  for (const t of s.topics) {
    map.set(t.slug, { slug: t.slug, title: t.title, category: t.category, order: t.order });
  }
  return map;
}

export function getLocalTopics(): TopicSummary[] {
  const s = loadStore();
  return s.topics.map((t) => ({
    slug: t.slug,
    title: t.title,
    category: t.category,
    order: t.order,
    summary: t.summary,
    estimatedHours: t.estimatedHours,
    ...t.stats,
  }));
}

export function getLocalTopicDetail(slug: string): TopicDetailResponse {
  const s = loadStore();
  const topic = s.topicsBySlug.get(slug);
  if (!topic) throw notFound(`Topic "${slug}" not found`);

  const topicQuestions = s.questionsByTopic.get(slug) ?? [];
  return {
    topic: { ...toTopic(topic), ...topic.stats },
    questions: topicQuestions.map((q) => toQuestionSummary(q, topic.title)),
  };
}

function sortQuestions(list: QuestionDoc[], sort: QuestionListQuery['sort']): QuestionDoc[] {
  return [...list].sort((a, b) => {
    if (sort === 'title') {
      const cmp = a.title.localeCompare(b.title);
      return cmp !== 0 ? cmp : a.slug.localeCompare(b.slug);
    }
    if (sort === 'difficulty') {
      const diffA = DIFF_RANK[a.difficulty] ?? 99;
      const diffB = DIFF_RANK[b.difficulty] ?? 99;
      if (diffA !== diffB) return diffA - diffB;
      if (a.topicOrder !== b.topicOrder) return a.topicOrder - b.topicOrder;
      if (a.order !== b.order) return a.order - b.order;
      return a.slug.localeCompare(b.slug);
    }
    if (sort === 'frequency') {
      const freqA = FREQ_RANK[a.frequency] ?? 99;
      const freqB = FREQ_RANK[b.frequency] ?? 99;
      if (freqA !== freqB) return freqA - freqB;
      if (a.topicOrder !== b.topicOrder) return a.topicOrder - b.topicOrder;
      if (a.order !== b.order) return a.order - b.order;
      return a.slug.localeCompare(b.slug);
    }
    // default
    if (a.topicOrder !== b.topicOrder) return a.topicOrder - b.topicOrder;
    if (a.order !== b.order) return a.order - b.order;
    return a.slug.localeCompare(b.slug);
  });
}

export function getLocalQuestions(query: QuestionListQuery): Paginated<QuestionSummary> {
  const s = loadStore();
  let matched = s.questions;

  if (query.topic?.length) {
    const topicsSet = new Set(query.topic);
    matched = matched.filter((q) => topicsSet.has(q.topic));
  }
  if (query.difficulty?.length) {
    const diffsSet = new Set(query.difficulty);
    matched = matched.filter((q) => diffsSet.has(q.difficulty));
  }
  if (query.kind?.length) {
    const kindsSet = new Set(query.kind);
    matched = matched.filter((q) => kindsSet.has(q.kind));
  }
  if (query.frequency?.length) {
    const freqsSet = new Set(query.frequency);
    matched = matched.filter((q) => freqsSet.has(q.frequency));
  }
  if (query.tag?.length) {
    const tagsSet = new Set(query.tag);
    matched = matched.filter((q) => q.tags?.some((t) => tagsSet.has(t)));
  }
  if (query.q) {
    const re = new RegExp(escapeRegex(query.q), 'i');
    matched = matched.filter(
      (q) => re.test(q.title) || q.tags?.some((t) => re.test(t)) || (q.pattern && re.test(q.pattern)) || re.test(q.prompt),
    );
  }

  const sorted = sortQuestions(matched, query.sort);
  const total = sorted.length;
  const { page, limit } = query;
  const items = sorted.slice((page - 1) * limit, page * limit);
  const topicsMap = getLocalTopicRefs();

  return {
    items: items.map((q) => toQuestionSummary(q, topicsMap.get(q.topic)?.title ?? q.topic)),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export function getLocalQuestionDetail(slug: string): QuestionDetailResponse {
  const s = loadStore();
  const q = s.questionsBySlug.get(slug);
  if (!q) throw notFound(`Question "${slug}" not found`);

  const topic = s.topicsBySlug.get(q.topic);
  const topicQuestions = s.questionsByTopic.get(q.topic) ?? [];
  const currIdx = topicQuestions.findIndex((item) => item.slug === slug);
  const prev = currIdx > 0 ? topicQuestions[currIdx - 1] : null;
  const next = currIdx >= 0 && currIdx < topicQuestions.length - 1 ? topicQuestions[currIdx + 1] : null;

  return {
    question: toQuestion(q),
    topic: topic ? { slug: topic.slug, title: topic.title, category: topic.category } : { slug: q.topic, title: q.topic, category: 'dsa' },
    prev: prev ? { slug: prev.slug, title: prev.title } : null,
    next: next ? { slug: next.slug, title: next.title } : null,
  };
}

export function getLocalRandomQuestions(query: RandomQuery): ApiQuestion[] {
  const s = loadStore();
  let matched = s.questions;

  if (query.topics?.length) {
    const topicsSet = new Set(query.topics);
    matched = matched.filter((q) => topicsSet.has(q.topic));
  }
  if (query.kinds?.length) {
    const kindsSet = new Set(query.kinds);
    matched = matched.filter((q) => kindsSet.has(q.kind));
  }
  if (query.difficulty?.length) {
    const diffsSet = new Set(query.difficulty);
    matched = matched.filter((q) => diffsSet.has(q.difficulty as DifficultyT));
  }
  if (query.exclude?.length) {
    const excludeSet = new Set(query.exclude);
    matched = matched.filter((q) => !excludeSet.has(q.slug));
  }

  const shuffled = shuffle(matched);
  const selected = shuffled.slice(0, query.count);
  return selected.map(toQuestion);
}

export function getLocalQuestionRefs(slugs: string[]): Map<string, Pick<QuestionDoc, 'slug' | 'title' | 'kind' | 'topic' | 'difficulty'>> {
  const s = loadStore();
  const map = new Map<string, Pick<QuestionDoc, 'slug' | 'title' | 'kind' | 'topic' | 'difficulty'>>();
  for (const slug of slugs) {
    const q = s.questionsBySlug.get(slug);
    if (q) {
      map.set(slug, { slug: q.slug, title: q.title, kind: q.kind, topic: q.topic, difficulty: q.difficulty });
    }
  }
  return map;
}

export function localQuestionExists(slug: string): boolean {
  return loadStore().questionsBySlug.has(slug);
}

export function getLocalQuizTopics(): QuizTopicSummary[] {
  const s = loadStore();
  return s.topics
    .filter((t) => (s.quizByTopic.get(t.slug)?.length ?? 0) > 0)
    .map((t) => ({
      topic: t.slug,
      title: t.title,
      category: t.category,
      count: s.quizByTopic.get(t.slug)?.length ?? 0,
    }));
}

export function getLocalQuiz(slug: string, query: QuizTopicQuery): QuizResponse {
  const s = loadStore();
  const topic = s.topicsBySlug.get(slug);
  if (!topic) throw notFound(`Topic "${slug}" not found`);

  let items = s.quizByTopic.get(slug) ?? [];
  if (query.shuffle) items = shuffle(items);
  if (query.limit) items = items.slice(0, query.limit);

  return {
    topic: { slug: topic.slug, title: topic.title },
    items: items.map(toQuizQuestion),
  };
}

export function getLocalRoadmap(): ApiRoadmap {
  const s = loadStore();
  if (!s.roadmap) throw notFound('Roadmap not found (it has not been seeded yet)');
  return toRoadmap(s.roadmap as unknown as Parameters<typeof toRoadmap>[0]);
}

export function getLocalRoadmapDayCount(): number {
  return loadStore().roadmap?.days.length ?? 0;
}

export function getLocalPlatformStats(): PlatformStats {
  const s = loadStore();
  const zeros = <K extends string>(keys: readonly K[]) => Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
  const byKind = zeros(KINDS);
  const byDifficulty = zeros(DIFFICULTIES);
  const byCategory = zeros(CATEGORIES);
  let visuals = 0;

  for (const q of s.questions) {
    if (q.kind in byKind) byKind[q.kind as keyof typeof byKind]++;
    if (q.difficulty in byDifficulty) byDifficulty[q.difficulty as keyof typeof byDifficulty]++;
    const t = s.topicsBySlug.get(q.topic);
    if (t && t.category in byCategory) byCategory[t.category as keyof typeof byCategory]++;
    visuals += q.visuals?.length ?? 0;
  }

  const quizQuestions = Array.from(s.quizByTopic.values()).reduce((sum, list) => sum + list.length, 0);

  return {
    topics: s.topics.length,
    questions: s.questions.length,
    quizQuestions,
    visuals,
    byKind,
    byDifficulty,
    byCategory,
  };
}
