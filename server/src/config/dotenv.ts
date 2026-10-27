import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

/** Server package root (folder with package.json); works from src/ (tsx) and dist/src/ (tsc). */
export function serverRoot(): string {
  let dir = __dirname;
  while (!fs.existsSync(path.join(dir, 'package.json'))) {
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('server package.json not found');
    dir = parent;
  }
  return dir;
}

let loaded = false;

/**
 * Loads `server/.env` into process.env once. Variables already set in the shell win,
 * so `PORT=4100 MONGODB_URI=... npm run dev` overrides the file.
 */
export function loadDotenv(): void {
  if (loaded) return;
  loaded = true;
  const file = path.join(serverRoot(), '.env');
  if (fs.existsSync(file)) dotenv.config({ path: file, quiet: true });
}
