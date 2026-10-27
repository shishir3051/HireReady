import { Types } from 'mongoose';
import { computeStreak } from '../lib/dates';
import { notFound } from '../lib/errors';
import { round1 } from '../lib/util';
import {
  MockSessionModel,
  QuestionModel,
  QuestionProgressModel,
  QuizAttemptModel,
  RoadmapProgressModel,
  type QuestionDoc,
  type QuestionProgressDoc,
} from '../models';
import { DIFFICULTIES, type ApiQuestionProgress, type DifficultyT, type ProgressSnapshot, type ProgressStats } from '../types/api';
import type { ProgressUpdateBody } from '../validators/schemas';
import { getActivityDays, recentActivity, recordActivity } from './activity.service';
import { toQuestionProgress } from './mappers';
import { questionExists } from './question.service';
import { roadmapDayCount } from './roadmap.service';
import { getTopicRefs } from './topic.service';

const sortAsc = (days: number[]) => [...new Set(days)].sort((a, b) => a - b);

/** GET /api/progress — every question the user has a progress doc for (newest first) + completed roadmap days. */
export async function getSnapshot(userId: string): Promise<ProgressSnapshot> {
  const [progress, roadmap] = await Promise.all([
    QuestionProgressModel.find({ user: userId }).sort({ updatedAt: -1, _id: -1 }).lean<QuestionProgressDoc[]>(),
    RoadmapProgressModel.findOne({ user: userId }, { days: 1 }).lean<{ days: number[] }>(),
  ]);
  return { questions: progress.map(toQuestionProgress), roadmapDays: sortAsc(roadmap?.days ?? []) };
}

/** PUT /api/progress/questions/:slug — upsert; only the provided fields change. */
export async function updateQuestionProgress(userId: string, slug: string, body: ProgressUpdateBody): Promise<ApiQuestionProgress> {
  if (!(await questionExists(slug))) throw notFound(`Question "${slug}" not found`);

  const set: Partial<Pick<QuestionProgressDoc, 'status' | 'bookmarked' | 'notes' | 'confidence'>> = {};
  if (body.status !== undefined) set.status = body.status;
  if (body.bookmarked !== undefined) set.bookmarked = body.bookmarked;
  if (body.notes !== undefined) set.notes = body.notes;
  if (body.confidence !== undefined) set.confidence = body.confidence;

  const upsert = () =>
    QuestionProgressModel.findOneAndUpdate(
      { user: userId, questionSlug: slug },
      { $set: set },
      { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true },
    ).lean<QuestionProgressDoc>();

  let doc: QuestionProgressDoc | null;
  try {
    doc = await upsert();
  } catch (err) {
    // concurrent first-time upserts race on the unique {user, questionSlug} index; the retry updates
    if ((err as { code?: number }).code !== 11000) throw err;
    doc = await upsert();
  }
  await recordActivity(userId);
  return toQuestionProgress(doc!);
}

/** PUT /api/progress/roadmap/:day — mark a roadmap day done/undone; returns all completed days ascending. */
export async function setRoadmapDay(userId: string, day: number, done: boolean): Promise<number[]> {
  const total = await roadmapDayCount();
  if (total === 0) throw notFound('Roadmap not found (it has not been seeded yet)');
  if (day > total) throw notFound(`Roadmap day ${day} not found (the roadmap has ${total} days)`);

  const update = done ? { $addToSet: { days: day } } : { $pull: { days: day } };
  const upsert = () =>
    RoadmapProgressModel.findOneAndUpdate({ user: userId }, update, { upsert: true, returnDocument: 'after' }).lean<{ days: number[] }>();
  let doc: { days: number[] } | null;
  try {
    doc = await upsert();
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) throw err;
    doc = await upsert();
  }
  await recordActivity(userId);
  return sortAsc(doc?.days ?? []);
}

/** GET /api/progress/stats */
export async function getStats(userId: string): Promise<ProgressStats> {
  const uid = new Types.ObjectId(userId);
  const [topics, questions, progress, activity, quizAgg, quizByTopic, mockAgg, roadmapTotal, roadmapProgress] = await Promise.all([
    getTopicRefs(),
    QuestionModel.find({}, { _id: 0, slug: 1, topic: 1, difficulty: 1 }).lean<Pick<QuestionDoc, 'slug' | 'topic' | 'difficulty'>[]>(),
    QuestionProgressModel.find({ user: userId }, { _id: 0, questionSlug: 1, status: 1, bookmarked: 1 }).lean<
      Pick<QuestionProgressDoc, 'questionSlug' | 'status' | 'bookmarked'>[]
    >(),
    getActivityDays(userId),
    QuizAttemptModel.aggregate<{ attempts: number; avgPct: number }>([
      { $match: { user: uid } },
      { $group: { _id: null, attempts: { $sum: 1 }, avgPct: { $avg: '$pct' } } },
    ]),
    QuizAttemptModel.aggregate<{ _id: string; bestPct: number; attempts: number }>([
      { $match: { user: uid } },
      { $group: { _id: '$topic', bestPct: { $max: '$pct' }, attempts: { $sum: 1 } } },
    ]),
    MockSessionModel.aggregate<{ sessions: number; avgRating: number; totalSec: number }>([
      { $match: { user: uid } },
      { $group: { _id: null, sessions: { $sum: 1 }, avgRating: { $avg: '$avgRating' }, totalSec: { $sum: '$durationSec' } } },
    ]),
    roadmapDayCount(),
    RoadmapProgressModel.findOne({ user: userId }, { days: 1 }).lean<{ days: number[] }>(),
  ]);

  // ---- questions: totals, by topic, by difficulty (progress for removed questions is ignored)
  const questionBySlug = new Map(questions.map((q) => [q.slug, q]));
  const byTopic = new Map([...topics.values()].map((t) => [t.slug, { topic: t.slug, title: t.title, category: t.category, solved: 0, attempted: 0, total: 0 }]));
  const byDifficulty = Object.fromEntries(DIFFICULTIES.map((d) => [d, { solved: 0, total: 0 }])) as ProgressStats['byDifficulty'];
  for (const q of questions) {
    const t = byTopic.get(q.topic);
    if (t) t.total++;
    if (q.difficulty in byDifficulty) byDifficulty[q.difficulty as DifficultyT].total++;
  }
  const totals = { solved: 0, attempted: 0, bookmarked: 0, questions: questions.length };
  for (const p of progress) {
    const q = questionBySlug.get(p.questionSlug);
    if (!q) continue;
    const t = byTopic.get(q.topic);
    if (p.bookmarked) totals.bookmarked++;
    if (p.status === 'solved') {
      totals.solved++;
      if (t) t.solved++;
      if (q.difficulty in byDifficulty) byDifficulty[q.difficulty as DifficultyT].solved++;
    } else if (p.status === 'attempted') {
      totals.attempted++;
      if (t) t.attempted++;
    }
  }

  // ---- quiz
  const quiz = quizAgg[0];
  const bestByTopic = quizByTopic
    .map((r) => ({
      topic: r._id,
      title: topics.get(r._id)?.title ?? r._id,
      bestPct: r.bestPct,
      attempts: r.attempts,
      order: topics.get(r._id)?.order ?? Number.MAX_SAFE_INTEGER,
    }))
    .sort((a, b) => a.order - b.order || a.topic.localeCompare(b.topic))
    .map(({ order: _order, ...rest }) => rest);

  // ---- mock
  const mock = mockAgg[0];

  // ---- roadmap
  const completedDays = new Set((roadmapProgress?.days ?? []).filter((d) => d >= 1 && d <= roadmapTotal)).size;

  return {
    totals,
    byTopic: [...byTopic.values()],
    byDifficulty,
    streak: computeStreak(activity.map((a) => a.date)),
    activity: recentActivity(activity),
    quiz: {
      attempts: quiz?.attempts ?? 0,
      avgPct: Math.round(quiz?.avgPct ?? 0),
      bestByTopic,
    },
    mock: {
      sessions: mock?.sessions ?? 0,
      avgRating: round1(mock?.avgRating ?? 0),
      totalMinutes: Math.round((mock?.totalSec ?? 0) / 60),
    },
    roadmap: { completedDays, totalDays: roadmapTotal },
  };
}
