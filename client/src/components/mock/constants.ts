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

export const KIND_HINTS_BN: Record<QuestionKind, string> = {
  coding: "প্রশ্ন পরিষ্কার করা, ব্রুট ফোর্স, অপ্টিমাইজ, টেস্ট",
  design: "রিকোয়ারমেন্ট, কম্পোনেন্ট, ট্রেড-অফ",
  sql: "কোয়েরি লেখা, জয়েন ব্যাখ্যা করা",
  concept: "সংজ্ঞা, বাস্তব উদাহরণ, ব্যবহারের ক্ষেত্র",
  behavioral: "STAR মেথড: Situation, Task, Action, Result",
};

export const KIND_LABELS_BN: Record<QuestionKind, string> = {
  coding: "কোডিং (Coding)",
  concept: "কনসেপ্ট (Concept)",
  sql: "এসকিউএল (SQL)",
  design: "সিস্টেম ডিজাইন (Design)",
  behavioral: "বিহেভিয়ারাল (Behavioral)",
};

export const MIN_QUESTIONS = 3;
export const MAX_QUESTIONS = 10;

export const DIFFICULTY_CHOICES: (Difficulty | "mixed")[] = ["mixed", "easy", "medium", "hard"];

export const DIFFICULTY_LABELS_BN: Record<Difficulty, string> = {
  easy: "সহজ (Easy)",
  medium: "মাঝারি (Medium)",
  hard: "কঠিন (Hard)",
};

export const RATING_LABELS: Record<number, string> = {
  1: "Blanked",
  2: "Struggled",
  3: "Got there",
  4: "Solid",
  5: "Nailed it",
};

export const RATING_LABELS_BN: Record<number, string> = {
  1: "উত্তর মনে আসেনি",
  2: "বেশ কঠিন লেগেছে",
  3: "মোটামুটি পেরেছি",
  4: "ভালো দিয়েছি",
  5: "পারফেক্ট হয়েছে",
};

export const RATING_DESCRIPTIONS: Record<number, string> = {
  1: "Couldn't get started",
  2: "Needed the answer for most of it",
  3: "Reached an answer with gaps",
  4: "Good answer, minor misses",
  5: "Would impress an interviewer",
};

export const RATING_DESCRIPTIONS_BN: Record<number, string> = {
  1: "শুরুই করতে পারিনি",
  2: "বেশিরভাগ অংশেই সমাধান দেখতে হয়েছে",
  3: "কিছুটা অপূর্ণ হলেও উত্তর দিতে পেরেছি",
  4: "ভালো উত্তর হয়েছে, সামান্য কিছু ভুল ছিল",
  5: "ইন্টারভিউয়ার নিশ্চিত ইমপ্রেস হতেন",
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
