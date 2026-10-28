import mongoose from 'mongoose';
import { badRequest, notFound } from '../lib/errors';
import { shuffle } from '../lib/util';
import { QuizAttemptModel, QuizQuestionModel, TopicModel, type QuizAttemptDoc, type QuizQuestionDoc } from '../models';
import type { ApiQuizAttempt, AuthUser, QuizAttemptResult, QuizResponse, QuizTopicSummary } from '../types/api';
import type { QuizAttemptBody, QuizTopicQuery } from '../validators/schemas';
import { recordActivity } from './activity.service';
import { toQuizAttempt, toQuizQuestion } from './mappers';
import { getTopicRefs } from './topic.service';
import { dbState } from '../db/connect';
import { getLocalQuiz, getLocalQuizTopics, loadStore } from '../content/localContent';

/** GET /api/quiz — topics that have quiz questions, in topic order. */
export async function listQuizTopics(): Promise<QuizTopicSummary[]> {
  if (dbState() !== 'connected') {
    return getLocalQuizTopics();
  }
  try {
    const [counts, topics] = await Promise.all([
      QuizQuestionModel.aggregate<{ _id: string; n: number }>([{ $group: { _id: '$topic', n: { $sum: 1 } } }]),
      getTopicRefs(),
    ]);
    const byTopic = new Map(counts.map((c) => [c._id, c.n]));
    return [...topics.values()]
      .filter((t) => (byTopic.get(t.slug) ?? 0) > 0)
      .map((t) => ({ topic: t.slug, title: t.title, category: t.category, count: byTopic.get(t.slug) ?? 0 }));
  } catch (err) {
    console.warn(`[db] listQuizTopics fallback to local files: ${(err as Error).message}`);
    return getLocalQuizTopics();
  }
}

async function requireTopic(slug: string) {
  if (dbState() !== 'connected') {
    const topic = loadStore().topicsBySlug.get(slug);
    if (!topic) throw notFound(`Topic "${slug}" not found`);
    return { slug: topic.slug, title: topic.title };
  }
  try {
    const topic = await TopicModel.findOne({ slug }, { _id: 0, slug: 1, title: 1 }).lean<{ slug: string; title: string }>();
    if (!topic) throw notFound(`Topic "${slug}" not found`);
    return topic;
  } catch (err) {
    if ((err as { status?: number }).status === 404) throw err;
    const topic = loadStore().topicsBySlug.get(slug);
    if (!topic) throw notFound(`Topic "${slug}" not found`);
    return { slug: topic.slug, title: topic.title };
  }
}

/** GET /api/quiz/:topic — answers included (practice tool). `shuffle` shuffles questions, not options. */
export async function getQuiz(slug: string, query: QuizTopicQuery): Promise<QuizResponse> {
  if (dbState() !== 'connected') {
    return getLocalQuiz(slug, query);
  }
  try {
    const topic = await requireTopic(slug);
    let items = await QuizQuestionModel.find({ topic: slug }).sort({ order: 1 }).lean<QuizQuestionDoc[]>();
    if (query.shuffle) items = shuffle(items);
    if (query.limit) items = items.slice(0, query.limit);
    return { topic: { slug: topic.slug, title: topic.title }, items: items.map(toQuizQuestion) };
  } catch (err) {
    if ((err as { status?: number }).status === 404) throw err;
    console.warn(`[db] getQuiz fallback to local files: ${(err as Error).message}`);
    return getLocalQuiz(slug, query);
  }
}

/** POST /api/quiz/attempts — graded for everyone; stored (and counted as activity) only for logged-in users. */
export async function gradeAttempt(body: QuizAttemptBody, user: AuthUser | undefined): Promise<QuizAttemptResult> {
  await requireTopic(body.topic);
  const ids = body.answers.map((a) => a.questionId);
  let answerById = new Map<string, number>();

  if (dbState() === 'connected') {
    try {
      const questions = await QuizQuestionModel.find(
        { topic: body.topic, id: mongoose.trusted({ $in: ids }) },
        { _id: 0, id: 1, answer: 1 },
      ).lean<Pick<QuizQuestionDoc, 'id' | 'answer'>[]>();
      answerById = new Map(questions.map((q) => [q.id, q.answer]));
    } catch {
      // fallback to local below
    }
  }

  if (answerById.size === 0) {
    const localQuiz = loadStore().quizByTopic.get(body.topic) ?? [];
    answerById = new Map(localQuiz.map((q) => [q.id, q.answer]));
  }

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
  if (user && dbState() === 'connected') {
    try {
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
    } catch (err) {
      console.warn(`[db] failed to save quiz attempt: ${(err as Error).message}`);
    }
  }
  return { score, total, pct, results, saved };
}

/** GET /api/quiz/attempts — latest 50, newest first. */
export async function listAttempts(userId: string): Promise<ApiQuizAttempt[]> {
  if (dbState() !== 'connected') {
    return [];
  }
  try {
    const [attempts, topics] = await Promise.all([
      QuizAttemptModel.find({ user: userId }).sort({ createdAt: -1, _id: -1 }).limit(50).lean<QuizAttemptDoc[]>(),
      getTopicRefs(),
    ]);
    return attempts.map((a) => toQuizAttempt(a, topics.get(a.topic)?.title ?? a.topic));
  } catch (err) {
    console.warn(`[db] listAttempts fallback: ${(err as Error).message}`);
    return [];
  }
}
