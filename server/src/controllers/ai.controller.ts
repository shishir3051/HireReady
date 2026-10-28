import type { RequestHandler, Response } from 'express';
import { geminiEnabled } from '../config/env';
import { applyQuestionDetailOverlay } from '../content/overlay';
import { authUser } from '../middleware/auth';
import { input } from '../middleware/validate';
import * as aiService from '../services/ai.service';
import { consumeAiQuota, getAiUsage, refundAiQuota, type AiUsage } from '../services/ai-quota.service';
import { getQuestionDetail } from '../services/question.service';
import type { AiChatBody, AiEvaluateBody } from '../validators/schemas';

/** The real question (Bangla overlay applied when asked) — never trust question text sent by the browser. */
async function loadQuestion(slug: string, lang: 'en' | 'bn') {
  const detail = applyQuestionDetailOverlay(await getQuestionDetail(slug), lang);
  return { question: detail.question, topicTitle: detail.topic.title };
}

/** GET /ai/status — whether AI is configured, plus today's usage for a logged-in user. */
export const status: RequestHandler = async (req, res) => {
  const usage = geminiEnabled && req.user ? await getAiUsage(req.user.id).catch(() => undefined) : undefined;
  res.json({ enabled: geminiEnabled, usage });
};

interface AiRequestContext {
  /** when the request reached us: time budgets count from here, database work included */
  arrivedAt: number;
  /** aborts when the student goes away before we answered (closed the chat, navigated, proxy timeout) */
  left: AbortSignal;
}

/**
 * First middleware on the AI routes, ahead of auth and the database: notes the arrival time and starts watching
 * for a disconnect, so a student who leaves at any point is noticed (and refunded) instead of paying for Gemini.
 */
export const trackAiRequest: RequestHandler = (req, res, next) => {
  const disconnected = new AbortController();
  if (req.destroyed || res.destroyed) disconnected.abort();
  res.on('close', () => {
    if (!res.writableEnded) disconnected.abort();
  });
  res.locals.ai = { arrivedAt: Date.now(), left: disconnected.signal } satisfies AiRequestContext;
  next();
};

const aiContext = (res: Response): AiRequestContext => res.locals.ai;

/** POST /ai/evaluate — JSON feedback on mock-interview notes. */
export const evaluate: RequestHandler = async (req, res) => {
  const body = input<AiEvaluateBody>(req, 'body');
  const userId = authUser(req).id;
  const lang = body.lang ?? 'en';
  const { arrivedAt, left } = aiContext(res);
  const q = await loadQuestion(body.slug, lang); // unknown slug → 404 before any quota is used
  if (left.aborted) return; // gone already: don't spend their quota
  const usage = await consumeAiQuota(userId, 'evaluate', lang);
  try {
    const evaluation = await aiService.evaluateMockAnswer({ ...q, userNotes: body.userNotes, lang }, left, arrivedAt);
    res.json({ evaluation, usage });
  } catch (err) {
    await refundAiQuota(userId, 'evaluate');
    if (left.aborted) return; // nobody is waiting for an answer
    throw err;
  }
};

function startTextStream(res: Response, usage: AiUsage) {
  res.status(200);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  // no-transform: compression layers (e.g. Next.js's gzip on the /api rewrite) would otherwise buffer the whole reply
  res.setHeader('Cache-Control', 'no-store, no-transform');
  res.setHeader('X-Accel-Buffering', 'no'); // ask nginx-style proxies not to buffer the stream
  res.setHeader('X-AI-Usage', `${usage.used}/${usage.limit}`);
  res.flushHeaders();
}

/**
 * POST /ai/chat — streams the tutor's reply as plain text while Gemini generates it.
 * Failures before the first word return a normal JSON error; a failure mid-answer ends the text with a short note.
 */
export const chat: RequestHandler = async (req, res) => {
  const body = input<AiChatBody>(req, 'body');
  const userId = authUser(req).id;
  const lang = body.lang ?? 'en';
  const { arrivedAt, left } = aiContext(res);
  const q = await loadQuestion(body.slug, lang);
  if (left.aborted) return; // gone already: don't spend their quota
  const usage = await consumeAiQuota(userId, 'chat', lang);

  let started = false;
  try {
    await aiService.streamQuestionTutor(
      {
        ...q,
        message: body.message,
        history: body.history,
        lang,
      },
      (text) => {
        if (!started) {
          startTextStream(res, usage);
          started = true;
        }
        res.write(text);
      },
      left,
      arrivedAt,
    );
    if (started) res.end();
    else await refundAiQuota(userId, 'chat'); // the student left before any answer arrived
  } catch (err) {
    if (!started) {
      await refundAiQuota(userId, 'chat');
      throw err;
    }
    res.end(lang === 'bn' ? '\n\n⚠️ উত্তরটি মাঝপথে থেমে গেছে। আবার চেষ্টা করুন।' : '\n\n⚠️ The answer was cut off. Please try again.');
  }
};
