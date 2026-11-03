// Records every English walkthrough line as an MP3 with Kokoro (voice af_heart), offline, for pre-recorded narration.
// Resumable: lines that already have a clip are skipped, so stop it any time (Ctrl+C) and run it again later.
//
//   npx tsx generate-en.ts [--workers 3] [--threads 2] [--limit N] [--prune] [--model <dir>] [--out <dir>]
//
// --prune deletes clips no line uses any more. See README.md for setup.
import { fork, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { isBanglaText, speechText } from "../../client/src/components/visualizers/lib/speech-text";
import { CLIP_VOICE, NARRATION_SAMPLES, clipKey, type ClipManifest } from "../../client/src/components/visualizers/lib/narration-audio";
import { narrationLine, stepCount } from "../../client/src/components/visualizers/lib/steps";
import { TWO_SUM_VISUAL } from "../../client/src/lib/demo-content";

const ROOT = path.resolve(__dirname, "../..");
const SPEAKER = 3; // af_heart in Kokoro v1.0 (am_michael is 16)
const KBPS = 40; // mono MP3 at the model's 24 kHz: clear speech at ~5 KB a second
const CLIP_FILE = /^[0-9a-z]{11}\.mp3$/; // what clipKey() names look like: --prune touches nothing else

interface Job {
  key: string;
  text: string;
}
type Done = { key: string; ms: number; chars: number } | { key: string; error: string };
type FromWorker = { ready: true } | Done;
type ToWorker = { job: Job } | { stop: true };

function option(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

const MODEL = path.resolve(option("model") ?? path.join(__dirname, "models/kokoro-multi-lang-v1_0"));
const OUT = path.resolve(option("out") ?? path.join(ROOT, "client/public/narration/en"));
const WORKERS = Math.max(1, Number(option("workers") ?? 3));
const THREADS = Math.max(1, Number(option("threads") ?? Math.max(1, Math.floor(os.cpus().length / WORKERS))));

const pauseMs = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/**
 * Every English line the walkthrough player can speak, keyed exactly as the player looks clips up. The most visible
 * ones (the voice sample, the homepage demo) come first, so a partial run already covers them.
 */
function collectJobs(): Job[] {
  const jobs = new Map<string, string>();
  const add = (line: string) => {
    if (!line.trim() || isBanglaText(line)) return;
    const spoken = speechText(line, "en");
    if (spoken.trim()) jobs.set(clipKey(spoken), spoken);
  };
  const addVisual = (v: any) => {
    for (let i = 0; i < stepCount(v); i++) add(narrationLine(v, i, "en"));
  };
  add(NARRATION_SAMPLES.en);
  addVisual(TWO_SUM_VISUAL); // client-only: the homepage demo walkthrough
  const dir = path.join(ROOT, "server/src/data/content");
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    const questions: any[] = Array.isArray(data.questions) ? data.questions : Object.values(data.questions ?? {});
    for (const q of questions) for (const v of q.visuals ?? []) addVisual(v);
  }
  return [...jobs].map(([key, text]) => ({ key, text }));
}

function readManifest(file: string): Record<string, number> {
  try {
    const m = JSON.parse(fs.readFileSync(file, "utf8")) as ClipManifest;
    return m.voice === CLIP_VOICE && m.clips ? m.clips : {};
  } catch {
    return {};
  }
}

/**
 * Replaces manifest.json in one step. On Windows the rename fails while another process has the file open (the dev
 * server serving it, an antivirus scan, a preview pane), so retry for a moment; a failed periodic write is only
 * reported, since the next one (and the final one) rewrites everything.
 */
function writeManifest(file: string, clips: Record<string, number>, mustSucceed = false) {
  const sorted = Object.fromEntries(Object.entries(clips).sort(([a], [b]) => a.localeCompare(b)));
  const manifest: ClipManifest = { version: 1, voice: CLIP_VOICE, format: "mp3", clips: sorted };
  for (let attempt = 1; ; attempt++) {
    try {
      fs.writeFileSync(`${file}.tmp`, JSON.stringify(manifest));
      fs.renameSync(`${file}.tmp`, file);
      return;
    } catch (e) {
      if (attempt >= (mustSucceed ? 40 : 5)) {
        if (mustSucceed) throw e;
        console.error(`manifest not updated this time (${(e as Error).message}); will retry`);
        return;
      }
      pauseMs(250);
    }
  }
}

// ------------------------------------------------------------------ worker: synthesize + encode

/** Drop the model's leading/trailing silence (keeping a short lead-in and tail) so steps follow each other briskly. */
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
  const gain = peak > 0.97 ? 0.97 / peak : 1; // never clip
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) pcm[i] = Math.max(-32768, Math.min(32767, Math.round(samples[i]! * gain * 32767)));
  const encoder = new lamejs.Mp3Encoder(1, rate, KBPS);
  const parts: Buffer[] = [];
  const push = (chunk: Int8Array) => chunk.length && parts.push(Buffer.from(chunk.buffer, chunk.byteOffset, chunk.length));
  for (let i = 0; i < pcm.length; i += 1152) push(encoder.encodeBuffer(pcm.subarray(i, i + 1152)));
  push(encoder.flush());
  return Buffer.concat(parts);
}

/** A worker records one job at a time, asking the main process for the next one, until it is told to stop. */
function runWorker() {
  // keep the PC usable while recording for hours
  try {
    os.setPriority(os.constants.priority.PRIORITY_BELOW_NORMAL);
  } catch {
    /* not allowed: run at normal priority */
  }
  const load = createRequire(__filename);
  const sherpa = load("sherpa-onnx-node");
  // lamejs's CommonJS entry fails under Node ("MPEGMode is not defined"); its single-file build defines a global
  // `lamejs` function instead, so evaluate that and take the function
  const lamejs = new Function(`${fs.readFileSync(load.resolve("lamejs/lame.all.js"), "utf8")}\nreturn lamejs;`)();
  const tts = new sherpa.OfflineTts({
    model: {
      kokoro: {
        model: path.join(MODEL, "model.onnx"),
        voices: path.join(MODEL, "voices.bin"),
        tokens: path.join(MODEL, "tokens.txt"),
        lexicon: path.join(MODEL, "lexicon-us-en.txt"),
        // espeak-ng reads numbers and words the lexicon lacks; sherpa-onnx-node 2.x dropped it (and skips them)
        dataDir: path.join(MODEL, "espeak-ng-data"),
        lang: "en-us",
      },
      numThreads: THREADS,
      provider: "cpu",
      debug: false,
    },
    maxNumSentences: 1,
  });

  const record = (job: Job): Done => {
    try {
      const audio = tts.generate({ text: job.text, sid: SPEAKER, speed: 1 });
      const samples = trimSilence(audio.samples as Float32Array, audio.sampleRate);
      const file = path.join(OUT, `${job.key}.mp3`);
      fs.writeFileSync(`${file}.tmp`, encodeMp3(lamejs, samples, audio.sampleRate));
      // an antivirus scan can hold the new file for a moment
      for (let attempt = 1; ; attempt++) {
        try {
          fs.renameSync(`${file}.tmp`, file);
          break;
        } catch (e) {
          if (attempt >= 8) throw e;
          pauseMs(250);
        }
      }
      return { key: job.key, ms: Math.round((samples.length / audio.sampleRate) * 1000), chars: job.text.length };
    } catch (e) {
      return { key: job.key, error: (e as Error).message };
    }
  };

  process.on("message", (m: ToWorker) => {
    if ("stop" in m) process.exit(0);
    else process.send!(record(m.job) satisfies FromWorker);
  });
  process.send!({ ready: true } satisfies FromWorker);
}

// ------------------------------------------------------------------ main: plan, hand out jobs, keep the manifest

async function main() {
  if (flag("worker")) {
    process.on("disconnect", () => process.exit(0)); // the main process stopped: stop too
    runWorker();
    return;
  }

  if (!fs.existsSync(path.join(MODEL, "model.onnx"))) {
    console.error(`Kokoro model not found in ${MODEL}. See README.md (download kokoro-multi-lang-v1_0).`);
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });
  const manifestFile = path.join(OUT, "manifest.json");
  const known = readManifest(manifestFile);
  const jobs = collectJobs();
  const clips: Record<string, number> = {};
  const todo: Job[] = [];
  for (const job of jobs) {
    const file = path.join(OUT, `${job.key}.mp3`);
    if (!fs.existsSync(file)) todo.push(job);
    // a clip recorded just before a stop may not be in the manifest yet: at a constant bitrate, size gives length
    else clips[job.key] = known[job.key] ?? Math.round((fs.statSync(file).size * 8) / KBPS);
  }
  const limit = Number(option("limit") ?? 0);
  const queue = limit > 0 ? todo.slice(0, limit) : todo;
  const batchSize = queue.length;
  const totalChars = queue.reduce((n, j) => n + j.text.length, 0);
  console.log(
    `${jobs.length} English lines: ${jobs.length - todo.length} recorded, ${batchSize} to record now ` +
      `(${WORKERS} worker${WORKERS > 1 ? "s" : ""} × ${THREADS} threads) → ${OUT}`,
  );

  const started = Date.now();
  let done = 0;
  let chars = 0;
  let audioMs = 0;
  let failed = 0;
  let replacements = 0;
  const report = () => {
    const secs = (Date.now() - started) / 1000;
    const eta = chars ? ((totalChars - chars) / chars) * secs : 0;
    console.log(
      `${done}/${batchSize} clips, ${(audioMs / 60000).toFixed(1)} min of audio in ${(secs / 60).toFixed(1)} min` +
        ` (×${(secs / (audioMs / 1000 || 1)).toFixed(2)} real time), about ${(eta / 60).toFixed(0)} min left`,
    );
  };

  // the manifest is rewritten every 2 s while clips arrive, and once more on Ctrl+C, so a stop loses nothing
  let dirty = false;
  const flush = (mustSucceed = false) => {
    if (!dirty && !mustSucceed) return;
    dirty = false;
    writeManifest(manifestFile, clips, mustSucceed);
  };
  const timer = setInterval(() => flush(), 2000);
  process.on("SIGINT", () => {
    flush(true);
    console.log(`\nstopped: ${Object.keys(clips).length} clips in the manifest; run again to continue`);
    process.exit(130);
  });

  // Workers pull jobs one at a time, so a worker that dies (a crash in the speech engine, ended from Task Manager)
  // costs only the clip it was recording: that clip is reported, and a fresh worker takes over the rest.
  const runOne = (): Promise<void> =>
    new Promise((resolve) => {
      const child: ChildProcess = fork(__filename, [...process.argv.slice(2), "--worker"], { execArgv: process.execArgv });
      let current: Job | null = null;
      const next = () => {
        current = queue.shift() ?? null;
        child.send((current ? { job: current } : { stop: true }) satisfies ToWorker);
      };
      child.on("message", (m: FromWorker) => {
        if (!("ready" in m)) {
          done++;
          if ("error" in m) {
            failed++;
            console.error(`failed ${m.key}: ${m.error}`);
          } else {
            clips[m.key] = m.ms;
            chars += m.chars;
            audioMs += m.ms;
            dirty = true;
          }
          if (done % 25 === 0) report();
        }
        next();
      });
      child.on("exit", (code, signal) => {
        if (current) {
          done++;
          failed++;
          console.error(`a worker stopped (${signal ?? `exit code ${code}`}) while recording ${current.key}: "${current.text.slice(0, 120)}"`);
          current = null;
          if (queue.length > 0 && replacements++ < 10) return void runOne().then(resolve);
        }
        resolve();
      });
    });
  await Promise.all(Array.from({ length: Math.min(WORKERS, batchSize) }, runOne));
  clearInterval(timer);
  flush(true);

  if (flag("prune")) {
    const used = new Set(jobs.map((j) => `${j.key}.mp3`));
    const stale = fs.readdirSync(OUT).filter((f) => (CLIP_FILE.test(f) && !used.has(f)) || f.endsWith(".tmp"));
    for (const f of stale) fs.unlinkSync(path.join(OUT, f));
    console.log(`pruned ${stale.length} unused clip(s) and leftover file(s)`);
  }
  report();
  const missing = queue.length; // left over only if workers kept dying
  console.log(
    `manifest: ${Object.keys(clips).length} of ${jobs.length} lines recorded` +
      `${failed ? `, ${failed} failed` : ""}${missing ? `, ${missing} not attempted` : ""}${failed || missing ? " (run again to retry)" : ""}`,
  );
  process.exitCode = failed || missing ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
