import { Router } from 'express';
import * as c from '../controllers/roadmap.controller';

export const roadmapRouter = Router();
roadmapRouter.get('/', c.roadmap);
