#!/usr/bin/env node
// Mind Math video CLI. Run from the workspace root.
//   mm new <slug> [--date YYYY-MM-DD]   scaffold source/<date>/<slug>/
//   mm preview <clip> [--port 8765]     serve the storyboard preview
//   mm voice <clip> [--force]           generate narration + timing
//   mm render <clip> [--scale 3 --fps 30 --seconds N --safe]   --safe overlays the UI zones (test output only)
//   mm safe <clip> [--step 0.25]        report text under platform UI (top/bottom/right zones)
//   mm build <clip> [--skip-safe]       voice + safe check + render -> out/<date>/<slug>/<slug>.mp4 + publish.txt
//   mm publish <clip>                   rewrite out/<date>/<slug>/publish.txt from source publish.json
import { cp, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { loadEnv, resolveClip, startServer, templateDir, today } from './lib.mjs';
import { makeVoice } from './voice.mjs';
import { renderClip } from './render.mjs';
import { checkSafe } from './safe.mjs';
import { writePublish } from './publish.mjs';

const [cmd, ...rest] = process.argv.slice(2);
const flags = {}, pos = [];
for (let i = 0; i < rest.length; i++) {
  if (!rest[i].startsWith('--')) { pos.push(rest[i]); continue; }
  const next = rest[i + 1];
  if (next === undefined || next.startsWith('--')) flags[rest[i].slice(2)] = true;
  else { flags[rest[i].slice(2)] = next; i++; }
}
const root = process.cwd();
loadEnv(root);
const num = (v, d) => (v === undefined || v === true ? d : Number(v));

const usage = () => console.log('Usage: mm <new|preview|voice|render|safe|publish|build> <clip> [flags]\nSee the header of scripts/mm.mjs.');

try {
  if (cmd === 'new') {
    const slug = pos[0];
    if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error('Slug must be lowercase letters, digits, hyphens. Example: count-to-a-billion');
    const dir = path.join(root, 'source', flags.date || today(), slug);
    if (existsSync(dir)) throw new Error(`Already exists: ${dir}`);
    await mkdir(path.dirname(dir), { recursive: true });
    await cp(templateDir, dir, { recursive: true });
    console.log(`Created ${path.relative(root, dir)}\nEdit narration.json, scenes.js, style.css, then: mm preview ${slug}`);
  } else if (cmd === 'preview') {
    const clip = resolveClip(root, pos[0]);
    const { port } = await startServer(clip, num(flags.port, 8765));
    console.log(`Storyboard: http://127.0.0.1:${port}/storyboard.html  (Ctrl+C to stop)`);
  } else if (cmd === 'voice') {
    await makeVoice(resolveClip(root, pos[0]), { force: Boolean(flags.force) });
  } else if (cmd === 'render') {
    await renderClip(root, resolveClip(root, pos[0]), { fps: num(flags.fps, 30), scale: num(flags.scale, 3), seconds: num(flags.seconds, 0), safe: Boolean(flags.safe) });
  } else if (cmd === 'publish') {
    await writePublish(root, resolveClip(root, pos[0]));
  } else if (cmd === 'safe') {
    const bad = await checkSafe(root, resolveClip(root, pos[0]), { step: num(flags.step, 0.25) });
    if (bad.length) process.exit(1);
  } else if (cmd === 'build') {
    const clip = resolveClip(root, pos[0]);
    await makeVoice(clip, { force: Boolean(flags.force) });
    if (!flags['skip-safe'] && (await checkSafe(root, clip)).length) throw new Error('Fix the safe-area problems above (or pass --skip-safe), then build again.');
    await renderClip(root, clip, { fps: num(flags.fps, 30), scale: num(flags.scale, 3) });
  } else usage();
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exit(1);
}
