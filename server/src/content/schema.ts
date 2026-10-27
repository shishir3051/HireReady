/**
 * Content schema — the single source of truth for every topic/question/quiz JSON file
 * in `src/data/content/`. The frontend mirrors these shapes in `client/src/lib/types.ts`.
 * Change both together.
 */
import { z } from 'zod';

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be kebab-case');

/**
 * Semantic highlight colors shared by every visualizer:
 * primary = current/active element, warning = being compared / candidate,
 * success = found / final / sorted / answer, danger = removed / conflict / invalid,
 * info = visited / inside window / inside a structure, muted = discarded / out of range.
 */
export const ColorKey = z.enum(['primary', 'success', 'warning', 'danger', 'info', 'muted']);

const Value = z.union([z.string(), z.number()]);
const Cell = z.union([z.string(), z.number(), z.null()]);
const Scalar = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const int = z.number().int();

/** Side data structure drawn next to the main visual (call stack, hash map, queue, result list...). */
const ListPanel = z.object({
  kind: z.enum(['stack', 'queue', 'list', 'set', 'heap', 'output']),
  title: z.string().min(1),
  /** stack: last item is the TOP. queue: first item is the FRONT. heap: array representation. */
  items: z.array(Value),
  /** indices into `items` to emphasise */
  highlight: z.array(int).optional(),
});
const MapPanel = z.object({
  kind: z.literal('map'),
  title: z.string().min(1),
  entries: z.array(z.object({ key: z.string(), value: z.string() })),
  /** keys to emphasise */
  highlight: z.array(z.string()).optional(),
});
export const Panel = z.union([ListPanel, MapPanel]);

/** Fields every animation step can carry. */
const baseStep = {
  /** Narration for this step: 1–2 sentences explaining WHAT happens and WHY. Inline markdown allowed. */
  note: z.string().min(1),
  /** Variables to show in a watch box, e.g. { i: 2, sum: 7, best: 3 }. */
  vars: z.record(z.string(), Scalar).optional(),
  panels: z.array(Panel).optional(),
  /** 1-based line in this question's `solution.code` entry whose language is "javascript". */
  codeLine: int.positive().optional(),
};
export const BaseStep = z.object(baseStep);

const visualHead = {
  title: z.string().min(1),
  caption: z.string().optional(),
};

// ---------- array: arrays, strings, two pointers, sliding window, sorting, binary search ----------
const ArrayRow = z.object({
  name: z.string().optional(),
  values: z.array(Value),
  /** index may be -1 or values.length to show a pointer that walked off the end */
  pointers: z.array(z.object({ name: z.string(), index: int, color: ColorKey.optional() })).optional(),
  highlights: z.array(z.object({ indices: z.array(int), color: ColorKey })).optional(),
  /** inclusive [start, end] spans, e.g. a sliding window */
  ranges: z
    .array(z.object({ start: int, end: int, color: ColorKey.optional(), label: z.string().optional() }))
    .optional(),
});
const ArrayVisual = z.object({
  type: z.literal('array'),
  ...visualHead,
  steps: z.array(z.object({ ...baseStep, arrays: z.array(ArrayRow).min(1) })).min(1),
});

// ---------- grid: matrices, DP tables, grid BFS/DFS ----------
const GridVisual = z.object({
  type: z.literal('grid'),
  ...visualHead,
  rowLabels: z.array(z.string()).optional(),
  colLabels: z.array(z.string()).optional(),
  steps: z
    .array(
      z.object({
        ...baseStep,
        grid: z.array(z.array(Cell)).min(1),
        highlights: z.array(z.object({ cells: z.array(z.tuple([int, int])), color: ColorKey })).optional(),
      }),
    )
    .min(1),
});

// ---------- linked-list ----------
const LinkedListVisual = z.object({
  type: z.literal('linked-list'),
  ...visualHead,
  steps: z
    .array(
      z.object({
        ...baseStep,
        /** drawn left→right in this order; `next` arrows may point anywhere (reversal, cycles) */
        nodes: z.array(z.object({ id: z.string(), value: Value, next: z.string().nullable() })),
        head: z.string().nullable().optional(),
        pointers: z
          .array(z.object({ name: z.string(), nodeId: z.string().nullable(), color: ColorKey.optional() }))
          .optional(),
        highlights: z.array(z.object({ ids: z.array(z.string()), color: ColorKey })).optional(),
      }),
    )
    .min(1),
});

// ---------- tree: binary trees, BSTs, heaps, tries, recursion / decision trees ----------
const TreeVisual = z.object({
  type: z.literal('tree'),
  ...visualHead,
  steps: z
    .array(
      z.object({
        ...baseStep,
        /** binary trees use left/right; n-ary trees (trie, recursion tree) use children */
        nodes: z.array(
          z.object({
            id: z.string(),
            value: Value,
            left: z.string().nullable().optional(),
            right: z.string().nullable().optional(),
            children: z.array(z.string()).optional(),
          }),
        ),
        root: z.string().nullable(),
        pointers: z
          .array(z.object({ name: z.string(), nodeId: z.string().nullable(), color: ColorKey.optional() }))
          .optional(),
        highlights: z.array(z.object({ ids: z.array(z.string()), color: ColorKey })).optional(),
      }),
    )
    .min(1),
});

// ---------- graph: BFS/DFS, topo sort, Dijkstra, union-find ----------
const GraphVisual = z.object({
  type: z.literal('graph'),
  ...visualHead,
  directed: z.boolean(),
  /** x/y are positions in a 0–100 square; lay nodes out so edges don't overlap */
  nodes: z.array(z.object({ id: z.string(), label: z.string().optional(), x: z.number().min(0).max(100), y: z.number().min(0).max(100) })).min(1),
  edges: z.array(z.object({ from: z.string(), to: z.string(), weight: Value.optional() })),
  steps: z
    .array(
      z.object({
        ...baseStep,
        nodeHighlights: z.array(z.object({ ids: z.array(z.string()), color: ColorKey })).optional(),
        edgeHighlights: z.array(z.object({ edges: z.array(z.tuple([z.string(), z.string()])), color: ColorKey })).optional(),
        /** small label under a node, e.g. distance or discovery order: { A: "0", B: "4" } */
        nodeBadges: z.record(z.string(), z.string()).optional(),
      }),
    )
    .min(1),
});

// ---------- table: SQL tables, joins, group by, normalization ----------
const TableData = z.object({
  name: z.string(),
  columns: z.array(z.string()).min(1),
  rows: z.array(z.array(Cell)),
  highlightRows: z.array(z.object({ rows: z.array(int), color: ColorKey })).optional(),
});
const TableVisual = z.object({
  type: z.literal('table'),
  ...visualHead,
  steps: z.array(z.object({ ...baseStep, query: z.string().optional(), tables: z.array(TableData).min(1) })).min(1),
});

// ---------- state: only panels + vars (event loop, LRU cache, scheduler queues, call stack) ----------
const StateVisual = z.object({
  type: z.literal('state'),
  ...visualHead,
  steps: z.array(z.object({ ...baseStep, panels: z.array(Panel).min(1) })).min(1),
});

// ---------- timeline: Gantt-style lanes (CPU scheduling, request lifecycles, git history) ----------
const TimelineVisual = z.object({
  type: z.literal('timeline'),
  ...visualHead,
  unit: z.string().optional(),
  steps: z
    .array(
      z.object({
        ...baseStep,
        segments: z.array(
          z.object({ label: z.string(), start: z.number(), end: z.number(), lane: z.string().optional(), color: ColorKey.optional() }),
        ),
      }),
    )
    .min(1),
});

// ---------- diagram: Mermaid (flowchart, sequenceDiagram, classDiagram, erDiagram, stateDiagram-v2) ----------
const DiagramVisual = z.object({
  type: z.literal('diagram'),
  ...visualHead,
  frames: z.array(z.object({ note: z.string().min(1), mermaid: z.string().min(1) })).min(1),
});

// ---------- comparison: side-by-side table (TCP vs UDP, process vs thread) ----------
const ComparisonVisual = z.object({
  type: z.literal('comparison'),
  ...visualHead,
  /** columns[0] is the "aspect" column header */
  columns: z.array(z.string()).min(2),
  rows: z.array(z.array(z.string())).min(1),
});

export const Visual = z.discriminatedUnion('type', [
  ArrayVisual,
  GridVisual,
  LinkedListVisual,
  TreeVisual,
  GraphVisual,
  TableVisual,
  StateVisual,
  TimelineVisual,
  DiagramVisual,
  ComparisonVisual,
]);
export const VISUAL_TYPES = [
  'array', 'grid', 'linked-list', 'tree', 'graph', 'table', 'state', 'timeline', 'diagram', 'comparison',
] as const;

export const Language = z.enum(['javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'sql', 'bash', 'json', 'text']);
export const CodeSnippet = z.object({ language: Language, code: z.string().min(1) });

export const Difficulty = z.enum(['easy', 'medium', 'hard']);
export const QuestionKind = z.enum(['coding', 'concept', 'sql', 'design', 'behavioral']);
export const Frequency = z.enum(['very-high', 'high', 'medium']);
export const Category = z.enum(['dsa', 'cs-fundamentals', 'web', 'engineering', 'career']);

export const Question = z.object({
  slug,
  title: z.string().min(3),
  /** topic slug; must equal the file's topic.slug */
  topic: slug,
  difficulty: Difficulty,
  kind: QuestionKind,
  /** how often this shows up in junior / new-grad interviews */
  frequency: Frequency,
  tags: z.array(z.string()).min(1),
  /** algorithmic pattern name for coding questions, e.g. "Sliding Window" */
  pattern: z.string().optional(),
  /** markdown problem statement or interview question */
  prompt: z.string().min(10),
  examples: z.array(z.object({ input: z.string(), output: z.string(), explanation: z.string().optional() })).optional(),
  constraints: z.array(z.string()).optional(),
  /** progressive hints, vaguest first */
  hints: z.array(z.string()).min(1),
  /** ordered brute force → optimal; concept questions may use "—" for time/space */
  approaches: z.array(z.object({ name: z.string(), idea: z.string(), time: z.string(), space: z.string() })).min(1),
  solution: z.object({
    /** the 30-second answer you would say first in the interview */
    summary: z.string().min(10),
    /** markdown, detailed walkthrough */
    explanation: z.string().min(20),
    code: z.array(CodeSnippet).optional(),
    complexity: z.object({ time: z.string(), space: z.string() }).optional(),
    /** bullet points the interviewer wants to hear */
    keyPoints: z.array(z.string()).min(1),
  }),
  visuals: z.array(Visual).min(1),
  pitfalls: z.array(z.string()).optional(),
  followUps: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
  /** slugs of related questions, any topic */
  related: z.array(slug).optional(),
});

export const QuizQuestion = z.object({
  /** `${topicSlug}-q${n}` */
  id: z.string().regex(/^[a-z0-9-]+-q\d+$/),
  question: z.string().min(5),
  /** optional snippet for "what is the output?" style questions */
  code: CodeSnippet.optional(),
  options: z.array(z.string().min(1)).min(2).max(5),
  /** index into options */
  answer: int.min(0),
  explanation: z.string().min(5),
  difficulty: Difficulty,
});

export const Topic = z.object({
  slug,
  title: z.string().min(2),
  category: Category,
  /** global display order (see docs/ARCHITECTURE.md topic table) */
  order: int,
  /** 1–2 sentence teaser */
  summary: z.string().min(10),
  /** markdown: what interviewers expect, core concepts, how to study it */
  overview: z.string().min(50),
  cheatsheet: z.array(z.object({ title: z.string(), points: z.array(z.string()).min(1) })).min(1),
  /** reusable patterns / templates (mainly DSA) */
  patterns: z
    .array(z.object({ name: z.string(), whenToUse: z.string(), template: CodeSnippet.optional() }))
    .optional(),
  estimatedHours: z.number().positive(),
});

/** One JSON file per topic: src/data/content/<topic-slug>.json */
export const ContentFile = z.object({
  topic: Topic,
  questions: z.array(Question).min(1),
  quiz: z.array(QuizQuestion).min(5),
});

export const Roadmap = z.object({
  title: z.string(),
  description: z.string(),
  days: z
    .array(
      z.object({
        day: int.positive(),
        week: int.positive(),
        title: z.string(),
        topics: z.array(slug).min(1),
        goals: z.array(z.string()).min(1),
        questionSlugs: z.array(slug),
        estimatedHours: z.number().positive(),
      }),
    )
    .min(28),
});

export type ColorKeyT = z.infer<typeof ColorKey>;
export type PanelT = z.infer<typeof Panel>;
export type VisualT = z.infer<typeof Visual>;
export type QuestionT = z.infer<typeof Question>;
export type QuizQuestionT = z.infer<typeof QuizQuestion>;
export type TopicT = z.infer<typeof Topic>;
export type ContentFileT = z.infer<typeof ContentFile>;
export type RoadmapT = z.infer<typeof Roadmap>;
