import type { RequestHandler } from 'express';
import { authUser } from '../middleware/auth';
import { input } from '../middleware/validate';
import * as mock from '../services/mock.service';
import type { MockSessionBody } from '../validators/schemas';

export const createSession: RequestHandler = async (req, res) => {
  res.status(201).json({ session: await mock.createSession(authUser(req).id, input<MockSessionBody>(req, 'body')) });
};

export const listSessions: RequestHandler = async (req, res) => {
  res.json({ items: await mock.listSessions(authUser(req).id) });
};
