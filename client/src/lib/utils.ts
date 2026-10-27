import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge class names; later Tailwind classes win over earlier conflicting ones. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "1,234" style number formatting that is stable between server and browser. */
export function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

/** Pluralise a simple English noun: plural(3, "question") → "3 questions". */
export function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${formatNumber(count)} ${count === 1 ? singular : pluralForm}`;
}

/** Turn "two-pointers" into "Two Pointers" (fallback label for unknown slugs). */
export function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Initials for avatars: "Gaziur Rahman" → "GR". */
export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/**
 * Only allow same-origin relative redirect targets (prevents open redirects via ?next=).
 * Returns `fallback` for anything that is not a plain "/path".
 */
export function safeRedirect(target: string | null | undefined, fallback = "/dashboard") {
  if (!target || typeof target !== "string") return fallback;
  if (!target.startsWith("/") || target.startsWith("//") || target.startsWith("/\\")) return fallback;
  return target;
}

/** Read a single string from a Next.js searchParams value. */
export function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** Parse a comma separated param ("easy,medium") into a de-duplicated list, keeping only allowed values. */
export function listParam<T extends string>(value: string | string[] | undefined, allowed?: readonly T[]): T[] {
  const raw = Array.isArray(value) ? value.join(",") : (value ?? "");
  const items = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as T[];
  const unique = Array.from(new Set(items));
  return allowed ? unique.filter((v) => allowed.includes(v)) : unique;
}

/** Clamp a number into [min, max]. */
export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Short relative time ("3 days ago") using Intl.RelativeTimeFormat. Call on the client only. */
export function timeAgo(iso: string, now: number = Date.now()) {
  const diff = (new Date(iso).getTime() - now) / 1000;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, seconds] of units) {
    if (Math.abs(diff) >= seconds) return rtf.format(Math.round(diff / seconds), unit);
  }
  return "just now";
}

/** Format seconds as m:ss or h:mm:ss. */
export function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
