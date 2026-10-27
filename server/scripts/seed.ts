/**
 * Validates all content, then syncs it into MongoDB (topics, questions, quiz questions, roadmap).
 * Content documents whose slug/id no longer exists are deleted. User collections are never touched.
 *
 * Usage:
 *   npm run seed                                            # src/data/content/*.json + src/data/roadmap.json
 *   npx tsx scripts/seed.ts --dir ../docs/examples          # another content dir (roadmap skipped)
 *   npx tsx scripts/seed.ts --dir <dir> --roadmap <file>    # another content dir + a roadmap file
 *
 * Reads MONGODB_URI from the environment (server/.env is loaded; shell variables win).
 */
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { loadDotenv } from '../src/config/dotenv';
import { CONTENT_DIR, ROADMAP_FILE, listContentFiles, validateContent, type Issue } from '../src/content/validate';
import { connectDb, disconnectDb, redactUri } from '../src/db/connect';
import { QuestionModel, QuizQuestionModel, ROADMAP_KEY, RoadmapModel, TopicModel, ensureIndexes } from '../src/models';

interface Args {
  dir: string;
  roadmap: string | null;
}

function usage(exitCode: number): never {
  console.log('Usage: tsx scripts/seed.ts [--dir <content-dir>] [--roadmap <roadmap.json>]');
  process.exit(exitCode);
}

function parseArgs(argv: string[]): Args {
  let dir: string | undefined;
  let roadmap: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => {
      const v = argv[++i];
      if (!v || v.startsWith('--')) {
        console.error(`Missing value for ${arg}`);
        usage(1);
      }
      return v;
    };
    if (arg === '--dir') dir = path.resolve(value());
    else if (arg === '--roadmap') roadmap = path.resolve(value());
    else if (arg === '--help' || arg === '-h') usage(0);
    else {
      console.error(`Unknown argument: ${arg}`);
      usage(1);
    }
  }
  // a custom --dir skips the default roadmap (its questions would not exist) unless --roadmap is given
  return { dir: dir ?? CONTENT_DIR, roadmap: roadmap ?? (dir ? null : ROADMAP_FILE) };
}

function printIssues(label: string, issues: Issue[], log: (line: string) => void) {
  for (const i of issues) log(`${label} ${i.file} :: ${i.where} :: ${i.message}`);
}

// (MongoDB reports every replaceOne as "modified", even when identical, so only new vs existing is meaningful)
type BulkResult = { upsertedCount: number; matchedCount: number };
const describe = (r: BulkResult, total: number, removed: number) =>
  `${total} upserted (${r.upsertedCount} new, ${r.matchedCount} existing), ${removed} removed`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadDotenv();
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    console.error('MONGODB_URI is not set (server/.env or shell).');
    process.exit(1);
  }

  // ---- 1. validate everything before touching the database
  if (!fs.existsSync(args.dir)) {
    console.error(`Content directory not found: ${args.dir}`);
    process.exit(1);
  }
  if (args.roadmap && args.roadmap !== ROADMAP_FILE && !fs.existsSync(args.roadmap)) {
    console.error(`Roadmap file not found: ${args.roadmap}`);
    process.exit(1);
  }
  const files = listContentFiles(args.dir);
  if (!files.length) {
    console.error(`No content files (*.json) in ${args.dir} — refusing to seed (it would delete all content).`);
    process.exit(1);
  }

  console.log(`Validating ${files.length} content file(s) in ${args.dir}${args.roadmap && fs.existsSync(args.roadmap) ? ` + ${path.basename(args.roadmap)}` : ''}...`);
  const result = validateContent(files, args.roadmap);
  if (result.warnings.length) {
    printIssues('WARN ', result.warnings.slice(0, 30), console.warn);
    if (result.warnings.length > 30) console.warn(`WARN  ...and ${result.warnings.length - 30} more warning(s)`);
  }
  if (result.errors.length) {
    printIssues('ERROR', result.errors, console.error);
    console.error(`\nSeed aborted: ${result.errors.length} content error(s). Fix them (npm run validate:content) and re-run.`);
    process.exit(1);
  }

  // ---- 2. sync into MongoDB
  await connectDb(uri, { quiet: true });
  console.log(`Connected to ${redactUri(uri)}`);
  try {
    await ensureIndexes();

    const topics = result.files.map((f) => f.content.topic);
    const questions = result.files.flatMap((f) =>
      f.content.questions.map((q, order) => ({ ...q, order, topicOrder: f.content.topic.order })),
    );
    const quiz = result.files.flatMap((f) => f.content.quiz.map((q, order) => ({ ...q, topic: f.content.topic.slug, order })));

    const topicRes = await TopicModel.bulkWrite(
      topics.map((t) => ({ replaceOne: { filter: { slug: t.slug }, replacement: t, upsert: true } })),
      { ordered: false },
    );
    const topicDel = await TopicModel.deleteMany({ slug: mongoose.trusted({ $nin: topics.map((t) => t.slug) }) });

    const questionRes = await QuestionModel.bulkWrite(
      questions.map((q) => ({ replaceOne: { filter: { slug: q.slug }, replacement: q, upsert: true } })),
      { ordered: false },
    );
    const questionDel = await QuestionModel.deleteMany({ slug: mongoose.trusted({ $nin: questions.map((q) => q.slug) }) });

    const quizRes = await QuizQuestionModel.bulkWrite(
      quiz.map((q) => ({ replaceOne: { filter: { id: q.id }, replacement: q, upsert: true } })),
      { ordered: false },
    );
    const quizDel = await QuizQuestionModel.deleteMany({ id: mongoose.trusted({ $nin: quiz.map((q) => q.id) }) });

    let roadmapLine = 'skipped (no roadmap file)';
    if (result.roadmap) {
      await RoadmapModel.replaceOne({ key: ROADMAP_KEY }, { key: ROADMAP_KEY, ...result.roadmap }, { upsert: true });
      roadmapLine = `${result.roadmap.days.length} days ("${result.roadmap.title}")`;
    }

    const visuals = questions.reduce((n, q) => n + q.visuals.length, 0);
    console.log('\nSeed complete');
    console.log(`  topics:         ${describe(topicRes, topics.length, topicDel.deletedCount)}`);
    console.log(`  questions:      ${describe(questionRes, questions.length, questionDel.deletedCount)} — ${visuals} visuals`);
    console.log(`  quiz questions: ${describe(quizRes, quiz.length, quizDel.deletedCount)}`);
    console.log(`  roadmap:        ${roadmapLine}`);
    if (result.warnings.length) console.log(`  warnings:       ${result.warnings.length}`);
  } finally {
    await disconnectDb();
  }
}

main().catch(async (err) => {
  console.error('\nSeed failed:', err instanceof Error ? err.message : err);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
