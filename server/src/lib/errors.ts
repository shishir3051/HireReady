/** Error with an HTTP status and a machine-readable code; rendered by the central error handler. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (message: string, details?: unknown) => new HttpError(400, message, 'VALIDATION_ERROR', details);
export const unauthenticated = (message = 'Authentication required') => new HttpError(401, message, 'UNAUTHENTICATED');
export const notFound = (message = 'Not found') => new HttpError(404, message, 'NOT_FOUND');
export const conflict = (message: string) => new HttpError(409, message, 'CONFLICT');

/** Body shape of every error response (see docs/ARCHITECTURE.md). */
export interface ErrorBody {
  error: { message: string; code?: string; details?: unknown };
}

export function errorBody(message: string, code?: string, details?: unknown): ErrorBody {
  const error: ErrorBody['error'] = { message };
  if (code) error.code = code;
  if (details !== undefined) error.details = details;
  return { error };
}
