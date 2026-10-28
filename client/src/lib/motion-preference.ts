"use client";

import { useSyncExternalStore } from "react";
import { STORAGE_KEYS } from "@/lib/constants";

/**
 * Animation preference. Animations play by default, even when the OS asks for reduced motion: the step-by-step
 * movement in walkthroughs is how the lessons teach. A learner who needs less motion picks "Reduce animations" in the
 * walkthrough player; that choice ("off") is stored per browser and turns motion off everywhere in the app.
 */
export type MotionPreference = "on" | "off";

const QUERY = "(prefers-reduced-motion: reduce)";
const listeners = new Set<() => void>();
let current: MotionPreference | null = null;

function read(): MotionPreference {
  if (current === null) {
    try {
      current = localStorage.getItem(STORAGE_KEYS.motion) === "off" ? "off" : "on";
    } catch {
      current = "on";
    }
  }
  return current;
}

/** For event handlers (e.g. smooth vs instant scrolling): whether the learner turned animations off. */
export function animationsReduced(): boolean {
  return typeof window !== "undefined" && read() === "off";
}

/** CSS follows the choice through <html data-motion="off"> (globals.css); the boot script sets it on load. */
function applyHtmlFlag(pref: MotionPreference) {
  if (pref === "off") document.documentElement.setAttribute("data-motion", "off");
  else document.documentElement.removeAttribute("data-motion");
}

export function setMotionPreference(pref: MotionPreference) {
  current = pref;
  try {
    localStorage.setItem(STORAGE_KEYS.motion, pref);
  } catch {
    /* private mode: keep it for this page only */
  }
  applyHtmlFlag(pref);
  listeners.forEach((l) => l());
}

/** Another tab changed the setting: re-read it so every open tab follows. */
function onStorage(e: StorageEvent) {
  if (e.key !== STORAGE_KEYS.motion && e.key !== null) return;
  current = null;
  applyHtmlFlag(read());
  listeners.forEach((l) => l());
}

function subscribePref(l: () => void) {
  listeners.add(l);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function subscribeSystem(l: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", l);
  return () => mq.removeEventListener("change", l);
}

/**
 * `reducedMotion` is the value for motion's <MotionConfig>; `reduce` says whether animations should be skipped;
 * `systemReduces` tells the player to offer "Reduce animations" to people whose device asks for less motion.
 */
export function useMotionPreference(): {
  pref: MotionPreference;
  systemReduces: boolean;
  reduce: boolean;
  reducedMotion: "never" | "always";
  setPref: (pref: MotionPreference) => void;
} {
  // server/hydration snapshots: the default ("on", no OS reduction), so the first client render matches the server
  const pref = useSyncExternalStore(subscribePref, read, () => "on" as const);
  const systemReduces = useSyncExternalStore(subscribeSystem, () => window.matchMedia(QUERY).matches, () => false);
  return {
    pref,
    systemReduces,
    reduce: pref === "off",
    reducedMotion: pref === "off" ? "always" : "never",
    setPref: setMotionPreference,
  };
}
