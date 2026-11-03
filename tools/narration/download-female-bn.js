const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'client/public/narration/bn');
const MANIFEST_PATH = path.join(OUT, 'manifest.json');
const JOBS_PATH = path.join(__dirname, '.work/bn-jobs.json');

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const jobs = JSON.parse(fs.readFileSync(JOBS_PATH, 'utf8')).jobs;
const jobMap = new Map(jobs.map(j => [j.key, j.text]));

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
    // tiny delay between chunks
    await new Promise(r => setTimeout(r, 60));
  }
  return Buffer.concat(buffers);
}

async function run() {
  const keys = Object.keys(manifest.clips);
  console.log(`Starting download of ${keys.length} Bangla female voice clips...`);

  const updatedClips = {};
  let count = 0;

  for (const key of keys) {
    const text = jobMap.get(key);
    if (!text) {
      console.warn(`No text found for key ${key}`);
      continue;
    }

    try {
      const audioBuffer = await fetchGoogleTTS(text);
      const filePath = path.join(OUT, `${key}.mp3`);
      fs.writeFileSync(filePath, audioBuffer);
      // Rough duration in ms for 32kbps MP3 (or file size * 8 / 32)
      const durationMs = Math.max(2000, Math.round((audioBuffer.length * 8) / 32));
      updatedClips[key] = durationMs;
      count++;
      if (count % 25 === 0 || count === keys.length) {
        console.log(`[${count}/${keys.length}] Saved female clip: ${key} (${audioBuffer.length} bytes)`);
      }
    } catch (err) {
      console.error(`Error fetching key ${key}:`, err.message);
    }

    // small pacing between requests to avoid any rate-limiting
    await new Promise(r => setTimeout(r, 80));
  }

  const updatedManifest = {
    version: 1,
    voice: 'google-female/bn/1',
    format: 'mp3',
    clips: updatedClips,
  };

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(updatedManifest));
  console.log('Successfully updated manifest.json with female voice clips!');
}

run().catch(console.error);
