import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Defensive: anything that is not an array becomes []. */
export function asArray<T>(x: readonly T[] | null | undefined): T[] {
  return Array.isArray(x) ? (x as T[]) : [];
}

export function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

export function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** Display string for any scalar-ish value. */
export function str(v: unknown): string {
  if (v === null) return "null";
  if (v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") return String(v);
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
}

export function truncate(s: string, max: number): string {
  if (max <= 1) return s.length > 1 ? "…" : s;
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** Approximate rendered width of a string (good enough for SVG layout). */
export function textWidth(s: string, fontSize: number, mono = true): number {
  return s.length * fontSize * (mono ? 0.61 : 0.56);
}

/** Strips inline markdown for screen-reader announcements and titles. */
export function plainText(md: string | undefined | null): string {
  if (!md) return "";
  return String(md)
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1$2")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Stable identity keys for list items that have no ids: `value#occurrence`.
 * Lets enter/exit/layout animations follow values (e.g. a dequeued item exits from the front).
 */
export function occurrenceKeys(values: readonly unknown[]): string[] {
  const seen = new Map<string, number>();
  return values.map((v) => {
    const s = `${typeof v}:${str(v)}`;
    const n = seen.get(s) ?? 0;
    seen.set(s, n + 1);
    return `${s}#${n}`;
  });
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message || err.name;
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    if (typeof o.message === "string") return o.message;
    if (typeof o.str === "string") return o.str;
  }
  return "Unknown error";
}

/** CSS-safe id fragment from React's useId() output. */
export function safeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "");
}
