import type { RequestHandler } from 'express';

/** Per-user responses must never be cached by browsers or shared caches. */
export const noStore: RequestHandler = (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
};
