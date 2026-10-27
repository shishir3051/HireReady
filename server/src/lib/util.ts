/** Escape a user string so it matches literally inside a RegExp. */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Values in first-seen order without duplicates. */
export function uniq<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const round1 = (n: number) => Math.round(n * 10) / 10;

/** Copy of `obj` without keys whose value is `undefined` or `null` (for optional contract fields). */
export function compact<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined && v !== null) out[k] = v;
  return out as T;
}
