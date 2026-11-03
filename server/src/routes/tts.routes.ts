import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { EdgeTTS } from '@andresaya/edge-tts';

export const ttsRouter = Router();

const CACHE_DIR = path.resolve(__dirname, '../../cache/tts');

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

ttsRouter.get('/', async (req: Request, res: Response) => {
  const text = typeof req.query.text === 'string' ? req.query.text.trim() : '';
  const lang = typeof req.query.lang === 'string' && req.query.lang.toLowerCase().startsWith('en') ? 'en' : 'bn';

  if (!text) {
    res.status(400).json({ error: { message: 'Missing text parameter' } });
    return;
  }

  // Male voices: bn-BD-PradeepNeural for Bangla, en-US-ChristopherNeural for English
  const voice = lang === 'en' ? 'en-US-ChristopherNeural' : 'bn-BD-PradeepNeural';
  const hash = crypto.createHash('sha256').update(`${voice}:${text}`).digest('hex').slice(0, 16);
  const cacheFile = path.join(CACHE_DIR, `${hash}.mp3`);

  if (fs.existsSync(cacheFile)) {
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    fs.createReadStream(cacheFile).pipe(res);
    return;
  }

  try {
    const tts = new EdgeTTS();
    await tts.synthesize(text, voice);
    const fullAudio = tts.toBuffer();

    fs.writeFile(cacheFile, fullAudio, () => {});

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(fullAudio);
  } catch (error) {
    console.error('TTS error, falling back to Google TTS:', error);
    try {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text.slice(0, 150))}&tl=${lang}&client=tw-ob`;
      const gRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (gRes.ok) {
        const buf = Buffer.from(await gRes.arrayBuffer());
        res.setHeader('Content-Type', 'audio/mpeg');
        res.send(buf);
        return;
      }
    } catch {}
    res.status(502).json({ error: { message: 'Failed to generate speech audio' } });
  }
});
