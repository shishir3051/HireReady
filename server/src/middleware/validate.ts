import type { Request, RequestHandler } from 'express';
import type { z } from 'zod';
import { HttpError } from '../lib/errors';

type Location = 'params' | 'query' | 'body';
type Schemas = Partial<Record<Location, z.ZodType>>;

export interface IssueDetail {
  /** dotted path including the input location, e.g. "body.email", "query.limit" */
  path: string;
  message: string;
  code: string;
}

type ZodIssueLike = { path: PropertyKey[]; message: string; code: string };

export function formatIssues(issues: readonly ZodIssueLike[], location?: Location): IssueDetail[] {
  return issues.map((i) => ({
    path: [...(location ? [location] : []), ...i.path.map(String)].join('.'),
    message: i.message,
    code: i.code,
  }));
}

/** Human-readable summary of the first issue: "email: must be a valid email address (+1 more)". */
export function issuesMessage(details: IssueDetail[]): string {
  if (!details.length) return 'Invalid request';
  const first = details[0];
  const field = first.path.split('.').slice(1).join('.') || first.path;
  const more = details.length > 1 ? ` (+${details.length - 1} more)` : '';
  return `${field ? `${field}: ` : ''}${first.message}${more}`;
}

/**
 * Validates and parses request input with zod. Results are stored on `req.validated`
 * (Express 5's `req.query` is a read-only getter); the parsed body also replaces `req.body`.
 * Any failure → 400 VALIDATION_ERROR with every issue in `details`.
 */
export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    const details: IssueDetail[] = [];
    const validated = { ...(req.validated ?? {}) };
    for (const location of ['params', 'query', 'body'] as const) {
      const schema = schemas[location];
      if (!schema) continue;
      const raw: unknown = location === 'body' ? (req.body ?? {}) : req[location];
      const result = schema.safeParse(raw);
      if (result.success) validated[location] = result.data;
      else details.push(...formatIssues(result.error.issues, location));
    }
    if (details.length) return next(new HttpError(400, issuesMessage(details), 'VALIDATION_ERROR', details));
    req.validated = validated;
    if (schemas.body) req.body = validated.body;
    next();
  };
}

/** Typed accessor for input parsed by `validate`. */
export function input<T>(req: Request, location: Location): T {
  return req.validated?.[location] as T;
}
