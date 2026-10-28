import { setTimeout as delay } from 'node:timers/promises';
import { env, geminiEnabled } from '../config/env';
import { HttpError, serviceUnavailable, tooManyRequests } from '../lib/errors';

export type Lang = 'en' | 'bn';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-3.5-flash-lite';

/**
 * Why a Gemini call failed, sorted by what to do next:
 * - daily: the model's free quota for today is used up (Google resets it at midnight Pacific time) → use the backup model
 * - minute: a per-minute limit → fine again after `retryAfterMs`
 * - overloaded: 5xx / 408 or Google unreachable → retry shortly, then the backup model
 * - stalled: an attempt gave no answer within its time limit → straight to the backup (it would likely stall again)
 * - empty: the call worked but gave no usable answer (e.g. MALFORMED_RESPONSE) → retry once
 * - blocked: Google's safety filters refused this message → same result on any model, so stop and ask to rephrase
 * - fatal: bad request, key or model problem → retrying the same model won't help
 */
export type GeminiFailure = 'daily' | 'minute' | 'overloaded' | 'stalled' | 'empty' | 'blocked' | 'fatal';

export class GeminiError extends Error {
  constructor(
    readonly failure: GeminiFailure,
    readonly retryAfterMs?: number,
  ) {
    super(`Gemini ${failure}`);
    this.name = 'GeminiError';
  }
}

export const isAbortError = (err: unknown) => err instanceof Error && err.name === 'AbortError';

/** "27s" / "1.5s" (google.rpc.RetryInfo.retryDelay) → milliseconds */
function parseDelay(value: unknown): number | undefined {
  const match = typeof value === 'string' ? /^(\d+(?:\.\d+)?)s$/.exec(value.trim()) : null;
  return match ? Math.round(Number(match[1]) * 1000) : undefined;
}

/** Turns a Gemini error response (HTTP status + `{ error }` body) into a GeminiError. */
export function classifyGeminiError(status: number, body: any): GeminiError {
  const details: any[] = Array.isArray(body?.error?.details) ? body.error.details : [];
  const retryInfo = details.find((d) => String(d?.['@type'] ?? '').endsWith('google.rpc.RetryInfo'));
  const retryAfterMs =
    parseDelay(retryInfo?.retryDelay) ?? parseDelay(/retry in (\d+(?:\.\d+)?)s/i.exec(String(body?.error?.message ?? ''))?.[1] + 's');

  if (status === 429) {
    // QuotaFailure names the limit, e.g. GenerateRequestsPerDayPerProjectPerModel-FreeTier; a per-day one wins,
    // because its retryDelay is often a misleading few seconds
    const quotaIds: string[] = details.flatMap((d) =>
      Array.isArray(d?.violations) ? d.violations.map((v: any) => String(v?.quotaId ?? '')) : [],
    );
    if (quotaIds.some((id) => /PerDay/i.test(id))) return new GeminiError('daily');
    return new GeminiError('minute', retryAfterMs);
  }
  if (status === 408 || status >= 500) return new GeminiError('overloaded', retryAfterMs);
  return new GeminiError('fatal');
}

/** Finish reasons that mean Google refused this message (filters, unsupported language); asking again won't help. */
const BLOCKED_FINISH = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'RECITATION', 'IMAGE_SAFETY', 'LANGUAGE']);

/**
 * The failure for a response with no usable text. Blocked → stop. MAX_TOKENS (thinking used the whole allowance) →
 * this model would likely do it again, so 'fatal' moves on to the backup without a retry. Anything else
 * (MALFORMED_RESPONSE, OTHER, none) is a fluke worth one retry.
 */
export function noAnswerError(model: string, finishReason?: string, blockReason?: string): GeminiError {
  console.error(`[ai] ${model} returned no text (finishReason: ${finishReason ?? '-'}, blockReason: ${blockReason ?? '-'})`);
  if (blockReason || (finishReason && BLOCKED_FINISH.has(finishReason))) return new GeminiError('blocked');
  if (finishReason === 'MAX_TOKENS') return new GeminiError('fatal');
  return new GeminiError('empty');
}

/** True when an answer that did produce text was stopped part-way rather than finishing normally. */
export const stoppedEarly = (finishReason?: string) =>
  finishReason === 'MAX_TOKENS' || (finishReason !== undefined && BLOCKED_FINISH.has(finishReason));

/** POSTs to a Gemini model; the API key goes in a header so it never appears in URLs or proxy logs. */
export async function geminiFetch(
  model: string,
  method: 'generateContent' | 'streamGenerateContent',
  payload: Record<string, unknown>,
  signal: AbortSignal,
): Promise<Response> {
  if (!geminiEnabled || !env.GEMINI_API_KEY) {
    throw serviceUnavailable('Gemini AI is not configured on this server');
  }
  const query = method === 'streamGenerateContent' ? '?alt=sse' : '';
  let res: Response;
  try {
    res = await fetch(`${GEMINI_BASE_URL}/${model}:${method}${query}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (err) {
    if (isAbortError(err)) throw err;
    // DNS failure, connection reset, connect timeout…: worth a retry or the backup model
    console.error(`[ai] ${model} ${method} could not reach Google: ${(err as Error).message}`);
    throw new GeminiError('overloaded');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let body: any;
    try {
      body = JSON.parse(text);
    } catch {
      // not JSON; classify by status alone
    }
    console.error(`[ai] ${model} ${method} failed (${res.status}): ${body?.error?.message ?? text.slice(0, 300)}`);
    throw classifyGeminiError(res.status, body);
  }
  return res;
}

/**
 * Gives one attempt its own time limit inside the overall budget, so a model that stalls counts as 'stalled'
 * and withGemini moves on instead of spending the whole budget on it. `run` gets the attempt's signal and a
 * `started` callback that stops the attempt timer (a stream calls it once text is flowing).
 */
export async function withAttemptTimeout<T>(
  signal: AbortSignal,
  ms: number,
  run: (signal: AbortSignal, started: () => void) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (signal.aborted) controller.abort();
  else signal.addEventListener('abort', onAbort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, ms);
  try {
    return await run(controller.signal, () => clearTimeout(timer));
  } catch (err) {
    if (timedOut && !signal.aborted && isAbortError(err)) {
      console.error(`[ai] Gemini attempt gave no answer within ${ms / 1000} s`);
      throw new GeminiError('stalled');
    }
    throw err;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', onAbort);
  }
}

/** Google resets per-day quotas at midnight Pacific time. */
export function nextQuotaReset(now = new Date()): Date {
  const pacific = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hourCycle: 'h23',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  });
  const part = (date: Date, type: string) => Number(pacific.formatToParts(date).find((p) => p.type === type)?.value ?? 0);
  const sinceMidnight =
    ((part(now, 'hour') * 60 + part(now, 'minute')) * 60 + part(now, 'second')) * 1000 + now.getMilliseconds();
  let reset = new Date(now.getTime() - sinceMidnight + 24 * 3_600_000);
  // a daylight-saving day is 23 or 25 hours long: nudge onto midnight
  const hour = part(reset, 'hour');
  if (hour === 23) reset = new Date(reset.getTime() + 3_600_000);
  else if (hour === 1) reset = new Date(reset.getTime() - 3_600_000);
  return reset;
}

/** e.g. "2:00 PM" / "২:০০ PM" in Bangladesh time, where our users are */
function bangladeshTime(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-US', {
    timeZone: 'Asia/Dhaka',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

const bangladeshDate = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(date);

/** What students see when Gemini fails for a reason they can't act on; the real reason is only logged. */
export function aiUnavailableMessage(lang: Lang): string {
  return lang === 'bn'
    ? 'হীরা এই মুহূর্তে উত্তর দিতে পারছে না। এক মিনিট পরে আবার চেষ্টা করুন।'
    : 'Hira is unavailable right now. Please try again in a minute.';
}

/** The quota usually runs out in the evening, when the reset is tomorrow afternoon in Bangladesh: say so. */
export function dailyLimitMessage(lang: Lang, now = new Date()): string {
  const reset = nextQuotaReset(now);
  const tomorrow = bangladeshDate(reset) !== bangladeshDate(now);
  const time = bangladeshTime(reset, lang);
  return lang === 'bn'
    ? `হীরা আজকের ফ্রি AI লিমিট শেষ করে ফেলেছে। ${tomorrow ? 'আগামীকাল ' : ''}বাংলাদেশ সময় ${time}-এর পর আবার চেষ্টা করুন। এটি আপনার দৈনিক লিমিটে গোনা হয়নি।`
    : `Hira has used up today's free AI limit. Please try again after ${time}${tomorrow ? ' tomorrow' : ''} (Bangladesh time). This didn't count toward your daily limit.`;
}

function busyMessage(lang: Lang, retryAfterMs: number): string {
  const seconds = Math.min(60, Math.max(5, Math.ceil(retryAfterMs / 1000)));
  return lang === 'bn'
    ? `হীরা এই মুহূর্তে অনেক প্রশ্নের উত্তর দিচ্ছে। প্রায় ${seconds} সেকেন্ড পরে আবার চেষ্টা করুন।`
    : `Hira is answering a lot of questions right now. Please try again in about ${seconds} seconds.`;
}

function blockedMessage(lang: Lang): string {
  return lang === 'bn'
    ? 'হীরা এই মেসেজের উত্তর দিতে পারছে না। এই সমস্যা নিয়ে প্রশ্নটি অন্যভাবে লিখে দেখুন।'
    : "Hira can't answer that message. Please rephrase your question about this problem.";
}

/** The error to show once every model has failed, judged from what happened to each of them. */
function finalError(outcomes: GeminiError[], lang: Lang): HttpError {
  const busy = outcomes.filter((o) => o.failure === 'minute');
  if (busy.length) return tooManyRequests(busyMessage(lang, Math.min(...busy.map((o) => o.retryAfterMs ?? 30_000))));
  // out for the day, and the only other problem is one retrying can't fix (e.g. a misnamed backup model)
  if (outcomes.some((o) => o.failure === 'daily') && outcomes.every((o) => o.failure === 'daily' || o.failure === 'fatal')) {
    return tooManyRequests(dailyLimitMessage(lang));
  }
  return serviceUnavailable(aiUnavailableMessage(lang));
}

/** Wait at most this long for a per-minute limit; a longer wait switches to the backup model instead. */
const MAX_WAIT_MS = 5_000;
/** A model whose daily quota ran out is skipped until the reset, rechecked every 30 min in case it came early. */
const RECHECK_MS = 30 * 60_000;
const exhaustedUntil = new Map<string, number>();

/** For tests: forget which models ran out today. */
export function resetGeminiQuotaState(): void {
  exhaustedUntil.clear();
}

/**
 * Runs one Gemini call with the main model, then the backup model (same key, separate per-model quota) when the main
 * one is out of quota, overloaded or failing. Each model gets one quick retry when the wait is short. When every model
 * fails, the error says why in the student's language (daily limit with the reset time, busy, or unavailable).
 * `run` must throw GeminiError for Gemini failures; any other error (aborts, our own HttpErrors, a reply that broke
 * off after text was already sent) is passed straight through, never retried.
 */
export async function withGemini<T>(run: (model: string) => Promise<T>, lang: Lang, signal: AbortSignal): Promise<T> {
  const models = [...new Set([env.GEMINI_MODEL || DEFAULT_MODEL, env.GEMINI_BACKUP_MODEL].filter(Boolean))];
  const outcomes: GeminiError[] = []; // each model's last failure; one skipped as used up counts as 'daily'

  for (const [index, model] of models.entries()) {
    if ((exhaustedUntil.get(model) ?? 0) > Date.now()) {
      outcomes.push(new GeminiError('daily'));
      continue;
    }
    let last: GeminiError | undefined;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const result = await run(model);
        if (index > 0) console.warn(`[ai] answered with the backup model ${model}`);
        return result;
      } catch (err) {
        if (!(err instanceof GeminiError)) throw err;
        last = err;
        if (err.failure === 'blocked') throw new HttpError(422, blockedMessage(lang), 'AI_BLOCKED');
        if (err.failure === 'daily') {
          exhaustedUntil.set(model, Math.min(nextQuotaReset().getTime(), Date.now() + RECHECK_MS));
          break;
        }
        if (err.failure === 'fatal' || err.failure === 'stalled') break;
        const wait = err.retryAfterMs ?? (err.failure === 'minute' ? 2_000 : 1_000);
        if (attempt === 1 && wait <= MAX_WAIT_MS) {
          await delay(wait + Math.floor(Math.random() * 250), undefined, { signal }); // a little jitter
          continue;
        }
        break;
      }
    }
    if (last) outcomes.push(last);
  }

  throw finalError(outcomes, lang);
}
