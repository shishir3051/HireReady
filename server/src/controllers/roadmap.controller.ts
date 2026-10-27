import type { RequestHandler } from 'express';
import { getRoadmap } from '../services/roadmap.service';

export const roadmap: RequestHandler = async (_req, res) => {
  res.json(await getRoadmap());
};
