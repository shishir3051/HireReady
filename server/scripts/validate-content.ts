/**
 * Usage:
 *   npm run validate:content                 # every file in src/data/content + roadmap
 *   npm run validate:content -- arrays-hashing two-pointers   # only these topic files (no roadmap)
 */
import path from 'node:path';
import { CONTENT_DIR, listContentFiles, validateContent } from '../src/content/validate';

const only = process.argv.slice(2);
const files = only.length
  ? only.map((name) => path.join(CONTENT_DIR, name.endsWith('.json') ? name : `${name}.json`))
  : listContentFiles();

const result = validateContent(files, only.length ? null : undefined);

for (const w of result.warnings) console.warn(`WARN  ${w.file} :: ${w.where} :: ${w.message}`);
for (const e of result.errors) console.error(`ERROR ${e.file} :: ${e.where} :: ${e.message}`);

const questions = result.files.reduce((n, f) => n + f.content.questions.length, 0);
const quiz = result.files.reduce((n, f) => n + f.content.quiz.length, 0);
console.log(
  `\n${result.files.length} topic file(s), ${questions} questions, ${quiz} quiz items` +
    `${result.roadmap ? `, roadmap ${result.roadmap.days.length} days` : ''}` +
    ` — ${result.errors.length} error(s), ${result.warnings.length} warning(s)`,
);
process.exit(result.errors.length ? 1 : 0);
