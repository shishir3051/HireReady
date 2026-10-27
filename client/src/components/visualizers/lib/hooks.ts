"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { speak, speechRate } from "./narration";
import { clamp } from "./utils";

// ------------------------------------------------------------------ dark mode (.dark on <html>)

function subscribeHtmlClass(onChange: () => void): () => void {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") return () => {};
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => mo.disconnect();
}

function readIsDark(): boolean {
  return document.documentElement.classList.contains("dark");
}

/** True while <html> has the `dark` class; re-renders when the theme provider toggles it. */
export function useIsDark(): boolean {
  return useSyncExternalStore(subscribeHtmlClass, readIsDark, () => false);
}

// ------------------------------------------------------------------ step player

export type Speed = 0.5 | 1 | 2;
export const SPEEDS: readonly Speed[] = [0.5, 1, 2];
/** ms per step at 1x */
export const BASE_STEP_MS = 1700;
/** pause after a narrated step before moving on */
const NARRATION_GAP_MS = 350;

/** When `on`, playback reads `text(i)` aloud and advances when the voice finishes; manual steps are read too. */
export interface PlayerNarration {
  on: boolean;
  /** must be stable (useCallback) — a new function restarts the current step's speech */
  text: (index: number) => string;
}

export interface StepPlayer {
  index: number;
  count: number;
  playing: boolean;
  speed: Speed;
  go: (i: number) => void;
  next: () => void;
  prev: () => void;
  restart: () => void;
  toggle: () => void;
  pause: () => void;
  setSpeed: (s: Speed) => void;
  atStart: boolean;
  atEnd: boolean;
}

export function useStepPlayer(
  count: number,
  initialIndex = 0,
  onIndexChange?: (i: number) => void,
  narration?: PlayerNarration,
): StepPlayer {
  const last = Math.max(0, count - 1);
  const [rawIndex, setRawIndex] = useState(() => clamp(initialIndex, 0, last));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const index = clamp(rawIndex, 0, last);
  const narrate = narration?.on ?? false;
  const narrationText = narration?.text;

  const setClamped = useCallback(
    (update: (cur: number) => number) => setRawIndex((cur) => clamp(Math.round(update(clamp(cur, 0, last))), 0, last)),
    [last],
  );
  const go = useCallback((i: number) => setClamped(() => i), [setClamped]);

  // report index changes to the owner (e.g. to remember the step per tab)
  useEffect(() => {
    onIndexChange?.(index);
  }, [index, onIndexChange]);

  useEffect(() => {
    if (!playing) return;
    const advance = () => {
      if (index >= last) {
        setPlaying(false);
        return;
      }
      setClamped((cur) => cur + 1);
      if (index + 1 >= last) setPlaying(false);
    };
    if (narrate && narrationText) {
      // narrated: move on when the voice has finished this step (the last step is read by the effect below)
      let gap: number | undefined;
      const cancel = speak(narrationText(index), speechRate(speed), () => {
        gap = window.setTimeout(advance, NARRATION_GAP_MS);
      });
      return () => {
        cancel();
        window.clearTimeout(gap);
      };
    }
    const t = window.setTimeout(advance, BASE_STEP_MS / speed);
    return () => window.clearTimeout(t);
  }, [playing, index, speed, last, setClamped, narrate, narrationText]);

  // While paused, read each step the user moves to (or the current one when narration is switched on);
  // stay quiet on first render and when merely pausing on a step that was already read.
  const heard = useRef<{ index: number; narrate: boolean } | null>(null);
  useEffect(() => {
    const prev = heard.current;
    heard.current = { index, narrate };
    if (!prev || !narrate || !narrationText || playing) return;
    if (prev.index === index && prev.narrate) return;
    return speak(narrationText(index), speechRate(speed));
  }, [index, narrate, narrationText, playing, speed]);

  const next = useCallback(() => {
    setPlaying(false);
    setClamped((cur) => cur + 1);
  }, [setClamped]);
  const prev = useCallback(() => {
    setPlaying(false);
    setClamped((cur) => cur - 1);
  }, [setClamped]);
  const restart = useCallback(() => {
    setPlaying(false);
    go(0);
  }, [go]);
  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => {
    if (count <= 1) return;
    if (playing) {
      setPlaying(false);
      return;
    }
    if (index >= last) go(0);
    setPlaying(true);
  }, [count, playing, index, last, go]);

  return {
    index,
    count,
    playing: playing && count > 1,
    speed,
    go,
    next,
    prev,
    restart,
    toggle,
    pause,
    setSpeed,
    atStart: index <= 0,
    atEnd: index >= last,
  };
}
