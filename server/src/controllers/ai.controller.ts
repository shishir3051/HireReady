import type { RequestHandler } from 'express';
import { geminiEnabled } from '../config/env';
import { input } from '../middleware/validate';
import * as aiService from '../services/ai.service';
import type { AiChatBody, AiEvaluateBody } from '../validators/schemas';

export const status: RequestHandler = (_req, res) => {
  res.json({ enabled: geminiEnabled });
};

export const evaluate: RequestHandler = async (req, res) => {
  const body = input<AiEvaluateBody>(req, 'body');
  const evaluation = await aiService.evaluateMockAnswer(body);
  res.json({ evaluation });
};

export const chat: RequestHandler = async (req, res) => {
  const body = input<AiChatBody>(req, 'body');
  const result = await aiService.askQuestionTutor(body);
  res.json(result);
};

