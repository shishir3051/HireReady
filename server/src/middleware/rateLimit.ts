import { rateLimit } from 'express-rate-limit';
import { errorBody } from '../lib/errors';

const WINDOW_MS = 15 * 60 * 1000;

/** `limit` requests / 15 min / IP (default 20). One instance per route so each endpoint has its own budget. */
export function authRateLimiter(limit = 20) {
  return rateLimit({
    windowMs: WINDOW_MS,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res, _next, options) => {
      res.status(options.statusCode).json(errorBody('Too many attempts. Please wait 15 minutes and try again.', 'RATE_LIMITED'));
    },
  });
}
