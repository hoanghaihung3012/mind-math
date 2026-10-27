// Shared helpers: paths, clip resolution, env loading, local static server, puppeteer loader.
import http from 'node:http';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import path from 'node:path';

export const skillDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const sharedDir = path.join(skillDir, 'shared');
export const templateDir = path.join(skillDir, 'templates', 'clip');

const pad = n => String(n).padStart(2, '0');
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const hash = v => createHash('sha1').update(JSON.stringify(v)).digest('hex').slice(0, 16);

export function loadEnv(root) {
  try { process.loadEnvFile(path.join(root, '.env')); } catch { /* .env is optional */ }
}

// ref: "slug" (latest date wins), "date/slug", or a path ending in source/date/slug.
export function resolveClip(root, ref) {
  if (!ref) throw new Error('Missing clip name. Example: walk-around-earth or 2026-10-27/walk-around-earth');
  const parts = ref.split(/[\\/]/).filter(Boolean);
  let date, slug;
  if (parts.length >= 2) [date, slug] = parts.slice(-2);
  else {
    slug = parts[0];
    const src = path.join(root, 'source');
    const dates = existsSync(src) ? readdirSync(src).filter(d => existsSync(path.join(src, d, slug))).sort() : [];
    if (!dates.length) throw new Error(`Clip "${slug}" not found under source/<date>/`);
    date = dates.at(-1);
  }
  const dir = path.join(root, 'source', date, slug);
  if (!existsSync(dir)) throw new Error(`Clip folder not found: ${dir}`);
  return { date, slug, dir, build: path.join(root, 'build', date, slug), outDir: path.join(root, 'out', date, slug), outFile: path.join(root, 'out', date, slug, `${slug}.mp4`) };
}

export async function loadPuppeteer(root) {
  let file;
  try { file = createRequire(path.join(root, 'package.json')).resolve('puppeteer-core'); }
  catch { throw new Error('puppeteer-core not found. Run "npm install puppeteer-core" in the workspace root.'); }
  const m = await import(pathToFileURL(file).href);
  return m.default ?? m;
}

export const chromePath = () => process.env.CHROME_PATH || ({
  darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  linux: '/usr/bin/google-chrome',
  win32: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
})[process.platform];

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };

// "/" -> clip folder (falls back to shared templates), "/__shared/" -> skill shared files, "/__build/" -> generated audio + timing.
export function startServer(clip, port = 0) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]);
    const tries = [];
    if (rel.startsWith('/__shared/')) tries.push([sharedDir, rel.slice(10)]);
    else if (rel.startsWith('/__build/')) tries.push([clip.build, rel.slice(9)]);
    else { const r = rel === '/' ? '/storyboard.html' : rel; tries.push([clip.dir, r], [sharedDir, r]); }
    for (const [base, r] of tries) {
      const f = path.join(base, r);
      if (f.startsWith(base + path.sep) && existsSync(f) && statSync(f).isFile()) {
        res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        createReadStream(f).pipe(res);
        return;
      }
    }
    res.writeHead(404).end();
  });
  return new Promise(ok => server.listen(port, '127.0.0.1', () => ok({ server, port: server.address().port })));
}
