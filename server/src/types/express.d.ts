import type { AuthUser } from './api';

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth / optionalAuth. */
      user?: AuthUser;
      /** Parsed + validated input, set by the `validate` middleware (req.query is read-only in Express 5). */
      validated?: { body?: unknown; query?: unknown; params?: unknown };
    }
  }
}

export {};
