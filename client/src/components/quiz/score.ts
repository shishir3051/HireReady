import type { Tone } from "@/components/ui/badge";

/** Tone for a percentage score (quiz results, best scores, attempt history). */
export function scoreTone(pct: number): Exclude<Tone, "neutral"> {
  if (pct >= 80) return "success";
  if (pct >= 50) return "warning";
  return "danger";
}

/** Short verdict shown on the result screen. */
export function scoreVerdict(pct: number): { title: string; message: string } {
  if (pct === 100) return { title: "Perfect score", message: "You know this topic cold. Try a mock interview to practice saying it out loud." };
  if (pct >= 80) return { title: "Interview ready", message: "Strong result. Review the ones you missed and you are set." };
  if (pct >= 50) return { title: "Getting there", message: "Solid base. Study the explanations below, then retry with the questions shuffled." };
  return { title: "Keep practicing", message: "Work through the topic's cheat sheet and questions first, then come back and retry." };
}

/** ~45 seconds per multiple-choice question. */
export function quizMinutes(count: number) {
  return Math.max(1, Math.round(count * 0.75));
}
