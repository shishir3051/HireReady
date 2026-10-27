/** Input schemas for every endpoint (body / query / params). */
import { z } from 'zod';
import { Difficulty, Frequency, QuestionKind } from '../content/schema';
import { PROGRESS_STATUSES } from '../types/api';
import { boolQuery, csv, intQuery, optionalIntQuery, single, slug } from './common';

// ---------------------------------------------------------------- auth
/** 'is required' when missing, 'must be a string' for any other non-string (e.g. an injected object). */
const requiredString = () => z.string({ error: (iss) => (iss.input === undefined ? 'is required' : 'must be a string') });

const email = requiredString()
  .trim()
  .toLowerCase()
  .max(254, 'is too long')
  .pipe(z.email({ error: 'must be a valid email address' }));

export const registerBody = z.object({
  name: requiredString().trim().min(2, 'must be at least 2 characters').max(60, 'must be at most 60 characters'),
  email,
  password: requiredString().min(8, 'must be at least 8 characters').max(128, 'must be at most 128 characters'),
});
export type RegisterBody = z.infer<typeof registerBody>;

export const loginBody = z.object({
  email,
  password: requiredString().min(1, 'is required').max(128, 'must be at most 128 characters'),
});
export type LoginBody = z.infer<typeof loginBody>;

export const forgotPasswordBody = z.object({ email });
export type ForgotPasswordBody = z.infer<typeof forgotPasswordBody>;

export const resetPasswordBody = z.object({
  token: requiredString().trim().min(20, 'is invalid').max(200, 'is invalid'),
  password: registerBody.shape.password,
});
export type ResetPasswordBody = z.infer<typeof resetPasswordBody>;

export const googleStartQuery = z.object({ next: single(z.string().max(500)).optional() });
export type GoogleStartQuery = z.infer<typeof googleStartQuery>;

// ---------------------------------------------------------------- questions
export const SORTS = ['default', 'title', 'difficulty', 'frequency'] as const;

export const questionListQuery = z.object({
  topic: csv(slug),
  difficulty: csv(Difficulty),
  kind: csv(QuestionKind),
  frequency: csv(Frequency),
  tag: csv(z.string().max(60, 'is too long')),
  q: single(z.string().trim().max(100, 'must be at most 100 characters')).optional(),
  sort: single(z.enum(SORTS)).default('default'),
  page: intQuery(1, 10_000, 1),
  limit: intQuery(1, 100, 20),
});
export type QuestionListQuery = z.infer<typeof questionListQuery>;

export const randomQuery = z.object({
  count: intQuery(1, 20, 5),
  kinds: csv(QuestionKind),
  topics: csv(slug),
  difficulty: csv(Difficulty),
  exclude: csv(slug, 1000),
});
export type RandomQuery = z.infer<typeof randomQuery>;

// ---------------------------------------------------------------- quiz
export const quizTopicQuery = z.object({
  limit: optionalIntQuery(1, 50),
  shuffle: boolQuery,
});
export type QuizTopicQuery = z.infer<typeof quizTopicQuery>;

export const quizTopicParams = z.object({ topic: slug });

export const quizAttemptBody = z.object({
  topic: slug,
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1).max(160),
        /** index into options; -1 = skipped (counts as wrong) */
        selected: z.number().int('must be an integer').min(-1, 'must be ≥ -1').max(9, 'must be ≤ 9'),
      }),
    )
    .min(1, 'must contain at least one answer')
    .max(100, 'must contain at most 100 answers')
    .refine((a) => new Set(a.map((x) => x.questionId)).size === a.length, 'must not repeat a questionId'),
});
export type QuizAttemptBody = z.infer<typeof quizAttemptBody>;

// ---------------------------------------------------------------- progress
export const progressUpdateBody = z
  .object({
    status: z.enum(PROGRESS_STATUSES).optional(),
    bookmarked: z.boolean().optional(),
    notes: z.string().max(5000, 'must be at most 5000 characters').optional(),
    confidence: z.number().int('must be an integer').min(1, 'must be 1–5').max(5, 'must be 1–5').nullable().optional(),
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), 'provide at least one of status, bookmarked, notes, confidence');
export type ProgressUpdateBody = z.infer<typeof progressUpdateBody>;

export const roadmapDayParams = z.object({
  day: z.coerce.number({ error: 'must be a number' }).int('must be an integer').min(1, 'must be ≥ 1').max(366, 'must be ≤ 366'),
});
export const roadmapDayBody = z.object({ done: z.boolean({ error: 'must be a boolean' }) });

// ---------------------------------------------------------------- mock sessions
export const mockSessionBody = z.object({
  config: z.object({
    count: z.number().int().min(1).max(20),
    kinds: z.array(QuestionKind).max(10),
    topics: z.array(slug).max(50),
    difficulty: z.union([Difficulty, z.literal('mixed')]),
  }),
  durationSec: z.number().int().min(0).max(24 * 60 * 60),
  items: z
    .array(
      z.object({
        slug,
        selfRating: z.number().int('must be an integer').min(1, 'must be 1–5').max(5, 'must be 1–5'),
        timeSpentSec: z.number().int().min(0).max(24 * 60 * 60),
        revealed: z.boolean(),
      }),
    )
    .min(1, 'must contain 1–20 items')
    .max(20, 'must contain 1–20 items'),
});
export type MockSessionBody = z.infer<typeof mockSessionBody>;
