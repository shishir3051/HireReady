import { badRequest, serviceUnavailable } from '../lib/errors';
import type { ApiQuestion } from '../types/api';
import {
  aiUnavailableMessage,
  classifyGeminiError,
  geminiFetch,
  GeminiError,
  isAbortError,
  noAnswerError,
  stoppedEarly,
  withAttemptTimeout,
  withGemini,
} from './gemini-client';

export interface AiEvaluationInput {
  question: ApiQuestion;
  topicTitle?: string;
  userNotes: string;
  lang?: 'en' | 'bn';
}

export interface AiEvaluationResult {
  rating: number; // 1 to 5
  verdict: 'Strong Hire' | 'Hire' | 'Lean Hire' | 'Lean No Hire' | 'No Hire';
  summary: string;
  strengths: string[];
  improvements: string[];
  missingEdgeCases: string[];
}

export interface AiChatInput {
  question: ApiQuestion;
  topicTitle?: string;
  message: string;
  history?: Array<{ role: 'user' | 'model'; text: string }>;
  lang?: 'en' | 'bn';
}

/**
 * Thinking lets the model reason before it answers, which makes complexity claims and code tracing more reliable.
 * The tutor uses "low": it still thinks on hard messages (tracing code) but starts quick replies in ~1–2 s.
 * Reviews use "medium" (~4 s): a careful verdict matters more there than speed. Thinking tokens count against
 * maxOutputTokens, hence the headroom below. (Gemini 3.5 ignores temperature, so we don't send it.)
 */
const TUTOR_THINKING = { thinkingLevel: 'low' } as const;
const REVIEW_THINKING = { thinkingLevel: 'medium' } as const;

/** rating 1–5 → verdict, exactly as the rating scale in the prompts defines it */
const VERDICTS = ['No Hire', 'Lean No Hire', 'Lean Hire', 'Hire', 'Strong Hire'] as const;

/**
 * Time budgets. Both the Next.js /api proxy (30 s with no bytes) and Vercel (maxDuration 30) cut requests off at
 * 30 s, so every retry and the backup model must fit well inside that. A single attempt that stalls is given up on
 * early so the backup still has time.
 */
const CHAT_BUDGET_MS = 28_000; // from the request's arrival: the whole streamed reply, retries and waits included
const CHAT_FIRST_TEXT_MS = 10_000; // per attempt, until its first text arrives
const REVIEW_BUDGET_MS = 25_000; // from arrival; the review sends nothing until it is done
const REVIEW_ATTEMPT_MS = 12_000;

/** Text parts of a Gemini response, without any thought summaries. */
function answerText(data: any): string {
  const parts: Array<{ text?: string; thought?: boolean }> = data?.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((p) => !p.thought)
    .map((p) => p.text ?? '')
    .join('');
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}…` : text);
const bullets = (items: string[] | undefined) => (items ?? []).map((s) => `- ${s}`).join('\n');

/**
 * The question's own HireReady content (written and validated by us), given to Gemini as ground truth so Hira agrees
 * with the page the student is reading instead of answering from memory. Long parts are clipped to keep each request
 * around 3k tokens on the free tier.
 */
function questionReference(q: ApiQuestion, topicTitle?: string): string {
  const s = q.solution;
  const code = s.code?.[0];
  const sections: Array<[string, string | undefined]> = [
    ['Question', `${q.title} (${[topicTitle, q.difficulty, q.kind, q.pattern].filter(Boolean).join(' · ')})`],
    ['Problem statement', clip(q.prompt, 2500)],
    [
      'Examples',
      q.examples
        ?.slice(0, 3)
        .map((e) => `- Input: ${e.input}\n  Output: ${e.output}${e.explanation ? `\n  Why: ${e.explanation}` : ''}`)
        .join('\n'),
    ],
    ['Constraints', bullets(q.constraints)],
    ['Hint ladder (vaguest first)', q.hints.map((h, i) => `${i + 1}. ${h}`).join('\n')],
    ['Approaches (brute force → optimal)', q.approaches.map((a) => `- ${a.name}: ${a.idea} — time ${a.time}, space ${a.space}`).join('\n')],
    ['30-second answer', s.summary],
    ['Optimal complexity', s.complexity && `time ${s.complexity.time}, space ${s.complexity.space}`],
    ['Key points interviewers want', bullets(s.keyPoints)],
    ['Walkthrough', clip(s.explanation, 2500)],
    ['Reference code', code && `\`\`\`${code.language}\n${clip(code.code, 1800)}\n\`\`\``],
    ['Common pitfalls', bullets(q.pitfalls)],
    ['Follow-up questions', q.followUps?.slice(0, 4).map((f) => `- Q: ${f.question}\n  A: ${clip(f.answer, 400)}`).join('\n')],
  ];
  const body = sections
    .filter(([, text]) => text)
    .map(([title, text]) => `## ${title}\n${text}`)
    .join('\n\n');
  return `<reference>\n${body}\n</reference>`;
}

/** Structured output for the evaluator; rating comes last so the model writes its critique before scoring. */
const EVALUATION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    strengths: { type: 'ARRAY', items: { type: 'STRING' } },
    improvements: { type: 'ARRAY', items: { type: 'STRING' } },
    missingEdgeCases: { type: 'ARRAY', items: { type: 'STRING' } },
    rating: { type: 'INTEGER' },
  },
  required: ['summary', 'strengths', 'improvements', 'missingEdgeCases', 'rating'],
  propertyOrdering: ['summary', 'strengths', 'improvements', 'missingEdgeCases', 'rating'],
};

const strings = (value: unknown) =>
  Array.isArray(value) ? value.filter((s): s is string => typeof s === 'string' && s.trim() !== '').slice(0, 4) : [];

/**
 * Evaluates candidate notes / draft code against the question and its verified reference solution.
 * `signal` aborts when the student disconnects; the abort is rethrown so the caller can refund and stop.
 * `arrivedAt` is when the request came in: the time budget counts from there.
 */
export async function evaluateMockAnswer(
  input: AiEvaluationInput,
  signal?: AbortSignal,
  arrivedAt = Date.now(),
): Promise<AiEvaluationResult> {
  const { question, topicTitle, userNotes, lang = 'en' } = input;

  if (!userNotes || userNotes.trim().length < 5) {
    throw badRequest('Please provide your notes or draft solution before requesting an evaluation.');
  }

  const isBn = lang === 'bn';
  const systemInstruction = isBn
    ? `আপনি হীরা — HireReady-এর AI ইন্টারভিউ কোচ, এখানে একজন কঠোর কিন্তু ন্যায্য সিনিয়র সফটওয়্যার ইঞ্জিনিয়ারিং ইন্টারভিউয়ার। একজন জুনিয়র প্রার্থী মক ইন্টারভিউতে নিচের প্রশ্নের জন্য খসড়া নোট বা কোড লিখেছেন। REFERENCE অংশটি HireReady এই প্রশ্নের জন্য লিখে যাচাই করেছে; এর সাথে মিলিয়ে মূল্যায়ন করুন।

সঠিক মূল্যায়নের নিয়ম:
- সিদ্ধান্ত নেওয়ার আগে প্রার্থীর অ্যাপ্রোচটি REFERENCE-এর উদাহরণগুলোতে ধাপে ধাপে চালিয়ে দেখুন।
- প্রার্থীর কমপ্লেক্সিটি REFERENCE-এর অপ্টিমাল কমপ্লেক্সিটির সাথে তুলনা করুন। ভিন্ন কিন্তু সঠিক অ্যাপ্রোচ গ্রহণযোগ্য; সেটিকে তার নিজের যোগ্যতায় বিচার করুন।
- নোট ছোট বা pseudo-code হতে পারে: সিনট্যাক্স নয়, আইডিয়া ও যুক্তি বিচার করুন।
- নোটে যা আসলে আছে শুধু তারই প্রশংসা করুন, এবং শুধু সেই এজ কেসগুলো উল্লেখ করুন যা প্রশ্নের constraints অনুযায়ী সম্ভব।
- কমপ্লেক্সিটি সাধারণ লেখায় দিন, যেমন O(n log n); কখনো LaTeX বা $…$ ব্যবহার করবেন না।

রেটিং স্কেল ১ থেকে ৫:
1: No Hire (অপ্রাসঙ্গিক বা মৌলিকভাবে ভুল ধারণা)
2: Lean No Hire (অসম্পূর্ণ, বড় অ্যালগরিদমিক ভুল বা মূল এজ কেস বাদ)
3: Lean Hire (সঠিক দিকে, কিন্তু অপ্টিমাইজেশন বা স্ট্রাকচারে উন্নতি দরকার)
4: Hire (সঠিক সমাধান, সঠিক কমপ্লেক্সিটি এবং ভালো এজ কেস বিবেচনা)
5: Strong Hire (চমৎকার স্পষ্টতা, অপ্টিমাল কমপ্লেক্সিটি, পূর্ণাঙ্গ এজ কেস হ্যান্ডলিং)

বাংলায় প্রতিক্রিয়া লিখুন (Time Complexity, Edge Case-এর মতো টেকনিক্যাল টার্ম ইংরেজিতে রাখতে পারেন)। summary ১-২ বাক্যে; strengths, improvements ও missingEdgeCases প্রতিটিতে সর্বোচ্চ ৪টি নির্দিষ্ট ও কাজে লাগার মতো পয়েন্ট দিন।`
    : `You are Hira, HireReady's AI interview coach, acting as a rigorous but fair staff-engineer interviewer. A junior candidate wrote the notes or draft code below during a mock interview. Evaluate them against the REFERENCE, which HireReady wrote and verified for this question.

How to judge accurately:
- Trace the candidate's approach on the reference examples before deciding whether it is correct.
- Compare their complexity with the reference's optimal one. A different approach that is correct is fine; judge it on its own merits.
- Notes may be short or pseudo-code: judge the idea and the reasoning, not syntax or polish.
- Only praise what is actually in the notes, and only list edge cases that the problem's constraints allow.
- Write complexities as plain text such as O(n log n), never LaTeX or $…$.

Rating scale (1 to 5):
1: No Hire (irrelevant or fundamentally flawed)
2: Lean No Hire (incomplete, major algorithmic issues, or critical edge cases overlooked)
3: Lean Hire (right direction, but needs optimization or cleaner structure)
4: Hire (correct solution, correct time/space complexity, good edge case consideration)
5: Strong Hire (exceptional clarity, optimal complexity, thorough edge case handling)

Write a 1-2 sentence summary, and at most 4 specific, actionable points each for strengths, improvements and missingEdgeCases.`;

  const userPrompt = `${questionReference(question, topicTitle)}

### Candidate's notes / answer:
${userNotes.slice(0, 4000)}`;

  const payload = {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: EVALUATION_SCHEMA,
      thinkingConfig: REVIEW_THINKING,
      maxOutputTokens: 4000,
    },
  };

  const controller = new AbortController();
  const onLeave = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', onLeave, { once: true });
  const timer = setTimeout(() => controller.abort(), Math.max(0, arrivedAt + REVIEW_BUDGET_MS - Date.now())); // all attempts
  try {
    return await withGemini(
      (model) =>
        withAttemptTimeout(controller.signal, REVIEW_ATTEMPT_MS, async (attemptSignal) => {
          const res = await geminiFetch(model, 'generateContent', payload, attemptSignal);
          let data: any;
          try {
            data = await res.json();
          } catch (err) {
            if (isAbortError(err)) throw err;
            throw new GeminiError('overloaded'); // the body broke off or wasn't JSON
          }
          const text = answerText(data);
          if (!text) throw noAnswerError(model, data?.candidates?.[0]?.finishReason, data?.promptFeedback?.blockReason);
          let parsed: any;
          try {
            parsed = JSON.parse(text);
          } catch {
            console.error(`[ai] ${model} gave no usable evaluation JSON`);
            throw new GeminiError('empty');
          }
          const rating = Math.max(1, Math.min(5, Math.round(Number(parsed.rating)) || 3));
          return {
            rating,
            verdict: VERDICTS[rating - 1],
            summary: typeof parsed.summary === 'string' && parsed.summary ? parsed.summary : 'Solution reviewed.',
            strengths: strings(parsed.strengths),
            improvements: strings(parsed.improvements),
            missingEdgeCases: strings(parsed.missingEdgeCases),
          };
        }),
      lang,
      controller.signal,
    );
  } catch (err) {
    if (isAbortError(err) && !signal?.aborted) {
      console.error('[ai] Gemini evaluation timed out');
      throw serviceUnavailable(aiUnavailableMessage(lang));
    }
    throw err;
  } finally {
    signal?.removeEventListener('abort', onLeave);
    clearTimeout(timer);
  }
}

/** Gemini request for the tutor: persona and accuracy rules plus the verified reference, recent history, the new message. */
function buildTutorPayload(input: AiChatInput): Record<string, unknown> {
  const { question, topicTitle, message, history = [], lang = 'en' } = input;

  if (!message || message.trim().length === 0) {
    throw badRequest('Please provide a question or message for the tutor.');
  }

  const isBn = lang === 'bn';
  const rules = isBn
    ? `আপনি হীরা (নামটি "HIre ReAdy" থেকে; বাংলায় হীরা মানে diamond) — HireReady-এর AI ইন্টারভিউ কোচ। আপনি নতুন ও জুনিয়র সফটওয়্যার ইঞ্জিনিয়ারদের টেক ইন্টারভিউয়ের প্রস্তুতিতে সাহায্য করেন। আপনার ব্যক্তিত্ব: বন্ধুত্বপূর্ণ, উৎসাহব্যঞ্জক এবং স্পষ্ট।

সঠিক উত্তরের নিয়ম:
1. নিচের REFERENCE অংশটি HireReady এই প্রশ্নের জন্য লিখে যাচাই করেছে। এটিকে সত্য হিসেবে ধরুন: আপনার অ্যাপ্রোচ, কমপ্লেক্সিটি ও মূল পয়েন্ট অবশ্যই এর সাথে মিলতে হবে। শিক্ষার্থীর কোনো দাবি এর সাথে না মিললে বিনয়ের সাথে তা বলুন এবং কারণ ব্যাখ্যা করুন।
2. REFERENCE-এ যা নেই, সেখানে শুধু প্রতিষ্ঠিত কম্পিউটার সায়েন্সের তথ্য ব্যবহার করুন। নিশ্চিত না হলে সরাসরি বলুন — কখনো API, সংখ্যা, লাইব্রেরির আচরণ বা কোনো কোম্পানির ইন্টারভিউ সম্পর্কে তথ্য বানিয়ে বলবেন না।
3. শিক্ষার্থীর কোড বা আইডিয়া যাচাই করার আগে একটি ছোট উদাহরণ ইনপুটে (REFERENCE-এর Examples থেকে) ধাপে ধাপে চালিয়ে দেখুন, এবং ভুল থাকলে ঠিক কোন লাইন বা ধাপে তা বলুন।
4. Time ও Space Complexity বলার সময় n কী বোঝায় তা উল্লেখ করুন এবং \`O(n log n)\`-এর মতো inline code হিসেবে লিখুন। কখনো LaTeX বা $…$ ব্যবহার করবেন না।

শেখানোর ধরন:
5. হিন্ট চাইলে একবারে একটি হিন্ট দিন, REFERENCE-এর hint ladder অনুযায়ী অস্পষ্ট থেকে স্পষ্টের দিকে। শিক্ষার্থী নিজে না চাইলে সম্পূর্ণ সমাধান বা কোড দেবেন না।
6. সংক্ষিপ্ত থাকুন: সাধারণত ২০০ শব্দের মধ্যে, ছোট অনুচ্ছেদ বা বুলেটে। কোড ভাষার নামসহ Markdown কোড ব্লকে দিন — শিক্ষার্থী যে প্রোগ্রামিং ভাষা ব্যবহার করছে সেটিতে, না জানা থাকলে REFERENCE কোডের ভাষায়।
7. বাংলায় উত্তর দিন এবং শিক্ষার্থীকে "আপনি" সম্বোধন করুন। তবে টেকনিক্যাল টার্ম (যেমন Big-O, Hash Map, Two Pointers) ইংরেজিতে রাখুন।
8. এই প্রশ্ন ও টপিকের ইন্টারভিউ প্রস্তুতির মধ্যেই থাকুন; অপ্রাসঙ্গিক অনুরোধ এলে সংক্ষেপে বিষয়ে ফিরিয়ে আনুন।
9. সরাসরি উত্তর দিন। চ্যাটে শিক্ষার্থীকে আগেই স্বাগত জানানো হয়েছে, তাই শুভেচ্ছা জানাবেন না বা নিজের পরিচয় দেবেন না — শুধু কেউ আপনার পরিচয় জানতে চাইলে বলুন: আপনি হীরা, HireReady-এর AI ইন্টারভিউ কোচ, Google Gemini দ্বারা চালিত।`
    : `You are Hira (the name comes from "HIre ReAdy"; হীরা also means diamond in Bangla), HireReady's encouraging and expert AI interview coach, helping new-grad and junior software engineers prepare for tech interviews.

How to answer accurately:
1. The REFERENCE below was written and checked by HireReady for this exact question. Treat it as ground truth: your approach, complexities and key points must agree with it. If the student says something that contradicts it, say so kindly and explain why.
2. For anything the reference does not cover, use only well-established computer-science facts. If you are not sure, say so plainly. Never invent APIs, numbers, library behaviour or facts about a company's interviews.
3. Before you judge the student's code or idea, trace it on a small concrete input (use the reference examples), and point to the exact line or step that goes wrong.
4. When you give time or space complexity, say what n stands for and write it as inline code such as \`O(n log n)\`. Never use LaTeX or $…$ math.

How to teach:
5. Hints: give one hint at a time, following the reference hint ladder from vaguest to most specific. Don't reveal the full solution or code unless the student asks for it.
6. Be concise: usually under 200 words, in short paragraphs or bullets. Put code in fenced Markdown blocks with a language tag, in the student's programming language (or the reference code's language if you don't know it).
7. Stay on interview preparation for this question and topic; if asked about something unrelated, briefly steer back.
8. Answer directly. The chat has already welcomed the student, so don't greet them or introduce yourself unless they ask who you are; then say you are Hira, HireReady's AI interview coach, powered by Google Gemini.`;

  const systemInstruction = `${rules}

REFERENCE — HireReady's verified content for the question the student is studying:
${questionReference(question, topicTitle)}`;

  // the conversation must start with a student turn
  const recent = history.slice(-6);
  while (recent[0]?.role === 'model') recent.shift();

  const contents = [
    ...recent.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: 'user', parts: [{ text: message }] },
  ];

  return {
    contents,
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      thinkingConfig: TUTOR_THINKING,
      maxOutputTokens: 4000,
    },
  };
}

/**
 * One streamed Gemini call. Failures before any text throw GeminiError, so withGemini can retry or switch models.
 * Once text has reached the student a failure throws a plain Error instead: retrying would repeat the answer.
 */
function streamOnce(model: string, payload: Record<string, unknown>, onText: (text: string) => void, signal: AbortSignal) {
  return withAttemptTimeout(signal, CHAT_FIRST_TEXT_MS, async (attemptSignal, started) => {
    const res = await geminiFetch(model, 'streamGenerateContent', payload, attemptSignal);
    if (!res.body) throw new GeminiError('empty');
    let produced = false;
    let finishReason: string | undefined;
    let blockReason: string | undefined;
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
        buffer += decoder.decode(chunk, { stream: true });
        let newline: number;
        // SSE: one `data: {json}` line per event
        while ((newline = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (!line.startsWith('data:')) continue;
          let event: any;
          try {
            event = JSON.parse(line.slice(5));
          } catch {
            continue; // keep-alives and partial lines
          }
          if (event?.error) {
            // Google can also report an error inside a stream that already started (HTTP 200)
            console.error(`[ai] ${model} stream error (${event.error.code ?? '?'}): ${event.error.message ?? ''}`);
            if (produced) throw new Error('Gemini stream broke off mid-answer');
            throw classifyGeminiError(Number(event.error.code) || 500, event);
          }
          finishReason = event?.candidates?.[0]?.finishReason ?? finishReason;
          blockReason = event?.promptFeedback?.blockReason ?? blockReason;
          const text = answerText(event);
          if (text) {
            if (!produced) started(); // text is flowing: only the overall budget applies from here
            produced = true;
            onText(text);
          }
        }
      }
    } catch (err) {
      if (err instanceof GeminiError || isAbortError(err) || produced) throw err;
      // the connection broke before any text (e.g. "terminated"): safe to retry
      console.error(`[ai] ${model} stream broke off before any text: ${(err as Error).message}`);
      throw new GeminiError('overloaded');
    }
    if (!produced) throw noAnswerError(model, finishReason, blockReason); // an empty fluke is retried once
    // stopped part-way (length limit or a filter): end with the "cut off" note rather than a silent half answer
    if (stoppedEarly(finishReason)) throw new Error(`Gemini stopped mid-answer (${finishReason})`);
  });
}

/**
 * Streams the tutor's reply: `onText` receives each piece of text as Gemini generates it (server-sent events).
 * Errors before the first piece throw (so the caller can still answer with a normal JSON error);
 * `signal` aborts the upstream request when the user disconnects.
 */
export async function streamQuestionTutor(
  input: AiChatInput,
  onText: (text: string) => void,
  signal: AbortSignal,
  arrivedAt = Date.now(),
): Promise<void> {
  if (!input.message || input.message.trim().length === 0) {
    throw badRequest('Please provide a question or message for the tutor.');
  }
  if (signal.aborted) return; // the student left before we started
  const lang = input.lang ?? 'en';
  const payload = buildTutorPayload(input);
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, Math.max(0, arrivedAt + CHAT_BUDGET_MS - Date.now())); // all attempts, waits included
  try {
    await withGemini((model) => streamOnce(model, payload, onText, controller.signal), lang, controller.signal);
  } catch (err) {
    if (isAbortError(err)) {
      if (signal.aborted) return; // the user left; nothing to report
      console.error('[ai] Gemini stream timed out');
      throw serviceUnavailable(aiUnavailableMessage(lang));
    }
    throw err;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}
