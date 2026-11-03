# Pre-recorded English narration

`generate-en.ts` records every English walkthrough step as an MP3 in one natural voice. Walkthrough narration then sounds the same in every browser. It runs offline on your own PC and needs no cloud service, account or card.

- **Voice:** [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) v1.0, voice `am_michael` (a warm, deep, laid-back male voice), run with [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx). Both are Apache-2.0, so the audio may be used and served freely, including in a paid app.
- **Labelling:** the app labels it as an AI-generated voice.
- **Output:** `client/public/narration/en/<key>.mp3` (mono, 24 kHz, 40 kbps) plus `manifest.json`. That is about 3,100 clips and roughly 150 MB. The folder is committed and deployed with the app; commit it again after each recording run.
- **Naming:** each clip is named by a hash of the exact words spoken. The app finds clips with the same functions the recorder uses: `narrationLine`, `speechText` and `clipKey` in `client/src/components/visualizers/lib/`.
- **Changes:** when a note changes, its new text has no clip, and the browser's own voice reads it until you record again.

## Set up (once)

1. Install the tools:
   ```bash
   cd tools/narration
   npm install
   ```
2. Download `kokoro-multi-lang-v1_0.tar.bz2` (about 330 MB) from the sherpa-onnx [tts-models release](https://github.com/k2-fsa/sherpa-onnx/releases/tag/tts-models). Extract it into `tools/narration/models/`, so that `models/kokoro-multi-lang-v1_0/model.onnx` exists. Use the full-precision model: the int8 one runs about 4× slower on CPUs without VNNI.

Keep `sherpa-onnx-node` on **1.13.x**. Version 2.x dropped espeak-ng: it silently skips numbers and words that aren't in its dictionary.

## Record

```bash
npx tsx generate-en.ts            # everything that has no clip yet
npx tsx generate-en.ts --prune    # …and delete clips no note uses any more
```

- **Speed:** recording runs in 2–3 worker processes at below-normal priority. On a 6-core laptop, `--workers 3 --threads 2` was fastest, at about 0.45× real time; a full run takes about 2.5 h.
- **Resuming:** stop it any time and run it again; it skips clips that already exist.
- **`--limit N`** records only N clips, which is handy for a quick check.

## Serve

- **Local:** `next dev` and `next start` serve the clips from `client/public/narration` at `/narration`.
- **Production:** the clips are committed, so they deploy with the app; after recording, commit `client/public/narration/` (the manifest last, once the run has finished). To host them elsewhere instead, build with `NEXT_PUBLIC_NARRATION_AUDIO_URL` set. A free GitHub Pages site works:
  - It needs no card.
  - It sends the CORS header that the manifest fetch and the clips need (the player loads them with `crossOrigin="anonymous"`).
  - The URL must contain `en/manifest.json`, for example `https://<user>.github.io/hireready-narration`.
- **Missing manifest:** narration quietly uses the browser voices.

If you change the voice, speed, bitrate or model, bump `CLIP_VOICE` in `narration-audio.ts`, so that old clips are not mixed with new ones.

# Pre-recorded Bangla narration

Chrome and Firefox on computers have no Bangla voice, so Bangla narration used to work only in Edge and on Android. Recorded Bangla clips fix that.

- **Voice:** [AI4Bharat Indic Parler-TTS](https://huggingface.co/ai4bharat/indic-parler-tts) (Apache-2.0, free, runs offline), speaker Arjun, in a deep, resonant, laid-back tone. The app labels it as an AI-generated voice.
- **Output:** `client/public/narration/bn/<key>.mp3` plus `manifest.json`, for about 3,100 Bangla lines.
- **What it unlocks:** a walkthrough whose Bangla lines are all recorded unlocks বাংলা in every browser, and plays the clips by default. The rest keep working as before.

## What you need (once)

- **About 6 GB free on C:**: the model is 3.7 GB, plus Python packages and temporary recordings. To keep the model elsewhere, set `HF_HOME`, for example `setx HF_HOME D:\hf-cache`.
- **Python 3.11** (`py -3.11`), **git** and **Node**. All three are already on this PC.
- **A free Hugging Face account:** open the [model page](https://huggingface.co/ai4bharat/indic-parler-tts), click *Agree and access repository*, and create a *Read* token at [settings/tokens](https://huggingface.co/settings/tokens). The first run asks you to paste that token; it never goes into the code.

## Record

```bash
tools\narration\record-bn.cmd --limit 5   :: a quick test: sets everything up, records 5 lines
tools\narration\record-bn.cmd             :: everything still missing; Ctrl+C to stop, run again to continue
```

- **Steps:** the runner sets up `.venv-bn`, lists the Bangla lines (`generate-bn.ts export`), records them (`record-bn.py`), then turns them into MP3s and updates the manifest (`generate-bn.ts finish --prune`).
- **Order:** the homepage demo, the voice sample and the most-asked questions come first.
- **Time:** it runs on the CPU and is slow. Expect roughly 1–3 days for everything; the speed hasn't been measured on this PC yet. The `--limit 5` test shows the speed in its progress lines.
- **Odd takes:** a take far longer or shorter than its text is retried once, and logged as `check <key>` if it is still odd.
- **Publishing:** commit `client/public/narration/bn` and push. If a run was stopped, run `npx.cmd tsx generate-bn.ts finish` first, so the manifest includes everything recorded.

To change the speaker or the description in `record-bn.py`, bump `CLIP_VOICES.bn` in `narration-audio.ts` too.
