import type { RequestHandler } from 'express';
import { applyRoadmapOverlay, getRequestLang } from '../content/overlay';
import { getRoadmap } from '../services/roadmap.service';

export const roadmap: RequestHandler = async (req, res) => {
  const lang = getRequestLang(req);
  const data = await getRoadmap();
  res.json(applyRoadmapOverlay(data, lang));
};
