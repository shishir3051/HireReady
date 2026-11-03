import type { SpeechLang } from "./speech-text";

/**
 * Pre-recorded narration: every English step note is turned into an MP3 once, offline, by tools/narration (Kokoro, an
 * open Apache-2.0 voice model), so English narration sounds the same — clear and natural — in every browser. A clip
 * is named by a hash of the exact words spoken (speechText output) plus the voice, so the player and the generator
 * agree on file names without sharing anything else, and an edited note simply has no clip until it is regenerated
 * (the browser voice reads it meanwhile). This module has no browser code at import time: the generator imports it.
 */

/** Model, voice and recording settings baked into every English clip name; change it to re-record everything. */
export const CLIP_VOICE = "kokoro-82m-v1.0/am_michael/1";

/**
 * The same per language. Bangla clips are recorded by tools/narration/record-bn.py with AI4Bharat's Indic Parler-TTS
 * (Apache-2.0), so Bangla is heard in browsers that have no Bangla voice (Chrome and Firefox on computers).
 */
export const CLIP_VOICES: Record<SpeechLang, string> = { en: CLIP_VOICE, bn: "indic-parler-tts/arjun-resonant/1" };

/** The narration-prefs value for the pre-recorded voice (browser voices are stored by voiceURI). */
export const NATURAL_VOICE = "hireready:natural";

/** Where the clips are served from: this site's /narration folder unless the build points elsewhere (e.g. a CDN). */
export const CLIP_BASE = (process.env.NEXT_PUBLIC_NARRATION_AUDIO_URL || "/narration").replace(/\/+$/, "");

/** Spoken by "Test voice" and when a voice is picked; recorded along with the notes. */
export const NARRATION_SAMPLES: Record<SpeechLang, string> = {
  bn: "প্রতিটি ধাপ এভাবে পড়ে শোনানো হবে। যেমন: i = 0, `nums[0]` = 3, তাই map-এ রাখা হয় 3 → 0।",
  en: "This is how each step will sound. For example: i = 0, `nums[0]` = 3, so the map stores 3 → 0.",
};

/** en/manifest.json: every recorded clip, by name, with its length in milliseconds. */
export interface ClipManifest {
  version: 1;
  voice: string;
  format: "mp3";
  clips: Record<string, number>;
}

/** cyrb53 (public domain, bryc): a fast 53-bit string hash, identical in Node and every browser. */
function cyrb53(text: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** The clip name for some spoken text (speechText output) in a language, e.g. "0k3x9q2m1ab". */
export const clipKey = (spoken: string, lang: SpeechLang = "en") =>
  cyrb53(`${CLIP_VOICES[lang]}\n${spoken}`).toString(36).padStart(11, "0");

export const clipUrl = (key: string, lang: SpeechLang = "en") => `${CLIP_BASE}/${lang}/${key}.mp3?v=female-v2`;
export const manifestUrl = (lang: SpeechLang) => `${CLIP_BASE}/${lang}/manifest.json?v=female-v2`;
