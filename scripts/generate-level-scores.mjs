/**
 * Emits the base XP of every case as plain JSON, so the score server can price a
 * solve without importing the game's TypeScript module graph. A test asserts the
 * file matches the real catalogue, so the two cannot drift apart unnoticed.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const levelsDir = join(root, 'src', 'data', 'levels');

const scores = {};
for (const file of readdirSync(levelsDir).filter((name) => /^act\d+\.ts$/.test(name))) {
  const source = readFileSync(join(levelsDir, file), 'utf8');
  const ids = [...source.matchAll(/^\s*id: (\d+),/gm)].map((m) => Number(m[1]));
  const xps = [...source.matchAll(/^\s*xp: (\d+),/gm)].map((m) => Number(m[1]));
  if (ids.length !== xps.length) {
    throw new Error(`${file}: found ${ids.length} ids but ${xps.length} xp values`);
  }
  ids.forEach((id, index) => {
    scores[id] = xps[index];
  });
}

const count = Object.keys(scores).length;
if (count < 99) throw new Error(`Only found ${count} cases; refusing to write a truncated manifest.`);

writeFileSync(
  join(root, 'server', 'level-scores.json'),
  `${JSON.stringify({ generated: 'scripts/generate-level-scores.mjs', scores }, null, 2)}\n`,
  'utf8',
);
console.log(`[level-scores] wrote ${count} cases to server/level-scores.json`);
