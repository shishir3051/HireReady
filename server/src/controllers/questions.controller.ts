import type { RequestHandler } from 'express';
import {
  applyQuestionDetailOverlay,
  applyQuestionOverlay,
  applyQuestionSummaryOverlay,
  getRequestLang,
} from '../content/overlay';
import { input } from '../middleware/validate';
import * as questions from '../services/question.service';
import type { QuestionListQuery, RandomQuery } from '../validators/schemas';

export const listQuestions: RequestHandler = async (req, res) => {
  const lang = getRequestLang(req);
  const data = await questions.listQuestions(input<QuestionListQuery>(req, 'query'));
  if (lang === 'bn') {
    data.items = data.items.map((q) => applyQuestionSummaryOverlay(q, lang));
  }
  res.json(data);
};

export const randomQuestions: RequestHandler = async (req, res) => {
  const lang = getRequestLang(req);
  const items = await questions.randomQuestions(input<RandomQuery>(req, 'query'));
  res.json({
    items: lang === 'bn' ? items.map((q) => applyQuestionOverlay(q, lang)) : items,
  });
};

export const getQuestion: RequestHandler = async (req, res) => {
  const lang = getRequestLang(req);
  const detail = await questions.getQuestionDetail(input<{ slug: string }>(req, 'params').slug);
  res.json(applyQuestionDetailOverlay(detail, lang));
};
