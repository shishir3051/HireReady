import type { QuizAttemptInput } from "@/lib/types";

/**
 * An anonymous user's graded attempt, kept in sessionStorage so it can be saved right after they log in
 * (the login page sends them back to the quiz via ?next=). Expires after 30 minutes.
 */
export interface PendingAttempt {
  input: QuizAttemptInput;
  topicTitle: string;
  savedAt: number;
}

const KEY = "hr-pending-quiz-attempt";
const MAX_AGE_MS = 30 * 60 * 1000;

export function stashPendingAttempt(input: QuizAttemptInput, topicTitle: string) {
  try {
    const value: PendingAttempt = { input, topicTitle, savedAt: Date.now() };
    window.sessionStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // storage unavailable — the user can still retake the quiz after logging in
  }
}

/** Read and remove the pending attempt (null when missing, malformed or expired). */
export function takePendingAttempt(): PendingAttempt | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(KEY);
    const value = JSON.parse(raw) as Partial<PendingAttempt>;
    if (
      !value.input ||
      typeof value.input.topic !== "string" ||
      !Array.isArray(value.input.answers) ||
      value.input.answers.length === 0 ||
      typeof value.savedAt !== "number" ||
      Date.now() - value.savedAt > MAX_AGE_MS
    ) {
      return null;
    }
    return { input: value.input, topicTitle: String(value.topicTitle ?? value.input.topic), savedAt: value.savedAt };
  } catch {
    return null;
  }
}

export function clearPendingAttempt() {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
