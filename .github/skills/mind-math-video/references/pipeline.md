# Render Pipeline Notes

## Where things live
```
skill/scripts/   mm.mjs (CLI) lib.mjs voice.mjs render.mjs safe.mjs
skill/shared/    base.css engine.js video.html storyboard.html storyboard.css storyboard.js
skill/templates/clip/   starting files for `mm new`
skill/examples/walk-around-earth/   finished clip to copy patterns from
```
A clip folder holds only `narration.json`, `sfx.json`, `scenes.js`, `style.css`. A clip may also provide its own `video.html` or `storyboard.html` to override the shared pages.

## Local server routes (render and preview)
| URL | Served from |
|-----|-------------|
| `/__shared/*` | skill `shared/` |
| `/__build/*` | `build/<date>/<slug>/` (timing.json, audio) |
| everything else | clip folder, falling back to skill `shared/` (so `/video.html` and `/storyboard.html` come from the skill) |

## How deterministic rendering works
1. `render.mjs` serves the clip, opens `/video.html` in headless Chrome (viewport 360x640, deviceScaleFactor 3 -> 1080x1920).
2. For each frame it calls `renderAt(t)` (in `shared/engine.js`): picks the scene from `timing.json`, mounts it when it changes, then sets `currentTime` on every `document.getAnimations()` entry (paused), so CSS animations (infinite and delayed ones included) are exact for time `t`.
3. JS-driven values come from `scene.update(localT, q)`.
4. The wipe transition and the camera shake (`SHAKES`) are computed from `t`.
5. Screenshots are piped as JPEG into ffmpeg (H.264, yuv420p, crf 17). Audio is mixed afterwards: per-scene voice with `adelay`, a whoosh at each transition, thuds from `sfx.json`, `amix normalize=0` + limiter.

## Timing model
- Scene length = `max(narration.min, 0.3 voice delay + voice duration + 0.6 tail)`.
- Scene `i > 0` local time = `t - start - 0.25` (the wipe covers the first 0.25 s). `WIPE_HALF` in engine.js and `WIPE` in render.mjs must stay equal.
- Voice starts at `start + 0.25 (i > 0) + 0.3`.

## Safe-area check
`safe.mjs` opens `/video.html`, calls `renderAt(t)` every 0.25 s and runs `window.checkSafe()` (in `shared/engine.js`). It measures the real text boxes (Range rects, after the push-in scale) and elements with `data-safe`, ignores things fully off-screen or below 20% opacity, and reports an element only if it stays in a zone for 3 consecutive samples, so slide-ins and pop overshoot do not count. Limits are read from the `--safe-*` CSS variables in `shared/base.css`, the same ones used by the caption position and the overlay. Add `?safe=1` to `/video.html` (or use `mm render --safe`) to see the zones.

## Voice caching
`timing.json` stores a hash of narration text + provider + voice id + model. `mm voice` and `mm build` skip generation when it matches, so re-rendering after a visual-only change costs no ElevenLabs credits. `--force` regenerates.

## Pitfalls learned
- The browser tool cannot open `file://`; use `mm preview` (local server).
- `currentTime` includes `animation-delay`, so CSS delays work as written.
- Only one scene is mounted at a time, so duplicated SVG ids (clipPath, gradients) are safe in the video; the storyboard shows many scenes at once but identical ids resolve identically.
- A partial render (`--seconds`) never overwrites the final mp4.
- Free ElevenLabs plans may reject library voices via API (402/403); use premade voices.
- `.env` is git-ignored and loaded with `process.loadEnvFile`; a variable already set in the shell wins. An empty key falls back to `say`.
- After editing a script run `node --check <file>`.
- Look at rendered frames (contact sheet) for overlap with the caption zone.
