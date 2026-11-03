// Bangla narration clips, in three steps (record-bn.cmd runs all of them):
//
//   1. npx tsx generate-bn.ts export            → .work/bn-jobs.json: every Bangla line, most-used walkthroughs first
//   2. python record-bn.py                       → .work/bn-wav/<key>.wav, recorded with AI4Bharat Indic Parler-TTS
//   3. npx tsx generate-bn.ts finish [--prune]   → client/public/narration/bn/<key>.mp3 + manifest.json
//
// The lines are exactly what a Bangla page speaks: the English walkthrough with the Bangla overlay merged in the way
// server/src/content/overlay.ts merges it, read through narrationLine() and speechText(), so the player finds the clips.
// Lines that stay English (no Bangla note) are left to the English clips.
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { isBanglaText, speechText } from "../../client/src/components/visualizers/lib/speech-text";
import { CLIP_VOICES, NARRATION_SAMPLES, clipKey, type ClipManifest } from "../../client/src/components/visualizers/lib/narration-audio";
import { narrationLine, stepCount } from "../../client/src/components/visualizers/lib/steps";
import { TWO_SUM_VISUAL_BN } from "../../client/src/lib/demo-content";

const ROOT = path.resolve(__dirname, "../..");
const WORK = path.join(__dirname, ".work");
const JOBS = path.join(WORK, "bn-jobs.json");
const WAVS = path.join(WORK, "bn-wav");
const OUT = path.join(ROOT, "client/public/narration/bn");
const KBPS = 40;
const CLIP_FILE = /^[0-9a-z]{11}\.mp3$/;
const FREQUENCY_ORDER = ["very-high", "high", "medium", "low"];

interface Job {
  key: string;
  /** what the voice model reads: the spoken line with numbers written as Bangla words */
  text: string;
}

// ------------------------------------------------------------------ export: the Bangla lines

const BN_0_99 =
  "শূন্য এক দুই তিন চার পাঁচ ছয় সাত আট নয় দশ এগারো বারো তেরো চৌদ্দ পনেরো ষোলো সতেরো আঠারো উনিশ বিশ একুশ বাইশ তেইশ চব্বিশ পঁচিশ ছাব্বিশ সাতাশ আটাশ ঊনত্রিশ ত্রিশ একত্রিশ বত্রিশ তেত্রিশ চৌত্রিশ পঁয়ত্রিশ ছত্রিশ সাঁইত্রিশ আটত্রিশ ঊনচল্লিশ চল্লিশ একচল্লিশ বিয়াল্লিশ তেতাল্লিশ চুয়াল্লিশ পঁয়তাল্লিশ ছেচল্লিশ সাতচল্লিশ আটচল্লিশ ঊনপঞ্চাশ পঞ্চাশ একান্ন বাহান্ন তিপ্পান্ন চুয়ান্ন পঞ্চান্ন ছাপ্পান্ন সাতান্ন আটান্ন ঊনষাট ষাট একষট্টি বাষট্টি তেষট্টি চৌষট্টি পঁয়ষট্টি ছেষট্টি সাতষট্টি আটষট্টি ঊনসত্তর সত্তর একাত্তর বাহাত্তর তিয়াত্তর চুয়াত্তর পঁচাত্তর ছিয়াত্তর সাতাত্তর আটাত্তর ঊনআশি আশি একাশি বিরাশি তিরাশি চুরাশি পঁচাশি ছিয়াশি সাতাশি অষ্টআশি ঊননব্বই নব্বই একানব্বই বিরানব্বই তিরানব্বই চুরানব্বই পঁচানব্বই ছিয়ানব্বই সাতানব্বই আটানব্বই নিরানব্বই".split(
    " ",
  );

/** 1234567 → "বারো লাখ চৌত্রিশ হাজার পাঁচশো সাতষট্টি" (Bangladeshi lakh/crore grouping). */
function bnNumber(n: number): string {
  const part = (value: number, unit: number, name: string) =>
    `${bnNumber(Math.floor(value / unit))} ${name}${value % unit ? ` ${bnNumber(value % unit)}` : ""}`;
  if (n < 100) return BN_0_99[n]!;
  if (n < 1000) return `${BN_0_99[Math.floor(n / 100)]}শো${n % 100 ? ` ${BN_0_99[n % 100]}` : ""}`;
  if (n < 100_000) return part(n, 1000, "হাজার");
  if (n < 10_000_000) return part(n, 100_000, "লাখ");
  return part(n, 10_000_000, "কোটি");
}

const digitByDigit = (d: string) => [...d].map((c) => BN_0_99[Number(c)]).join(" ");

/** Numbers as Bangla words, so the voice model never guesses how to read digits ("3.5" → "তিন দশমিক পাঁচ পাঁচ"). */
function numbersAsWords(text: string): string {
  return text
    .replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6))
    .replace(/\d+(?:\.\d+)?/g, (num) => {
      const [whole, frac] = num.split(".") as [string, string | undefined];
      const w = whole.length > 1 && whole.startsWith("0") ? digitByDigit(whole) : whole.length > 9 ? digitByDigit(whole) : bnNumber(Number(whole));
      return frac ? `${w} দশমিক ${digitByDigit(frac)}` : w;
    });
}

/** The Bangla visual a Bangla page shows: overlay title, caption and notes on the English walkthrough. */
function withOverlay(vis: any, over: any): any {
  if (!over) return vis;
  const base = { ...vis, title: over.title ?? vis.title, caption: over.caption ?? vis.caption };
  if (vis.type === "diagram")
    return { ...base, frames: (vis.frames ?? []).map((fr: any, i: number) => ({ ...fr, note: over.frames?.[i]?.note ?? over.steps?.[i]?.note ?? fr.note })) };
  if (vis.type === "comparison") return base;
  return { ...base, steps: (vis.steps ?? []).map((st: any, i: number) => ({ ...st, note: over.steps?.[i]?.note ?? st.note })) };
}

function collectJobs(): Job[] {
  const jobs = new Map<string, string>();
  const add = (line: string) => {
    if (!isBanglaText(line)) return; // stays English: the English clips cover it
    const spoken = speechText(line, "bn");
    if (spoken.trim()) jobs.set(clipKey(spoken, "bn"), numbersAsWords(spoken));
  };
  const addVisual = (v: any) => {
    for (let i = 0; i < stepCount(v); i++) add(narrationLine(v, i, "bn"));
  };
  addVisual(TWO_SUM_VISUAL_BN); // the homepage demo first: the most visible walkthrough
  add(NARRATION_SAMPLES.bn); // "Test voice"
  const questions: Array<{ frequency?: string; visuals: any[] }> = [];
  for (const file of fs.readdirSync(path.join(ROOT, "server/src/data/content")).filter((f) => f.endsWith(".json")).sort()) {
    const en = JSON.parse(fs.readFileSync(path.join(ROOT, "server/src/data/content", file), "utf8"));
    const bnFile = path.join(ROOT, "server/src/data/content-bn", file);
    const overlay = fs.existsSync(bnFile) ? JSON.parse(fs.readFileSync(bnFile, "utf8")) : null;
    for (const q of en.questions ?? []) {
      const qOver = overlay?.questions?.[q.slug];
      if (!qOver) continue; // no Bangla for this question: the page shows English
      questions.push({ frequency: q.frequency, visuals: (q.visuals ?? []).map((v: any, i: number) => withOverlay(v, qOver.visuals?.[i])) });
    }
  }
  const rank = (f?: string) => (FREQUENCY_ORDER.includes(f ?? "") ? FREQUENCY_ORDER.indexOf(f!) : FREQUENCY_ORDER.length);
  questions.sort((a, b) => rank(a.frequency) - rank(b.frequency)); // stable: file order within a frequency
  for (const q of questions) q.visuals.forEach(addVisual);
  return [...jobs].map(([key, text]) => ({ key, text }));
}

// ------------------------------------------------------------------ finish: WAV → MP3 + manifest

function readWav(file: string): { samples: Float32Array; rate: number } {
  const buf = fs.readFileSync(file);
  let at = 12;
  let rate = 0;
  let format = 0;
  let bits = 0;
  let channels = 1;
  while (at + 8 <= buf.length) {
    const id = buf.toString("ascii", at, at + 4);
    const size = buf.readUInt32LE(at + 4);
    if (id === "fmt ") {
      format = buf.readUInt16LE(at + 8);
      channels = buf.readUInt16LE(at + 10);
      rate = buf.readUInt32LE(at + 12);
      bits = buf.readUInt16LE(at + 22);
    } else if (id === "data") {
      const data = buf.subarray(at + 8, at + 8 + size);
      const frames = Math.floor(data.length / ((bits / 8) * channels));
      const samples = new Float32Array(frames);
      for (let i = 0; i < frames; i++) {
        const o = i * (bits / 8) * channels; // first channel
        samples[i] = format === 3 ? data.readFloatLE(o) : bits === 16 ? data.readInt16LE(o) / 32768 : 0;
      }
      return { samples, rate };
    }
    at += 8 + size + (size % 2);
  }
  throw new Error(`no audio data in ${file}`);
}

function trimSilence(s: Float32Array, rate: number): Float32Array {
  const threshold = 0.004;
  let a = 0;
  let b = s.length - 1;
  while (a < s.length && Math.abs(s[a]!) < threshold) a++;
  while (b > a && Math.abs(s[b]!) < threshold) b--;
  if (a >= b) return s;
  return s.subarray(Math.max(0, a - Math.round(rate * 0.05)), Math.min(s.length, b + Math.round(rate * 0.15)));
}

function encodeMp3(lamejs: any, samples: Float32Array, rate: number): Buffer {
  let peak = 0;
  for (const v of samples) peak = Math.max(peak, Math.abs(v));
  const gain = peak > 0.97 ? 0.97 / peak : 1;
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) pcm[i] = Math.max(-32768, Math.min(32767, Math.round(samples[i]! * gain * 32767)));
  const encoder = new lamejs.Mp3Encoder(1, rate, KBPS);
  const parts: Buffer[] = [];
  const push = (chunk: Int8Array) => chunk.length && parts.push(Buffer.from(chunk.buffer, chunk.byteOffset, chunk.length));
  for (let i = 0; i < pcm.length; i += 1152) push(encoder.encodeBuffer(pcm.subarray(i, i + 1152)));
  push(encoder.flush());
  return Buffer.concat(parts);
}

function finish(jobs: Job[]) {
  const load = createRequire(__filename);
  // lamejs's CommonJS entry fails under Node; its single-file build defines a global `lamejs` function instead
  const lamejs = new Function(`${fs.readFileSync(load.resolve("lamejs/lame.all.js"), "utf8")}\nreturn lamejs;`)();
  fs.mkdirSync(OUT, { recursive: true });
  const manifestFile = path.join(OUT, "manifest.json");
  let known: Record<string, number> = {};
  try {
    const m = JSON.parse(fs.readFileSync(manifestFile, "utf8")) as ClipManifest;
    if (m.voice === CLIP_VOICES.bn) known = m.clips;
  } catch {
    /* first run */
  }
  let encoded = 0;
  const clips: Record<string, number> = {};
  for (const { key } of jobs) {
    const mp3 = path.join(OUT, `${key}.mp3`);
    const wav = path.join(WAVS, `${key}.wav`);
    if (!fs.existsSync(mp3) && fs.existsSync(wav)) {
      const { samples, rate } = readWav(wav);
      const trimmed = trimSilence(samples, rate);
      fs.writeFileSync(`${mp3}.tmp`, encodeMp3(lamejs, trimmed, rate));
      fs.renameSync(`${mp3}.tmp`, mp3);
      fs.unlinkSync(wav); // the MP3 is what the app uses; the WAVs only fill the disk
      known[key] = Math.round((trimmed.length / rate) * 1000);
      encoded++;
    }
    if (fs.existsSync(mp3)) clips[key] = known[key] ?? Math.round((fs.statSync(mp3).size * 8) / KBPS);
  }
  const sorted = Object.fromEntries(Object.entries(clips).sort(([a], [b]) => a.localeCompare(b)));
  const manifest: ClipManifest = { version: 1, voice: CLIP_VOICES.bn, format: "mp3", clips: sorted };
  fs.writeFileSync(`${manifestFile}.tmp`, JSON.stringify(manifest));
  fs.renameSync(`${manifestFile}.tmp`, manifestFile);
  if (process.argv.includes("--prune")) {
    const used = new Set(jobs.map((j) => `${j.key}.mp3`));
    const stale = fs.readdirSync(OUT).filter((f) => (CLIP_FILE.test(f) && !used.has(f)) || f.endsWith(".tmp"));
    for (const f of stale) fs.unlinkSync(path.join(OUT, f));
    if (stale.length) console.log(`pruned ${stale.length} unused file(s)`);
  }
  console.log(`${encoded} new Bangla clip(s); ${Object.keys(clips).length} of ${jobs.length} Bangla lines recorded → ${OUT}`);
}

// ------------------------------------------------------------------ main

const mode = process.argv[2];
const jobs = collectJobs();
if (mode === "export") {
  fs.mkdirSync(WORK, { recursive: true });
  fs.writeFileSync(JOBS, JSON.stringify({ voice: CLIP_VOICES.bn, jobs }, null, 1));
  const done = jobs.filter((j) => fs.existsSync(path.join(OUT, `${j.key}.mp3`))).length;
  console.log(`${jobs.length} Bangla lines (${done} already recorded) → ${JOBS}`);
} else if (mode === "finish") {
  finish(jobs);
} else {
  console.error("usage: npx tsx generate-bn.ts export | finish [--prune]");
  process.exit(1);
}
