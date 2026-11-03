"""Records HireReady's Bangla narration with AI4Bharat Indic Parler-TTS (Apache-2.0), offline, on the CPU.

Reads .work/bn-jobs.json (made by `npx tsx generate-bn.ts export`) and writes .work/bn-wav/<key>.wav (22.05 kHz).
Resumable: lines that already have a WAV or a finished MP3 are skipped, so stop it any time with Ctrl+C and run it
again later. Then `npx tsx generate-bn.ts finish` turns the WAVs into the MP3 clips the app plays.
record-bn.cmd runs all of this in order. See README.md.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
JOBS = HERE / ".work" / "bn-jobs.json"
WAVS = HERE / ".work" / "bn-wav"
MP3S = HERE.parent.parent / "client" / "public" / "narration" / "bn"
MODEL = "ai4bharat/indic-parler-tts"
# Parler-TTS picks the voice from a description. Arjun is one of AI4Bharat's recommended Bangla speakers, described in
# the owner's chosen tone: a deep, resonant, laid-back and casual male voice. A fixed description and seed keep every
# clip in the same voice. CLIP_VOICES.bn in narration-audio.ts names this voice: bump it when this changes.
DESCRIPTION = (
    "Arjun speaks in a deep, warm and resonant voice with a relaxed, laid-back and casual delivery, at a moderate pace, "
    "clearly pronouncing every word, like a friendly senior explaining a lesson. The recording is of very high quality, "
    "with the speaker's voice sounding clear and very close up, and no background noise."
)
SEED = 1234


def logged_in() -> bool:
    try:
        from huggingface_hub import get_token
    except ImportError:  # older huggingface_hub
        from huggingface_hub import HfFolder

        get_token = HfFolder.get_token
    return bool(get_token())


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=0, help="record at most this many lines, e.g. 5 for a quick test")
    parser.add_argument("--threads", type=int, default=os.cpu_count() or 4)
    parser.add_argument("--check-login", action="store_true", help="exit 0 if logged in to Hugging Face, else 1")
    args = parser.parse_args()
    if args.check_login:
        return 0 if logged_in() else 1

    import numpy as np
    import soundfile as sf
    import torch
    from parler_tts import ParlerTTSForConditionalGeneration
    from transformers import AutoTokenizer, set_seed

    torch.set_num_threads(args.threads)
    jobs = json.loads(JOBS.read_text(encoding="utf-8"))["jobs"]
    WAVS.mkdir(parents=True, exist_ok=True)
    todo = [j for j in jobs if not (WAVS / f"{j['key']}.wav").exists() and not (MP3S / f"{j['key']}.mp3").exists()]
    if args.limit:
        todo = todo[: args.limit]
    print(f"{len(jobs)} Bangla lines, {len(todo)} to record now ({args.threads} threads)", flush=True)
    if not todo:
        return 0

    print("Loading the voice model (the first run downloads about 3.7 GB)...", flush=True)
    try:
        model = ParlerTTSForConditionalGeneration.from_pretrained(MODEL)
        tokenizer = AutoTokenizer.from_pretrained(MODEL)
        description_tokenizer = AutoTokenizer.from_pretrained(model.config.text_encoder._name_or_path)
    except Exception as e:  # gated model: not logged in, or the terms not accepted yet
        print(f"\nCould not load {MODEL}: {e}", file=sys.stderr)
        print(
            "Open https://huggingface.co/ai4bharat/indic-parler-tts, click 'Agree and access repository', "
            "then log in with: .venv-bn\\Scripts\\huggingface-cli login",
            file=sys.stderr,
        )
        return 1
    model.eval()
    description = description_tokenizer(DESCRIPTION, return_tensors="pt")
    rate = model.config.sampling_rate

    def synthesize(text: str, seed: int) -> "np.ndarray":
        set_seed(seed)
        prompt = tokenizer(text, return_tensors="pt")
        with torch.inference_mode():
            audio = model.generate(
                input_ids=description.input_ids,
                attention_mask=description.attention_mask,
                prompt_input_ids=prompt.input_ids,
                prompt_attention_mask=prompt.attention_mask,
            )
        return audio.cpu().numpy().squeeze().astype(np.float32)

    def plausible(seconds: float, text: str) -> bool:
        # Bangla speech runs at roughly 12-15 characters a second; far outside that usually means a skipped or
        # rambling take
        expected = len(text) / 13
        return expected * 0.45 <= seconds <= expected * 2.2 + 1.5

    started = time.time()
    audio_total = 0.0
    try:
        for n, job in enumerate(todo, 1):
            t0 = time.time()
            audio = synthesize(job["text"], SEED)
            if not plausible(len(audio) / rate, job["text"]):
                retry = synthesize(job["text"], SEED + 1)  # one more take with another seed
                expected = len(job["text"]) / 13
                if abs(len(retry) / rate - expected) < abs(len(audio) / rate - expected):
                    audio = retry
                if not plausible(len(audio) / rate, job["text"]):
                    print(f"  check {job['key']}: {len(audio) / rate:.1f} s for {len(job['text'])} characters", flush=True)
            out_rate = rate
            if rate == 44100:  # 22.05 kHz is plenty for speech and halves the temporary files
                audio = audio[: len(audio) // 2 * 2].reshape(-1, 2).mean(axis=1)
                out_rate = 22050
            tmp = WAVS / f"{job['key']}.wav.tmp"
            sf.write(tmp, np.clip(audio, -1.0, 1.0), out_rate, subtype="PCM_16", format="WAV")
            os.replace(tmp, WAVS / f"{job['key']}.wav")
            seconds = len(audio) / out_rate
            audio_total += seconds
            elapsed = time.time() - started
            left = elapsed / n * (len(todo) - n)
            print(
                f"{n}/{len(todo)}  {seconds:4.1f} s in {time.time() - t0:5.1f} s  "
                f"(about {left / 3600:.1f} h left)",
                flush=True,
            )
    except KeyboardInterrupt:
        print("\nStopped. Run again to continue where it left off.", flush=True)
    print(f"Recorded {audio_total / 60:.1f} min of Bangla in {(time.time() - started) / 60:.1f} min.", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
