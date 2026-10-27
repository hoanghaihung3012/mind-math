// Safe-area check: samples the video over time and reports text that sits under platform UI
// (Shorts/TikTok/Reels top bar, bottom title/channel area, right action buttons).
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { loadPuppeteer, startServer, chromePath } from './lib.mjs';

export async function checkSafe(root, clip, { step = 0.25 } = {}) {
  const timingFile = path.join(clip.build, 'timing.json');
  if (!existsSync(timingFile)) throw new Error('No timing.json. Run the voice step first (mm voice <clip>).');
  const puppeteer = await loadPuppeteer(root);
  const { server, port } = await startServer(clip);
  const browser = await puppeteer.launch({ executablePath: chromePath(), headless: true, args: ['--hide-scrollbars'] });
  try {
    const page = await browser.newPage();
    page.on('pageerror', e => console.error('Page error:', e.message));
    await page.setViewport({ width: 360, height: 640, deviceScaleFactor: 1 });
    await page.goto(`http://127.0.0.1:${port}/video.html`, { waitUntil: 'networkidle0' });
    const total = await page.evaluate(() => window.loadTiming());
    const hits = new Map(); // scene|selector|zone -> streak info; a problem must last 3 samples (0.5 s at the default step) so slide-in/overshoot frames are ignored
    for (let t = 0; t <= total; t += step) {
      const { scene, list } = await page.evaluate(x => { window.renderAt(x); return { scene: window.currentScene(), list: window.checkSafe() }; }, t);
      const seen = new Set();
      for (const v of list) {
        const key = `${scene}|${v.sel}|${v.zone}`;
        seen.add(key);
        const h = hits.get(key) || { scene: scene + 1, sel: v.sel, zone: v.zone, first: t, streak: 0, max: 0 };
        h.streak++; h.max = Math.max(h.max, h.streak); h.last = t; h.text = v.text; h.rect = v.rect;
        hits.set(key, h);
      }
      for (const [k, h] of hits) if (!seen.has(k)) h.streak = 0;
    }
    const bad = [...hits.values()].filter(h => h.max >= 3);
    if (!bad.length) console.log(`Safe area OK (${Math.round(total / step)} samples).`);
    else {
      console.log(`Safe area problems (${bad.length}):`);
      for (const h of bad) console.log(`  scene ${h.scene} ${h.sel} "${h.text}"  ${h.zone.toUpperCase()}  ${h.first.toFixed(1)}s-${h.last.toFixed(1)}s  rect[l,t,r,b]=${h.rect.join(',')}`);
    }
    return bad;
  } finally {
    await browser.close();
    server.close();
  }
}
