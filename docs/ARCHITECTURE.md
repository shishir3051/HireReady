# HireReady — Architecture & Contracts

HireReady is an interview-preparation platform for new-grad / junior software engineers.
Every question ships with a model answer **and an interactive visual walkthrough** (step-by-step
animations of the algorithm or a diagram of the concept).

```
.
├── client/   Next.js 16 (App Router, React 19, TypeScript, Tailwind CSS v4)   :3000
├── server/   Node 24 + Express 5 + Mongoose 9 (TypeScript via tsx)            :4000
└── docs/     this file, CONTENT_GUIDE.md, examples/
```

```
Browser ──/api/* (Next rewrite, same-origin cookies)──▶ Express ──▶ MongoDB
Next server components ──${API_URL}/api/*──────────────▶ Express
server/src/data/content/*.json ──npm run seed──▶ MongoDB (topics, questions, quizzes, roadmap)
```

## Stack decisions

| Concern | Choice | Why |
|---|---|---|
| Frontend | Next.js 16 App Router, **Cache Components disabled** | Content is served by Express; classic dynamic rendering keeps data flow simple |
| Styling | Tailwind v4 + design tokens in `client/src/app/globals.css` | One token set drives light/dark and the visualizer palette |
| Dark mode | `class="dark"` on `<html>` (`@custom-variant dark`) | Toggleable, persisted in localStorage, no flash (inline script in layout) |
| Visuals | Custom React/SVG renderers + Mermaid for concept diagrams | Step-by-step animation with state the content controls |
| API | Express 5 REST, zod-validated input, central error handler | Small, explicit, testable |
| Auth | bcrypt (cost 12) + JWT in an **httpOnly cookie** `hr_token` (SameSite=Lax, Secure in prod, 7d) | No token in JS; same-origin through the Next rewrite |
| DB | MongoDB via Mongoose, `sanitizeFilter` on | Content is document-shaped; user progress is small per-user docs |
| Content | JSON files validated by zod (`server/src/content/schema.ts`) and seeded | Content is reviewable in git, validated before it reaches the DB |

### Next.js 16 notes (read `client/node_modules/next/dist/docs/` before writing Next code)
- `params` and `searchParams` are **Promises** in pages/layouts/route handlers: `const { slug } = await params`.
- Middleware is now `proxy.ts` (not used here; route guards are client-side).
- Turbopack is the default bundler; `next build` does not run ESLint (`npm run lint` does).
- `cacheComponents` is intentionally **off** in `next.config.ts`; `fetch` defaults to no caching. Use `{ next: { revalidate: 60 } }` for content fetches in server components.

## Topics (fixed slugs — content files are `server/src/data/content/<slug>.json`)

| order | slug | title | category |
|---|---|---|---|
| 1 | big-o | Time & Space Complexity | dsa |
| 2 | arrays-hashing | Arrays & Hashing | dsa |
| 3 | two-pointers | Two Pointers | dsa |
| 4 | sliding-window | Sliding Window | dsa |
| 5 | stack-queue | Stack & Queue | dsa |
| 6 | binary-search | Binary Search | dsa |
| 7 | linked-list | Linked List | dsa |
| 8 | sorting | Sorting Algorithms | dsa |
| 9 | recursion-backtracking | Recursion & Backtracking | dsa |
| 10 | trees | Trees & BST | dsa |
| 11 | heap | Heap / Priority Queue | dsa |
| 12 | graphs | Graphs | dsa |
| 13 | dynamic-programming | Dynamic Programming | dsa |
| 14 | greedy-intervals | Greedy & Intervals | dsa |
| 15 | math-bits | Math & Bit Manipulation | dsa |
| 16 | oop | Object-Oriented Programming | cs-fundamentals |
| 17 | design-patterns | SOLID & Design Patterns | cs-fundamentals |
| 18 | dbms | Database Concepts (DBMS) | cs-fundamentals |
| 19 | sql | SQL | cs-fundamentals |
| 20 | operating-systems | Operating Systems | cs-fundamentals |
| 21 | computer-networks | Computer Networks | cs-fundamentals |
| 22 | javascript | JavaScript | web |
| 23 | react-nextjs | React & Next.js | web |
| 24 | nodejs-express | Node.js & Express | web |
| 25 | web-fundamentals | Web, HTTP, REST & Security | web |
| 26 | java-spring | Java & Spring Boot | web |
| 27 | system-design | System Design Basics | engineering |
| 28 | git | Git & Version Control | engineering |
| 29 | behavioral | Behavioral, HR & Interview Strategy | career |

Category display names: `dsa` → "Data Structures & Algorithms", `cs-fundamentals` → "CS Fundamentals",
`web` → "Web & Languages", `engineering` → "Engineering Practices", `career` → "Career & Behavioral".

## REST API contract (base `/api`)

Types referenced below are defined in `client/src/lib/types.ts` — the server MUST return exactly these shapes.

**Conventions**
- JSON only. Successful responses return the documented body directly (no `{data: ...}` wrapper).
- Errors: HTTP status + `{ "error": { "message": string, "code"?: string, "details"?: unknown } }`.
  400 validation (`code: "VALIDATION_ERROR"`, zod issues in `details`), 401 `UNAUTHENTICATED`, 404 `NOT_FOUND`, 409 `CONFLICT`, 429 `RATE_LIMITED`, 500 `INTERNAL`.
- Ids are strings (`_id.toString()`), dates are ISO strings.
- Lists of user data are sorted newest first.
- Optional auth: if a valid `hr_token` cookie is present `req.user` is set, otherwise the request continues anonymously.

### Health & stats
| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/api/health` | – | `{ ok: true, db: "connected" \| "disconnected", uptime: number }` |
| GET | `/api/stats` | – | `PlatformStats` |

### Auth
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/auth/register` | `{ name (2–60), email, password (8–128) }` | `201 { user: User }` + sets cookie; 409 if email exists |
| POST | `/api/auth/login` | `{ email, password }` | `{ user: User }` + sets cookie; 401 on bad credentials (same message for unknown email and wrong password) |
| POST | `/api/auth/logout` | – | `{ ok: true }` + clears cookie |
| GET | `/api/auth/me` | required | `{ user: User }` |
| GET | `/api/auth/providers` | – | `{ google: boolean, email: boolean }` (Google client configured / SMTP configured) |
| POST | `/api/auth/forgot-password` | `{ email }` | always `{ ok: true }`; emails a single-use link (sha256-hashed token, 30 min, max one email/min/account) to `APP_URL/reset-password?token=…`. Without SMTP the email is printed to the API console (development only) |
| POST | `/api/auth/reset-password` | `{ token, password (8–128) }` | `{ user: User }` + sets cookie; revokes all earlier sessions (`passwordChangedAt`); 400 `INVALID_TOKEN` when expired/used |
| GET | `/api/auth/google?next=/path` | – | 302 to Google (authorization code + PKCE, `state` in a signed 10-min `hr_oauth` cookie); 404 when Google is not configured |
| GET | `/api/auth/google/callback` | – | 302 to `APP_URL + next` with a session cookie, or to `/login?error=google`. Links to an existing account with the same Google-verified email (removing its unverified password) or creates one |

Rate limits (per IP, 15 min): register, login, reset-password, google, google/callback 20 each; forgot-password 5.

### Content (public)
| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/api/topics` | – | `{ items: TopicSummary[] }` sorted by `order` |
| GET | `/api/topics/:slug` | – | `TopicDetailResponse` (questions sorted by `order`) |
| GET | `/api/questions` | `topic, difficulty, kind, frequency` (each comma-separated), `tag`, `q` (case-insensitive match on title, tags, pattern, prompt), `sort` = `default` (topic order, then question order) \| `title` \| `difficulty` \| `frequency`, `page` (≥1, default 1), `limit` (1–100, default 20) | `Paginated<QuestionSummary>` |
| GET | `/api/questions/random` | `count` (1–20, default 5), `kinds`, `topics`, `difficulty` (comma-separated), `exclude` (comma-separated slugs) | `{ items: Question[] }` (full questions) |
| GET | `/api/questions/:slug` | – | `QuestionDetailResponse`; `prev`/`next` are neighbours in the same topic by `order` |
| GET | `/api/quiz` | – | `{ items: QuizTopicSummary[] }` sorted by topic order |
| GET | `/api/quiz/:topic` | `limit` (1–50, default all), `shuffle` (`true` shuffles questions, not options) | `QuizResponse` (answers included — practice tool) |
| GET | `/api/roadmap` | – | `Roadmap` (404 if not seeded) |

`/api/questions/random` must be registered **before** `/api/questions/:slug`.

### User data (auth required unless noted)
| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/progress` | – | `ProgressSnapshot` (only questions with a progress doc) |
| PUT | `/api/progress/questions/:slug` | `QuestionProgressUpdate` (`notes` ≤ 5000 chars, `confidence` 1–5 or null) | `{ progress: QuestionProgress }` (upsert; 404 if question slug unknown) |
| PUT | `/api/progress/roadmap/:day` | `{ done: boolean }` | `{ roadmapDays: number[] }` sorted asc |
| GET | `/api/progress/stats` | – | `ProgressStats` |
| POST | `/api/quiz/attempts` | `QuizAttemptInput` | `QuizAttemptResult` — **optional auth**: graded for everyone, stored only when logged in (`saved`) |
| GET | `/api/quiz/attempts` | – | `{ items: QuizAttempt[] }` (latest 50) |
| POST | `/api/mock-sessions` | `MockSessionInput` (1–20 items, `selfRating` 1–5) | `201 { session: MockSession }` |
| GET | `/api/mock-sessions` | – | `{ items: MockSession[] }` (latest 20) |

Every progress update, quiz attempt and mock session records activity for the user's UTC day (used for streaks and the activity heatmap).

## Data model (MongoDB collections)

| Collection | Key fields | Indexes |
|---|---|---|
| `topics` | everything in `Topic` | `slug` unique, `order` |
| `questions` | everything in `Question` + `order` (index within topic file) + `topicOrder` | `slug` unique, `{topic, order}`, `{topicOrder, order}`, text-ish search via regex on title/tags/pattern/prompt |
| `quizquestions` | `QuizQuestion` + `topic` + `order` | `id` unique, `{topic, order}` |
| `roadmaps` | single doc `{ key: "default", ...Roadmap }` | `key` unique |
| `users` | `name, email (lowercased, unique), passwordHash, createdAt` | `email` unique |
| `questionprogresses` | `user, questionSlug, status, bookmarked, notes, confidence, updatedAt` | `{user, questionSlug}` unique |
| `roadmapprogresses` | `user, days: number[]` | `user` unique |
| `quizattempts` | `user, topic, score, total, pct, answers[], createdAt` | `{user, createdAt}` |
| `mocksessions` | `user, config, items[], durationSec, avgRating, createdAt` | `{user, createdAt}` |
| `activities` | `user, date (YYYY-MM-DD UTC), count` | `{user, date}` unique |

Seeding (`npm run seed`) validates all content first (aborts on any error), then **syncs**: upserts every
topic/question/quiz item/roadmap and deletes content documents whose slug/id no longer exists. User
collections are never touched.

## Frontend routes

| Route | Purpose |
|---|---|
| `/` | Landing: value proposition, live stats, category overview, "how a question works" demo, CTA |
| `/topics` | All topics grouped by category with counts + personal progress bars |
| `/topics/[slug]` | Overview, cheat sheet, patterns, question list (filter by difficulty/kind/status), quiz CTA |
| `/questions` | Searchable, filterable list of every question (URL-synced filters, pagination) |
| `/questions/[slug]` | Question page: prompt, examples, progressive hints, **visual walkthrough**, approaches, solution code tabs, complexity, pitfalls, follow-ups, notes, solved/bookmark, prev/next |
| `/quiz`, `/quiz/[topic]` | Topic MCQ quizzes with instant feedback and saved scores |
| `/mock-interview` | Timed mock interview: configure → answer under a timer → reveal → self-rate → summary |
| `/roadmap` | 30-day study plan with per-day completion |
| `/dashboard` | Personal stats: solved by topic/difficulty, streak, activity heatmap, quiz & mock history, bookmarks |
| `/login`, `/register` | Auth |
| `/dev/visuals`, `/dev/content-check` | Developer pages: visualizer gallery and an automated check that renders every visual in the DB |

## Code ownership (parallel build)

| Area | Owner |
|---|---|
| `server/src/content/schema.ts`, `server/src/content/validate.ts`, `client/src/lib/types.ts`, `client/src/app/globals.css` tokens, `docs/` | architect (change only with a note in your report) |
| `server/src/data/content/*.json` | content authors (one owner per topic file) |
| `server/src/**` (except the above), `server/scripts/seed.ts` | backend |
| `client/src/components/visualizers/**`, `client/src/app/dev/**` | visualizer |
| rest of `client/src/**` | frontend app |
