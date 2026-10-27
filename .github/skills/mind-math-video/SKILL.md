---
name: mind-math-video
description: 'Make viral 9:16 "Mind Math" 2D animation Shorts (math/number wow facts) in English with HTML+CSS+JS animation, ElevenLabs voice, and ffmpeg render to MP4. Reusable CLI + shared engine; each clip lives in source/<date>/<slug>/ and exports to out/<date>/<slug>/ (mp4 + publish.txt with title, description, tags). Use when: creating a new Short/TikTok/Reel in the Mind Math style, "làm video 2d animation", storyboard preview before rendering, kinetic text counters, ElevenLabs narration, render HTML animation to mp4, viral math idea like "how many steps/years/hours to ...".'
argument-hint: 'Video idea, e.g. "How long to count to a billion?"'
---

# Mind Math Video

Short (35-45 s) vertical explainer videos: a "what if" math question, numbers that scale absurdly, a relatable comparison. All shared code (engine, base CSS, storyboard page, voice + render scripts) lives in this skill, so a clip only contains its own content.

## Workspace layout
```
source/<YYYY-MM-DD>/<slug>/     one folder per clip, grouped by day
    narration.json  sfx.json  scenes.js  style.css  publish.json
build/<YYYY-MM-DD>/<slug>/      generated audio, timing.json, silent video (git-ignored)
out/<YYYY-MM-DD>/<slug>/        <slug>.mp4 and publish.txt (title options, description, tags, pinned comment, ready to copy)
.env                            ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, ELEVENLABS_MODEL
```

## One-time setup in a workspace
1. Copy [assets/package.json](./assets/package.json) (or add `puppeteer-core` and the `mm` script), [assets/gitignore.txt](./assets/gitignore.txt) -> `.gitignore`, [assets/env.example](./assets/env.example) -> `.env`.
2. `npm install`. Requires Node 20.12+, ffmpeg/ffprobe, and Google Chrome (set `CHROME_PATH` if not at the default location).
3. The `mm` script must point at this skill's `scripts/mm.mjs`. If the skill lives elsewhere (for example `~/.copilot/skills/mind-math-video`), change the path in `package.json`. Always run commands from the workspace root.

## CLI (`npm run mm -- <command>`)
| Command | Does |
|---------|------|
| `new <slug> [--date D]` | Scaffold `source/<date>/<slug>/` from [templates/clip](./templates/clip/) (date defaults to today) |
| `preview <clip> [--port 8765]` | Serve the storyboard at `http://127.0.0.1:8765/storyboard.html` |
| `voice <clip> [--force]` | Narration per scene + `build/.../timing.json`; skipped when text and voice settings are unchanged |
| `render <clip> [--scale 3 --fps 30 --seconds N --safe]` | Frame render + audio mix; `--seconds` writes `build/.../test_Ns.mp4`, `--safe` overlays the platform-UI zones and writes `build/.../safe_preview.mp4` (never touches `out/`) |
| `safe <clip> [--step 0.25]` | Samples the whole video and reports text under platform UI (top, bottom, right zones); exits 1 on problems |
| `build <clip> [--skip-safe]` | `voice`, then `safe` (stops on problems), then `render` -> `out/<date>/<slug>/<slug>.mp4` + `publish.txt` |
| `publish <clip>` | Rewrite `out/<date>/<slug>/publish.txt` from the clip's `publish.json` (no render) |

`<clip>` is `slug` (latest date wins), `date/slug`, or a path ending in it.

## Procedure
1. **Lock the idea.** One question, one number payoff, one relatable comparison. Verify the math (show the calculation chain). Use rounded, honest numbers and say "about".
2. **Scaffold:** `mm new <slug>`.
3. **Write the clip** following [style-guide](./references/style-guide.md):
   - `narration.json`: one entry per scene, `{ "min": seconds, "text": "..." }`.
   - `scenes.js`: `window.SCENES` (metadata + `html()` + optional `update(t, q)`), `window.SHAKES`, `window.CLIP.title`.
   - `style.css`: positions and scene-specific animation. Reuse markup/CSS patterns from [examples/double-one-dollar](./examples/double-one-dollar/) (safe-area compliant). `examples/walk-around-earth` is legacy: it predates the safe-area rules, do not copy its layout.
   - `sfx.json`: impact thuds, `scene` is 1-based, `at` is seconds into the scene.
   - `publish.json`: `titles[]`, `description[]` (one array item per line), `tags[]`, `pinnedComment`. Start from the template.
4. **Storyboard first.** Run `mm preview <clip>`, open the URL with the browser tool, check for console errors, and **wait for the user to approve** before rendering. Preview only; no audio needed. The "Safe area" button overlays the zones covered by the Shorts UI.
5. **Test render:** `mm render <clip> --scale 1 --seconds 4`, extract frames with ffmpeg and view them (layout, overlaps, counters). For a visual safe-area check run `mm render <clip> --scale 1 --safe` and view a contact sheet of `build/.../safe_preview.mp4`.
6. **Sync to the voice.** After the first `mm voice <clip>` the real durations exist. Find pauses with `ffmpeg -i build/<date>/<slug>/audio/sN.mp3 -af silencedetect=noise=-35dB:d=0.12 -f null -` (voice starts at local scene time 0.3 s) and move stamps, counters, `ramp()` keypoints, `SHAKES` and `sfx.json` so each beat lands on the word it illustrates. Voice is cached, so re-rendering costs no ElevenLabs credits.
7. **Safe area:** run `mm safe <clip>` and fix every reported element (move it, shorten the text, shrink the font) until it prints `Safe area OK`. Details in [style-guide](./references/style-guide.md#safe-area-youtube-shorts-ui).
8. **Final:** `mm build <clip>` -> `out/<date>/<slug>/<slug>.mp4` (it runs the safe check first); verify with `ffprobe` and a contact sheet of mid-scene frames.
9. **Publish text:** fill `source/<date>/<slug>/publish.json` (titles, description lines, tags, pinned comment) using [references/publish.md](./references/publish.md), then `mm publish <clip>` (also runs at the end of `build`) to write `out/<date>/<slug>/publish.txt` for copy-paste. Use the real numbers from the clip's math check.
10. Tell the user what was NOT verified (for example audio not listened to).

## Rules That Matter
- Scene code must be deterministic: CSS animations, or values computed from time `t` in `update(t, q)`. No `Math.random()`, timers or `requestAnimationFrame` (use seeded `rnd`). See [pipeline](./references/pipeline.md).
- **Safe area (mandatory).** YouTube Shorts covers the top bar, the bottom title/channel/sound area and a column of action buttons on the right. Design inside this budget (360x640 canvas): important text between y 52 and 440, the caption sits right below (`.cap` is already placed at y 441-486), nothing important right of x 300 below y 270, left margin at least 16. The zoom push-in scales the scene 4%, so leave margin. Limits are the `--safe-*` variables in `shared/base.css` (one source of truth for CSS, the overlay and `mm safe`). Never put text or a call-to-action in the bottom 150 px.
- Scene length is `max(min, voice + 0.9 s)`, computed from the audio; do not hardcode the total.
- Shake times (`SHAKES`) and thuds (`sfx.json`) must match the impact moment (stamp, slam).
- ElevenLabs key: the user types it into `.env`; never ask for it in chat, never print it. With no key the draft macOS `say` voice is used.
- Shared code lives in `shared/` and `scripts/` of this skill. Fix bugs there, not in a clip.
