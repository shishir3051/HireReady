import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const ttsRouter = Router();

const CACHE_DIR = path.resolve(__dirname, '../../cache/tts');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function splitText(text: string, maxLen = 150): string[] {
  const chunks: string[] = [];
  // Split by sentence/clause boundaries
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

async function fetchGoogleTTS(chunk: string, lang: string): Promise<Buffer> {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&client=tw-ob`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  if (!res.ok) {
    throw new Error(`Google TTS returned status ${res.status}`);
  }
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

ttsRouter.get('/', async (req: Request, res: Response) => {
  const text = typeof req.query.text === 'string' ? req.query.text.trim() : '';
  const lang = typeof req.query.lang === 'string' && req.query.lang.toLowerCase().startsWith('en') ? 'en' : 'bn';

  if (!text) {
    res.status(400).json({ error: { message: 'Missing text parameter' } });
    return;
  }

  // Generate unique cache key
  const hash = crypto.createHash('sha256').update(`${lang}:${text}`).digest('hex').slice(0, 16);
  const cacheFile = path.join(CACHE_DIR, `${hash}.mp3`);

  // Check cache first
  if (fs.existsSync(cacheFile)) {
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    fs.createReadStream(cacheFile).pipe(res);
    return;
  }

  try {
    const chunks = splitText(text);
    const audioBuffers: Buffer[] = [];

    for (const chunk of chunks) {
      const buf = await fetchGoogleTTS(chunk, lang);
      audioBuffers.push(buf);
    }

    const fullAudio = Buffer.concat(audioBuffers);

    // Write to cache asynchronously
    fs.writeFile(cacheFile, fullAudio, () => {});

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(fullAudio);
  } catch (error) {
    console.error('TTS generation error:', error);
    res.status(502).json({ error: { message: 'Failed to generate speech audio' } });
  }
});
