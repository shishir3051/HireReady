import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { isProduction } from '../config/env';
import { errorBody, HttpError } from '../lib/errors';
import { formatIssues, issuesMessage } from './validate';

/** Unknown route → 404 in the contract envelope. */
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json(errorBody(`Route not found: ${req.method} ${req.path}`, 'NOT_FOUND'));
};

type HttpLikeError = Error & { status?: number; statusCode?: number; type?: string; expose?: boolean; code?: unknown };

/** Central error handler: every error leaves as `{ error: { message, code?, details? } }`. */
export const errorHandler: ErrorRequestHandler = (err: HttpLikeError, req, res, next) => {
  if (res.headersSent) return next(err);

  const send = (status: number, message: string, code: string, details?: unknown) =>
    res.status(status).json(errorBody(message, code, details));

  if (err instanceof HttpError) return send(err.status, err.message, err.code, err.details);

  if (err instanceof ZodError) {
    const details = formatIssues(err.issues);
    return send(400, issuesMessage(details), 'VALIDATION_ERROR', details);
  }

  // body-parser (express.json) errors
  if (err.type === 'entity.parse.failed') return send(400, 'Malformed JSON in request body', 'INVALID_JSON');
  if (err.type === 'entity.too.large') return send(413, 'Request body is too large (max 100kb)', 'PAYLOAD_TOO_LARGE');

  if (err instanceof mongoose.Error.CastError) {
    return send(400, `Invalid value for "${err.path}"`, 'VALIDATION_ERROR', [{ path: err.path, message: 'invalid value', code: 'invalid_type' }]);
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message, code: 'invalid_value' }));
    return send(400, details[0]?.message ?? 'Validation failed', 'VALIDATION_ERROR', details);
  }
  if (err.code === 11000) {
    const keyValue = (err as { keyValue?: Record<string, unknown> }).keyValue;
    const fields = keyValue ? Object.keys(keyValue) : [];
    return send(409, fields.length ? `A record with this ${fields.join(', ')} already exists` : 'Resource already exists', 'CONFLICT', fields.length ? { fields } : undefined);
  }

  // other client errors raised by middleware (e.g. unsupported charset) with an explicit 4xx status
  const status = err.status ?? err.statusCode;
  if (status && status >= 400 && status < 500 && err.expose !== false) {
    return send(status, err.message || 'Bad request', status === 404 ? 'NOT_FOUND' : 'BAD_REQUEST');
  }

  console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  return send(
    500,
    isProduction ? 'Internal server error' : `Internal server error: ${err.message}`,
    'INTERNAL',
    isProduction ? undefined : { stack: err.stack?.split('\n').map((l) => l.trim()) },
  );
};
