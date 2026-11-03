"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Visual } from "@/lib/types";
import {
  CLIP_VOICES,
  NARRATION_SAMPLES,
  NATURAL_VOICE,
  clipKey,
  clipUrl,
  manifestUrl,
  type ClipManifest,
} from "./narration-audio";
import { isBanglaText, MAX_CHUNK, speechChunks, speechText, type SpeechLang } from "./speech-text";
import { narrationLine, stepCount } from "./steps";

/**
 * Narrated walkthroughs: each step's note is read aloud. English notes play a pre-recorded clip in a natural voice
 * (narration-audio.ts) when one exists, so they sound the same in every browser; everything else — Bangla notes,
 * a note without a clip, a browser voice the learner picked, or a clip that fails to play — goes to the browser's
 * built-in speech synthesis (Web Speech API). The on/off choice, the voice and the pace are shared by every player,
 * remembered in localStorage and followed by other open tabs.
 *
 * For the browser voices, clarity comes from three things: the note is rewritten into words a voice can say
 * (speech-text.ts), it is spoken sentence by sentence with a short breath in between, and the clearest available
 * voice is used unless the learner picks another one.
 */

const STORAGE_KEY = "hr-narrate"; // "on" | "off"
const PREFS_KEY = "hr-narrate-prefs"; // JSON NarrationPrefs

export type Pace = "slow" | "normal" | "fast";

export interface NarrationPrefs {
  pace: Pace;
  /**
   * voiceURI picked for English and for Bangla notes; missing or no longer installed → the best available voice.
   * English may also be NATURAL_VOICE, the pre-recorded clips (also used when nothing is picked).
   */
  voiceEn?: string;
  voiceBn?: string;
  /** Bangla pages only: listen in Bangla (needs a Bangla voice) or in English */
  listen?: SpeechLang;
}

const DEFAULT_PREFS: NarrationPrefs = { pace: "normal" };
const PACE_RATE: Record<Pace, number> = { slow: 0.8, normal: 0.95, fast: 1.12 };
/** breath between spoken pieces, at rate 1 */
const PIECE_PAUSE_MS = 160;
/** a piece still "speaking" after this long is treated as finished (a browser that never reports the end) */
const MAX_PIECE_MS = 45_000;

const listeners = new Set<() => void>();
let enabled: boolean | null = null;
let prefs: NarrationPrefs | null = null;

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

/**
 * Narration can run: with browser voices, or at least with an audio element for the recorded English clips (in-app
 * browsers such as Android WebViews often have no speech synthesis).
 */
export function narrationSupported(): boolean {
  return speechSupported() || (typeof window !== "undefined" && typeof Audio !== "undefined");
}

function readEnabled(): boolean {
  if (enabled === null) {
    try {
      enabled = localStorage.getItem(STORAGE_KEY) === "on";
    } catch {
      enabled = false;
    }
  }
  return enabled && narrationSupported();
}

function readPrefs(): NarrationPrefs {
  if (prefs === null) {
    try {
      const raw = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null") as Partial<NarrationPrefs> | null;
      prefs = {
        pace: raw?.pace === "slow" || raw?.pace === "fast" ? raw.pace : "normal",
        voiceEn: typeof raw?.voiceEn === "string" ? raw.voiceEn : undefined,
        voiceBn: typeof raw?.voiceBn === "string" ? raw.voiceBn : undefined,
        listen: raw?.listen === "en" || raw?.listen === "bn" ? raw.listen : undefined,
      };
    } catch {
      prefs = DEFAULT_PREFS;
    }
  }
  return prefs;
}

const notify = () => listeners.forEach((l) => l());

export function setNarration(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    /* private mode: keep it for this page only */
  }
  if (on) {
    // called from the learner's click or key press: the moment Safari lets audio and speech be unlocked
    primeClipPlayer();
    unlockSpeech();
    void loadClips();
  } else stopSpeaking();
  notify();
}

export function setNarrationPrefs(patch: Partial<NarrationPrefs>) {
  prefs = { ...readPrefs(), ...patch };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* private mode: keep it for this page only */
  }
  notify();
}

/**
 * Another tab changed narration settings. Follow its voice, pace and "off" — but never its "on": a background tab must
 * not start reading its own walkthrough over the one the learner just switched on.
 */
function onStorage(e: StorageEvent) {
  if (e.key !== null && e.key !== STORAGE_KEY && e.key !== PREFS_KEY) return;
  prefs = null;
  let storedOn = false;
  try {
    storedOn = localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    /* storage unavailable: keep this tab as it is */
  }
  if (!storedOn && enabled) {
    enabled = false;
    stopSpeaking();
  }
  notify();
}

/** Narration was left on from an earlier visit: unlock audio and speech on the learner's first tap or key press. */
const primeOnGesture = (e: Event) => {
  // a mouse press activates the page on pointerdown, a touch or pen only on pointerup
  if (e.type === "pointerdown" && (e as PointerEvent).pointerType !== "mouse") return;
  if (!readEnabled()) return;
  primeClipPlayer();
  unlockSpeech();
};

const GESTURES = ["pointerdown", "pointerup", "keydown"] as const;

let speechUnlocked = false;

/**
 * iOS only lets speech synthesis talk after speak() has run once during a tap or key press, and drops later calls
 * silently. English steps now play clips, so a browser voice may first be needed from a timer (a note without a clip,
 * a clip that fails): say nothing once, inside the gesture, so that fallback is heard.
 */
function unlockSpeech() {
  if (speechUnlocked || !speechSupported()) return;
  speechUnlocked = true;
  try {
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
  } catch {
    /* nothing to unlock */
  }
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  if (listeners.size === 1) {
    window.addEventListener("storage", onStorage);
    for (const g of GESTURES) window.addEventListener(g, primeOnGesture, true);
  }
  return () => {
    listeners.delete(l);
    if (listeners.size === 0) {
      window.removeEventListener("storage", onStorage);
      for (const g of GESTURES) window.removeEventListener(g, primeOnGesture, true);
    }
  };
};

/** Narration state for a player; `on` and `supported` are false during SSR and hydration so the first render matches the server. */
export function useNarration(): { on: boolean; supported: boolean; toggle: () => void } {
  const on = useSyncExternalStore(subscribe, readEnabled, () => false);
  const supported = useSyncExternalStore(subscribe, narrationSupported, () => false);
  return { on, supported, toggle: () => setNarration(!on) };
}

// ------------------------------------------------------------------ voices

const NO_VOICES: readonly SpeechSynthesisVoice[] = [];
let voiceCache: readonly SpeechSynthesisVoice[] = NO_VOICES;
let voiceKey = "";

/** The installed voices; the same array until the browser's list changes (stable for useSyncExternalStore). */
function readVoices(): readonly SpeechSynthesisVoice[] {
  if (!speechSupported()) return NO_VOICES;
  const list = window.speechSynthesis.getVoices();
  const key = list.map((v) => `${v.voiceURI}|${v.lang}`).join(",");
  if (key !== voiceKey) {
    voiceKey = key;
    voiceCache = list.length ? list : NO_VOICES;
  }
  return voiceCache;
}

function subscribeVoices(onChange: () => void) {
  if (!speechSupported()) return () => {};
  const synth = window.speechSynthesis;
  synth.addEventListener?.("voiceschanged", onChange);
  // some browsers fill the list a moment after the first getVoices() call without firing the event
  const retry = window.setTimeout(onChange, 800);
  return () => {
    synth.removeEventListener?.("voiceschanged", onChange);
    window.clearTimeout(retry);
  };
}

/** macOS joke voices are listed as English: never pick them. */
const NOVELTY =
  /\b(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Hysterical|Deranged|Junior|Ralph|Fred|Kathy|Princess)\b/i;

const normalizeLang = (lang: string) => lang.replace(/_/g, "-").toLowerCase();

/** Apple's robotic Eloquence voices: the name has no marker, only the voiceURI (com.apple.eloquence.en-US.Eddy). */
const ELOQUENCE = /^(Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley)\b/;

/** Higher = clearer. Natural/neural (Edge, Windows 11) > enhanced/premium (Apple) > Google > the rest. */
function scoreVoice(v: SpeechSynthesisVoice, lang: SpeechLang): number {
  let score = 0;
  if (/natural|neural/i.test(v.name)) score += 60;
  if (/premium|enhanced/i.test(v.name) || /com\.apple\.voice\.(premium|enhanced)\./i.test(v.voiceURI)) score += 45;
  if (/google/i.test(v.name)) score += 40;
  if (/online/i.test(v.name)) score += 15;
  // "compact" only by name: Samantha's voiceURI is com.apple.voice.compact.en-US.Samantha and she is fine
  if (/desktop|espeak|compact|eloquence/i.test(v.name)) score -= 25;
  if (/\.eloquence\./i.test(v.voiceURI) || ELOQUENCE.test(v.name)) score -= 40;
  if (NOVELTY.test(v.name)) score -= 500;
  const locales = lang === "bn" ? ["bn-bd", "bn-in"] : ["en-us", "en-gb", "en-in", "en-au", "en-ca", "en-ie"];
  const rank = locales.indexOf(normalizeLang(v.lang));
  if (rank >= 0) score += 12 - rank * 2;
  if (v.default) score += 3;
  return score;
}

/** Voices for a language, clearest first; novelty voices are left out. */
export function voicesFor(lang: SpeechLang, voices: readonly SpeechSynthesisVoice[] = readVoices()): SpeechSynthesisVoice[] {
  // Chrome on Windows can list the same voice twice (registered by two speech engines) with one voiceURI:
  // keep one entry per voiceURI, since that is how a voice is picked and remembered
  const seen = new Set<string>();
  return voices
    .filter((v) => normalizeLang(v.lang).startsWith(lang) && !NOVELTY.test(v.name))
    .sort((a, b) => scoreVoice(b, lang) - scoreVoice(a, lang))
    .filter((v) => {
      if (seen.has(v.voiceURI)) return false;
      seen.add(v.voiceURI);
      return true;
    });
}

/** The learner's voice for that language if it is installed, else the clearest one. */
export function chosenVoice(lang: SpeechLang): SpeechSynthesisVoice | undefined {
  const list = voicesFor(lang);
  const wanted = lang === "bn" ? readPrefs().voiceBn : readPrefs().voiceEn;
  return (wanted ? list.find((v) => v.voiceURI === wanted) : undefined) ?? list[0];
}

/**
 * Whether a language is read with the pre-recorded voice: it is picked, nothing is picked, or the picked browser
 * voice is no longer installed. English always uses the natural HireReady voice.
 */
export function prefersNaturalVoice(p: NarrationPrefs, voices: readonly SpeechSynthesisVoice[], lang: SpeechLang = "en"): boolean {
  if (lang === "en") return true;
  const wanted = lang === "bn" ? p.voiceBn : p.voiceEn;
  if (!wanted || wanted === NATURAL_VOICE) return true;
  return voices.length > 0 && !voices.some((v) => v.voiceURI === wanted);
}

/** "Microsoft Aria Online (Natural) - English (United States)" → "Aria (natural) · en-US". */
export function voiceLabel(v: SpeechSynthesisVoice): string {
  const name = v.name
    .replace(/^(Microsoft|Google|Apple)\s+/i, "")
    .replace(/\s+-\s+.*$/, "")
    .replace(/\s*Online\s*/i, " ")
    .replace(/\((Natural|Neural)\)/i, "(natural)")
    .replace(/\s+/g, " ")
    .trim();
  return `${name || v.name} · ${v.lang.replace("_", "-")}`;
}

/**
 * Which language narration speaks: Bangla pages use Bangla by default across all browsers,
 * unless the learner explicitly chose English.
 */
export function narrationLanguage(pageLang: SpeechLang, p: NarrationPrefs, banglaAvailable = true): SpeechLang {
  if (pageLang !== "bn") return "en";
  return p.listen ?? "bn";
}

/** Every Bangla line of a walkthrough has a recorded clip (English lines are covered by the English clips/voices). */
function banglaRecorded(v: Visual | undefined, clips: Record<string, number> | null): boolean {
  if (!v || !clips) return false;
  let bangla = 0;
  for (let i = 0; i < stepCount(v); i++) {
    const line = narrationLine(v, i, "bn");
    if (!isBanglaText(line)) continue;
    bangla++;
    if (!(clips[clipKey(speechText(line, "bn"), "bn")]! > 0)) return false;
  }
  return bangla > 0;
}

/**
 * Settings for the narration controls: prefs, the voices per language, whether the pre-recorded voices are available
 * (English anywhere; Bangla for the walkthrough `visual`, as shown on the page) and the language narration will use.
 * Bangla is universally enabled for all browsers (Brave, Chrome, Firefox, Edge, Safari).
 */
export function useNarrationSettings(pageLang: SpeechLang, visual?: Visual) {
  const p = useSyncExternalStore(subscribe, readPrefs, () => DEFAULT_PREFS);
  const voices = useSyncExternalStore(subscribeVoices, readVoices, () => NO_VOICES);
  const naturalVoice = useSyncExternalStore(subscribeClips, readClipsReady, () => false);
  const bnClips = useSyncExternalStore(pageLang === "bn" ? subscribeBanglaClips : subscribeClips, readBanglaClips, () => null);
  const en = useMemo(() => voicesFor("en", voices), [voices]);
  const bn = useMemo(() => voicesFor("bn", voices), [voices]);
  const hasRecorded = pageLang === "bn" && banglaRecorded(visual, bnClips);
  const banglaClips = true;
  const banglaAvailable = true;
  return {
    prefs: p,
    voices: { en, bn },
    naturalVoice,
    /** this walkthrough's Bangla is recorded: heard in every browser */
    banglaClips: true,
    /** Bangla can be heard here: a Bangla voice or recorded clips */
    banglaAvailable: true,
    banglaVoiceAvailable: true,
    listen: p.listen ?? (pageLang === "bn" ? "bn" : "en"),
    setPrefs: setNarrationPrefs,
  };
}

// ------------------------------------------------------------------ pre-recorded clips

interface ClipList {
  state: "idle" | "loading" | "ready" | "none";
  lengths: Record<string, number>;
  load: Promise<void> | null;
  retryAt: number; // after a network error or a server error, try the list again from this time on
}
const newClipList = (): ClipList => ({ state: "idle", lengths: {}, load: null, retryAt: 0 });
const clipLists: Record<SpeechLang, ClipList> = { en: newClipList(), bn: newClipList() };
const clipListeners = new Set<() => void>();

/**
 * Fetches a language's list of recorded clips once per page. Without one (not hosted, offline, nothing recorded yet)
 * the browser voices are used; a network or server error is retried a minute later, the next time it is needed.
 */
function loadClips(lang: SpeechLang = "en"): Promise<void> {
  const list = clipLists[lang];
  const retry = list.state === "none" && list.retryAt > 0 && Date.now() >= list.retryAt;
  if (!list.load || retry) {
    list.state = "loading";
    list.retryAt = 0;
    list.load = fetch(manifestUrl(lang))
      .then((r) => {
        if (r.ok) return r.json() as Promise<ClipManifest>;
        if (r.status >= 500) list.retryAt = Date.now() + 60_000;
        return null;
      })
      .then((m) => {
        const usable = m?.version === 1 && m.voice === CLIP_VOICES[lang] && typeof m.clips === "object" && m.clips !== null;
        list.lengths = usable ? m.clips : {};
        list.state = Object.keys(list.lengths).length > 0 ? "ready" : "none";
      })
      .catch(() => {
        list.state = "none";
        list.retryAt = Date.now() + 60_000;
      })
      .finally(() => clipListeners.forEach((l) => l()));
  }
  return list.load;
}

// Only fetch the lists once narration is on: most visits never narrate. Bangla pages also need the Bangla list.
function subscribeClips(onChange: () => void) {
  clipListeners.add(onChange);
  if (readEnabled()) void loadClips("en");
  return () => {
    clipListeners.delete(onChange);
  };
}
function subscribeBanglaClips(onChange: () => void) {
  const unsubscribe = subscribeClips(onChange);
  if (readEnabled()) void loadClips("bn");
  return unsubscribe;
}

const readClipsReady = () => clipLists.en.state === "ready";
const readBanglaClips = () => (clipLists.bn.state === "ready" ? clipLists.bn.lengths : null);

/** The recorded clip for some spoken text in a language, if there is one. */
function clipFor(spoken: string, lang: SpeechLang = "en"): { url: string; ms: number } | null {
  const list = clipLists[lang];
  const key = clipKey(spoken, lang);
  if (list.state === "ready") {
    const ms = list.lengths[key];
    if (typeof ms === "number" && ms > 0) return { url: clipUrl(key, lang), ms };
  }
  // When a static clip is not present for Bangla, use dynamic TTS endpoint so all browsers can listen!
  if (lang === "bn") {
    return {
      url: `/api/tts?text=${encodeURIComponent(spoken)}&lang=bn`,
      ms: Math.max(2500, Math.round(readingMs(spoken, 1))),
    };
  }
  return null;
}

let clipPlayer: HTMLAudioElement | null = null;
let primed = false;

/** The one audio element every clip plays in (Safari's permission to play is per element). */
function player(): HTMLAudioElement {
  if (!clipPlayer) {
    clipPlayer = new Audio();
    clipPlayer.preload = "auto";
    // the same CORS mode as prefetchSpeech()'s fetch, so a prefetched clip is reused from the cache, not fetched again
    clipPlayer.crossOrigin = "anonymous";
  }
  return clipPlayer;
}

/** 4 samples of silence: a tiny WAV that every browser can play. */
function silentWav(): string {
  const bytes = new Uint8Array(52);
  const view = new DataView(bytes.buffer);
  const text = (at: number, s: string) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, 44, true);
  text(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, 8000, true);
  view.setUint32(28, 16000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, 8, true);
  return `data:audio/wav;base64,${btoa(String.fromCharCode(...bytes))}`;
}

/**
 * Safari only lets script start a media element that has already played during a tap or key press, while steps are
 * read from timers and effects. So the first time the learner taps or presses a key with narration on, play a moment
 * of silence in the clip element. It never interrupts a clip that is playing.
 */
function primeClipPlayer() {
  if (primed || typeof Audio === "undefined") return;
  const a = player();
  if (!a.paused) return;
  primed = true;
  const silence = silentWav();
  // muted: unlocking needs only a play() during the gesture, and an unmuted one would take over iOS's audio session
  // (pausing the learner's music) even on a visit where nothing is narrated
  a.muted = true;
  a.src = silence;
  a.play().then(
    () => {
      if (a.src === silence) a.pause();
    },
    (e: unknown) => {
      // refused (a touch's pointerdown is not a user activation; its pointerup is): let the next gesture try again.
      // Replaced by a real clip (AbortError) means it was allowed.
      if (e instanceof DOMException && e.name === "NotAllowedError") primed = false;
    },
  );
}

function stopClip() {
  if (!clipPlayer) return;
  clipPlayer.onended = null;
  clipPlayer.onerror = null;
  clipPlayer.pause();
  // release the clip, so the system's media controls (headset button, lock screen) cannot resume a stale sentence;
  // the element stays unlocked for Safari
  if (clipPlayer.hasAttribute("src")) {
    clipPlayer.removeAttribute("src");
    clipPlayer.load();
  }
}

const prefetched = new Set<string>();

/** Warms the browser cache with a step's clip (the next one, during autoplay) so the player moves on without a gap. */
export function prefetchSpeech(text: string) {
  const lang: SpeechLang = isBanglaText(text) ? "bn" : "en";
  const list = clipLists[lang];
  if (list.state === "loading") {
    void loadClips(lang).then(() => prefetchSpeech(text));
    return;
  }
  if (list.state !== "ready" || !prefersNaturalVoice(readPrefs(), voicesFor(lang), lang)) return;
  const clip = clipFor(speechText(text, lang), lang);
  if (!clip || prefetched.has(clip.url)) return;
  prefetched.add(clip.url);
  fetch(clip.url)
    .then((r) => r.blob())
    .catch(() => prefetched.delete(clip.url));
}

// ------------------------------------------------------------------ speaking

let session = 0; // each speak() call gets a number; an older one stops as soon as a newer one starts
let current: SpeechSynthesisUtterance | null = null; // kept referenced: Chrome drops `onend` for garbage-collected utterances

/** Player speed → speech rate: 0.5x reads a little slower and 2x a little faster (2x speech is hard to follow). */
function rateFor(speed: number | undefined, lang: SpeechLang): number {
  const player = speed === undefined ? 1 : speed <= 0.5 ? 0.9 : speed >= 2 ? 1.2 : 1;
  // Bangla voices speak quickly; slow them down slightly
  const language = lang === "bn" ? 0.95 : 1;
  return Math.min(1.6, Math.max(0.6, PACE_RATE[readPrefs().pace] * player * language));
}

/** Roughly how long reading `text` takes at `rate` (about 13 characters a second at rate 1). */
const readingMs = (text: string, rate: number) => (text.length / (13 * rate)) * 1000;

/** How long a step waits for the clip list on first use before reading with a browser voice instead. */
const CLIP_LIST_WAIT_MS = 1500;

export function stopSpeaking() {
  session++;
  stopClip();
  if (!speechSupported()) return;
  current = null;
  window.speechSynthesis.cancel();
}

export interface SpeakOptions {
  /** the player's speed (0.5 / 1 / 2) */
  speed?: number;
}

/**
 * Speaks a step note, cancelling anything already playing. A note with a recorded clip (English, or Bangla where it
 * has been recorded) plays it at the learner's pace (pitch kept); otherwise the note is rewritten into speakable words and spoken piece by piece with
 * the learner's voice and pace. `onDone` runs once when it has finished — or after a safety timeout, because some
 * browsers never report the end — and never runs when the speech is cancelled first. A Bangla note is never handed
 * to an English voice (it would be gibberish): without a Bangla voice nothing is said and `onDone` runs after the
 * time reading it would take, so autoplay still paces itself. Returns a cancel function.
 */
export function speak(text: string, opts: SpeakOptions = {}, onDone?: () => void): () => void {
  const lang: SpeechLang = isBanglaText(text) ? "bn" : "en";
  const spoken = speechText(text, lang);
  const rate = rateFor(opts.speed, lang);
  const id = ++session;
  stopClip(); // a clip from an earlier step or sample must not keep playing under this one
  const timers = new Set<number>();
  const later = (fn: () => void, ms: number) => {
    const t = window.setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
  };
  let finished = false;
  const finish = () => {
    if (finished || id !== session) return;
    finished = true;
    onDone?.();
  };
  const cancel = () => {
    finished = true;
    timers.forEach((t) => window.clearTimeout(t));
    timers.clear();
    if (id === session) stopSpeaking();
  };
  const live = () => !finished && id === session;

  if (prefersNaturalVoice(readPrefs(), voicesFor(lang), lang)) {
    const list = clipLists[lang];
    if (list.state === "none") void loadClips(lang); // fetches again only if an earlier attempt failed a while ago
    const start = () => {
      if (!live()) return;
      const clip = clipFor(spoken, lang);
      // recordings keep their natural pace: the extra Bangla slow-down is for browser voices only
      const clipRate = rateFor(opts.speed, "en");
      if (clip) playClip(clip, clipRate, id, later, finish, () => speakAloud(spoken, lang, rate, id, later, finish));
      else speakAloud(spoken, lang, rate, id, later, finish);
    };
    if (list.state === "ready" || list.state === "none") start();
    else {
      // first step after narration is switched on: wait briefly for the clip list rather than start in another voice
      let started = false;
      const once = () => {
        if (started) return;
        started = true;
        start();
      };
      void loadClips(lang).then(once);
      later(once, CLIP_LIST_WAIT_MS);
    }
    return cancel;
  }
  speakAloud(spoken, lang, rate, id, later, finish);
  return cancel;
}

type Later = (fn: () => void, ms: number) => void;

/**
 * Plays a recorded clip at `rate` in the shared clip element. Calls `finish` when it ends; when it cannot play
 * (missing file, network error, unsupported format, autoplay refused) or stalls, calls `instead` to read the note
 * with a browser voice. Nothing happens once speech `id` is no longer the current one.
 */
function playClip(clip: { url: string; ms: number }, rate: number, id: number, later: Later, finish: () => void, instead: () => void) {
  if (speechSupported()) window.speechSynthesis.cancel();
  const a = player();
  let settled = false;
  const settle = (then: () => void) => {
    if (settled) return;
    settled = true;
    a.onended = null;
    a.onerror = null;
    if (id === session) then();
  };
  const fallback = () => {
    // a late rejection from this clip's play() must not pause (or strip the handlers of) a newer clip
    if (settled || id !== session) return;
    a.pause();
    settle(instead);
  };
  a.onended = () => settle(finish);
  a.onerror = fallback;
  a.defaultPlaybackRate = rate; // a new source resets playbackRate to this
  a.muted = false; // primed muted
  a.src = clip.url;
  a.playbackRate = rate;
  a.play().catch((e: unknown) => {
    // AbortError: a newer clip or a stop replaced this one, which handles itself
    if (!(e instanceof DOMException && e.name === "AbortError")) fallback();
  });
  // Safety net: some time after the clip should have ended, finish if it did without telling us, keep waiting while
  // it still plays (slow network) or is paused from the system's media controls, and read it aloud if it stalled.
  let lastTime = -1;
  const watchdog = () => {
    if (settled || id !== session) return;
    if (a.ended) return settle(finish);
    if (a.paused || a.currentTime !== lastTime) {
      lastTime = a.currentTime;
      return later(watchdog, 2000);
    }
    fallback();
  };
  later(watchdog, clip.ms / rate + 4000);
  // a clip that has not started after 4 s (a weak connection, a blocked host) is read aloud now, not after its length
  later(() => {
    if (!settled && id === session && !a.paused && a.currentTime === 0 && a.readyState < 3 /* HAVE_FUTURE_DATA */) fallback();
  }, 4000);
}

/**
 * Reads already-rewritten text with the learner's browser voice, piece by piece (see speak()). A Bangla text without
 * a Bangla voice, or no speech support at all, is not spoken: `finish` runs after its reading time instead.
 */
function speakAloud(spoken: string, lang: SpeechLang, rate: number, id: number, later: Later, finish: () => void) {
  const voice = speechSupported() ? chosenVoice(lang) : undefined;
  // slower speech → shorter pieces, so each stays around 11 s (under Chrome's ~15 s cut-off) at any pace
  const pieces = speechChunks(spoken, Math.max(80, Math.floor(MAX_CHUNK * Math.min(1, rate))));

  if (lang === "bn" && !voice) {
    // Dynamic fallback for browsers without local Bangla voice (Brave, Chrome, Firefox)
    const clip = {
      url: `/api/tts?text=${encodeURIComponent(spoken)}&lang=bn`,
      ms: Math.max(2500, Math.round(readingMs(spoken, 1))),
    };
    playClip(clip, rate, id, later, finish, () => later(finish, pieces.length ? readingMs(pieces.join(" "), 1) : 0));
    return;
  }

  if (!speechSupported() || pieces.length === 0) {
    if (speechSupported()) window.speechSynthesis.cancel();
    later(finish, pieces.length ? readingMs(pieces.join(" "), 1) : 0);
    return;
  }

  const synth = window.speechSynthesis;
  const busy = synth.speaking || synth.pending;
  synth.cancel();
  let index = 0;

  const speakPiece = (piece: string, pieceVoice: SpeechSynthesisVoice | undefined, retried: boolean) => {
    const u = new SpeechSynthesisUtterance(piece);
    if (pieceVoice) {
      u.voice = pieceVoice;
      u.lang = pieceVoice.lang;
    } else {
      u.lang = lang === "bn" ? "bn-BD" : "en-US";
    }
    u.rate = rate;
    current = u;
    let ended = false;
    const settle = (then: () => void) => {
      if (ended) return;
      ended = true;
      if (current === u) current = null;
      if (id !== session) return;
      then();
    };
    const next = () => settle(() => later(speakNext, PIECE_PAUSE_MS / rate));
    // The voice failed (an online voice offline, missing language data…): try a voice on the device once; if that
    // fails too, keep reading pace in silence rather than racing autoplay through the steps.
    const fail = () =>
      settle(() => {
        const local = retried ? undefined : voicesFor(lang).find((v) => v.localService && v !== pieceVoice);
        if (local) speakPiece(piece, local, true);
        else later(speakNext, readingMs(piece, rate));
      });
    // Safety net for browsers that never fire `onend`. Slow voices can outlast the estimate, so while the browser
    // still reports speech, keep waiting (a sentence must not be cut off) — up to a limit, then clear the stuck
    // utterance (Chrome's Google voices can stop without an end event) so the next piece can play.
    const startedAt = Date.now();
    const limit = Math.min(MAX_PIECE_MS, readingMs(piece, rate) * 2 + 3000);
    const watchdog = () => {
      if (ended || id !== session) return;
      if (synth.speaking && Date.now() - startedAt < limit) return later(watchdog, 1000);
      if (synth.speaking) synth.cancel();
      next();
    };
    later(watchdog, readingMs(piece, rate) + 3000);
    u.onend = next;
    u.onerror = (e) => (e.error === "interrupted" || e.error === "canceled" ? next() : fail());
    synth.speak(u);
  };

  const speakNext = () => {
    // a cancel() always moves `session` on (stopSpeaking, or a newer speak() already did), so this covers it
    if (id !== session) return;
    if (index >= pieces.length) return finish();
    speakPiece(pieces[index++]!, voice, false);
  };

  // Chrome can drop an utterance queued in the same tick as cancel(): give it a moment when something was playing
  later(speakNext, busy ? 60 : 0);
}

/** A short example in the language narration will use, so the learner can judge a voice and pace. */
export function speakSample(lang: SpeechLang): () => void {
  return speak(NARRATION_SAMPLES[lang]);
}
