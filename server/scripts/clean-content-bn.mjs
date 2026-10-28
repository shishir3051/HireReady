import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../src/data/content-bn');

function sanitizeText(raw) {
  if (!raw || typeof raw !== 'string') return raw;

  let text = raw;

  // 1. Pair-based bold fixing:
  text = text.replace(
    /(^|[^\s*([{<`"']?)(\*\*)\s*([^*\n]+?)\s*(\*\*)([^\s*.,;:!?")\]}>`"']?|$)/g,
    (match, before, _open, inner, _close, after) => {
      const trimmed = inner.trim();
      if (!trimmed) return match;
      const prefix = before ? `${before} ` : '';
      const suffix = after ? ` ${after}` : '';
      return `${prefix}**${trimmed}**${suffix}`;
    }
  );

  // 2. Ensure headings have newlines before them if collapsed:
  text = text.replace(/([^\n])\s*(#{1,6}\s+)/g, '$1\n\n$2');

  // Fix lonely '#' lines:
  text = text.replace(/^#\s*\n+/gm, '');

  // 3. Ensure bullet items are on their own lines:
  text = text.replace(/([^\n])\s+-\s+/g, '$1\n- ');

  // 4. Ensure numbered lists are on their own lines:
  text = text.replace(/([^\n])\s+(\d+\.\s+)/g, '$1\n\n$2');

  // 5. Clean up table rows collapsed into one line:
  text = text.replace(/\|\s*\|\s*([-:]{2,})/g, '|\n| $1');
  text = text.replace(/\|\s*\|\s*([A-Za-z0-9\u0980-\u09FF`])/g, '|\n| $1');

  // Clean up excessive newlines
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

function cleanString(str) {
  if (typeof str !== 'string') return str;
  // If it contains markdown headings or lists or tables, sanitize it fully
  if (str.includes('#') || str.includes(' - ') || str.includes('|')) {
    return sanitizeText(str);
  }
  // Otherwise just clean bold tokens
  return str.replace(
    /(^|[^\s*([{<`"']?)(\*\*)\s*([^*\n]+?)\s*(\*\*)([^\s*.,;:!?")\]}>`"']?|$)/g,
    (match, before, _open, inner, _close, after) => {
      const trimmed = inner.trim();
      if (!trimmed) return match;
      const prefix = before ? `${before} ` : '';
      const suffix = after ? ` ${after}` : '';
      return `${prefix}**${trimmed}**${suffix}`;
    }
  );
}

function cleanObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanObject);
  }
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      result[k] = cleanString(v);
    } else if (typeof v === 'object') {
      result[k] = cleanObject(v);
    } else {
      result[k] = v;
    }
  }
  return result;
}

const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
console.log(`Processing ${files.length} Bangla content files...`);

let updatedCount = 0;
for (const file of files) {
  const filePath = path.join(DATA_DIR, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const cleaned = cleanObject(data);
  const origJson = JSON.stringify(data);
  const cleanJson = JSON.stringify(cleaned, null, 2);
  if (origJson !== JSON.stringify(cleaned)) {
    fs.writeFileSync(filePath, cleanJson, 'utf8');
    updatedCount++;
    console.log(`✓ Cleaned ${file}`);
  }
}

console.log(`Done! Updated ${updatedCount} files.`);

