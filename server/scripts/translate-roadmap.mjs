import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../src/data');

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const TECHNICAL_TERMS = [
  'hash map', 'hash set', 'two pointers', 'sliding window', 'binary search',
  'linked list', 'dynamic programming', 'recursion', 'backtracking',
  'brute force', 'time complexity', 'space complexity', 'worst case',
  'average case', 'best case', 'amortized time', 'amortized', 'one pass', 'two pass', 'in-place',
  'monotonic stack', 'monotonic queue', 'priority queue', 'call stack',
  'stack', 'queue', 'heap', 'binary tree', 'BST', 'graph', 'array', 'pointer',
  'prefix sum', 'bit manipulation', 'matrix', 'memoization', 'top-k',
  'JavaScript', 'Python', 'Java', 'TypeScript', 'Node.js', 'Express', 'React', 'Next.js',
  'SQL', 'DBMS', 'REST', 'HTTP', 'HTTPS', 'TCP', 'UDP', 'DNS', 'Git', 'Big-O', 'OOP', 'SOLID'
];

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function maskText(rawText) {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) return { text: rawText, tokens: [] };
  const tokens = [];
  let text = rawText;

  text = text.replace(/`[^`]+`/g, (m) => {
    tokens.push(m);
    return ` __TK${tokens.length - 1}__ `;
  });

  text = text.replace(/[OΘΩ]\([^)]+\)/g, (m) => {
    tokens.push(m);
    return ` __TK${tokens.length - 1}__ `;
  });

  for (const t of TECHNICAL_TERMS) {
    const re = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'gi');
    text = text.replace(re, (m) => {
      tokens.push(m);
      return ` __TK${tokens.length - 1}__ `;
    });
  }

  return { text, tokens };
}

function unmaskText(translated, tokens) {
  if (!translated) return translated;
  let out = translated;
  tokens.forEach((val, i) => {
    const tokenRegex = new RegExp(`__\\s*TK${i}\\s*__`, 'gi');
    out = out.replace(tokenRegex, val);
  });
  for (let d = 0; d < 10; d++) {
    out = out.replaceAll(BN_DIGITS[d], String(d));
  }
  return out.replace(/\s+/g, ' ').trim();
}

async function translateBatch(texts) {
  const maskedItems = texts.map(t => maskText(t));
  const toTranslate = maskedItems.map(m => m.text);

  const chunks = [];
  let curChunk = [];
  let curLen = 0;

  for (let i = 0; i < toTranslate.length; i++) {
    const t = toTranslate[i];
    if (curLen + t.length > 2500 && curChunk.length > 0) {
      chunks.push(curChunk);
      curChunk = [];
      curLen = 0;
    }
    curChunk.push({ idx: i, text: t });
    curLen += t.length + 15;
  }
  if (curChunk.length > 0) chunks.push(curChunk);

  const transMap = new Map();

  for (const chunk of chunks) {
    const joined = chunk.map(c => c.text).join('\n__DIV__\n');
    let resText = null;

    const eps = [
      { url: 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=bn&dt=t&q=', parse: (d) => d[0].map(c => c[0]).join('') },
      { url: 'https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=en&tl=bn&q=', parse: (d) => (Array.isArray(d) ? d.join('') : String(d)) }
    ];

    for (let attempt = 1; attempt <= 6; attempt++) {
      const ep = eps[(attempt - 1) % eps.length];
      try {
        const res = await fetch(ep.url + encodeURIComponent(joined), {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        if (res.status === 429) {
          await sleep(attempt * 1200);
          continue;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const text = ep.parse(data);
        if (text) {
          resText = text;
          break;
        }
      } catch (err) {
        await sleep(attempt * 800);
      }
    }

    if (resText) {
      const parts = resText.split(/__\s*DIV\s*__/i);
      chunk.forEach((c, i) => {
        transMap.set(c.idx, parts[i] ? parts[i].trim() : c.text);
      });
    } else {
      chunk.forEach(c => transMap.set(c.idx, c.text));
    }
    await sleep(200);
  }

  return maskedItems.map((item, i) => {
    const raw = transMap.has(i) ? transMap.get(i) : item.text;
    return unmaskText(raw, item.tokens);
  });
}

async function run() {
  const rmPath = path.join(DATA_DIR, 'roadmap.json');
  const en = JSON.parse(fs.readFileSync(rmPath, 'utf8'));

  console.log('Translating 30-day roadmap...');

  const batch = [
    en.title,
    en.description
  ];

  const meta = [];
  for (const d of en.days) {
    const tIdx = batch.push(d.title) - 1;
    const gStart = batch.length;
    const gCount = (d.goals || []).length;
    (d.goals || []).forEach(g => batch.push(g));
    meta.push({ day: d.day, tIdx, gStart, gCount });
  }

  const translated = await translateBatch(batch);

  const bnRoadmap = {
    title: translated[0],
    description: translated[1],
    days: en.days.map((d, i) => {
      const m = meta[i];
      const title = translated[m.tIdx];
      const goals = translated.slice(m.gStart, m.gStart + m.gCount);
      return {
        ...d,
        title,
        goals
      };
    })
  };

  const outPath = path.join(DATA_DIR, 'roadmap-bn.json');
  fs.writeFileSync(outPath, JSON.stringify(bnRoadmap, null, 2), 'utf8');
  console.log(`✓ Saved ${outPath}`);
}

run().catch(console.error);

