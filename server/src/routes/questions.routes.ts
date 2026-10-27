import { Router } from 'express';
import * as c from '../controllers/questions.controller';
import { validate } from '../middleware/validate';
import { slugParams } from '../validators/common';
import { questionListQuery, randomQuery } from '../validators/schemas';

export const questionsRouter = Router();
questionsRouter.get('/', validate({ query: questionListQuery }), c.listQuestions);
// must stay above '/:slug'
questionsRouter.get('/random', validate({ query: randomQuery }), c.randomQuestions);
questionsRouter.get('/:slug', validate({ params: slugParams }), c.getQuestion);
