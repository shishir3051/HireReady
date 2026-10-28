import type {
  Category,
  Difficulty,
  Frequency,
  Language,
  ProgressStatus,
  QuestionKind,
  VisualType,
} from "@/lib/types";

export const SITE_NAME = "HireReady";
export const SITE_TAGLINE = "Crack your first software engineering interview";
export const SITE_DESCRIPTION =
  "Interview preparation for new-grad and junior software engineers: DSA, CS fundamentals, web, system design and behavioral questions, each with a model answer and a step-by-step visual walkthrough.";

// ---------------------------------------------------------------- navigation

export interface NavLink {
  href: string;
  label: string;
}

export const NAV_LINKS: NavLink[] = [
  { href: "/topics", label: "Topics" },
  { href: "/questions", label: "Questions" },
  { href: "/quiz", label: "Quiz" },
  { href: "/mock-interview", label: "Mock Interview" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/dashboard", label: "Dashboard" },
];

// ---------------------------------------------------------------- categories

export const CATEGORY_ORDER: Category[] = ["dsa", "cs-fundamentals", "web", "engineering", "career"];

export const CATEGORY_LABELS: Record<Category, string> = {
  dsa: "Data Structures & Algorithms",
  "cs-fundamentals": "CS Fundamentals",
  web: "Web & Languages",
  engineering: "Engineering Practices",
  career: "Career & Behavioral",
};

export const CATEGORY_SHORT_LABELS: Record<Category, string> = {
  dsa: "DSA",
  "cs-fundamentals": "CS Fundamentals",
  web: "Web & Languages",
  engineering: "Engineering",
  career: "Career",
};

export const CATEGORY_DESCRIPTIONS: Record<Category, string> = {
  dsa: "Big-O, arrays, two pointers, trees, graphs and DP — the patterns behind every coding round.",
  "cs-fundamentals": "OOP, design patterns, DBMS, SQL, operating systems and networks, explained the way interviewers ask.",
  web: "JavaScript, React & Next.js, Node & Express, HTTP and security, Java & Spring Boot.",
  engineering: "System design basics and Git — what a junior is expected to reason about on a real team.",
  career: "Behavioral and HR rounds: STAR stories, salary talk and how to close the interview.",
};

// ---------------------------------------------------------------- question facets

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
export const DIFFICULTY_LABELS: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

export const KINDS: QuestionKind[] = ["coding", "concept", "sql", "design", "behavioral"];
export const KIND_LABELS: Record<QuestionKind, string> = {
  coding: "Coding",
  concept: "Concept",
  sql: "SQL",
  design: "Design",
  behavioral: "Behavioral",
};

export const FREQUENCIES: Frequency[] = ["very-high", "high", "medium"];
export const FREQUENCY_LABELS: Record<Frequency, string> = {
  "very-high": "Very common",
  high: "Common",
  medium: "Sometimes asked",
};

export const PROGRESS_STATUSES: ProgressStatus[] = ["todo", "attempted", "solved"];
export const STATUS_LABELS: Record<ProgressStatus, string> = {
  todo: "To do",
  attempted: "Attempted",
  solved: "Solved",
};

/** Status filter used by question lists (client-side, needs progress). */
export type StatusFilter = "all" | "solved" | "unsolved" | "attempted" | "bookmarked";
export const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "solved", label: "Solved" },
  { value: "unsolved", label: "Unsolved" },
  { value: "attempted", label: "Attempted" },
  { value: "bookmarked", label: "Bookmarked" },
];

export const SORT_OPTIONS = [
  { value: "default", label: "Topic order" },
  { value: "title", label: "Title (A–Z)" },
  { value: "difficulty", label: "Difficulty" },
  { value: "frequency", label: "Most asked" },
] as const;
export type QuestionSort = (typeof SORT_OPTIONS)[number]["value"];

// ---------------------------------------------------------------- visuals & code

export const VISUAL_TYPE_LABELS: Record<VisualType, string> = {
  array: "Array trace",
  grid: "Grid / DP table",
  "linked-list": "Linked list",
  tree: "Tree",
  graph: "Graph",
  table: "SQL tables",
  state: "State panels",
  timeline: "Timeline",
  diagram: "Diagram",
  comparison: "Comparison",
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  c: "C",
  cpp: "C++",
  sql: "SQL",
  bash: "Bash",
  json: "JSON",
  text: "Text",
};

// ---------------------------------------------------------------- storage & cookie keys

export const LANG_COOKIE = "hr-lang";
export type AppLang = "en" | "bn";
export const DEFAULT_LANG: AppLang = "en";

export const STORAGE_KEYS = {
  theme: "hr-theme",
  codeLanguage: "hr-code-lang",
  practiceMode: "hr-practice-mode",
  lang: "hr-lang",
} as const;
