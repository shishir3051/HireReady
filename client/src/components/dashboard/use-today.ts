"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** Today's date as YYYY-MM-DD in UTC (the server's activity day). `null` during SSR / hydration. */
export function useTodayUTC(): string | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => new Date().toISOString().slice(0, 10),
    () => null,
  );
}

const DAY_MS = 86_400_000;

/** Parse YYYY-MM-DD as a UTC midnight timestamp. */
export function utcDay(date: string) {
  return Date.parse(`${date}T00:00:00Z`);
}

export function addDays(date: string, days: number) {
  return new Date(utcDay(date) + days * DAY_MS).toISOString().slice(0, 10);
}
