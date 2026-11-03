const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'client/public/narration/bn');
const MANIFEST_PATH = path.join(OUT, 'manifest.json');
const JOBS_PATH = path.join(__dirname, '.work/bn-jobs.json');

const jobsData = JSON.parse(fs.readFileSync(JOBS_PATH, 'utf8'));
const voice = jobsData.voice || 'google-female/bn/1';
const allJobs = jobsData.jobs;

// Number of top Bangla clips to pre-record (Two Sum + sample + top questions)
const LIMIT = 250;
const jobsToRecord = allJobs.slice(0, LIMIT);

function splitText(text, maxLen = 150) {
  const chunks = [];
  const parts = text.match(/[^।?!,;:.\n]+[।?!,;:.\n]*/g) || [text];
  let current = '';

  for (const part of parts) {
    if ((current + part).length > maxLen) {
      if (current.trim()) chunks.push(current.trim());
      current = part;
    } else {
      current += part;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text];
}

function fetchChunk(chunk) {
  return new Promise((resolve, reject) => {
    const url = 'https://translate.google.com/translate_tts?ie=UTF-8&q=' + encodeURIComponent(chunk) + '&tl=bn&client=tw-ob';
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, res => {
      if (res.statusCode !== 200) {
        return reject(new Error('Google TTS status: ' + res.statusCode));
      }
      const data = [];
      res.on('data', d => data.push(d));
      res.on('end', () => resolve(Buffer.concat(data)));
    }).on('error', reject);
  });
}

async function fetchGoogleTTS(text) {
  const chunks = splitText(text);
  const buffers = [];
  for (const chunk of chunks) {
    const buf = await fetchChunk(chunk);
    buffers.push(buf);
    await new Promise(r => setTimeout(r, 50));
  }
  return Buffer.concat(buffers);
}

async function run() {
  console.log(`Starting generation of ${jobsToRecord.length} Bangla female voice clips...`);

  // Track new clips for manifest
  const newClips = {};
  const newFiles = new Set();
  let count = 0;

  for (const job of jobsToRecord) {
    const { key, text } = job;
    const filePath = path.join(OUT, `${key}.mp3`);
    newFiles.add(`${key}.mp3`);

    try {
      const audioBuffer = await fetchGoogleTTS(text);
      fs.writeFileSync(filePath, audioBuffer);
      // Duration in ms: Google TTS sends ~32kbps mono MP3 (4 bytes / ms)
      const durationMs = Math.max(2000, Math.round((audioBuffer.length * 8) / 32));
      newClips[key] = durationMs;
      count++;
      if (count % 25 === 0 || count === jobsToRecord.length) {
        console.log(`[${count}/${jobsToRecord.length}] Saved female clip: ${key} (${audioBuffer.length} bytes, ~${durationMs}ms)`);
      }
    } catch (err) {
      console.error(`Error fetching key ${key} ("${text.slice(0, 30)}..."):`, err.message);
    }

    await new Promise(r => setTimeout(r, 60));
  }

  // Remove any stale/old male files that are not among the new clips
  const existingFiles = fs.readdirSync(OUT).filter(f => f.endsWith('.mp3'));
  let prunedCount = 0;
  for (const file of existingFiles) {
    if (!newFiles.has(file)) {
      try {
        fs.unlinkSync(path.join(OUT, file));
        prunedCount++;
      } catch {}
    }
  }
  console.log(`Pruned ${prunedCount} old male audio files.`);

  // Write updated manifest
  const updatedManifest = {
    version: 1,
    voice: voice,
    format: 'mp3',
    clips: Object.fromEntries(Object.entries(newClips).sort(([a], [b]) => a.localeCompare(b))),
  };

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(updatedManifest));
  console.log(`Updated manifest.json: ${Object.keys(newClips).length} clips with voice: "${voice}".`);
}

run().catch(console.error);

