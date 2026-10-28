/**
 * Typed client for the HireReady REST API (contract: docs/ARCHITECTURE.md, types: lib/types.ts).
 *
 * One module for both environments:
 * - Browser (client components): calls relative `/api/*` (rewritten by next.config.ts to Express, so the
 *   httpOnly `hr_token` cookie is same-origin) with `credentials: "include"` and no caching.
 * - Server (server components, generateMetadata): calls `${process.env.API_URL ?? "http://localhost:4000"}/api/*`.
 *   Public content GETs are cached with `{ next: { revalidate: 60 } }`; user endpoints are `no-store`
 *   (pass the request cookie via `opts.cookie` if you ever need user data on the server).
 *
 * Every non-2xx response throws an `ApiError(status, code, message, details)` built from the
 * `{ error: { message, code?, details? } }` envelope. Network failures throw `ApiError(0, "NETWORK_ERROR")`.
 * Aborted requests re-throw the original `AbortError` (check with `isAbortError`).
 *
 * Usage
 *   // server component
 *   const { items } = await api.topics.list();
 *   const detail = await api.questions.get(slug).catch(notFoundOn404);
 *
 *   // client component
 *   const { user } = await api.auth.login({ email, password });
 *   await api.progress.updateQuestion(slug, { status: "solved" });
 *
 *   // abort / per-call options (last argument of every call)
 *   api.questions.list({ q: "tree" }, { signal: controller.signal });
 */
import type {
  ApiErrorBody,
  Difficulty,
  Frequency,
  MockSession,
  MockSessionInput,
  Paginated,
  PlatformStats,
  ProgressSnapshot,
  ProgressStats,
  Question,
  QuestionDetailResponse,
  QuestionKind,
  QuestionProgress,
  QuestionProgressUpdate,
  QuestionSummary,
  QuizAttempt,
  QuizAttemptInput,
  QuizAttemptResult,
  QuizResponse,
  QuizTopicSummary,
  Roadmap,
  TopicDetailResponse,
  TopicSummary,
  User,
  AiEvaluation,
  AiEvaluationInput,
  AiChatInput,
  AiStatus,
  AiUsage,
} from "@/lib/types";

// ---------------------------------------------------------------- errors

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL"
  | "NETWORK_ERROR"
  | "BAD_RESPONSE"
  | (string & {});

export class ApiError extends Error {
  readonly name = "ApiError";
  constructor(
    /** HTTP status; 0 when the request never reached the API */
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }

  get isUnauthenticated() {
    return this.status === 401;
  }
  get isNotFound() {
    return this.status === 404;
  }
  get isNetworkError() {
    return this.status === 0;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

export function isAbortError(e: unknown): boolean {
  return e instanceof DOMException ? e.name === "AbortError" : (e as { name?: string } | null)?.name === "AbortError";
}

/** Human readable message for any thrown value. */
export function getErrorMessage(e: unknown, fallback = "Something went wrong. Please try again.") {
  if (isApiError(e)) return e.message || fallback;
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

/**
 * Field errors from a 400 VALIDATION_ERROR whose `details` are zod issues (`{ path: (string|number)[], message }[]`)
 * or a zod `flatten()` result (`{ fieldErrors: Record<string, string[]> }`). Keys are the first path segment.
 */
export function getFieldErrors(e: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!isApiError(e) || e.code !== "VALIDATION_ERROR" || !e.details) return out;
  const details = e.details as unknown;
  const issues = Array.isArray(details)
    ? details
    : Array.isArray((details as { issues?: unknown }).issues)
      ? (details as { issues: unknown[] }).issues
      : null;
  if (issues) {
    for (const issue of issues) {
      const { path, message } = (issue ?? {}) as { path?: unknown; message?: unknown };
      const key = Array.isArray(path) && path.length > 0 ? String(path[0]) : "";
      if (key && typeof message === "string" && !out[key]) out[key] = message;
    }
    return out;
  }
  const fieldErrors = (details as { fieldErrors?: Record<string, unknown> }).fieldErrors;
  if (fieldErrors && typeof fieldErrors === "object") {
    for (const [key, value] of Object.entries(fieldErrors)) {
      if (Array.isArray(value) && typeof value[0] === "string") out[key] = value[0];
    }
  }
  return out;
}

// ---------------------------------------------------------------- request core

const isServer = typeof window === "undefined";

/** Base URL for API calls in the current environment (no trailing slash). */
export function apiBase() {
  return isServer ? `${(process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "")}/api` : "/api";
}

export interface RequestOptions {
  signal?: AbortSignal;
  headers?: HeadersInit;
  /** Server only: forward the incoming request cookie (e.g. `(await cookies()).toString()`) */
  cookie?: string;
  /** Server only: override the revalidate window for this call (`false` = cache forever, 0 = no cache) */
  revalidate?: number | false;
  /** Override fetch's cache mode */
  cache?: RequestCache;
}

type QueryValue = string | number | boolean | null | undefined | readonly (string | number)[];
type Query = Record<string, QueryValue>;

interface InternalOptions extends RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Query;
  body?: unknown;
  /** public content: cached on the server for 60s */
  content?: boolean;
}

const CONTENT_REVALIDATE_SECONDS = 60;

function buildQuery(query?: Query) {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(","));
    } else {
      params.set(key, String(value));
    }
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

type FetchInit = RequestInit & { next?: { revalidate?: number | false; tags?: string[] } };

/** ApiError for a non-2xx response, using the API's error envelope when present. */
function errorFromResponse(res: Response, data: unknown): ApiError {
  const envelope = (data as Partial<ApiErrorBody> | undefined)?.error;
  const fallbackMessage =
    res.status === 401
      ? "Please log in to continue."
      : res.status === 404
        ? "Not found."
        : res.status === 429
          ? "Too many requests. Please wait a moment and try again."
          : res.status >= 500
            ? "The server had a problem. Please try again shortly."
            : res.statusText || "Request failed.";
  const code =
    envelope?.code ??
    ({ 400: "VALIDATION_ERROR", 401: "UNAUTHENTICATED", 404: "NOT_FOUND", 409: "CONFLICT", 429: "RATE_LIMITED" } as Record<
      number,
      string
    >)[res.status] ??
    (res.status >= 500 ? "INTERNAL" : "BAD_RESPONSE");
  return new ApiError(res.status, code, envelope?.message || fallbackMessage, envelope?.details);
}

/**
 * Browser only: POSTs JSON and streams a plain-text response into `onText` as it arrives.
 * A non-2xx response (sent before any text) throws the usual ApiError.
 */
async function streamText(path: string, body: unknown, onText: (text: string) => void, signal?: AbortSignal): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/plain, application/json" },
      body: JSON.stringify(body),
      credentials: "include",
      cache: "no-store",
      signal,
    });
  } catch (e) {
    if (isAbortError(e)) throw e;
    throw new ApiError(0, "NETWORK_ERROR", "Could not reach the HireReady API. Check your connection and try again.");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      data = undefined;
    }
    throw errorFromResponse(res, data);
  }
  if (!res.body) {
    onText(await res.text());
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    if (text) onText(text);
  }
  const rest = decoder.decode();
  if (rest) onText(rest);
}

async function request<T>(path: string, opts: InternalOptions = {}): Promise<T> {
  const { method = "GET", query, body, content = false, signal, cookie, revalidate, cache } = opts;
  const headers = new Headers(opts.headers);
  headers.set("Accept", "application/json");
  if (body !== undefined) headers.set("Content-Type", "application/json");

  let activeLang: string | undefined;
  if (isServer) {
    if (!cookie) {
      try {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const cookieString = cookieStore.toString();
        if (cookieString) headers.set("Cookie", cookieString);
        const l = cookieStore.get("hr-lang")?.value;
        if (l) activeLang = l;
      } catch {
        // Outside request context (e.g. build time)
      }
    } else {
      headers.set("Cookie", cookie);
      if (cookie.includes("hr-lang=bn")) activeLang = "bn";
    }
  } else {
    const match = typeof document !== "undefined" ? document.cookie.match(/hr-lang=([^;]+)/) : null;
    if (match?.[1]) activeLang = match[1];
  }

  if (activeLang) {
    headers.set("Accept-Language", activeLang);
  }

  const effectiveQuery = {
    ...query,
    ...(activeLang && activeLang !== "en" && !query?.lang ? { lang: activeLang } : {}),
  };

  const init: FetchInit = {
    method,
    headers,
    signal,
    body: body === undefined ? undefined : JSON.stringify(body),
  };

  if (isServer) {
    if (cache) init.cache = cache;
    else if (method === "GET" && content && revalidate !== 0) {
      init.next = { revalidate: revalidate ?? CONTENT_REVALIDATE_SECONDS };
    } else init.cache = "no-store";
  } else {
    init.credentials = "include";
    init.cache = cache ?? "no-store";
  }

  let res: Response;
  try {
    res = await fetch(`${apiBase()}${path}${buildQuery(effectiveQuery)}`, init);
  } catch (e) {
    if (isAbortError(e)) throw e;
    throw new ApiError(0, "NETWORK_ERROR", "Could not reach the HireReady API. Check your connection and try again.");
  }

  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = undefined;
    }
  }

  if (!res.ok) throw errorFromResponse(res, data);

  if (data === undefined && text) {
    throw new ApiError(res.status, "BAD_RESPONSE", "The API returned an unexpected response.");
  }
  return data as T;
}

// ---------------------------------------------------------------- endpoint types (request side)

export interface HealthResponse {
  ok: true;
  db: "connected" | "disconnected";
  uptime: number;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}
export interface LoginInput {
  email: string;
  password: string;
}

export type QuestionSortParam = "default" | "title" | "difficulty" | "frequency";

/** GET /api/questions */
export interface QuestionListQuery {
  topic?: string[];
  difficulty?: Difficulty[];
  kind?: QuestionKind[];
  frequency?: Frequency[];
  tag?: string;
  q?: string;
  sort?: QuestionSortParam;
  /** ≥ 1, default 1 */
  page?: number;
  /** 1–100, default 20 */
  limit?: number;
}

/** GET /api/questions/random */
export interface RandomQuestionsQuery {
  /** 1–20, default 5 */
  count?: number;
  kinds?: QuestionKind[];
  topics?: string[];
  difficulty?: Difficulty[];
  /** question slugs to leave out */
  exclude?: string[];
}

/** GET /api/quiz/:topic */
export interface QuizQuery {
  /** 1–50, default all */
  limit?: number;
  /** shuffle question order (not options) */
  shuffle?: boolean;
}

// ---------------------------------------------------------------- endpoints

const enc = encodeURIComponent;

export const api = {
  /** GET /api/health */
  health: (o?: RequestOptions) => request<HealthResponse>("/health", { ...o, cache: o?.cache ?? "no-store" }),

  /** GET /api/stats */
  stats: (o?: RequestOptions) => request<PlatformStats>("/stats", { ...o, content: true }),

  auth: {
    /** POST /api/auth/register → 201 { user } (409 if the email exists) */
    register: (input: RegisterInput, o?: RequestOptions) =>
      request<{ user: User }>("/auth/register", { ...o, method: "POST", body: input }),
    /** POST /api/auth/login → { user } (401 on bad credentials) */
    login: (input: LoginInput, o?: RequestOptions) =>
      request<{ user: User }>("/auth/login", { ...o, method: "POST", body: input }),
    /** POST /api/auth/logout → { ok: true } */
    logout: (o?: RequestOptions) => request<{ ok: true }>("/auth/logout", { ...o, method: "POST" }),
    /** GET /api/auth/me → { user } (401 when logged out) */
    me: (o?: RequestOptions) => request<{ user: User }>("/auth/me", o),
    /** GET /api/auth/providers → which extra sign-in methods are configured, and whether email delivery is set up */
    providers: (o?: RequestOptions) => request<{ google: boolean; email: boolean }>("/auth/providers", o),
    /** POST /api/auth/forgot-password → { ok: true } whether or not the email has an account */
    forgotPassword: (input: { email: string }, o?: RequestOptions) =>
      request<{ ok: true }>("/auth/forgot-password", { ...o, method: "POST", body: input }),
    /** POST /api/auth/reset-password → { user } and a new session (400 INVALID_TOKEN when expired or used) */
    resetPassword: (input: { token: string; password: string }, o?: RequestOptions) =>
      request<{ user: User }>("/auth/reset-password", { ...o, method: "POST", body: input }),
  },

  topics: {
    /** GET /api/topics → { items } sorted by order */
    list: (o?: RequestOptions) => request<{ items: TopicSummary[] }>("/topics", { ...o, content: true }),
    /** GET /api/topics/:slug (404 if unknown) */
    get: (slug: string, o?: RequestOptions) =>
      request<TopicDetailResponse>(`/topics/${enc(slug)}`, { ...o, content: true }),
  },

  questions: {
    /** GET /api/questions (paginated, filterable) */
    list: (query: QuestionListQuery = {}, o?: RequestOptions) =>
      request<Paginated<QuestionSummary>>("/questions", {
        ...o,
        content: true,
        query: {
          topic: query.topic,
          difficulty: query.difficulty,
          kind: query.kind,
          frequency: query.frequency,
          tag: query.tag,
          q: query.q?.trim() || undefined,
          sort: query.sort && query.sort !== "default" ? query.sort : undefined,
          page: query.page && query.page > 1 ? query.page : undefined,
          limit: query.limit,
        },
      }),
    /** GET /api/questions/random → { items: Question[] } (never cached) */
    random: (query: RandomQuestionsQuery = {}, o?: RequestOptions) =>
      request<{ items: Question[] }>("/questions/random", {
        ...o,
        cache: o?.cache ?? "no-store",
        query: {
          count: query.count,
          kinds: query.kinds,
          topics: query.topics,
          difficulty: query.difficulty,
          exclude: query.exclude,
        },
      }),
    /** GET /api/questions/:slug (404 if unknown) */
    get: (slug: string, o?: RequestOptions) =>
      request<QuestionDetailResponse>(`/questions/${enc(slug)}`, { ...o, content: true }),
  },

  quiz: {
    /** GET /api/quiz → { items } */
    list: (o?: RequestOptions) => request<{ items: QuizTopicSummary[] }>("/quiz", { ...o, content: true }),
    /** GET /api/quiz/:topic (answers included). Shuffled requests are never cached. */
    get: (topic: string, query: QuizQuery = {}, o?: RequestOptions) =>
      request<QuizResponse>(`/quiz/${enc(topic)}`, {
        ...o,
        content: !query.shuffle,
        query: { limit: query.limit, shuffle: query.shuffle ? "true" : undefined },
      }),
    /** POST /api/quiz/attempts — graded for everyone, stored only when logged in (`saved`) */
    submitAttempt: (input: QuizAttemptInput, o?: RequestOptions) =>
      request<QuizAttemptResult>("/quiz/attempts", { ...o, method: "POST", body: input }),
    /** GET /api/quiz/attempts → latest 50 (auth) */
    attempts: (o?: RequestOptions) => request<{ items: QuizAttempt[] }>("/quiz/attempts", o),
  },

  /** GET /api/roadmap (404 if not seeded) */
  roadmap: {
    get: (o?: RequestOptions) => request<Roadmap>("/roadmap", { ...o, content: true }),
  },

  progress: {
    /** GET /api/progress (auth) */
    get: (o?: RequestOptions) => request<ProgressSnapshot>("/progress", o),
    /** PUT /api/progress/questions/:slug (auth, upsert) */
    updateQuestion: (slug: string, update: QuestionProgressUpdate, o?: RequestOptions) =>
      request<{ progress: QuestionProgress }>(`/progress/questions/${enc(slug)}`, {
        ...o,
        method: "PUT",
        body: update,
      }),
    /** PUT /api/progress/roadmap/:day (auth) → { roadmapDays } sorted asc */
    setRoadmapDay: (day: number, done: boolean, o?: RequestOptions) =>
      request<{ roadmapDays: number[] }>(`/progress/roadmap/${enc(String(day))}`, {
        ...o,
        method: "PUT",
        body: { done },
      }),
    /** GET /api/progress/stats (auth) */
    stats: (o?: RequestOptions) => request<ProgressStats>("/progress/stats", o),
  },

  mockSessions: {
    /** POST /api/mock-sessions (auth) → 201 { session } */
    create: (input: MockSessionInput, o?: RequestOptions) =>
      request<{ session: MockSession }>("/mock-sessions", { ...o, method: "POST", body: input }),
    /** GET /api/mock-sessions → latest 20 (auth) */
    list: (o?: RequestOptions) => request<{ items: MockSession[] }>("/mock-sessions", o),
  },

  ai: {
    /** GET /api/ai/status → { enabled, usage? } (today's usage only when logged in) */
    status: (o?: RequestOptions) => request<AiStatus>("/ai/status", o),
    /** POST /api/ai/evaluate → Gemini feedback on mock-interview notes (login required; daily limit) */
    evaluate: (input: AiEvaluationInput, o?: RequestOptions) =>
      request<{ evaluation: AiEvaluation; usage: AiUsage }>("/ai/evaluate", { ...o, method: "POST", body: input }),
    /** POST /api/ai/chat → streams the tutor's reply; `onText` receives each piece as it arrives (login required) */
    chatStream: (input: AiChatInput, onText: (text: string) => void, o?: { signal?: AbortSignal }) =>
      streamText("/ai/chat", input, onText, o?.signal),
  },
} as const;

export type Api = typeof api;

// ---------------------------------------------------------------- server helpers

/** Resolve to `null` instead of throwing on 404 — handy with `notFound()` in server components. */
export async function orNull<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (e) {
    if (isApiError(e) && e.status === 404) return null;
    throw e;
  }
}

/** Resolve to `null` on any API failure (for optional, decorative data like landing-page stats). */
export async function orFallback<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch {
    return null;
  }
}
