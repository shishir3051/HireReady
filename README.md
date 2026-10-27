# HireReady

**Crack your first software engineering interview.** HireReady is a full-stack interview-preparation
platform for new graduates and junior engineers. Every question comes with a model answer you can say out
loud, solutions in JavaScript / Python / Java, and an **interactive visual walkthrough** that animates the
solution step by step (pointers moving across arrays, trees being traversed, DP tables filling, the event
loop draining queues, TCP handshakes, ...).

## What's inside

| Area | Topics |
|---|---|
| Data Structures & Algorithms | Big-O, arrays & hashing, two pointers, sliding window, stack & queue, binary search, linked list, sorting, recursion & backtracking, trees & BST, heaps, graphs, dynamic programming, greedy & intervals, math & bits |
| CS Fundamentals | OOP, SOLID & design patterns, DBMS, SQL, operating systems, computer networks |
| Web & Languages | JavaScript, React & Next.js, Node.js & Express, HTTP/REST/security, Java & Spring Boot |
| Engineering | System design basics, Git |
| Career | Behavioral & HR questions, interview strategy |

Features:

- **Visual walkthroughs** with play/pause, step scrubbing, a variable watch box, side panels (stacks, queues, hash maps) and the code line that runs at each step.
- **Narrated walkthroughs**: press **Narrate** (or N) and the browser reads each step aloud, moving on when it finishes, like a video lesson (Web Speech API, works offline).
- **Practice mode**: hide the solution, reveal hints one at a time.
- **Topic quizzes** with instant feedback and saved scores.
- **Timed mock interviews** with self-rating and a summary of weak areas.
- **30-day roadmap** with daily goals and linked questions.
- **Dashboard**: progress by topic and difficulty, streaks, activity heatmap, bookmarks and notes.

## Tech stack

- **client/**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Mermaid, Motion
- **server/**: Node.js 24, Express 5, Mongoose 9, zod, JWT in an httpOnly cookie, bcrypt
- **Database**: MongoDB (Atlas or local)

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the API contract and data model, and
[docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md) for how questions and visuals are authored.

## Getting started

Prerequisites: Node.js 20+ and a MongoDB connection string.

```bash
npm run install:all
```

Configure the API in `server/.env` (copy `server/.env.example`):

```
MONGODB_URI=mongodb+srv://<user>:<url-encoded-password>@<cluster-host>/hireready?appName=Cluster0
JWT_SECRET=<long random string>
```

> Special characters in the password must be URL-encoded inside the URI (`/` → `%2F`, `@` → `%40`).

Configure the web app in `client/.env.local` (copy `client/.env.example`): `API_URL=http://localhost:4000`.

Load the content into MongoDB and start both apps:

```bash
npm run seed
```

```bash
npm run dev
```

Open http://localhost:3200. The API runs on http://localhost:4000.

## Scripts (from the repo root)

| Script | What it does |
|---|---|
| `npm run dev` | API (:4000) and web (:3200) together |
| `npm run seed` | Validate all content, then sync it into MongoDB (never touches user data) |
| `npm run validate` | Validate the content JSON without touching the database |
| `npm run build` | Production build of both apps |
| `npm run typecheck` | TypeScript checks for both apps |

## Optional: Google sign-in and password-reset email

Both are off until their keys are in `server/.env` (restart the API afterwards).

**Google sign-in**
1. Google Cloud Console → APIs & Services → OAuth consent screen: create it (External), add your email as a test user.
2. Credentials → Create credentials → OAuth client ID → *Web application*.
3. Authorized redirect URI: `http://localhost:3200/api/auth/google/callback` (use your `APP_URL`).
4. Copy the client ID and secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. The "Continue with Google" button appears automatically.

**Password-reset email (SMTP)**: set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (and optionally `MAIL_FROM`).
For Gmail: turn on 2-Step Verification, create an *App password*, then use `smtp.gmail.com`, port `587`, your address and
the 16-character app password. Without SMTP, reset links are printed in the API terminal (development only).

## Troubleshooting

- **Port 3200 is already in use**: stop the other process, or run `next dev -p <port>` and set `APP_URL` / `CLIENT_ORIGIN` in
  `server/.env` (and the Google redirect URI) to the same port, so reset links and Google sign-in come back to it.
- **"Blocked cross-origin request to Next.js dev resource"**: you opened the dev server from another hostname (e.g. the
  "Network" URL). Add that hostname to `DEV_ALLOWED_ORIGINS` in `client/.env.local` and restart `npm run dev`.
- **`querySrv ENOTFOUND _mongodb._tcp...`**: the Atlas cluster host in `MONGODB_URI` doesn't exist. Copy the exact
  connection string from Atlas → Connect → Drivers. A local MongoDB (`mongodb://127.0.0.1:27017/hireready`) also works.
- **`npm run seed` reports errors**: it validates every content file and the roadmap before writing anything; fix the
  listed file/field and run it again.

## Adding content

Each topic is one JSON file in `server/src/data/content/<topic-slug>.json`. Follow
[docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md), run `npm run validate`, then `npm run seed`. Developer pages
`/dev/visuals` (renderer gallery) and `/dev/content-check` (renders every visual in the database and lists
failures) help you check your work.
