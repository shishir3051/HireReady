import type { RequestHandler } from 'express';
import { applyQuizOverlay, getRequestLang } from '../content/overlay';
import { authUser } from '../middleware/auth';
import { input } from '../middleware/validate';
import * as quiz from '../services/quiz.service';
import type { QuizAttemptBody, QuizTopicQuery } from '../validators/schemas';

export const listQuizTopics: RequestHandler = async (_req, res) => {
  res.json({ items: await quiz.listQuizTopics() });
};

export const getQuiz: RequestHandler = async (req, res) => {
  const lang = getRequestLang(req);
  const data = await quiz.getQuiz(input<{ topic: string }>(req, 'params').topic, input<QuizTopicQuery>(req, 'query'));
  res.json(applyQuizOverlay(data, lang));
};

/** optional auth: graded for everyone, saved only when logged in */
export const submitAttempt: RequestHandler = async (req, res) => {
  res.json(await quiz.gradeAttempt(input<QuizAttemptBody>(req, 'body'), req.user));
};

export const listAttempts: RequestHandler = async (req, res) => {
  res.json({ items: await quiz.listAttempts(authUser(req).id) });
};
