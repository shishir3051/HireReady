import type { RequestHandler } from 'express';
import { input } from '../middleware/validate';
import * as topics from '../services/topic.service';

export const listTopics: RequestHandler = async (_req, res) => {
  res.json({ items: await topics.listTopics() });
};

export const getTopic: RequestHandler = async (req, res) => {
  res.json(await topics.getTopicDetail(input<{ slug: string }>(req, 'params').slug));
};
