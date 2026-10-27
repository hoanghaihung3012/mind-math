// Narration per scene (ElevenLabs, or macOS `say` as a draft) -> build/<date>/<slug>/audio + timing.json.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { hash } from './lib.mjs';

const VOICE_DELAY = 0.3; // seconds after the scene's visible start
const TAIL = 0.6; // silence after the voice before the next scene

const probe = f => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());

const cfg = () => ({
  key: process.env.ELEVENLABS_API_KEY,
  voiceId: process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb',
  model: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2',
});

// Changes when the text or voice settings change, so unchanged clips don't spend ElevenLabs credits again.
export function signature(narration) {
  const { key, voiceId, model } = cfg();
  return hash({ narration, provider: key ? 'elevenlabs' : 'say', voiceId: key ? voiceId : null, model: key ? model : null });
}

async function elevenlabs(text, file) {
  const { key, voiceId, model } = cfg();
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: model, voice_settings: { stability: 0.35, similarity_boost: 0.75, style: 0.4, use_speaker_boost: true, speed: 1.05 } }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
}

function draftVoice(text, file) {
  const aiff = file.replace(/\.mp3$/, '.aiff');
  execFileSync('say', ['-v', 'Samantha', '-r', '175', '-o', aiff, text.replace(/<break[^>]*\/>/g, ',')]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', aiff, '-ar', '44100', '-b:a', '128k', file]);
}

export async function makeVoice(clip, { force = false } = {}) {
  const narration = JSON.parse(await readFile(path.join(clip.dir, 'narration.json'), 'utf8'));
  const sig = signature(narration);
  const timingFile = path.join(clip.build, 'timing.json');
  if (!force && existsSync(timingFile)) {
    const t = JSON.parse(await readFile(timingFile, 'utf8'));
    if (t.hash === sig) { console.log('Voice is up to date (use --force to regenerate).'); return t; }
  }

  const useEleven = Boolean(cfg().key);
  console.log(useEleven ? `Voice: ElevenLabs (${cfg().voiceId}, ${cfg().model})` : 'Voice: macOS "say" (draft). Put ELEVENLABS_API_KEY in .env for the real voice.');
  await mkdir(path.join(clip.build, 'audio'), { recursive: true });

  const scenes = [];
  let start = 0;
  for (let i = 0; i < narration.length; i++) {
    const rel = `audio/s${i + 1}.mp3`, file = path.join(clip.build, rel);
    if (useEleven) await elevenlabs(narration[i].text, file); else draftVoice(narration[i].text, file);
    const audioDur = probe(file);
    const dur = Math.max(narration[i].min, +(VOICE_DELAY + audioDur + TAIL).toFixed(2));
    scenes.push({ start: +start.toFixed(3), dur, audio: rel, audioDur, voiceDelay: VOICE_DELAY });
    console.log(`Scene ${i + 1}: voice ${audioDur.toFixed(2)}s, scene ${dur}s`);
    start += dur;
  }
  const timing = { hash: sig, total: +start.toFixed(3), provider: useEleven ? 'elevenlabs' : 'say', scenes };
  await writeFile(timingFile, JSON.stringify(timing, null, 2));
  console.log(`Total: ${start.toFixed(2)}s`);
  return timing;
}
