/**
 * Loads and validates content JSON: schema (zod) + semantic checks the schema can't express
 * (cross-file slug uniqueness, visual indices in bounds, node references, code-line ranges).
 * Used by `npm run validate:content` and by the seed script.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ContentFile, Roadmap, type ContentFileT, type PanelT, type QuestionT, type RoadmapT, type VisualT } from './schema';

/** Server package root, found by walking up so this works from both src/ (tsx) and dist/ (tsc). */
function findServerRoot(): string {
  let dir = __dirname;
  while (!fs.existsSync(path.join(dir, 'package.json'))) {
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('server package.json not found');
    dir = parent;
  }
  return dir;
}

export const DATA_DIR = path.join(findServerRoot(), 'src', 'data');
export const CONTENT_DIR = path.join(DATA_DIR, 'content');
export const ROADMAP_FILE = path.join(DATA_DIR, 'roadmap.json');

export interface Issue {
  file: string;
  where: string;
  message: string;
}

export interface ValidationResult {
  files: { file: string; content: ContentFileT }[];
  roadmap: RoadmapT | null;
  errors: Issue[];
  warnings: Issue[];
}

const REQUIRED_CODING_LANGUAGES = ['javascript', 'python', 'java'] as const;

export function listContentFiles(dir = CONTENT_DIR): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => path.join(dir, f));
}

export function validateContent(filePaths = listContentFiles(), roadmapPath: string | null = ROADMAP_FILE): ValidationResult {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const files: ValidationResult['files'] = [];

  for (const filePath of filePaths) {
    const file = path.basename(filePath);
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      errors.push({ file, where: '(file)', message: `invalid JSON: ${(e as Error).message}` });
      continue;
    }
    const parsed = ContentFile.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues.slice(0, 40)) {
        errors.push({ file, where: issue.path.join('.'), message: issue.message });
      }
      if (parsed.error.issues.length > 40) {
        errors.push({ file, where: '(file)', message: `...and ${parsed.error.issues.length - 40} more schema issues` });
      }
      continue;
    }
    const content = parsed.data;
    if (file !== `${content.topic.slug}.json`) {
      errors.push({ file, where: 'topic.slug', message: `file must be named ${content.topic.slug}.json` });
    }
    checkFile(file, content, errors, warnings);
    files.push({ file, content });
  }

  // cross-file checks
  const topicSlugs = new Map<string, string>();
  const questionSlugs = new Map<string, string>();
  const quizIds = new Map<string, string>();
  for (const { file, content } of files) {
    dupCheck(topicSlugs, content.topic.slug, file, 'topic.slug', errors);
    content.questions.forEach((q, i) => dupCheck(questionSlugs, q.slug, file, `questions[${i}].slug`, errors));
    content.quiz.forEach((q, i) => dupCheck(quizIds, q.id, file, `quiz[${i}].id`, errors));
  }
  // `related` may point at topics not authored yet when validating a single file, so warn only
  for (const { file, content } of files) {
    content.questions.forEach((q, i) =>
      q.related?.forEach((r) => {
        if (!questionSlugs.has(r)) warnings.push({ file, where: `questions[${i}].related`, message: `unknown question slug "${r}"` });
      }),
    );
  }

  let roadmap: RoadmapT | null = null;
  if (roadmapPath && fs.existsSync(roadmapPath)) {
    const file = path.basename(roadmapPath);
    try {
      const parsed = Roadmap.safeParse(JSON.parse(fs.readFileSync(roadmapPath, 'utf8')));
      if (!parsed.success) {
        parsed.error.issues.slice(0, 20).forEach((issue) => errors.push({ file, where: issue.path.join('.'), message: issue.message }));
      } else {
        roadmap = parsed.data;
        roadmap.days.forEach((d, i) => {
          if (d.day !== i + 1) errors.push({ file, where: `days[${i}].day`, message: `expected day ${i + 1}` });
          d.topics.forEach((t) => {
            if (!topicSlugs.has(t)) errors.push({ file, where: `days[${i}].topics`, message: `unknown topic "${t}"` });
          });
          d.questionSlugs.forEach((s) => {
            if (!questionSlugs.has(s)) errors.push({ file, where: `days[${i}].questionSlugs`, message: `unknown question "${s}"` });
          });
        });
      }
    } catch (e) {
      errors.push({ file, where: '(file)', message: `invalid JSON: ${(e as Error).message}` });
    }
  }

  return { files, roadmap, errors, warnings };
}

function dupCheck(seen: Map<string, string>, key: string, file: string, where: string, errors: Issue[]) {
  const prev = seen.get(key);
  if (prev) errors.push({ file, where, message: `duplicate "${key}" (also in ${prev})` });
  else seen.set(key, file);
}

function checkFile(file: string, content: ContentFileT, errors: Issue[], warnings: Issue[]) {
  const err = (where: string, message: string) => errors.push({ file, where, message });
  const warn = (where: string, message: string) => warnings.push({ file, where, message });

  const localSlugs = new Set<string>();
  content.questions.forEach((q, qi) => {
    const at = `questions[${qi}](${q.slug})`;
    if (localSlugs.has(q.slug)) err(at, 'duplicate slug in file');
    localSlugs.add(q.slug);
    if (q.topic !== content.topic.slug) err(`${at}.topic`, `must be "${content.topic.slug}"`);

    if (q.kind === 'coding') {
      const langs = new Set((q.solution.code ?? []).map((c) => c.language));
      for (const l of REQUIRED_CODING_LANGUAGES) if (!langs.has(l)) err(`${at}.solution.code`, `coding questions need a ${l} solution`);
      if (!q.solution.complexity) err(`${at}.solution.complexity`, 'coding questions need complexity');
      if (!q.examples?.length) err(`${at}.examples`, 'coding questions need at least one example');
    }
    if (q.kind === 'sql' && !(q.solution.code ?? []).some((c) => c.language === 'sql')) {
      err(`${at}.solution.code`, 'sql questions need a sql solution');
    }
    const langCounts = new Map<string, number>();
    (q.solution.code ?? []).forEach((c) => langCounts.set(c.language, (langCounts.get(c.language) ?? 0) + 1));
    langCounts.forEach((n, l) => n > 1 && err(`${at}.solution.code`, `duplicate ${l} snippet`));

    const jsCode = q.solution.code?.find((c) => c.language === 'javascript')?.code;
    const jsLines = jsCode ? jsCode.split('\n').length : 0;
    q.visuals.forEach((v, vi) => checkVisual(v, `${at}.visuals[${vi}]`, jsLines, err, warn));
  });

  content.quiz.forEach((qq, i) => {
    if (qq.answer >= qq.options.length) err(`quiz[${i}].answer`, `index ${qq.answer} out of range`);
    if (!qq.id.startsWith(`${content.topic.slug}-q`)) err(`quiz[${i}].id`, `must start with "${content.topic.slug}-q"`);
    if (new Set(qq.options).size !== qq.options.length) err(`quiz[${i}].options`, 'duplicate options');
  });
}

type Report = (where: string, message: string) => void;

function checkVisual(v: VisualT, at: string, jsLines: number, err: Report, warn: Report) {
  const steps: { codeLine?: number; panels?: PanelT[] }[] = 'steps' in v ? v.steps : [];
  steps.forEach((s, si) => {
    if (s.codeLine !== undefined) {
      if (jsLines === 0) err(`${at}.steps[${si}].codeLine`, 'codeLine set but question has no javascript solution');
      else if (s.codeLine > jsLines) err(`${at}.steps[${si}].codeLine`, `line ${s.codeLine} > ${jsLines} lines of javascript`);
    }
    s.panels?.forEach((p, pi) => {
      if (p.kind === 'map') {
        const keys = new Set(p.entries.map((e) => e.key));
        p.highlight?.forEach((k) => !keys.has(k) && err(`${at}.steps[${si}].panels[${pi}]`, `highlight key "${k}" not in entries`));
      } else {
        p.highlight?.forEach((h) => (h < 0 || h >= p.items.length) && err(`${at}.steps[${si}].panels[${pi}]`, `highlight ${h} out of range`));
      }
    });
  });

  switch (v.type) {
    case 'array':
      v.steps.forEach((s, si) =>
        s.arrays.forEach((row, ri) => {
          const w = `${at}.steps[${si}].arrays[${ri}]`;
          const n = row.values.length;
          row.pointers?.forEach((p) => (p.index < -1 || p.index > n) && err(w, `pointer ${p.name}=${p.index} outside [-1, ${n}]`));
          row.highlights?.forEach((h) => h.indices.forEach((i) => (i < 0 || i >= n) && err(w, `highlight index ${i} out of range (len ${n})`)));
          row.ranges?.forEach((r) => {
            if (r.start > r.end) err(w, `range start ${r.start} > end ${r.end}`);
            if (r.start < 0 || r.end >= n) err(w, `range [${r.start}, ${r.end}] out of bounds (len ${n})`);
          });
        }),
      );
      break;
    case 'grid':
      v.steps.forEach((s, si) => {
        const w = `${at}.steps[${si}]`;
        const cols = s.grid[0].length;
        if (s.grid.some((r) => r.length !== cols)) err(w, 'grid rows have different lengths');
        if (v.rowLabels && v.rowLabels.length !== s.grid.length) err(w, `rowLabels length ${v.rowLabels.length} != rows ${s.grid.length}`);
        if (v.colLabels && v.colLabels.length !== cols) err(w, `colLabels length ${v.colLabels.length} != cols ${cols}`);
        s.highlights?.forEach((h) =>
          h.cells.forEach(([r, c]) => (r < 0 || r >= s.grid.length || c < 0 || c >= cols) && err(w, `cell [${r},${c}] out of bounds`)),
        );
      });
      break;
    case 'linked-list':
      v.steps.forEach((s, si) => {
        const w = `${at}.steps[${si}]`;
        const ids = new Set(s.nodes.map((n) => n.id));
        if (ids.size !== s.nodes.length) err(w, 'duplicate node ids');
        s.nodes.forEach((n) => n.next !== null && !ids.has(n.next) && err(w, `node ${n.id}.next -> unknown "${n.next}"`));
        if (s.head && !ids.has(s.head)) err(w, `head "${s.head}" not a node`);
        s.pointers?.forEach((p) => p.nodeId !== null && !ids.has(p.nodeId) && err(w, `pointer ${p.name} -> unknown "${p.nodeId}"`));
        s.highlights?.forEach((h) => h.ids.forEach((id) => !ids.has(id) && err(w, `highlight unknown node "${id}"`)));
      });
      break;
    case 'tree':
      v.steps.forEach((s, si) => {
        const w = `${at}.steps[${si}]`;
        const ids = new Set(s.nodes.map((n) => n.id));
        if (ids.size !== s.nodes.length) err(w, 'duplicate node ids');
        if (s.root !== null && !ids.has(s.root)) err(w, `root "${s.root}" not a node`);
        s.nodes.forEach((n) => {
          [n.left, n.right, ...(n.children ?? [])].forEach((c) => c && !ids.has(c) && err(w, `node ${n.id} child -> unknown "${c}"`));
          if (n.children && (n.left || n.right)) err(w, `node ${n.id} mixes children with left/right`);
        });
        s.pointers?.forEach((p) => p.nodeId !== null && !ids.has(p.nodeId) && err(w, `pointer ${p.name} -> unknown "${p.nodeId}"`));
        s.highlights?.forEach((h) => h.ids.forEach((id) => !ids.has(id) && err(w, `highlight unknown node "${id}"`)));
      });
      break;
    case 'graph': {
      const ids = new Set(v.nodes.map((n) => n.id));
      if (ids.size !== v.nodes.length) err(at, 'duplicate node ids');
      const edgeKeys = new Set<string>();
      v.edges.forEach((e) => {
        if (!ids.has(e.from) || !ids.has(e.to)) err(`${at}.edges`, `edge ${e.from}->${e.to} references unknown node`);
        edgeKeys.add(`${e.from}|${e.to}`);
        if (!v.directed) edgeKeys.add(`${e.to}|${e.from}`);
      });
      v.steps.forEach((s, si) => {
        const w = `${at}.steps[${si}]`;
        s.nodeHighlights?.forEach((h) => h.ids.forEach((id) => !ids.has(id) && err(w, `highlight unknown node "${id}"`)));
        s.edgeHighlights?.forEach((h) => h.edges.forEach(([a, b]) => !edgeKeys.has(`${a}|${b}`) && err(w, `highlight unknown edge ${a}->${b}`)));
        Object.keys(s.nodeBadges ?? {}).forEach((id) => !ids.has(id) && err(w, `badge for unknown node "${id}"`));
      });
      break;
    }
    case 'table':
      v.steps.forEach((s, si) =>
        s.tables.forEach((t, ti) => {
          const w = `${at}.steps[${si}].tables[${ti}](${t.name})`;
          t.rows.forEach((r, ri) => r.length !== t.columns.length && err(w, `row ${ri} has ${r.length} cells, expected ${t.columns.length}`));
          t.highlightRows?.forEach((h) => h.rows.forEach((r) => (r < 0 || r >= t.rows.length) && err(w, `highlight row ${r} out of range`)));
        }),
      );
      break;
    case 'timeline':
      v.steps.forEach((s, si) => s.segments.forEach((g) => g.end <= g.start && err(`${at}.steps[${si}]`, `segment "${g.label}" end <= start`)));
      break;
    case 'diagram':
      v.frames.forEach((f, fi) => {
        const first = f.mermaid.trim().split('\n')[0].trim();
        if (!/^(flowchart|graph|sequenceDiagram|classDiagram|erDiagram|stateDiagram-v2|gitGraph|mindmap)\b/.test(first)) {
          err(`${at}.frames[${fi}]`, `unsupported mermaid diagram header "${first}"`);
        }
      });
      break;
    case 'comparison':
      v.rows.forEach((r, ri) => r.length !== v.columns.length && err(`${at}.rows[${ri}]`, `has ${r.length} cells, expected ${v.columns.length}`));
      break;
    case 'state':
      break;
  }
  if ('steps' in v && v.steps.length === 1 && v.type !== 'table' && v.type !== 'state') {
    warn(at, 'single-step visual: consider showing the algorithm progressing step by step');
  }
}
