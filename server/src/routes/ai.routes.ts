import { Router } from 'express';
import * as c from '../controllers/ai.controller';
import { noStore } from '../middleware/cache';
import { authRateLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { aiChatBody, aiEvaluateBody } from '../validators/schemas';

export const aiRouter = Router();
aiRouter.use(noStore);

// Status check (cached / lightweight)
aiRouter.get('/status', c.status);

// Evaluate mock interview answers (20 requests / 15 min per IP)
aiRouter.post('/evaluate', authRateLimiter(25), validate({ body: aiEvaluateBody }), c.evaluate);

// Socratic AI Tutor on question pages (30 requests / 15 min per IP)
aiRouter.post('/chat', authRateLimiter(35), validate({ body: aiChatBody }), c.chat);
