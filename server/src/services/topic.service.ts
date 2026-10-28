import { notFound } from '../lib/errors';
import { QuestionModel, QuizQuestionModel, TopicModel, type TopicDoc } from '../models';
import type { CategoryT, DifficultyT, TopicDetailResponse, TopicStats, TopicSummary } from '../types/api';
import { QUESTION_SUMMARY_PROJECTION, toQuestionSummary, toTopic, type QuestionSummarySource } from './mappers';
import { dbState } from '../db/connect';
import { getLocalTopicDetail, getLocalTopicRefs, getLocalTopics } from '../content/localContent';

export interface TopicRef {
  slug: string;
  title: string;
  category: CategoryT;
  order: number;
}

/** slug → {slug, title, category, order} for every topic, in display order. */
export async function getTopicRefs(): Promise<Map<string, TopicRef>> {
  if (dbState() !== 'connected') {
    return getLocalTopicRefs();
  }
  try {
    const docs = await TopicModel.find({}, { _id: 0, slug: 1, title: 1, category: 1, order: 1 }).sort({ order: 1 }).lean<TopicRef[]>();
    return new Map(docs.map((t) => [t.slug, { slug: t.slug, title: t.title, category: t.category, order: t.order }]));
  } catch (err) {
    console.warn(`[db] getTopicRefs fallback to local files: ${(err as Error).message}`);
    return getLocalTopicRefs();
  }
}

const emptyStats = (): TopicStats => ({ questionCount: 0, difficultyCounts: { easy: 0, medium: 0, hard: 0 }, quizCount: 0 });

/** Question counts per topic/difficulty and quiz counts per topic (optionally for one topic). */
async function getTopicStats(topic?: string): Promise<Map<string, TopicStats>> {
  const match = topic ? [{ $match: { topic } }] : [];
  const [byDifficulty, quizCounts] = await Promise.all([
    QuestionModel.aggregate<{ _id: { topic: string; difficulty: DifficultyT }; n: number }>([
      ...match,
      { $group: { _id: { topic: '$topic', difficulty: '$difficulty' }, n: { $sum: 1 } } },
    ]),
    QuizQuestionModel.aggregate<{ _id: string; n: number }>([...match, { $group: { _id: '$topic', n: { $sum: 1 } } }]),
  ]);
  const stats = new Map<string, TopicStats>();
  const get = (slug: string) => {
    let s = stats.get(slug);
    if (!s) stats.set(slug, (s = emptyStats()));
    return s;
  };
  for (const row of byDifficulty) {
    const s = get(row._id.topic);
    s.questionCount += row.n;
    if (row._id.difficulty in s.difficultyCounts) s.difficultyCounts[row._id.difficulty] += row.n;
  }
  for (const row of quizCounts) get(row._id).quizCount = row.n;
  return stats;
}

export async function listTopics(): Promise<TopicSummary[]> {
  if (dbState() !== 'connected') {
    return getLocalTopics();
  }
  try {
    const [topics, stats] = await Promise.all([
      TopicModel.find({}, { _id: 0, slug: 1, title: 1, category: 1, order: 1, summary: 1, estimatedHours: 1 })
        .sort({ order: 1 })
        .lean<Pick<TopicDoc, 'slug' | 'title' | 'category' | 'order' | 'summary' | 'estimatedHours'>[]>(),
      getTopicStats(),
    ]);
    return topics.map((t) => ({
      slug: t.slug,
      title: t.title,
      category: t.category,
      order: t.order,
      summary: t.summary,
      estimatedHours: t.estimatedHours,
      ...(stats.get(t.slug) ?? emptyStats()),
    }));
  } catch (err) {
    console.warn(`[db] listTopics fallback to local files: ${(err as Error).message}`);
    return getLocalTopics();
  }
}

export async function getTopicDetail(slug: string): Promise<TopicDetailResponse> {
  if (dbState() !== 'connected') {
    return getLocalTopicDetail(slug);
  }
  try {
    const topic = await TopicModel.findOne({ slug }).lean<TopicDoc>();
    if (!topic) throw notFound(`Topic "${slug}" not found`);
    const [stats, questions] = await Promise.all([
      getTopicStats(slug),
      QuestionModel.find({ topic: slug }, QUESTION_SUMMARY_PROJECTION).sort({ order: 1 }).lean<QuestionSummarySource[]>(),
    ]);
    return {
      topic: { ...toTopic(topic), ...(stats.get(slug) ?? emptyStats()) },
      questions: questions.map((q) => toQuestionSummary(q, topic.title)),
    };
  } catch (err) {
    if ((err as { status?: number }).status === 404) throw err;
    console.warn(`[db] getTopicDetail fallback to local files: ${(err as Error).message}`);
    return getLocalTopicDetail(slug);
  }
}
