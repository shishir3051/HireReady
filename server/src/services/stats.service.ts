import { QuestionModel, QuizQuestionModel, TopicModel } from '../models';
import { CATEGORIES, DIFFICULTIES, KINDS, type CategoryT, type PlatformStats } from '../types/api';
import { dbState } from '../db/connect';
import { getLocalPlatformStats } from '../content/localContent';

const zeros = <K extends string>(keys: readonly K[]) => Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;

/** GET /api/stats — platform-wide content counts. `byCategory` counts questions per topic category. */
export async function getPlatformStats(): Promise<PlatformStats> {
  if (dbState() !== 'connected') {
    return getLocalPlatformStats();
  }
  try {
    const [topics, quizQuestions, facets, topicCategories] = await Promise.all([
      TopicModel.countDocuments(),
      QuizQuestionModel.countDocuments(),
      QuestionModel.aggregate<{
        totals: { questions: number; visuals: number }[];
        byKind: { _id: string; n: number }[];
        byDifficulty: { _id: string; n: number }[];
        byTopic: { _id: string; n: number }[];
      }>([
        {
          $facet: {
            totals: [{ $group: { _id: null, questions: { $sum: 1 }, visuals: { $sum: { $size: { $ifNull: ['$visuals', []] } } } } }],
            byKind: [{ $group: { _id: '$kind', n: { $sum: 1 } } }],
            byDifficulty: [{ $group: { _id: '$difficulty', n: { $sum: 1 } } }],
            byTopic: [{ $group: { _id: '$topic', n: { $sum: 1 } } }],
          },
        },
      ]),
      TopicModel.find({}, { _id: 0, slug: 1, category: 1 }).lean<{ slug: string; category: CategoryT }[]>(),
    ]);
    const f = facets[0];
    const byKind = zeros(KINDS);
    const byDifficulty = zeros(DIFFICULTIES);
    const byCategory = zeros(CATEGORIES);
    for (const r of f?.byKind ?? []) if (r._id in byKind) byKind[r._id as keyof typeof byKind] += r.n;
    for (const r of f?.byDifficulty ?? []) if (r._id in byDifficulty) byDifficulty[r._id as keyof typeof byDifficulty] += r.n;
    const categoryOf = new Map(topicCategories.map((t) => [t.slug, t.category]));
    for (const r of f?.byTopic ?? []) {
      const c = categoryOf.get(r._id);
      if (c && c in byCategory) byCategory[c] += r.n;
    }
    return {
      topics,
      questions: f?.totals[0]?.questions ?? 0,
      quizQuestions,
      visuals: f?.totals[0]?.visuals ?? 0,
      byKind,
      byDifficulty,
      byCategory,
    };
  } catch (err) {
    console.warn(`[db] getPlatformStats fallback to local files: ${(err as Error).message}`);
    return getLocalPlatformStats();
  }
}
