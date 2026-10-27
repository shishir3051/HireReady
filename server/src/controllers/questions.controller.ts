import type { RequestHandler } from 'express';
import { input } from '../middleware/validate';
import * as questions from '../services/question.service';
import type { QuestionListQuery, RandomQuery } from '../validators/schemas';

export const listQuestions: RequestHandler = async (req, res) => {
  res.json(await questions.listQuestions(input<QuestionListQuery>(req, 'query')));
};

export const randomQuestions: RequestHandler = async (req, res) => {
  res.json({ items: await questions.randomQuestions(input<RandomQuery>(req, 'query')) });
};

export const getQuestion: RequestHandler = async (req, res) => {
  res.json(await questions.getQuestionDetail(input<{ slug: string }>(req, 'params').slug));
};
