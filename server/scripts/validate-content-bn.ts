/**
 * Content Validation Suite for Bengali Content Overlay (src/data/content-bn)
 * Usage:
 *   npm run validate:content-bn
 */
import fs from 'node:fs';
import path from 'node:path';
import { listContentFiles } from '../src/content/validate';
import {
  applyQuestionOverlay,
  applyQuizOverlay,
  applyTopicDetailOverlay,
  getBanglaOverlay,
  clearOverlayCache,
  CONTENT_BN_DIR
} from '../src/content/overlay';

const BN_REGEX = /[\u0980-\u09FF]/;
const TOKEN_PATTERN = /__(?:TK|DIV|T|VAR|PH|CODE|REF)[a-zA-Z0-9_]*|__টাকা[a-zA-Z0-9_]*|__[0-9]+__|\b__TK\d+|\bTK\d+|__DIV\d+/g;
const ALLOWED_DOUBLE_UNDERSCORES = new Set(['__proto__', '__init__', '__new__']);

const enFiles = listContentFiles();
const bnFiles = fs.readdirSync(CONTENT_BN_DIR).filter(f => f.endsWith('.json')).sort();

console.log(`\nValidating Bengali Content (${bnFiles.length} files in src/data/content-bn/)...`);

const errors: string[] = [];
const warnings: string[] = [];

if (bnFiles.length !== 29) {
  errors.push(`Expected 29 JSON files in content-bn, found ${bnFiles.length}`);
}

// 1. Validate raw JSON syntax & tokens
for (const file of bnFiles) {
  const filePath = path.join(CONTENT_BN_DIR, file);
  let rawText = '';
  try {
    rawText = fs.readFileSync(filePath, 'utf8');
  } catch (err: any) {
    errors.push(`${file}: Cannot read file: ${err.message}`);
    continue;
  }

  try {
    JSON.parse(rawText);
  } catch (err: any) {
    errors.push(`${file}: Invalid JSON syntax: ${err.message}`);
    continue;
  }

  // Token check
  const tokenMatches = rawText.match(TOKEN_PATTERN);
  if (tokenMatches) {
    errors.push(`${file}: Contains unexpanded token(s): ${Array.from(new Set(tokenMatches)).join(', ')}`);
  }

  // Unexpected double underscore check
  const duMatches = rawText.match(/__[a-zA-Z0-9_]+__/g) || [];
  for (const m of duMatches) {
    if (!ALLOWED_DOUBLE_UNDERSCORES.has(m)) {
      errors.push(`${file}: Contains unexpected double underscore token: "${m}"`);
    }
  }
}

// 2. Validate overlay integration & authentic Bengali text
clearOverlayCache();

let totalQuestions = 0;
let totalQuizzes = 0;
let totalVisuals = 0;

for (const enPath of enFiles) {
  const file = path.basename(enPath);
  const slug = file.replace('.json', '');
  const enContent = JSON.parse(fs.readFileSync(enPath, 'utf8'));

  const bnOverlay = getBanglaOverlay(slug);
  if (!bnOverlay) {
    errors.push(`${file}: Missing corresponding Bengali overlay in content-bn`);
    continue;
  }

  // Verify top-level structure
  if (!bnOverlay.topic || typeof bnOverlay.topic !== 'object') {
    errors.push(`${file}: Missing or invalid "topic" object`);
  }
  if (!bnOverlay.questions || typeof bnOverlay.questions !== 'object') {
    errors.push(`${file}: Missing or invalid "questions" object`);
  }
  if (!bnOverlay.quiz || typeof bnOverlay.quiz !== 'object') {
    errors.push(`${file}: Missing or invalid "quiz" object`);
  }

  // Check topic overlay
  const topicDetail: any = {
    topic: enContent.topic,
    questions: enContent.questions.map((q: any) => ({
      slug: q.slug,
      title: q.title,
      summary: q.solution?.summary || '',
      topic: q.topic,
      topicTitle: enContent.topic.title,
      difficulty: q.difficulty,
      kind: q.kind,
      order: q.order
    }))
  };
  const overlaidTopic = applyTopicDetailOverlay(topicDetail, 'bn');
  if (!BN_REGEX.test(overlaidTopic.topic.summary || '')) {
    errors.push(`${file}: Topic summary contains no authentic Bengali text`);
  }

  // Check questions
  for (const eq of enContent.questions) {
    totalQuestions++;
    const bq = bnOverlay.questions?.[eq.slug];
    if (!bq) {
      errors.push(`${file} -> question "${eq.slug}": Missing in Bengali overlay`);
      continue;
    }

    const overlaidQ = applyQuestionOverlay(eq, 'bn');
    if (overlaidQ.visuals && Array.isArray(overlaidQ.visuals)) {
      totalVisuals += overlaidQ.visuals.length;
    }

    const qText = [
      overlaidQ.title,
      overlaidQ.prompt,
      overlaidQ.solution?.summary,
      overlaidQ.solution?.explanation
    ].join(' ');

    if (!BN_REGEX.test(qText)) {
      errors.push(`${file} -> question "${eq.slug}": Lacks authentic Bengali text`);
    }

    // Check visuals step count matches
    if (bq.visuals && eq.visuals) {
      if (bq.visuals.length !== eq.visuals.length) {
        errors.push(`${file} -> question "${eq.slug}": Visual count mismatch (EN=${eq.visuals.length}, BN=${bq.visuals.length})`);
      } else {
        eq.visuals.forEach((ev: any, vi: number) => {
          const bv = bq.visuals![vi];
          if (ev.type === 'diagram') {
            const ef = ev.frames?.length || 0;
            const bf = bv.frames?.length || bv.steps?.length || 0;
            if (ef !== bf) {
              errors.push(`${file} -> question "${eq.slug}": Vis #${vi} frames count mismatch (EN=${ef}, BN=${bf})`);
            }
          } else if ('steps' in ev) {
            const es = ev.steps?.length || 0;
            const bs = bv.steps?.length || 0;
            if (es !== bs) {
              errors.push(`${file} -> question "${eq.slug}": Vis #${vi} steps count mismatch (EN=${es}, BN=${bs})`);
            }
          }
        });
      }
    }
  }

  // Check quiz items
  const quizResponse: any = {
    topic: { slug, title: enContent.topic.title },
    items: enContent.quiz
  };
  const overlaidQuiz = applyQuizOverlay(quizResponse, 'bn');
  for (const item of overlaidQuiz.items) {
    totalQuizzes++;
    const bQuiz = bnOverlay.quiz?.[item.id];
    if (!bQuiz) {
      errors.push(`${file} -> quiz "${item.id}": Missing in Bengali overlay`);
      continue;
    }

    const quizText = [
      item.question,
      ...(item.options || []),
      item.explanation
    ].join(' ');

    if (!BN_REGEX.test(quizText)) {
      errors.push(`${file} -> quiz "${item.id}": Lacks authentic Bengali text`);
    }
  }
}

for (const w of warnings) console.warn(`WARN  ${w}`);
for (const e of errors) console.error(`ERROR ${e}`);

console.log(
  `\n29 Bengali topic file(s), ${totalQuestions} questions, ${totalQuizzes} quiz items, ${totalVisuals} visuals` +
  ` — ${errors.length} error(s), ${warnings.length} warning(s)`
);

process.exit(errors.length ? 1 : 0);
