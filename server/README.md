# HireReady API (server/)

Express 5 + Mongoose 9 REST API for HireReady. The contract (paths, bodies, response shapes) lives in
`docs/ARCHITECTURE.md`. Response bodies are the TypeScript types in `client/src/lib/types.ts`.

## Quick start

```bash
cd server
cp .env.example .env        # then fill in MONGODB_URI and JWT_SECRET
npm run seed                # validate content + sync it into MongoDB
npm run dev                 # http://localhost:4000 (tsx watch)
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the API with reload on change (`tsx watch src/index.ts`) |
| `npm run build` / `npm start` | Compile to `dist/` with tsc, then run `node dist/src/index.js` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run validate:content [-- <topic> ...]` | Validate content JSON without touching the DB |
| `npm run seed` | Validate everything in `src/data/content/` (+ `src/data/roadmap.json`), then sync it to MongoDB |

### Seeding

`npm run seed` runs `validateContent()` first and **aborts on any error** (nothing is written). Then it
syncs the data:

- upserts topics, questions (`order` = index in the file, `topicOrder` = `topic.order`), quiz questions
  (`topic`, `order`) and the roadmap (one document with `key: "default"`);
- deletes topics, questions and quiz questions whose slug or id is no longer in the content;
- never touches user collections (users, progress, attempts, mock sessions, activity);
- refuses to run when the content directory has no `*.json` files, because that would delete all content.

Options (paths are relative to the current directory):

```bash
npx tsx scripts/seed.ts --dir ../docs/examples                       # another content dir; roadmap skipped
npx tsx scripts/seed.ts --dir ../docs/examples --roadmap my-roadmap.json
MONGODB_URI=mongodb://127.0.0.1:27017/hireready_test npx tsx scripts/seed.ts --dir ../docs/examples
```

## Environment variables

`server/.env` is loaded at startup. Variables already set in the shell take precedence over the file.
Invalid values stop the server with a list of what is wrong.

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development` \| `production` \| `test`. Production turns on the `Secure` cookie, turns off morgan logging and hides error details. |
| `PORT` | no | `4000` | |
| `MONGODB_URI` | **yes** | – | `mongodb://…` or `mongodb+srv://…`. URL-encode special characters in the password (`/` → `%2F`). |
| `JWT_SECRET` | **yes** | – | At least 32 characters. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | no | `7d` | Formats such as `7d`, `12h`, `30m` or `3600` (seconds). The cookie itself always lasts 7 days. |
| `CLIENT_ORIGIN` | no | `http://localhost:3000` | Allowed CORS origin(s), comma-separated. |
| `TRUST_PROXY` | no | off | Express `trust proxy` setting: `true`, a hop count (`1`) or names/CIDRs (`loopback`). Set it only when a proxy you control sets `X-Forwarded-For`. The rate limiter keys on `req.ip`. |

## Endpoints (base `/api`)

Errors always look like `{ "error": { "message", "code"?, "details"? } }`.

| Code | Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Input failed zod validation, a Mongoose cast or validation error, an unknown quiz id or mock slug. `details` = `[{ path: "body.email", message, code }]` |
| `INVALID_JSON` | 400 | The JSON body is malformed |
| `UNAUTHENTICATED` | 401 | No session or an invalid session; also bad login credentials |
| `NOT_FOUND` | 404 | Unknown resource or route |
| `CONFLICT` | 409 | The email is already registered, or a duplicate key |
| `PAYLOAD_TOO_LARGE` | 413 | The body is larger than 100kb |
| `RATE_LIMITED` | 429 | More than 20 requests in 15 min per IP to `/auth/register` or `/auth/login` (each route has its own budget) |
| `INTERNAL` | 500 | Anything else. Stack traces are included only outside production. |

Auth uses the httpOnly cookie `hr_token` (SameSite=Lax, `Secure` in production, Path=/, 7 days).
Per-user routes send `Cache-Control: no-store`.

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | – | `{ ok: true, db, uptime }` (`uptime` is in whole seconds) |
| GET | `/stats` | – | `PlatformStats`. `byCategory` counts **questions** per topic category. |
| POST | `/auth/register` | – | `{ name, email, password }` → `201 { user }` and sets the cookie. 409 if the email exists. Emails are trimmed and lowercased. |
| POST | `/auth/login` | – | `{ email, password }` → `{ user }` and sets the cookie. 401 says "Invalid email or password" for both failure cases. |
| POST | `/auth/logout` | – | `{ ok: true }` and clears the cookie |
| GET | `/auth/me` | required | `{ user }` |
| GET | `/topics` | – | `{ items: TopicSummary[] }` by `order` |
| GET | `/topics/:slug` | – | `TopicDetailResponse` |
| GET | `/questions` | – | `Paginated<QuestionSummary>`. Filters: `topic, difficulty, kind, frequency, tag` (comma-separated or repeated keys), `q` (≤100 chars, case-insensitive literal match on title/tags/pattern/prompt), `sort=default\|title\|difficulty\|frequency`, `page` (≥1), `limit` (1–100, default 20) |
| GET | `/questions/random` | – | `{ items: Question[] }`. Takes `count` (1–20, default 5) and `kinds, topics, difficulty, exclude` (comma-separated). |
| GET | `/questions/:slug` | – | `QuestionDetailResponse` with `prev`/`next` inside the topic |
| GET | `/quiz` | – | `{ items: QuizTopicSummary[] }`, only topics that have quiz questions |
| GET | `/quiz/:topic` | – | `QuizResponse` (answers included). Takes `limit` (1–50) and `shuffle=true` (shuffles questions, not options). |
| POST | `/quiz/attempts` | optional | `QuizAttemptInput` → `QuizAttemptResult`. Stored only when logged in (`saved`). |
| GET | `/quiz/attempts` | required | `{ items: QuizAttempt[] }`, latest 50 |
| GET | `/roadmap` | – | `Roadmap`, or 404 if it has not been seeded |
| GET | `/progress` | required | `ProgressSnapshot` |
| PUT | `/progress/questions/:slug` | required | `QuestionProgressUpdate` → `{ progress }`. Upserts; 404 for an unknown question. |
| PUT | `/progress/roadmap/:day` | required | `{ done }` → `{ roadmapDays }` sorted ascending. 404 if the roadmap is not seeded or the day is outside it. |
| GET | `/progress/stats` | required | `ProgressStats` |
| POST | `/mock-sessions` | required | `MockSessionInput` → `201 { session }`. Title and kind come from the question; an unknown slug gives 400. |
| GET | `/mock-sessions` | required | `{ items: MockSession[] }`, latest 20 |

### Behaviour details

- **Sorting.** `default` sorts by topic order, then question order. `title` is case-insensitive.
  `difficulty` goes easy → hard. `frequency` goes very-high → medium. Ties fall back to topic order,
  then question order.
- **Pagination.** `totalPages = ceil(total / limit)`, so it is `0` when nothing matches. A page past
  the end returns `items: []`.
- **Quiz grading.** `total` is the number of answers submitted, not the size of the topic.
  `pct = round(score / total * 100)`. `selected: -1` means skipped and counts as wrong. Every
  `questionId` must belong to `topic` and appear only once.
- **Activity.** Each successful progress update (question or roadmap day), saved quiz attempt and mock
  session adds +1 to the user's counter for the current UTC day.
- **Streaks.** `current` counts consecutive active UTC days ending at the last active day, and only
  while that day is today or yesterday. `activity` lists the days with activity in the last 120 days,
  **newest first**, like every other list of user data.
- **Stats rounding.** `quiz.avgPct` is an integer. `mock.avgRating` and `MockSession.avgRating` have
  1 decimal. `mock.totalMinutes = round(sum(durationSec) / 60)`. Progress for questions that were
  removed from the content is ignored. `totals.attempted` counts status `attempted` only (solved is
  separate).

## Code layout

```
src/
  index.ts            env → DB → listen; graceful shutdown on SIGINT/SIGTERM
  app.ts              createApp(): helmet, cors, json(100kb), cookies, morgan, /api, 404, errors
  config/             dotenv loading + zod-validated env
  db/connect.ts       mongoose connection (sanitizeFilter + strictQuery on)
  middleware/         auth (requireAuth/optionalAuth), validate (zod), rateLimit, cache, errors
  models/             content.ts (topics, questions, quizquestions, roadmaps), user.ts (user collections)
  routes/ controllers/ services/   one set per resource; services hold the query logic
  services/mappers.ts DB documents → contract shapes (string ids, ISO dates, no internals)
  validators/         zod schemas for every body/query/params
  content/            content schema + validator (owned by the architect)
scripts/seed.ts       content sync
```

**`sanitizeFilter` is on globally.** Any `$`-operator object inside a `find`, `update` or `delete`
filter is wrapped in `$eq` unless it is marked with `mongoose.trusted({...})`. Wrap operator filters
you build yourself (`$in`, `$lt`, `$nin`, …). `aggregate()` pipelines are not sanitized, so only put
zod-validated values into them. Express 5's `req.query` is read-only, so read parsed input with
`input<T>(req, 'query' | 'body' | 'params')` from `middleware/validate.ts`.
