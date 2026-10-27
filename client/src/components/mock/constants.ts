import type { Difficulty, MockConfig, QuestionKind } from "@/lib/types";
import type { Tone } from "@/components/ui/badge";

/** Suggested minutes per question, by kind (drives the per-question countdown). */
export const KIND_MINUTES: Record<QuestionKind, number> = {
  coding: 20,
  design: 15,
  sql: 10,
  concept: 5,
  behavioral: 4,
};

export const KIND_HINTS: Record<QuestionKind, string> = {
  coding: "Clarify, brute force, optimise, test",
  design: "Requirements, components, trade-offs",
  sql: "Write the query, explain the joins",
  concept: "Define it, example, when to use it",
  behavioral: "STAR: situation, task, action, result",
};

export const MIN_QUESTIONS = 3;
export const MAX_QUESTIONS = 10;

export const DIFFICULTY_CHOICES: (Difficulty | "mixed")[] = ["mixed", "easy", "medium", "hard"];

export const RATING_LABELS: Record<number, string> = {
  1: "Blanked",
  2: "Struggled",
  3: "Got there",
  4: "Solid",
  5: "Nailed it",
};

export const RATING_DESCRIPTIONS: Record<number, string> = {
  1: "Couldn't get started",
  2: "Needed the answer for most of it",
  3: "Reached an answer with gaps",
  4: "Good answer, minor misses",
  5: "Would impress an interviewer",
};

export function ratingTone(rating: number): Exclude<Tone, "neutral"> {
  if (rating >= 4) return "success";
  if (rating >= 3) return "warning";
  return "danger";
}

export const DEFAULT_MOCK_CONFIG: MockConfig = {
  count: 5,
  kinds: ["coding", "concept", "sql", "design", "behavioral"],
  topics: [],
  difficulty: "mixed",
};
