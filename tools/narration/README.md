# Pre-recorded English narration

`generate-en.ts` records every English walkthrough step as an MP3 in one natural voice. Walkthrough narration then sounds the same in every browser. It runs offline on your own PC and needs no cloud service, account or card.

- **Voice:** [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) v1.0, voice `af_heart`, run with [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx). Both are Apache-2.0, so the audio may be used and served freely, including in a paid app.
- **Labelling:** the app labels it as an AI-generated voice.
- **Output:** `client/public/narration/en/<key>.mp3` (mono, 24 kHz, 40 kbps) plus `manifest.json`. That is about 3,100 clips and roughly 100 MB. The folder is git-ignored.
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
- **Production:** the files are not in git, so either commit `client/public/narration/` on purpose, or host the folder elsewhere and build with `NEXT_PUBLIC_NARRATION_AUDIO_URL` set. A free GitHub Pages site works:
  - It needs no card.
  - It sends the CORS header that the manifest fetch and the clips need (the player loads them with `crossOrigin="anonymous"`).
  - The URL must contain `en/manifest.json`, for example `https://<user>.github.io/hireready-narration`.
- **Missing manifest:** narration quietly uses the browser voices.

If you change the voice, speed, bitrate or model, bump `CLIP_VOICE` in `narration-audio.ts`, so that old clips are not mixed with new ones.
