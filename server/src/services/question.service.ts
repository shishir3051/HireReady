import mongoose, { type PipelineStage } from 'mongoose';
import { notFound } from '../lib/errors';
import { escapeRegex } from '../lib/util';
import { QuestionModel, TopicModel, type QuestionDoc } from '../models';
import { DIFFICULTIES, FREQUENCIES, type ApiQuestion, type CategoryT, type NavRef, type Paginated, type QuestionDetailResponse, type QuestionSummary } from '../types/api';
import type { QuestionListQuery, RandomQuery } from '../validators/schemas';
import { QUESTION_SUMMARY_PROJECTION, toQuestion, toQuestionSummary, type QuestionSummarySource } from './mappers';
import { getTopicRefs } from './topic.service';
import { dbState } from '../db/connect';
import {
  getLocalQuestionDetail,
  getLocalQuestionRefs,
  getLocalQuestions,
  getLocalRandomQuestions,
  localQuestionExists,
} from '../content/localContent';

const SORT_STAGES: Record<QuestionListQuery['sort'], Record<string, 1 | -1>> = {
  default: { topicOrder: 1, order: 1, slug: 1 },
  title: { titleSort: 1, slug: 1 },
  difficulty: { difficultyRank: 1, topicOrder: 1, order: 1, slug: 1 },
  frequency: { frequencyRank: 1, topicOrder: 1, order: 1, slug: 1 },
};

/** GET /api/questions — filters, case-insensitive search, sort, pagination; summaries only. */
export async function listQuestions(query: QuestionListQuery): Promise<Paginated<QuestionSummary>> {
  if (dbState() !== 'connected') {
    return getLocalQuestions(query);
  }
  try {
    const match: Record<string, unknown> = {};
    if (query.topic) match.topic = { $in: query.topic };
    if (query.difficulty) match.difficulty = { $in: query.difficulty };
    if (query.kind) match.kind = { $in: query.kind };
    if (query.frequency) match.frequency = { $in: query.frequency };
    if (query.tag) match.tags = { $in: query.tag };
    if (query.q) {
      const re = new RegExp(escapeRegex(query.q), 'i');
      match.$or = [{ title: re }, { tags: re }, { pattern: re }, { prompt: re }];
    }

    const { page, limit, sort } = query;
    const pipeline: PipelineStage[] = [
      { $match: match },
      { $project: { ...QUESTION_SUMMARY_PROJECTION, topicOrder: 1 } },
    ];
    if (sort === 'title') pipeline.push({ $addFields: { titleSort: { $toLower: '$title' } } });
    if (sort === 'difficulty') pipeline.push({ $addFields: { difficultyRank: { $indexOfArray: [DIFFICULTIES, '$difficulty'] } } });
    if (sort === 'frequency') pipeline.push({ $addFields: { frequencyRank: { $indexOfArray: [FREQUENCIES, '$frequency'] } } });
    pipeline.push(
      { $sort: SORT_STAGES[sort] },
      {
        $facet: {
          items: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          total: [{ $count: 'n' }],
        },
      },
    );

    const [[result], topics] = await Promise.all([
      QuestionModel.aggregate<{ items: QuestionSummarySource[]; total: { n: number }[] }>(pipeline),
      getTopicRefs(),
    ]);
    const total = result?.total[0]?.n ?? 0;
    return {
      items: (result?.items ?? []).map((q) => toQuestionSummary(q, topics.get(q.topic)?.title ?? q.topic)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (err) {
    console.warn(`[db] listQuestions fallback to local files: ${(err as Error).message}`);
    return getLocalQuestions(query);
  }
}

/** GET /api/questions/random — `$sample` after `$match`; full questions. */
export async function randomQuestions(query: RandomQuery): Promise<ApiQuestion[]> {
  if (dbState() !== 'connected') {
    return getLocalRandomQuestions(query);
  }
  try {
    const match: Record<string, unknown> = {};
    if (query.topics) match.topic = { $in: query.topics };
    if (query.kinds) match.kind = { $in: query.kinds };
    if (query.difficulty) match.difficulty = { $in: query.difficulty };
    if (query.exclude) match.slug = { $nin: query.exclude };
    const docs = await QuestionModel.aggregate<QuestionDoc>([{ $match: match }, { $sample: { size: query.count } }]);
    const seen = new Set<string>();
    return docs.filter((d) => !seen.has(d.slug) && seen.add(d.slug)).map(toQuestion);
  } catch (err) {
    console.warn(`[db] randomQuestions fallback to local files: ${(err as Error).message}`);
    return getLocalRandomQuestions(query);
  }
}

/** GET /api/questions/:slug — full question, its topic, and prev/next by order within the topic. */
export async function getQuestionDetail(slug: string): Promise<QuestionDetailResponse> {
  if (dbState() !== 'connected') {
    return getLocalQuestionDetail(slug);
  }
  try {
    const q = await QuestionModel.findOne({ slug }).lean<QuestionDoc>();
    if (!q) throw notFound(`Question "${slug}" not found`);

    const navProjection = { _id: 0, slug: 1, title: 1 };
    const [topic, prev, next] = await Promise.all([
      TopicModel.findOne({ slug: q.topic }, { _id: 0, slug: 1, title: 1, category: 1 }).lean<{ slug: string; title: string; category: CategoryT }>(),
      QuestionModel.findOne({ topic: q.topic, order: mongoose.trusted({ $lt: q.order }) }, navProjection)
        .sort({ order: -1 })
        .lean<NavRef>(),
      QuestionModel.findOne({ topic: q.topic, order: mongoose.trusted({ $gt: q.order }) }, navProjection)
        .sort({ order: 1 })
        .lean<NavRef>(),
    ]);

    return {
      question: toQuestion(q),
      topic: topic ? { slug: topic.slug, title: topic.title, category: topic.category } : { slug: q.topic, title: q.topic, category: 'dsa' },
      prev: prev ? { slug: prev.slug, title: prev.title } : null,
      next: next ? { slug: next.slug, title: next.title } : null,
    };
  } catch (err) {
    if ((err as { status?: number }).status === 404) throw err;
    console.warn(`[db] getQuestionDetail fallback to local files: ${(err as Error).message}`);
    return getLocalQuestionDetail(slug);
  }
}

/** slug → {slug, title, kind, topic, difficulty} for the given slugs (unknown slugs are absent). */
export async function findQuestionRefs(slugs: string[]) {
  if (dbState() !== 'connected') {
    return getLocalQuestionRefs(slugs);
  }
  try {
    const docs = await QuestionModel.find(
      { slug: mongoose.trusted({ $in: slugs }) },
      { _id: 0, slug: 1, title: 1, kind: 1, topic: 1, difficulty: 1 },
    ).lean<Pick<QuestionDoc, 'slug' | 'title' | 'kind' | 'topic' | 'difficulty'>[]>();
    return new Map(docs.map((d) => [d.slug, d]));
  } catch (err) {
    console.warn(`[db] findQuestionRefs fallback to local files: ${(err as Error).message}`);
    return getLocalQuestionRefs(slugs);
  }
}

export async function questionExists(slug: string): Promise<boolean> {
  if (dbState() !== 'connected') {
    return localQuestionExists(slug);
  }
  try {
    return (await QuestionModel.exists({ slug })) !== null;
  } catch (err) {
    console.warn(`[db] questionExists fallback to local files: ${(err as Error).message}`);
    return localQuestionExists(slug);
  }
}
