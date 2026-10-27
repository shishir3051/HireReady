const DAY_MS = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD` of the given instant in UTC. */
export function utcDay(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** `YYYY-MM-DD` (UTC) `days` days before/after the given day string. */
export function addDays(day: string, days: number): string {
  return utcDay(new Date(Date.parse(`${day}T00:00:00.000Z`) + days * DAY_MS));
}

/** Whole days from `a` to `b` (both `YYYY-MM-DD`). */
export function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00.000Z`) - Date.parse(`${a}T00:00:00.000Z`)) / DAY_MS);
}

export function toIso(d: Date | string | undefined | null): string {
  if (!d) return new Date(0).toISOString();
  return (d instanceof Date ? d : new Date(d)).toISOString();
}

/**
 * Streaks over activity days (`YYYY-MM-DD`, any order, duplicates allowed).
 * `current` is alive only when the last active day is today or yesterday (UTC).
 */
export function computeStreak(days: string[], today: string = utcDay()): { current: number; longest: number } {
  const sorted = [...new Set(days)].sort();
  if (!sorted.length) return { current: 0, longest: 0 };
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = dayDiff(sorted[i - 1], sorted[i]) === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }
  const last = sorted[sorted.length - 1];
  const gap = dayDiff(last, today);
  const current = gap === 0 || gap === 1 ? run : 0;
  return { current, longest };
}
