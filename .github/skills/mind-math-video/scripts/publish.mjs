// Writes out/<date>/<slug>/publish.txt (title options, description, tags, pinned comment) from the clip's publish.json.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const line = '-'.repeat(60);

export async function writePublish(root, clip) {
  const src = path.join(clip.dir, 'publish.json');
  if (!existsSync(src)) { console.log('No publish.json in the clip folder; skipped publish.txt.'); return null; }
  const p = JSON.parse(await readFile(src, 'utf8'));
  const description = Array.isArray(p.description) ? p.description.join('\n') : p.description || '';
  const tags = (p.tags || []).join(', ');
  const out = [
    'TITLE OPTIONS (pick one, under 70 characters)',
    line,
    ...(p.titles || []).map((t, i) => `${i + 1}. ${t}  [${t.length}]`),
    '',
    'DESCRIPTION',
    line,
    description,
    '',
    `TAGS (comma separated, ${tags.length}/500 characters)`,
    line,
    tags,
    '',
    'PINNED COMMENT',
    line,
    p.pinnedComment || '',
    '',
  ].join('\n');
  await mkdir(clip.outDir, { recursive: true });
  const file = path.join(clip.outDir, 'publish.txt');
  await writeFile(file, out);
  console.log(`Wrote ${path.relative(root, file)}`);
  return file;
}
