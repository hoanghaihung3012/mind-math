// Frame-by-frame render of the clip's video.html, then mixes narration + SFX into out/<date>/<slug>/<slug>.mp4.
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import path from 'node:path';
import { loadPuppeteer, startServer, chromePath } from './lib.mjs';
import { writePublish } from './publish.mjs';

const WIPE = 0.25; // must match WIPE_HALF in shared/engine.js
const whoosh = 'anoisesrc=d=0.5:c=pink:a=0.6,highpass=f=500,lowpass=f=6000,afade=t=in:d=0.25,afade=t=out:st=0.25:d=0.25';
const thud = 'sine=f=55:d=0.7,afade=t=out:st=0.05:d=0.65';

export async function renderClip(root, clip, { fps = 30, scale = 3, seconds = 0, safe = false } = {}) {
  const timingFile = path.join(clip.build, 'timing.json');
  if (!existsSync(timingFile)) throw new Error('No timing.json. Run the voice step first (mm voice <clip>).');
  const timing = JSON.parse(await readFile(timingFile, 'utf8'));
  const puppeteer = await loadPuppeteer(root);
  const { server, port } = await startServer(clip);

  // A partial or safe-overlay render never overwrites the real output.
  await mkdir(clip.outDir, { recursive: true });
  const silent = path.join(clip.build, 'video_silent.mp4');
  const final = safe ? path.join(clip.build, 'safe_preview.mp4') : seconds ? path.join(clip.build, `test_${seconds}s.mp4`) : clip.outFile;

  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'medium', '-movflags', '+faststart', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
  const ffDone = new Promise((ok, fail) => ff.on('close', c => (c === 0 ? ok() : fail(new Error(`ffmpeg exited ${c}`)))));

  const browser = await puppeteer.launch({ executablePath: chromePath(), headless: true, args: ['--hide-scrollbars'] });
  try {
    const page = await browser.newPage();
    page.on('pageerror', e => console.error('Page error:', e.message));
    await page.setViewport({ width: 360, height: 640, deviceScaleFactor: scale });
    await page.goto(`http://127.0.0.1:${port}/video.html${safe ? '?safe=1' : ''}`, { waitUntil: 'networkidle0' });
    const total = await page.evaluate(() => window.loadTiming());
    const end = seconds || total;
    const frames = Math.ceil(end * fps);
    console.log(`Rendering ${frames} frames (${end.toFixed(1)}s) at ${360 * scale}x${640 * scale}`);
    for (let f = 0; f < frames; f++) {
      await page.evaluate(t => window.renderAt(t), f / fps);
      const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 60 === 0) process.stdout.write(`\r${f}/${frames}`);
    }
    ff.stdin.end();
    await ffDone;
    console.log('\nFrames done. Mixing audio...');

    const S = timing.scenes;
    const ms = s => Math.max(0, Math.round(s * 1000));
    const inputs = ['-i', silent], filters = [], labels = [];
    let n = 1; // input 0 is the silent video
    S.forEach((s, i) => {
      inputs.push('-i', path.join(clip.build, s.audio));
      const d = ms(s.start + (i === 0 ? 0 : WIPE) + s.voiceDelay);
      filters.push(`[${n}:a]adelay=${d}|${d},volume=1.0[v${i}]`); labels.push(`[v${i}]`); n++;
    });
    const sfx = (src, atSec, vol, name) => {
      inputs.push('-f', 'lavfi', '-t', '0.8', '-i', src);
      const d = ms(atSec);
      filters.push(`[${n}:a]adelay=${d}|${d},volume=${vol}[${name}]`); labels.push(`[${name}]`); n++;
    };
    for (let k = 1; k < S.length; k++) sfx(whoosh, S[k].start - WIPE, 0.5, `w${k}`);
    // sfx.json: [{ "type": "thud", "scene": 4, "at": 3.55 }]  (scene is 1-based, at = seconds into the scene)
    const sfxFile = path.join(clip.dir, 'sfx.json');
    const impacts = existsSync(sfxFile) ? JSON.parse(await readFile(sfxFile, 'utf8')) : [];
    impacts.forEach((e, k) => sfx(thud, S[e.scene - 1].start + WIPE + e.at, 2.2, `th${k}`));

    filters.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0,alimiter=limit=0.95[a]`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filters.join(';'),
      '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', String(end), final], { stdio: 'inherit' });
    console.log(`Done: ${path.relative(root, final)}`);
    if (final === clip.outFile) await writePublish(root, clip);
    return final;
  } finally {
    await browser.close();
    server.close();
  }
}
