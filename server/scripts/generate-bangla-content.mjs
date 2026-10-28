import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(SERVER_ROOT, 'src', 'data', 'content');
const CONTENT_BN_DIR = path.join(SERVER_ROOT, 'src', 'data', 'content-bn');

if (!fs.existsSync(CONTENT_BN_DIR)) {
  fs.mkdirSync(CONTENT_BN_DIR, { recursive: true });
}

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
  'SQL', 'DBMS', 'REST', 'HTTP', 'HTTPS', 'TCP', 'UDP', 'DNS', 'Git'
];

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function isBangla(str) {
  return typeof str === 'string' && /[\u0980-\u09FF]/.test(str);
}

function maskText(rawText) {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) return { text: rawText, tokens: [] };
  if (/^[\s0-9.,;:!?(){}\[\]<>_=+\-*/\\|^&~`'"]+$/.test(rawText)) return { text: rawText, tokens: [] };
  if (/^(true|false|null|undefined)$/i.test(rawText.trim())) return { text: rawText, tokens: [] };

  const tokens = [];
  let text = rawText;

  text = text.replace(/```[\s\S]*?```/g, (m) => {
    tokens.push(m);
    return ` __TK${tokens.length - 1}__ `;
  });

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
  if (!texts || texts.length === 0) return [];

  const maskedItems = texts.map(t => maskText(t));
  const indicesToTranslate = [];
  const toTranslateTexts = [];

  maskedItems.forEach((item, idx) => {
    if (typeof item.text === 'string' && item.text.trim() && !isBangla(item.text)) {
      indicesToTranslate.push(idx);
      toTranslateTexts.push(item.text);
    }
  });

  if (toTranslateTexts.length === 0) {
    return maskedItems.map(item => unmaskText(item.text, item.tokens));
  }

  // Chunk into batches of up to ~2500 chars
  const chunks = [];
  let currentChunk = [];
  let currentLen = 0;

  for (let i = 0; i < toTranslateTexts.length; i++) {
    const text = toTranslateTexts[i];
    if (currentLen + text.length > 2500 && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentLen = 0;
    }
    currentChunk.push({ originalIndex: indicesToTranslate[i], text });
    currentLen += text.length + 15;
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  const translatedMap = new Map();

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
          console.warn(`[HTTP 429] waiting ${attempt * 1200}ms...`);
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
        if (attempt === 6) {
          console.error(`[WARN] Batch translation failed: ${err.message}`);
        }
        await sleep(attempt * 800);
      }
    }

    if (resText) {
      const parts = resText.split(/__\s*DIV\s*__/i);
      chunk.forEach((c, idx) => {
        const part = parts[idx] ? parts[idx].trim() : c.text;
        translatedMap.set(c.originalIndex, part);
      });
    } else {
      chunk.forEach(c => {
        translatedMap.set(c.originalIndex, c.text);
      });
    }

    await sleep(200);
  }

  return maskedItems.map((item, idx) => {
    const trans = translatedMap.has(idx) ? translatedMap.get(idx) : item.text;
    return unmaskText(trans, item.tokens);
  });
}

async function translateTopicFile(slug) {
  const srcPath = path.join(CONTENT_DIR, `${slug}.json`);
  const destPath = path.join(CONTENT_BN_DIR, `${slug}.json`);

  if (!fs.existsSync(srcPath)) {
    console.error(`Source file not found: ${srcPath}`);
    return;
  }

  console.log(`\n========================================`);
  console.log(`Translating topic: ${slug}`);
  console.log(`========================================`);

  const raw = fs.readFileSync(srcPath, 'utf-8');
  const enData = JSON.parse(raw);

  let existingOverlay = {};
  if (fs.existsSync(destPath)) {
    try {
      existingOverlay = JSON.parse(fs.readFileSync(destPath, 'utf-8'));
    } catch {
      existingOverlay = {};
    }
  }

  const overlay = {
    topic: existingOverlay.topic || {},
    questions: existingOverlay.questions || {},
    quiz: existingOverlay.quiz || {},
  };

  // 1. Topic metadata
  if (!isBangla(overlay.topic.summary)) {
    console.log(`  -> Translating topic summary & overview...`);
    overlay.topic.title = enData.topic.title;
    const batch = [enData.topic.summary, enData.topic.overview];
    const [summary, overview] = await translateBatch(batch);
    overlay.topic.summary = summary;
    overlay.topic.overview = overview;

    if (Array.isArray(enData.topic.cheatsheet)) {
      const csTitles = enData.topic.cheatsheet.map(c => c.title);
      const csPoints = enData.topic.cheatsheet.flatMap(c => c.points || []);
      const [transTitles, transPoints] = await Promise.all([
        translateBatch(csTitles),
        translateBatch(csPoints)
      ]);
      let pointIdx = 0;
      overlay.topic.cheatsheet = enData.topic.cheatsheet.map((c, i) => {
        const count = (c.points || []).length;
        const pts = transPoints.slice(pointIdx, pointIdx + count);
        pointIdx += count;
        return { title: transTitles[i], points: pts };
      });
    }

    if (Array.isArray(enData.topic.patterns)) {
      const names = enData.topic.patterns.map(p => p.name);
      const whens = enData.topic.patterns.map(p => p.whenToUse);
      const [transNames, transWhens] = await Promise.all([
        translateBatch(names),
        translateBatch(whens)
      ]);
      overlay.topic.patterns = enData.topic.patterns.map((p, i) => ({
        name: transNames[i],
        whenToUse: transWhens[i]
      }));
    }
  }

  // 2. Questions
  console.log(`  -> Translating ${enData.questions.length} questions...`);
  for (let i = 0; i < enData.questions.length; i++) {
    const q = enData.questions[i];
    if (isBangla(overlay.questions[q.slug]?.prompt)) {
      continue;
    }

    process.stdout.write(`    [${i + 1}/${enData.questions.length}] ${q.slug}... `);

    // Flatten question fields into single batch
    const batch = [];
    const meta = {
      promptIdx: batch.push(q.prompt) - 1,
      hintsStart: batch.length,
      hintsCount: (q.hints || []).length,
    };
    (q.hints || []).forEach(h => batch.push(h));

    meta.summaryIdx = q.solution?.summary ? batch.push(q.solution.summary) - 1 : -1;
    meta.explanationIdx = q.solution?.explanation ? batch.push(q.solution.explanation) - 1 : -1;
    meta.keyPointsStart = batch.length;
    meta.keyPointsCount = (q.solution?.keyPoints || []).length;
    (q.solution?.keyPoints || []).forEach(kp => batch.push(kp));

    meta.pitfallsStart = batch.length;
    meta.pitfallsCount = (q.pitfalls || []).length;
    (q.pitfalls || []).forEach(pf => batch.push(pf));

    meta.approachesStart = batch.length;
    meta.approachesCount = (q.approaches || []).length;
    (q.approaches || []).forEach(app => batch.push(app.idea));

    meta.examplesStart = batch.length;
    meta.examplesCount = (q.examples || []).length;
    (q.examples || []).forEach(ex => batch.push(ex.explanation || ''));

    meta.followUpsStart = batch.length;
    meta.followUpsCount = (q.followUps || []).length;
    (q.followUps || []).forEach(fu => {
      batch.push(fu.question || '');
      batch.push(fu.answer || '');
    });

    // Visuals titles, captions, step notes, frame notes
    const visualRefs = [];
    if (Array.isArray(q.visuals)) {
      q.visuals.forEach((vis, vIdx) => {
        const vRef = { vIdx, titleIdx: -1, captionIdx: -1, steps: [], frames: [] };
        if (vis.title) vRef.titleIdx = batch.push(vis.title) - 1;
        if (vis.caption) vRef.captionIdx = batch.push(vis.caption) - 1;
        if (Array.isArray(vis.steps)) {
          vis.steps.forEach((st, sIdx) => {
            if (st.note) vRef.steps.push({ sIdx, noteIdx: batch.push(st.note) - 1 });
          });
        }
        if (Array.isArray(vis.frames)) {
          vis.frames.forEach((fr, fIdx) => {
            if (fr.note) vRef.frames.push({ fIdx, noteIdx: batch.push(fr.note) - 1 });
          });
        }
        visualRefs.push(vRef);
      });
    }

    // Single network call for the entire question!
    const translatedBatch = await translateBatch(batch);

    // Unpack
    const prompt = translatedBatch[meta.promptIdx];
    const hints = translatedBatch.slice(meta.hintsStart, meta.hintsStart + meta.hintsCount);
    const summary = meta.summaryIdx >= 0 ? translatedBatch[meta.summaryIdx] : undefined;
    const explanation = meta.explanationIdx >= 0 ? translatedBatch[meta.explanationIdx] : undefined;
    const keyPoints = translatedBatch.slice(meta.keyPointsStart, meta.keyPointsStart + meta.keyPointsCount);
    const pitfalls = translatedBatch.slice(meta.pitfallsStart, meta.pitfallsStart + meta.pitfallsCount);

    const approaches = (q.approaches || []).map((app, aIdx) => ({
      idea: translatedBatch[meta.approachesStart + aIdx] || app.idea,
    }));

    const examples = (q.examples || []).map((ex, eIdx) => ({
      explanation: translatedBatch[meta.examplesStart + eIdx] || ex.explanation,
    }));

    const followUps = [];
    for (let f = 0; f < meta.followUpsCount; f++) {
      const qText = translatedBatch[meta.followUpsStart + (f * 2)];
      const aText = translatedBatch[meta.followUpsStart + (f * 2) + 1];
      followUps.push({ question: qText, answer: aText });
    }

    const visuals = visualRefs.map((vRef) => {
      const vis = q.visuals[vRef.vIdx];
      const res = {};
      if (vRef.titleIdx >= 0) res.title = translatedBatch[vRef.titleIdx];
      if (vRef.captionIdx >= 0) res.caption = translatedBatch[vRef.captionIdx];
      if (vRef.steps.length > 0) {
        res.steps = (vis.steps || []).map((st, sIdx) => {
          const match = vRef.steps.find(s => s.sIdx === sIdx);
          return match ? { note: translatedBatch[match.noteIdx] } : { note: st.note };
        });
      }
      if (vRef.frames.length > 0) {
        res.frames = (vis.frames || []).map((fr, fIdx) => {
          const match = vRef.frames.find(f => f.fIdx === fIdx);
          return match ? { note: translatedBatch[match.noteIdx] } : { note: fr.note };
        });
      }
      return res;
    });

    overlay.questions[q.slug] = {
      title: q.title,
      prompt,
      hints,
      examples,
      approaches,
      solution: { summary, explanation, keyPoints },
      visuals,
      pitfalls,
      followUps,
    };

    process.stdout.write(`done\n`);
  }

  // 3. Quiz
  const quizItemsToTranslate = enData.quiz.filter(item => !isBangla(overlay.quiz[item.id]?.question));
  if (quizItemsToTranslate.length > 0) {
    console.log(`  -> Translating ${quizItemsToTranslate.length} quiz items in batch...`);
    const quizBatch = [];
    const quizMeta = quizItemsToTranslate.map(item => {
      const qIdx = quizBatch.push(item.question) - 1;
      const optStart = quizBatch.length;
      const optCount = (item.options || []).length;
      (item.options || []).forEach(opt => quizBatch.push(opt));
      const expIdx = item.explanation ? quizBatch.push(item.explanation) - 1 : -1;
      return { id: item.id, qIdx, optStart, optCount, expIdx };
    });

    const translatedQuiz = await translateBatch(quizBatch);
    quizMeta.forEach(m => {
      overlay.quiz[m.id] = {
        question: translatedQuiz[m.qIdx],
        options: translatedQuiz.slice(m.optStart, m.optStart + m.optCount),
        explanation: m.expIdx >= 0 ? translatedQuiz[m.expIdx] : '',
      };
    });
  }

  fs.writeFileSync(destPath, JSON.stringify(overlay, null, 2), 'utf-8');
  console.log(`  ✓ Saved ${destPath}`);
}

async function main() {
  const targetSlug = process.argv[2];
  const allFiles = fs.readdirSync(CONTENT_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => path.basename(f, '.json'));

  const slugsToProcess = targetSlug ? [targetSlug] : allFiles;
  console.log(`Starting translation for ${slugsToProcess.length} topic(s)...`);

  for (const slug of slugsToProcess) {
    await translateTopicFile(slug);
  }

  console.log('\nAll topics translation completed successfully!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
