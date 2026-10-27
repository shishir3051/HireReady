import { Router } from 'express';
import * as c from '../controllers/mockSessions.controller';
import { requireAuth } from '../middleware/auth';
import { noStore } from '../middleware/cache';
import { validate } from '../middleware/validate';
import { mockSessionBody } from '../validators/schemas';

export const mockSessionsRouter = Router();
mockSessionsRouter.use(noStore, requireAuth);
mockSessionsRouter.post('/', validate({ body: mockSessionBody }), c.createSession);
mockSessionsRouter.get('/', c.listSessions);
