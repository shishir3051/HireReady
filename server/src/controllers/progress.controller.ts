import type { RequestHandler } from 'express';
import { authUser } from '../middleware/auth';
import { input } from '../middleware/validate';
import * as progress from '../services/progress.service';
import type { ProgressUpdateBody } from '../validators/schemas';

export const getProgress: RequestHandler = async (req, res) => {
  res.json(await progress.getSnapshot(authUser(req).id));
};

export const updateQuestionProgress: RequestHandler = async (req, res) => {
  const { slug } = input<{ slug: string }>(req, 'params');
  res.json({ progress: await progress.updateQuestionProgress(authUser(req).id, slug, input<ProgressUpdateBody>(req, 'body')) });
};

export const setRoadmapDay: RequestHandler = async (req, res) => {
  const { day } = input<{ day: number }>(req, 'params');
  const { done } = input<{ done: boolean }>(req, 'body');
  res.json({ roadmapDays: await progress.setRoadmapDay(authUser(req).id, day, done) });
};

export const getStats: RequestHandler = async (req, res) => {
  res.json(await progress.getStats(authUser(req).id));
};
