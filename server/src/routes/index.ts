import { Router } from 'express';
import { aiRouter } from './ai.routes';
import { authRouter } from './auth.routes';
import { healthRouter } from './health.routes';
import { mockSessionsRouter } from './mockSessions.routes';
import { progressRouter } from './progress.routes';
import { questionsRouter } from './questions.routes';
import { quizRouter } from './quiz.routes';
import { roadmapRouter } from './roadmap.routes';
import { topicsRouter } from './topics.routes';

/** Everything under /api (see docs/ARCHITECTURE.md). */
export const apiRouter = Router();
apiRouter.use('/', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/topics', topicsRouter);
apiRouter.use('/questions', questionsRouter);
apiRouter.use('/quiz', quizRouter);
apiRouter.use('/roadmap', roadmapRouter);
apiRouter.use('/progress', progressRouter);
apiRouter.use('/mock-sessions', mockSessionsRouter);
apiRouter.use('/ai', aiRouter);
