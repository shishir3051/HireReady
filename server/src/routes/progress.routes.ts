import { Router } from 'express';
import * as c from '../controllers/progress.controller';
import { requireAuth } from '../middleware/auth';
import { noStore } from '../middleware/cache';
import { validate } from '../middleware/validate';
import { slugParams } from '../validators/common';
import { progressUpdateBody, roadmapDayBody, roadmapDayParams } from '../validators/schemas';

export const progressRouter = Router();
progressRouter.use(noStore, requireAuth);
progressRouter.get('/', c.getProgress);
progressRouter.get('/stats', c.getStats);
progressRouter.put('/questions/:slug', validate({ params: slugParams, body: progressUpdateBody }), c.updateQuestionProgress);
progressRouter.put('/roadmap/:day', validate({ params: roadmapDayParams, body: roadmapDayBody }), c.setRoadmapDay);
