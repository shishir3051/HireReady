import type { RequestHandler } from 'express';
import {
  applyTopicDetailOverlay,
  applyTopicSummaryOverlay,
  getRequestLang,
} from '../content/overlay';
import { input } from '../middleware/validate';
import * as topics from '../services/topic.service';

export const listTopics: RequestHandler = async (req, res) => {
  const lang = getRequestLang(req);
  const items = await topics.listTopics();
  res.json({
    items: lang === 'bn' ? items.map((t) => applyTopicSummaryOverlay(t, lang)) : items,
  });
};

export const getTopic: RequestHandler = async (req, res) => {
  const lang = getRequestLang(req);
  const detail = await topics.getTopicDetail(input<{ slug: string }>(req, 'params').slug);
  res.json(applyTopicDetailOverlay(detail, lang));
};
