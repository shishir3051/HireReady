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

/**
 * Short burst limit per logged-in user (use after requireAuth). Per-IP limits are unreliable behind shared NATs and
 * on serverless hosts, so AI endpoints count per account; the durable daily cap lives in MongoDB (ai-quota.service).
 */
export function userRateLimiter(limit: number, windowMs = 60 * 1000) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => `user:${req.user?.id ?? 'anonymous'}`,
    handler: (req, res, _next, options) => {
      const message =
        req.body?.lang === 'bn'
          ? 'আপনি খুব দ্রুত মেসেজ পাঠাচ্ছেন। একটু অপেক্ষা করে আবার চেষ্টা করুন।'
          : 'You are sending messages too quickly. Please wait a moment.';
      res.status(options.statusCode).json(errorBody(message, 'RATE_LIMITED'));
    },
  });
}
