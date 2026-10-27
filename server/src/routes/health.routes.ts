import { Router } from 'express';
import * as c from '../controllers/health.controller';

export const healthRouter = Router();
healthRouter.get('/health', c.health);
healthRouter.get('/stats', c.stats);
