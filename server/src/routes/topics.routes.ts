import { Router } from 'express';
import * as c from '../controllers/topics.controller';
import { validate } from '../middleware/validate';
import { slugParams } from '../validators/common';

export const topicsRouter = Router();
topicsRouter.get('/', c.listTopics);
topicsRouter.get('/:slug', validate({ params: slugParams }), c.getTopic);
