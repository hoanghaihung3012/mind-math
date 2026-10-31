// Frame-by-frame render of the clip's video.html, then mixes narration + SFX into out/<date>/<slug>/<slug>.mp4.
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import path from 'node:path';
import { loadPuppeteer, startServer, chromePath, clipConfig } from './lib.mjs';
import { writePublish } from './publish.mjs';
import { soundEffect } from './sfx.mjs';

const WIPE = 0.25; // must match WIPE_HALF in shared/engine.js
const whoosh = 'anoisesrc=d=0.5:c=pink:a=0.6,highpass=f=500,lowpass=f=6000,afade=t=in:d=0.25,afade=t=out:st=0.25:d=0.25';

export async function renderClip(root, clip, { fps = 30, scale, seconds = 0, safe = false } = {}) {
  const cfg = clipConfig(clip);
  scale ??= cfg.scale;
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
    await page.setViewport({ width: cfg.W, height: cfg.H, deviceScaleFactor: scale });
    await page.goto(`http://127.0.0.1:${port}/video.html${safe ? '?safe=1' : ''}`, { waitUntil: 'networkidle0' });
    const total = await page.evaluate(() => window.loadTiming());
    const end = seconds || total;
    const frames = Math.ceil(end * fps);
    console.log(`Rendering ${frames} frames (${end.toFixed(1)}s) at ${cfg.W * scale}x${cfg.H * scale}`);
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
      if (!s.audio) return; // voiceProvider "none"
      inputs.push('-i', path.join(clip.build, s.audio));
      const d = ms(s.start + (i === 0 ? 0 : WIPE) + s.voiceDelay);
      filters.push(`[${n}:a]adelay=${d}|${d},volume=1.0[v${i}]`); labels.push(`[v${i}]`); n++;
    });
    const sfx = (src, atSec, vol, name, duration = .8) => {
      inputs.push('-f', 'lavfi', '-t', String(duration), '-i', src);
      const d = ms(atSec);
      filters.push(`[${n}:a]adelay=${d}|${d},volume=${vol}[${name}]`); labels.push(`[${name}]`); n++;
    };
    if (cfg.transition !== 'fade') for (let k = 1; k < S.length; k++) sfx(whoosh, S[k].start - WIPE, 0.5, `w${k}`);
    // sfx.json: [{ "type": "thud", "scene": 4, "at": 3.55 }]  (scene is 1-based, at = seconds into the scene)
    const sfxFile = path.join(clip.dir, 'sfx.json');
    const impacts = existsSync(sfxFile) ? JSON.parse(await readFile(sfxFile, 'utf8')) : [];
    impacts.forEach((event, index) => {
      const effect = soundEffect(event.type, event.duration, event.freq);
      const scene = S[event.scene - 1];
      const repeat = event.repeat ?? 1;
      const every = event.every ?? .15;
      const volume = event.volume ?? effect.volume;
      if (!scene || !Number.isFinite(event.at) || event.at < 0 || !Number.isInteger(repeat) || repeat < 1 || repeat > 100 || !Number.isFinite(every) || every <= 0 || !Number.isFinite(volume) || volume < 0 || volume > 3) throw new Error(`Invalid SFX cue ${index + 1}`);
      for (let count = 0; count < repeat; count++) {
        const local = event.at + count * every;
        const available = scene.dur - (event.scene === 1 ? 0 : WIPE) - local;
        if (available <= 0) continue;
        sfx(effect.source, scene.start + (event.scene === 1 ? 0 : WIPE) + local, volume, `fx${index}_${count}`, Math.min(effect.duration, available));
      }
    });

    const musicFile = path.join(clip.dir, 'music.json');
    if (existsSync(musicFile)) {
      const settings = JSON.parse(await readFile(musicFile, 'utf8'));
      if (!settings || typeof settings !== 'object' || Array.isArray(settings) || Object.keys(settings).some(key => !['volume', 'style', 'drop', 'bpm'].includes(key))) throw new Error('music.json may only contain "volume", "style", "drop" and "bpm".');
      if (settings.style !== undefined && !['ambient', 'epic', 'buildup'].includes(settings.style)) throw new Error('music.json style must be "ambient", "epic" or "buildup".');
      const volume = settings?.volume ?? 0.15;
      if (!Number.isFinite(volume) || volume < 0 || volume > 1) throw new Error('Invalid background music volume in music.json (expected 0-1).');
      let music;
      if (settings.style === 'buildup') {
        // drop: { "scene": 4, "at": 0.3 } = the explosion moment, same clock as sfx.json; defaults to 1 s before the end
        const { scene, at } = settings.drop ?? {};
        const dropScene = S[(scene ?? 0) - 1];
        if (settings.drop !== undefined && (!dropScene || !Number.isFinite(at) || at < 0)) throw new Error('music.json drop must be { "scene": n, "at": seconds }.');
        const drop = dropScene ? dropScene.start + (scene === 1 ? 0 : WIPE) + at : Math.max(1, end - 1);
        if (settings.bpm !== undefined && !(settings.bpm >= 60 && settings.bpm <= 240)) throw new Error('music.json bpm must be 60-240.');
        music = buildupMusic(drop, settings.bpm);
      } else music = settings.style === 'epic' ? epicMusic() : ambientMusic();
      inputs.push('-f', 'lavfi', '-t', String(end), '-i', music);
      const fade = Math.min(1, end / 2);
      filters.push(`[${n}:a]volume=${volume},afade=t=in:d=${fade},afade=t=out:st=${Math.max(0, end - fade)}:d=${fade}[bgm]`);
      labels.push('[bgm]'); n++;
    }

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

// Generated ambient bed: C - Am - F - G (4 s each), soft swelling pad plus a quick 16th-note pluck arpeggio and a soft pulse.
function ambientMusic() {
  const chords = [[130.81, 164.81, 196], [110, 130.81, 164.81], [174.61, 220, 261.63], [196, 246.94, 293.66]];
  const pick = fn => chords.slice(0, 3).reduceRight((rest, c, i) => `if(lt(mod(t\\,16)\\,${(i + 1) * 4})\\,${fn(c)}\\,${rest})`, fn(chords[3]));
  const pad = pick(c => c.map(f => `sin(2*PI*${f}*t)`).join('+'));
  const ks = [0, 1, 2, 1, 2, 1, 0, 1];
  const pluck = ks.map((k, step) => `if(eq(mod(floor(t*4)\\,8)\\,${step})\\,${pick(c => `sin(2*PI*${c[k] * 2}*t)`)}\\,`).join('') + '0' + ')'.repeat(ks.length);
  const pulse = 'sin(2*PI*55*t)*exp(-14*mod(t\\,0.5))';
  return `aevalsrc=0.06*(${pad})*(0.65+0.35*sin(PI*mod(t\\,4)/4))+0.09*(${pluck})*exp(-9*mod(t\\,0.25))+0.12*${pulse}:s=44100:c=stereo`;
}

// Cinematic bed: Am - F - C - G (4 s each, 120 bpm): swelling detuned pad, driving bass, a kick on every beat and a rising arpeggio.
function epicMusic() {
  const chords = [[220, 261.63, 329.63, 55], [174.61, 220, 261.63, 43.65], [261.63, 329.63, 392, 65.41], [196, 246.94, 293.66, 49]];
  const pick = fn => chords.slice(0, 3).reduceRight((rest, c, i) => `if(lt(mod(t\\,16)\\,${(i + 1) * 4})\\,${fn(c)}\\,${rest})`, fn(chords[3]));
  const tone = f => `(sin(2*PI*${f}*t)+0.6*sin(2*PI*${(f * 1.004).toFixed(2)}*t)+0.35*sin(2*PI*${f * 2}*t))`;
  const pad = pick(c => c.slice(0, 3).map(tone).join('+'));
  const bass = pick(c => `(sin(2*PI*${c[3]}*t)+0.5*sin(2*PI*${c[3] * 2}*t))`);
  const k = 'if(lt(mod(floor(t*4)\\,4)\\,3)\\,mod(floor(t*4)\\,4)\\,1)';
  const arp = pick(c => `if(eq(${k}\\,0)\\,${c[0] * 2}\\,if(eq(${k}\\,1)\\,${c[1] * 2}\\,${c[2] * 2}))`);
  const kick = 'sin(2*PI*(45*mod(t\\,0.5)+3*(1-exp(-30*mod(t\\,0.5)))))*exp(-9*mod(t\\,0.5))';
  return `aevalsrc=0.03*(${pad})*(0.65+0.35*sin(PI*mod(t\\,4)/4))*(0.75+0.25*mod(t\\,16)/16)+0.12*(${bass})*exp(-4*mod(t\\,0.25))+0.3*${kick}+0.06*sin(2*PI*(${arp})*t)*exp(-8*mod(t\\,0.25)):s=44100:c=stereo`;
}

// Build-up bed: Am - F - C - G, tempo accelerating from 96 to 216 bpm until the drop, with intensity growing (louder pad,
// hats, then snare and a 16th arpeggio an octave up). A 0.3 s silence right before the drop, then a huge chord hit and the
// beat at full speed, fading out a few seconds after. With bpm the groove is steady instead: fixed tempo, full energy from the start.
function buildupMusic(D, bpm) {
  const r0 = bpm ? bpm / 60 : 1.6, r1 = bpm ? bpm / 60 : 3.6, k = ((r1 - r0) / (2 * D)).toFixed(5);
  const TT = `min(t,${D.toFixed(3)})`, post = `max(t-${D.toFixed(3)},0)`;
  const phi = `(${r0}*${TT}+${k}*${TT}*${TT}+${r1}*${post})`;
  const r = `(${r0}+2*${k}*${TT})`, I = bpm ? '0.9' : `(${TT}/${D.toFixed(3)})`;
  const s = `(mod(${phi},1)/${r})`;
  const chords = [[220, 261.63, 329.63, 55], [174.61, 220, 261.63, 43.65], [261.63, 329.63, 392, 65.41], [196, 246.94, 293.66, 49]];
  const ci = `mod(floor(${phi}/4),4)`;
  const pick = fn => `if(eq(${ci},0),${fn(chords[0])},if(eq(${ci},1),${fn(chords[1])},if(eq(${ci},2),${fn(chords[2])},${fn(chords[3])})))`;
  const tone = f => `(sin(2*PI*${f}*t)+0.6*sin(2*PI*${(f * 1.004).toFixed(2)}*t)+0.35*sin(2*PI*${f * 2}*t))`;
  const pad = pick(c => c.slice(0, 3).map(tone).join('+'));
  const bass = pick(c => `(sin(2*PI*${c[3]}*t)+0.5*sin(2*PI*${c[3] * 2}*t))`);
  const q = `mod(floor(${phi}*4),4)`;
  const arp = pick(c => `sin(2*PI*if(eq(${q},0),${c[0] * 2},if(eq(${q},1),${c[1] * 2},if(eq(${q},2),${c[2] * 2},${c[1] * 4})))*(1+gt(${I},0.6))*t)`);
  const noise = 'sin(2*PI*8900*t+40*sin(2*PI*1371*t)+25*sin(2*PI*577*t))';
  const kick = `sin(2*PI*(45*${s}+3*(1-exp(-30*${s}))))*exp(-9*${s})`;
  const hat = `${noise}*exp(-70*mod(2*${phi},1)/(2*${r}))`;
  const snare = `eq(mod(floor(${phi}),2),1)*${noise}*exp(-16*${s})`;
  const pre = `lt(t,${(D - 0.3).toFixed(3)})`, after = `gte(t,${D.toFixed(3)})`;
  const drums = `(${pre}+${after}*exp(-max(t-${(D + 3).toFixed(3)},0)/1.2))`;
  const build = `(0.4+0.6*${I})`;
  const expr = `${drums}*${build}*(0.32*${kick}+0.13*(${bass})*exp(-4*${s})+0.05*${I}*${hat}+0.09*clip(2*${I}-0.8,0,1)*${snare}+0.05*clip(2*${I}-0.5,0,1)*${arp}*exp(-10*mod(4*${phi},1)/(4*${r})))`
    + `+${pre}*0.025*(0.6+0.9*${I})*(${pad})+${after}*0.09*exp(-${post}/2.5)*(${pad})+${after}*0.25*exp(-${post}/2)*(${bass})`;
  return `aevalsrc=${expr.replace(/,/g, '\\,')}:s=44100:c=stereo`;
}
