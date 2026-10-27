# Content Authoring Guide

Audience: a student who just graduated (CSE/SWE) preparing for their first software-engineer interview —
product companies, service companies and banks/fintechs (in Bangladesh and abroad). Typical rounds: online
coding test → technical interview (DSA + CS fundamentals + the language/framework on their CV) → HR/behavioral.

Every question must teach the reader to **answer it out loud in an interview**: the 30-second answer first,
then depth, then what the interviewer will ask next. And every question must have a **visual** that makes
the solution click.

## Files

- One file per topic: `server/src/data/content/<topic-slug>.json`, shape `ContentFile` in
  `server/src/content/schema.ts` (read it — it is short and fully commented).
- Reference example with the exact quality bar: `docs/examples/example-topic.json` (Two Sum + TCP vs UDP).
- Validate after every file: `cd server && npm run validate:content -- <topic-slug>` → must print `0 error(s)`.
  Fix warnings about single-step visuals unless a single frame is genuinely right.

## Recommended workflow (avoids JSON escaping bugs and wrong traces)

1. Write a throwaway Node builder script **outside the repo content folder**, e.g.
   `server/.scratch/<topic-slug>/build.mjs` (`.scratch` is git-ignored; delete it when done).
   Use template literals for code and markdown, and emit the file with
   `fs.writeFileSync(path, JSON.stringify(content, null, 2))`.
2. **Generate visual steps by actually running the algorithm** in the builder (instrument the loop and push
   a step object per iteration) instead of typing states by hand. This guarantees the trace matches the code.
3. **Execute every solution** against its examples before shipping: run the JavaScript with `node`, Python with
   `python`, Java with `java File.java` (JDK 21 is installed). Put test harnesses in the scratch folder.
4. Run the validator, fix, repeat. Then delete the scratch folder.

## Question requirements

| Field | Rules |
|---|---|
| `slug` | kebab-case, descriptive, globally unique (e.g. `longest-substring-without-repeating`, `explain-event-loop`). Never generic (`basics`, `question-1`). |
| `title` | Problem name or the question as asked ("What is a deadlock?"). |
| `prompt` | Your own words (do **not** paste LeetCode/GfG text). Markdown. Coding prompts state input/output precisely. |
| `difficulty` | Relative to a new-grad interview. DSA mix per topic ≈ 30% easy / 50% medium / 20% hard. |
| `frequency` | Honest estimate of how often it comes up in junior interviews. |
| `hints` | 2–4, vaguest first; the last one nearly gives the idea away. |
| `approaches` | Brute force → better → optimal (coding). For concept questions: "Weak answer" vs "Strong answer" with what separates them; use `"—"` for time/space. |
| `solution.summary` | The first 1–2 sentences you would say in the interview. |
| `solution.explanation` | Markdown walkthrough: intuition, numbered steps, why it is correct, edge cases. Concept answers: definitions, mechanisms, examples, trade-offs. |
| `solution.code` | **coding**: `javascript`, `python`, `java` (exactly one each, same algorithm, idiomatic, runnable as a function/method, ≤ 40 lines). **sql**: `sql` (+ optional explanation). Concept questions: include code when it clarifies (e.g. closures, a Java class). |
| `solution.complexity` | Required for coding questions, with one-phrase justification ("O(n) — each index enters and leaves the window once"). |
| `solution.keyPoints` | 3–6 bullets the interviewer is listening for. |
| `visuals` | ≥ 1. See below. |
| `pitfalls` | 2–4 common mistakes. |
| `followUps` | 1–3 likely follow-up questions with short answers. |
| `related` | Only slugs you authored (cross-topic slugs you are unsure of cause warnings). |

Quiz: **10–12 MCQs per topic**, 4 options, one correct, plausible distractors, explanation of why the right
answer is right (and the tempting wrong one is wrong). Spread the correct `answer` index across 0–3 — never
always the same position. Language topics should include "what does this print?" items using `code`.

## Visuals

Pick the visual that shows the **mechanism**, not decoration.

| Visual | Use for | Size limits |
|---|---|---|
| `array` | arrays/strings, two pointers, sliding window (`ranges`), binary search (`lo/mid/hi` pointers), sorting, prefix sums, stacks over a string (with `panels`) | ≤ 10 cells per row, ≤ 3 rows |
| `grid` | DP tables (`rowLabels`/`colLabels`), matrices, grid BFS/DFS (islands), N-Queens board | ≤ 8 × 9 |
| `linked-list` | reversal, fast/slow pointers, merge, cycle detection, LRU list | ≤ 8 nodes |
| `tree` | binary trees, BST insert/search/delete, traversals (`panels` output list), heaps (as tree), tries and **recursion / backtracking decision trees** (`children`) | ≤ 15 nodes |
| `graph` | BFS/DFS (queue/stack panel), topological sort, Dijkstra (`nodeBadges` = distances), union-find, cycle detection | ≤ 9 nodes; give x/y in 0–100, spread out, no overlapping edges |
| `table` | SQL: input tables → result table, joins, GROUP BY/HAVING, window functions, normalization 1NF→3NF, indexes | ≤ 8 rows per table |
| `state` | anything that is "data structures changing over time": JS event loop (call stack / microtask / macrotask panels), LRU cache, scheduler ready queue, Spring bean lifecycle, React render/commit | ≤ 4 panels |
| `timeline` | CPU scheduling Gantt charts (FCFS/SJF/RR with `lane`s), request lifecycles, retry/backoff timing | ≤ 12 segments |
| `diagram` | Mermaid: architecture (`flowchart`), protocols (`sequenceDiagram`), OOP (`classDiagram`), schemas (`erDiagram`), lifecycles (`stateDiagram-v2`), branching (`gitGraph`). Multiple `frames` = build the picture up step by step | ≤ 15 nodes per frame |
| `comparison` | X vs Y questions (process vs thread, SQL vs NoSQL, REST vs GraphQL) | ≤ 8 rows |

Rules for step-based visuals:
- 4–14 steps. Each step's `note` says what happens **and why** in 1–2 sentences, using the variable names from the code.
- Every step contains the **full state** (not a diff). Keep inputs small but non-trivial (the example should exercise the interesting branch).
- Use `vars` for the loop variables and running answers; use `panels` for auxiliary structures (map, set, stack, queue, heap, output).
- Colors are semantic: `primary` current, `warning` comparing/candidate, `success` answer/final/sorted, `danger` removed/invalid, `info` visited/inside window, `muted` discarded.
- `codeLine` (optional, but strongly encouraged for coding questions): 1-based line number in **your javascript solution** that the step corresponds to. Count lines exactly — the validator rejects out-of-range lines; a wrong line is worse than none.
- The final step shows the answer in `success`.

Coding questions should usually have **two** visuals: the step-by-step trace of the optimal solution, plus
(where it teaches something) a second one such as a brute-force vs optimal `comparison`, a recursion tree, or a DP table.
Concept questions: usually a `diagram` or `state` visual plus a `comparison` when contrasting things.

### Mermaid rules (the renderer is Mermaid 11; invalid syntax shows an error box)
- First line must be one of: `flowchart LR|TD`, `sequenceDiagram`, `classDiagram`, `erDiagram`, `stateDiagram-v2`, `gitGraph`, `mindmap`.
- Quote any label containing spaces or punctuation: `A["Load balancer (L7)"]`, `B{"Cache hit?"}`. Edge labels: `A -->|"miss"| B`.
- Node ids: simple alphanumerics (`lb`, `db1`). Never use `end`, `graph`, `subgraph`, `class`, `style` as ids.
- No HTML other than `<br/>`. No `click`, no `%%{init}%%`, no custom `style`/`classDef` colors (theme handles colors).
- sequenceDiagram: declare `participant X as Name`; message text is free text after `:` (avoid `;` and `#`).
- classDiagram: `class Animal { +String name +speak() void }` style members, relations `Animal <|-- Dog`, `Car *-- Engine`, `Order o-- Item`, `A ..> B`. Put each member on its own line inside braces.
- erDiagram: `CUSTOMER ||--o{ ORDER : places` and attribute blocks `CUSTOMER { int id PK  string name }` with one attribute per line.
- stateDiagram-v2: `[*] --> New`, `New --> Ready : admitted`.

## Tone and accuracy
- Correctness beats coverage. If unsure about a fact, leave it out.
- Be concrete: numbers, examples, real systems ("Instagram feed", "bKash payment", "a bank transfer must be ACID").
- Prefer modern, version-correct facts (Java 21, Spring Boot 3, React 19, Node 22+, HTTP/2 & HTTP/3, ES2023+).
- Explain jargon the first time. Short paragraphs, bullet lists, bold for key terms.
