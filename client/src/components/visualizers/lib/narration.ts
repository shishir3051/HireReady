"use client";

import { useSyncExternalStore } from "react";

/**
 * Narrated walkthroughs: the browser's built-in speech synthesis (Web Speech API) reads each step's note aloud.
 * Free, offline and private (nothing leaves the device). The on/off choice is shared by every player on the page
 * and remembered in localStorage.
 */

const STORAGE_KEY = "hr-narrate";
const listeners = new Set<() => void>();
let enabled: boolean | null = null;

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

function readEnabled(): boolean {
  if (enabled === null) {
    try {
      enabled = localStorage.getItem(STORAGE_KEY) === "on";
    } catch {
      enabled = false;
    }
  }
  return enabled && speechSupported();
}

export function setNarration(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    /* private mode: keep it for this page only */
  }
  if (!on) stopSpeaking();
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Narration state for a player; `on` and `supported` are false during SSR and hydration so the first render matches the server. */
export function useNarration(): { on: boolean; supported: boolean; toggle: () => void } {
  const on = useSyncExternalStore(subscribe, readEnabled, () => false);
  const supported = useSyncExternalStore(subscribe, speechSupported, () => false);
  return { on, supported, toggle: () => setNarration(!on) };
}

// ------------------------------------------------------------------ speaking

let current: SpeechSynthesisUtterance | null = null; // kept referenced: Chrome drops `onend` for garbage-collected utterances

function pickVoice(isBangla = false): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  if (isBangla) {
    const bangla = voices.filter((v) => /^bn([-_]|$)/i.test(v.lang));
    const chosen =
      bangla.find((v) => /bn[-_]BD/i.test(v.lang)) ??
      bangla.find((v) => /bn[-_]IN/i.test(v.lang)) ??
      bangla[0];
    if (chosen) return chosen;
  }
  const english = voices.filter((v) => /^en([-_]|$)/i.test(v.lang));
  return (
    english.find((v) => /natural|neural|google/i.test(v.name) && /en[-_](US|GB)/i.test(v.lang)) ??
    english.find((v) => /en[-_](US|GB|IN)/i.test(v.lang)) ??
    english[0]
  );
}

/** Player speed → speech rate (2x speech is hard to follow, so it is compressed). */
export function speechRate(speed: number): number {
  return speed <= 0.5 ? 0.85 : speed >= 2 ? 1.3 : 1;
}

export function stopSpeaking() {
  if (!speechSupported()) return;
  current = null;
  window.speechSynthesis.cancel();
}

/**
 * Speaks `text`, cancelling anything already queued. `onDone` runs once when speech ends — or after a safety timeout,
 * because some browsers never fire `onend` — and never runs when the speech is cancelled first.
 * Returns a cancel function.
 */
export function speak(text: string, rate: number, onDone?: () => void): () => void {
  if (!speechSupported() || !text.trim()) {
    onDone?.();
    return () => {};
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const isBangla = typeof document !== "undefined" && document.documentElement.lang === "bn";
  const voice = pickVoice(isBangla);
  if (voice) {
    u.voice = voice;
    u.lang = voice.lang;
  } else {
    u.lang = isBangla ? "bn-BD" : "en-US";
  }
  u.rate = rate;
  current = u;

  let settled = false;
  const finish = () => {
    if (settled || current !== u) return;
    settled = true;
    window.clearTimeout(safety);
    onDone?.();
  };
  // ~14 characters per second at rate 1, plus slack
  const safety = window.setTimeout(finish, (text.length / (14 * rate)) * 1000 + 4000);
  u.onend = finish;
  u.onerror = finish;
  synth.speak(u);

  return () => {
    settled = true;
    window.clearTimeout(safety);
    if (current === u) stopSpeaking();
  };
}
