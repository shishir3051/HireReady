import type { RequestHandler } from 'express';
import { dbState } from '../db/connect';
import { getPlatformStats } from '../services/stats.service';

export const health: RequestHandler = (_req, res) => {
  res.json({ ok: true, db: dbState(), uptime: Math.round(process.uptime()) });
};

export const stats: RequestHandler = async (_req, res) => {
  res.json(await getPlatformStats());
};
