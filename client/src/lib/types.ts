/**
 * Shared frontend types.
 * Content shapes mirror server/src/content/schema.ts; API shapes mirror docs/ARCHITECTURE.md.
 * Change them together.
 */

// ---------------------------------------------------------------- content

export type ColorKey = "primary" | "success" | "warning" | "danger" | "info" | "muted";
export type Value = string | number;
export type Cell = string | number | null;
export type Scalar = string | number | boolean | null;

export type Panel =
  | {
      kind: "stack" | "queue" | "list" | "set" | "heap" | "output";
      title: string;
      /** stack: last item is the TOP. queue: first item is the FRONT. */
      items: Value[];
      highlight?: number[];
    }
  | {
      kind: "map";
      title: string;
      entries: { key: string; value: string }[];
      highlight?: string[];
    };

export interface BaseStep {
  note: string;
  vars?: Record<string, Scalar>;
  panels?: Panel[];
  /** 1-based line in the question's javascript solution */
  codeLine?: number;
}

interface VisualHead {
  title: string;
  caption?: string;
}

export interface ArrayRow {
  name?: string;
  values: Value[];
  pointers?: { name: string; index: number; color?: ColorKey }[];
  highlights?: { indices: number[]; color: ColorKey }[];
  /** inclusive */
  ranges?: { start: number; end: number; color?: ColorKey; label?: string }[];
}
export interface ArrayStep extends BaseStep {
  arrays: ArrayRow[];
}
export interface ArrayVisual extends VisualHead {
  type: "array";
  steps: ArrayStep[];
}

export interface GridStep extends BaseStep {
  grid: Cell[][];
  highlights?: { cells: [number, number][]; color: ColorKey }[];
}
export interface GridVisual extends VisualHead {
  type: "grid";
  rowLabels?: string[];
  colLabels?: string[];
  steps: GridStep[];
}

export interface PointerRef {
  name: string;
  nodeId: string | null;
  color?: ColorKey;
}
export interface IdHighlight {
  ids: string[];
  color: ColorKey;
}

export interface LinkedListStep extends BaseStep {
  nodes: { id: string; value: Value; next: string | null }[];
  head?: string | null;
  pointers?: PointerRef[];
  highlights?: IdHighlight[];
}
export interface LinkedListVisual extends VisualHead {
  type: "linked-list";
  steps: LinkedListStep[];
}

export interface TreeNode {
  id: string;
  value: Value;
  left?: string | null;
  right?: string | null;
  children?: string[];
}
export interface TreeStep extends BaseStep {
  nodes: TreeNode[];
  root: string | null;
  pointers?: PointerRef[];
  highlights?: IdHighlight[];
}
export interface TreeVisual extends VisualHead {
  type: "tree";
  steps: TreeStep[];
}

export interface GraphStep extends BaseStep {
  nodeHighlights?: IdHighlight[];
  edgeHighlights?: { edges: [string, string][]; color: ColorKey }[];
  nodeBadges?: Record<string, string>;
}
export interface GraphVisual extends VisualHead {
  type: "graph";
  directed: boolean;
  /** x/y in a 0–100 square */
  nodes: { id: string; label?: string; x: number; y: number }[];
  edges: { from: string; to: string; weight?: Value }[];
  steps: GraphStep[];
}

export interface TableData {
  name: string;
  columns: string[];
  rows: Cell[][];
  highlightRows?: { rows: number[]; color: ColorKey }[];
}
export interface TableStep extends BaseStep {
  query?: string;
  tables: TableData[];
}
export interface TableVisual extends VisualHead {
  type: "table";
  steps: TableStep[];
}

export interface StateStep extends BaseStep {
  panels: Panel[];
}
export interface StateVisual extends VisualHead {
  type: "state";
  steps: StateStep[];
}

export interface TimelineSegment {
  label: string;
  start: number;
  end: number;
  lane?: string;
  color?: ColorKey;
}
export interface TimelineStep extends BaseStep {
  segments: TimelineSegment[];
}
export interface TimelineVisual extends VisualHead {
  type: "timeline";
  unit?: string;
  steps: TimelineStep[];
}

export interface DiagramVisual extends VisualHead {
  type: "diagram";
  frames: { note: string; mermaid: string }[];
}

export interface ComparisonVisual extends VisualHead {
  type: "comparison";
  /** columns[0] is the aspect header */
  columns: string[];
  rows: string[][];
}

export type Visual =
  | ArrayVisual
  | GridVisual
  | LinkedListVisual
  | TreeVisual
  | GraphVisual
  | TableVisual
  | StateVisual
  | TimelineVisual
  | DiagramVisual
  | ComparisonVisual;
export type VisualType = Visual["type"];

export type Language = "javascript" | "typescript" | "python" | "java" | "c" | "cpp" | "sql" | "bash" | "json" | "text";
export interface CodeSnippet {
  language: Language;
  code: string;
}

export type Difficulty = "easy" | "medium" | "hard";
export type QuestionKind = "coding" | "concept" | "sql" | "design" | "behavioral";
export type Frequency = "very-high" | "high" | "medium";
export type Category = "dsa" | "cs-fundamentals" | "web" | "engineering" | "career";

export interface Question {
  slug: string;
  title: string;
  topic: string;
  difficulty: Difficulty;
  kind: QuestionKind;
  frequency: Frequency;
  tags: string[];
  pattern?: string;
  prompt: string;
  examples?: { input: string; output: string; explanation?: string }[];
  constraints?: string[];
  hints: string[];
  approaches: { name: string; idea: string; time: string; space: string }[];
  solution: {
    summary: string;
    explanation: string;
    code?: CodeSnippet[];
    complexity?: { time: string; space: string };
    keyPoints: string[];
  };
  visuals: Visual[];
  pitfalls?: string[];
  followUps?: { question: string; answer: string }[];
  related?: string[];
  /** position within its topic (assigned by the seed script) */
  order: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  code?: CodeSnippet;
  options: string[];
  answer: number;
  explanation: string;
  difficulty: Difficulty;
}

export interface Topic {
  slug: string;
  title: string;
  category: Category;
  order: number;
  summary: string;
  overview: string;
  cheatsheet: { title: string; points: string[] }[];
  patterns?: { name: string; whenToUse: string; template?: CodeSnippet }[];
  estimatedHours: number;
}

export interface RoadmapDay {
  day: number;
  week: number;
  title: string;
  topics: string[];
  goals: string[];
  questionSlugs: string[];
  estimatedHours: number;
}
export interface Roadmap {
  title: string;
  description: string;
  days: RoadmapDay[];
}

// ---------------------------------------------------------------- API

export interface ApiErrorBody {
  error: { message: string; code?: string; details?: unknown };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface TopicStats {
  questionCount: number;
  difficultyCounts: Record<Difficulty, number>;
  quizCount: number;
}
export type TopicSummary = Pick<Topic, "slug" | "title" | "category" | "order" | "summary" | "estimatedHours"> & TopicStats;

export interface QuestionSummary {
  slug: string;
  title: string;
  topic: string;
  topicTitle: string;
  difficulty: Difficulty;
  kind: QuestionKind;
  frequency: Frequency;
  tags: string[];
  pattern?: string;
  /** solution.summary */
  summary: string;
  visualTypes: VisualType[];
  order: number;
}

export interface NavRef {
  slug: string;
  title: string;
}

/** GET /api/topics/:slug */
export interface TopicDetailResponse {
  topic: Topic & TopicStats;
  questions: QuestionSummary[];
}

/** GET /api/questions/:slug */
export interface QuestionDetailResponse {
  question: Question;
  topic: { slug: string; title: string; category: Category };
  prev: NavRef | null;
  next: NavRef | null;
}

/** GET /api/stats */
export interface PlatformStats {
  topics: number;
  questions: number;
  quizQuestions: number;
  visuals: number;
  byKind: Record<QuestionKind, number>;
  byDifficulty: Record<Difficulty, number>;
  byCategory: Record<Category, number>;
}

/** GET /api/quiz */
export interface QuizTopicSummary {
  topic: string;
  title: string;
  category: Category;
  count: number;
}

/** GET /api/quiz/:topic */
export interface QuizResponse {
  topic: { slug: string; title: string };
  items: QuizQuestion[];
}

/** POST /api/quiz/attempts */
export interface QuizAttemptInput {
  topic: string;
  answers: { questionId: string; selected: number }[];
}
export interface QuizAttemptResult {
  score: number;
  total: number;
  pct: number;
  results: { questionId: string; selected: number; answer: number; correct: boolean }[];
  /** false when the user is not logged in */
  saved: boolean;
}
export interface QuizAttempt {
  id: string;
  topic: string;
  topicTitle: string;
  score: number;
  total: number;
  pct: number;
  createdAt: string;
}

export type ProgressStatus = "todo" | "attempted" | "solved";
export interface QuestionProgress {
  slug: string;
  status: ProgressStatus;
  bookmarked: boolean;
  notes: string;
  /** self-rated 1–5, null if never rated */
  confidence: number | null;
  updatedAt: string;
}
export type QuestionProgressUpdate = Partial<Pick<QuestionProgress, "status" | "bookmarked" | "notes" | "confidence">>;

/** GET /api/progress */
export interface ProgressSnapshot {
  questions: QuestionProgress[];
  roadmapDays: number[];
}

/** GET /api/progress/stats */
export interface ProgressStats {
  totals: { solved: number; attempted: number; bookmarked: number; questions: number };
  byTopic: { topic: string; title: string; category: Category; solved: number; attempted: number; total: number }[];
  byDifficulty: Record<Difficulty, { solved: number; total: number }>;
  streak: { current: number; longest: number };
  /** days with activity in the last 120 days, YYYY-MM-DD (UTC) */
  activity: { date: string; count: number }[];
  quiz: {
    attempts: number;
    avgPct: number;
    bestByTopic: { topic: string; title: string; bestPct: number; attempts: number }[];
  };
  mock: { sessions: number; avgRating: number; totalMinutes: number };
  roadmap: { completedDays: number; totalDays: number };
}

export interface MockConfig {
  count: number;
  kinds: QuestionKind[];
  topics: string[];
  difficulty: Difficulty | "mixed";
}
export interface MockSessionItem {
  slug: string;
  title: string;
  kind: QuestionKind;
  /** 1–5 self assessment */
  selfRating: number;
  timeSpentSec: number;
  revealed: boolean;
}
export interface MockSession {
  id: string;
  createdAt: string;
  durationSec: number;
  config: MockConfig;
  items: MockSessionItem[];
  avgRating: number;
}
/** POST /api/mock-sessions — server fills title/kind from the question */
export interface MockSessionInput {
  config: MockConfig;
  durationSec: number;
  items: Omit<MockSessionItem, "title" | "kind">[];
}

// ---------------------------------------------------------------- AI (Gemini)

export interface AiEvaluation {
  rating: number; // 1 to 5
  verdict: 'Strong Hire' | 'Hire' | 'Lean Hire' | 'Lean No Hire' | 'No Hire';
  summary: string;
  strengths: string[];
  improvements: string[];
  missingEdgeCases: string[];
}

/** The server loads the question text itself from `slug`. */
export interface AiEvaluationInput {
  slug: string;
  userNotes: string;
  lang?: 'en' | 'bn';
}

export interface AiChatInput {
  slug: string;
  message: string;
  history?: Array<{ role: 'user' | 'model'; text: string }>;
  lang?: 'en' | 'bn';
}

/** Today's AI usage for one feature (resets at midnight UTC). */
export interface AiUsage {
  used: number;
  limit: number;
}

export interface AiStatus {
  enabled: boolean;
  /** present when logged in */
  usage?: { chat: AiUsage; evaluate: AiUsage };
}

