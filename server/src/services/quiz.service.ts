import mongoose from 'mongoose';
import { badRequest, notFound } from '../lib/errors';
import { shuffle } from '../lib/util';
import { QuizAttemptModel, QuizQuestionModel, TopicModel, type QuizAttemptDoc, type QuizQuestionDoc } from '../models';
import type { ApiQuizAttempt, AuthUser, QuizAttemptResult, QuizResponse, QuizTopicSummary } from '../types/api';
import type { QuizAttemptBody, QuizTopicQuery } from '../validators/schemas';
import { recordActivity } from './activity.service';
import { toQuizAttempt, toQuizQuestion } from './mappers';
import { getTopicRefs } from './topic.service';

/** GET /api/quiz — topics that have quiz questions, in topic order. */
export async function listQuizTopics(): Promise<QuizTopicSummary[]> {
  const [counts, topics] = await Promise.all([
    QuizQuestionModel.aggregate<{ _id: string; n: number }>([{ $group: { _id: '$topic', n: { $sum: 1 } } }]),
    getTopicRefs(),
  ]);
  const byTopic = new Map(counts.map((c) => [c._id, c.n]));
  return [...topics.values()]
    .filter((t) => (byTopic.get(t.slug) ?? 0) > 0)
    .map((t) => ({ topic: t.slug, title: t.title, category: t.category, count: byTopic.get(t.slug) ?? 0 }));
}

async function requireTopic(slug: string) {
  const topic = await TopicModel.findOne({ slug }, { _id: 0, slug: 1, title: 1 }).lean<{ slug: string; title: string }>();
  if (!topic) throw notFound(`Topic "${slug}" not found`);
  return topic;
}

/** GET /api/quiz/:topic — answers included (practice tool). `shuffle` shuffles questions, not options. */
export async function getQuiz(slug: string, query: QuizTopicQuery): Promise<QuizResponse> {
  const topic = await requireTopic(slug);
  let items = await QuizQuestionModel.find({ topic: slug }).sort({ order: 1 }).lean<QuizQuestionDoc[]>();
  if (query.shuffle) items = shuffle(items);
  if (query.limit) items = items.slice(0, query.limit);
  return { topic: { slug: topic.slug, title: topic.title }, items: items.map(toQuizQuestion) };
}

/** POST /api/quiz/attempts — graded for everyone; stored (and counted as activity) only for logged-in users. */
export async function gradeAttempt(body: QuizAttemptBody, user: AuthUser | undefined): Promise<QuizAttemptResult> {
  await requireTopic(body.topic);
  const ids = body.answers.map((a) => a.questionId);
  const questions = await QuizQuestionModel.find(
    { topic: body.topic, id: mongoose.trusted({ $in: ids }) },
    { _id: 0, id: 1, answer: 1 },
  ).lean<Pick<QuizQuestionDoc, 'id' | 'answer'>[]>();
  const answerById = new Map(questions.map((q) => [q.id, q.answer]));
  const unknown = ids.filter((id) => !answerById.has(id));
  if (unknown.length) {
    throw badRequest(`Unknown quiz question id(s) for topic "${body.topic}": ${unknown.join(', ')}`, [
      { path: 'body.answers', message: `not in topic "${body.topic}": ${unknown.join(', ')}`, code: 'invalid_value' },
    ]);
  }

  const results = body.answers.map((a) => {
    const answer = answerById.get(a.questionId)!;
    return { questionId: a.questionId, selected: a.selected, answer, correct: a.selected === answer };
  });
  const score = results.filter((r) => r.correct).length;
  const total = results.length;
  const pct = Math.round((score / total) * 100);

  let saved = false;
  if (user) {
    await QuizAttemptModel.create({
      user: user.id,
      topic: body.topic,
      score,
      total,
      pct,
      answers: results.map((r) => ({ questionId: r.questionId, selected: r.selected, correct: r.correct })),
    });
    await recordActivity(user.id);
    saved = true;
  }
  return { score, total, pct, results, saved };
}

/** GET /api/quiz/attempts — latest 50, newest first. */
export async function listAttempts(userId: string): Promise<ApiQuizAttempt[]> {
  const [attempts, topics] = await Promise.all([
    QuizAttemptModel.find({ user: userId }).sort({ createdAt: -1, _id: -1 }).limit(50).lean<QuizAttemptDoc[]>(),
    getTopicRefs(),
  ]);
  return attempts.map((a) => toQuizAttempt(a, topics.get(a.topic)?.title ?? a.topic));
}
