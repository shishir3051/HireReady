import { Router } from 'express';
import * as c from '../controllers/quiz.controller';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { noStore } from '../middleware/cache';
import { validate } from '../middleware/validate';
import { quizAttemptBody, quizTopicParams, quizTopicQuery } from '../validators/schemas';

export const quizRouter = Router();
quizRouter.get('/', c.listQuizTopics);
// '/attempts' must stay above '/:topic'
quizRouter.post('/attempts', noStore, optionalAuth, validate({ body: quizAttemptBody }), c.submitAttempt);
quizRouter.get('/attempts', noStore, requireAuth, c.listAttempts);
quizRouter.get('/:topic', validate({ params: quizTopicParams, query: quizTopicQuery }), c.getQuiz);
