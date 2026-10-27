# Mind Math Style Guide

## Format
- 9:16, design canvas 360x640 CSS px, rendered at 3x -> 1080x1920, 30 fps
- 35-45 s total, 7 scenes of 4-8 s each
- Language: English. Burned-in caption in the safe area below the content (short version of the voice-over)

## Safe area (YouTube Shorts UI)
Shorts, TikTok and Reels draw their own UI over the video. Anything important under it is hidden, so it was a real problem on the first upload (captions and CTA were covered). Values are approximate, on the 360x640 canvas (multiply by 3 for 1080x1920):

| Zone | Area | Covered by |
|------|------|------------|
| Top | y < 52 | status bar, search/camera icons |
| Bottom | y > 492 (148 px) | channel, title, description, sound, progress bar |
| Right | x > 304 for y 270-520 | like, comment, share, remix buttons |
| Left | x < 8 | only an edge margin, no UI |

Budget for every scene:
- Content (titles, numbers, labels, buttons): y 52 to 440, left margin >= 16, right edge <= 296 when below y 270.
- Caption: `.cap` in `shared/base.css`, 18 px, bottom edge at y 486, max 2 lines (about 29 characters per line).
- Backgrounds, glows and decoration may bleed into the zones; text and CTAs may not.
- The scene push-in scales by 1.04 around the centre, so elements near the edges drift outward by up to 8 px.
- Source/credit lines go inside the content area (for example y 408), never at the very bottom.

Tools: the storyboard has a "Safe area" button (red overlay), `mm render <clip> --safe` writes `build/.../safe_preview.mp4` with the overlay, and `mm safe <clip>` samples every 0.25 s and lists text that stays in a zone for 0.5 s or more. `mm build` refuses to render until it is clean. Mark non-text elements that must stay visible with `data-safe` so the checker covers them too.

## Scene structure
| # | Role | Pattern |
|---|------|---------|
| 1 | Hook | Question as big uppercase title, words pop one by one; hero character + key unit (e.g. ruler "75 cm") |
| 2 | Scale | Big visual (globe, stack, crowd) + pill label with the key number |
| 3 | Math | Operands slide in from opposite sides, bar draws, answer slot scrambles digits, then "?!?" |
| 4 | Reveal | Giant counter 0 -> answer (ease-out, ~3 s), rays behind, stamp slams in, screen shake + thud |
| 5 | Time/compare | Progress ring + second counter + grid of squares filling one by one |
| 6 | Payoff | Huge "14+" slam, background cycles colours, character crosses a timeline, counter on top |
| 7 | CTA | Giant yellow footprint/icon stamp, ripple, pulsing "Follow for more" button, source line |

Swap the hero character and visuals per topic, keep the rhythm: hook -> scale -> math -> reveal -> relate -> payoff -> CTA.

## Palette
| Token | Hex | Use |
|-------|-----|-----|
| yellow | `#ffd23f` | key numbers, stamps, highlights |
| cyan | `#4cc9f0` | secondary numbers, progress |
| pink | `#ff4d6d` | questions, buttons, hero shirt |
| muted | `#98a2d3` | small labels |
| backgrounds | deep navy/purple gradients (`#1b1f5e`, `#3b2a7a`, `#0b0f1f`), one scene may be colourful (seasons) |

Font: Poppins 800/900, uppercase for titles, `font-variant-numeric: tabular-nums` for counters, text-shadow `0 2px 0 #000` on captions.

## Motion language
- Entrances use overshoot easing `cubic-bezier(.2,1.5,.4,1)` (pop, slam, stamp). Never plain fades for key text.
- Always something moving: slow push-in on the whole scene (`scale 1 -> 1.06` over 9 s), twinkling stars, looping walk cycle, drifting symbols.
- Counters ease out (cubic), reach the final number slightly before the voice says it.
- Transitions: yellow whip-wipe, 0.5 s, centered on the scene boundary; new scene's animations start 0.25 s after the boundary.
- Impacts (stamp, big number) get a camera shake (4-6 px, 0.35-0.4 s, decaying) and a low thud.
- Stagger lists/grids with `animation-delay: calc(var(--i) * 0.02-0.2s)`.

## Reusable pieces (shared/engine.js + examples/walk-around-earth)
- `walker()` SVG character with walk cycle (legs/arms swing, body bob)
- `footprint`, `globe` SVG (scrolling continents, self-drawing equator via `pathLength=1` + dashoffset)
- Example CSS (examples/walk-around-earth/style.css): `.pop`, `.ground` (scrolling dashes), `.ruler`, `.rays`, `.stamp`, `.ring` (progress), `.grid`, `.follow`
- JS helpers (shared/engine.js): `fmt`, `clamp`, `easeOut`, `prog(t, delay, dur)`, seeded `rnd`

## Narration
- ~2.5 words/second; 14-22 words per scene; one idea per scene
- Numbers spelled out for TTS ("seventy-five centimeters", "fifty-three million")
- Open with the question, close with a challenge + "Follow for more mind-blowing math."
- Pauses with `<break time="0.3s" />`; keep to 1 per sentence
- ElevenLabs settings: model `eleven_multilingual_v2`, stability 0.35, similarity 0.75, style 0.4, speed 1.05

## Idea formula
Everyday action x absurd scale = shocking number, then translate into something personal (years of your life, days, money). Examples: steps around the Earth, counting to a billion, spending $1 per second, doubling rice on a chessboard.

Channel: Mind Math.

## Real-scale zoom-out comparison (examples/double-one-dollar)
- Keep the hero (a coin tower) a fixed height on screen and zoom the world out: every other object is drawn at its true height relative to the tower and shrinks as the tower doubles. `towerUpdate(q, d)` in that clip does it from a day value `d`.
- Use `ramp(t, [[time, value], ...])` keypoints to make the camera follow the voice-over; find pauses with `ffmpeg -af silencedetect=noise=-35dB:d=0.12` on `build/<date>/<slug>/audio/sN.mp3` (voice starts at local scene time 0.3 s).
- Objects taller than the hero are hidden until the hero overtakes them, then they pop in at equal height with a yellow label. Use dashed altitude markers for things measured as altitude (space line, ISS).
- Sky colour is interpolated from log10(height) so it darkens to space as the tower climbs.
