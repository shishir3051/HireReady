import { Router } from 'express';
import * as c from '../controllers/ai.controller';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { noStore } from '../middleware/cache';
import { userRateLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { aiChatBody, aiEvaluateBody } from '../validators/schemas';

export const aiRouter = Router();
aiRouter.use(noStore);

// Whether AI is configured (+ today's usage when logged in)
aiRouter.get('/status', optionalAuth, c.status);

// AI features need an account: per-user burst limits here, daily caps in MongoDB (AI_DAILY_*_LIMIT).
// trackAiRequest goes first so the time budget and the "student left" signal cover the auth lookup too.
aiRouter.post('/evaluate', c.trackAiRequest, requireAuth, userRateLimiter(5), validate({ body: aiEvaluateBody }), c.evaluate);
aiRouter.post('/chat', c.trackAiRequest, requireAuth, userRateLimiter(10), validate({ body: aiChatBody }), c.chat);
