// Shared helpers, reusable SVG pieces and the deterministic frame engine.
// A clip provides window.SCENES (and optionally window.SHAKES) in its scenes.js.

const fmt = n => Math.round(n).toLocaleString('en-US');
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = p => 1 - Math.pow(1 - p, 3);
const prog = (t, delay, dur) => clamp((t - delay) / dur);
// Seeded pseudo-random: Math.random() would make frames differ between renders.
const rnd = n => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };

const walker = (shirt = '#ff4d6d') => `
<svg class="walker" viewBox="0 0 60 120" width="100%" height="100%"><g class="bob">
  <line class="a2" x1="30" y1="32" x2="30" y2="64" stroke="#c9a07a" stroke-width="8" stroke-linecap="round"/>
  <line class="l2" x1="30" y1="68" x2="30" y2="112" stroke="#1f2a52" stroke-width="10" stroke-linecap="round"/>
  <rect x="19" y="26" width="22" height="46" rx="11" fill="${shirt}"/>
  <circle cx="30" cy="14" r="11" fill="#ffd9b0"/><path d="M19 13a11 11 0 0 1 22 0z" fill="#3a2a1e"/>
  <line class="l1" x1="30" y1="68" x2="30" y2="112" stroke="#2b3a67" stroke-width="10" stroke-linecap="round"/>
  <line class="a1" x1="30" y1="32" x2="30" y2="64" stroke="#ffd9b0" stroke-width="8" stroke-linecap="round"/>
</g></svg>`;

const footprint = `<svg viewBox="0 0 80 115" width="100%" height="100%"><ellipse cx="40" cy="82" rx="26" ry="30" fill="#ffd23f"/><circle cx="14" cy="38" r="7" fill="#ffd23f"/><circle cx="28" cy="26" r="8" fill="#ffd23f"/><circle cx="45" cy="22" r="8" fill="#ffd23f"/><circle cx="60" cy="28" r="7" fill="#ffd23f"/><circle cx="70" cy="42" r="6" fill="#ffd23f"/></svg>`;

// Spinning globe with a self-drawing equator (.cont drifts in the clip CSS, .eq draws via pathLength=1).
const globe = `
<svg viewBox="0 0 260 260" width="100%" height="100%">
  <defs><clipPath id="gc"><circle cx="130" cy="130" r="120"/></clipPath>
  <radialGradient id="oc" cx="35%" cy="30%"><stop offset="0" stop-color="#4cc9f0"/><stop offset="1" stop-color="#0b4fa3"/></radialGradient>
  <radialGradient id="sh" cx="35%" cy="30%"><stop offset=".5" stop-color="#0000"/><stop offset="1" stop-color="#0009"/></radialGradient></defs>
  <circle cx="130" cy="130" r="120" fill="url(#oc)"/>
  <g clip-path="url(#gc)"><g class="cont" fill="#52b788"><g id="land"><path d="M40 80q20-30 50-20q25 10 10 35q-15 20-30 10q-20-5-30-25z"/><path d="M130 140q25-15 40 5q10 25-10 45q-20 10-25-15q-10-20-5-35z"/><path d="M190 70q25-10 40 10q5 20-15 25q-25 5-25-35z"/></g><use href="#land" x="260"/><use href="#land" x="520"/></g></g>
  <circle cx="130" cy="130" r="120" fill="url(#sh)"/>
  <ellipse class="eq" pathLength="1" cx="130" cy="130" rx="120" ry="26" fill="none" stroke="#ff4d6d" stroke-width="5" stroke-dasharray="1" stroke-linecap="round"/>
</svg>`;

const sceneMarkup = sc => `<div class="scene">${sc.html()}<div class="cap">${sc.cap}</div></div>`;

// ---- frame engine (used by the render script through video.html) ----
const WIPE_HALF = .25; // keep in sync with WIPE in scripts/render.mjs
const ease = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
let TIMING = null, mounted = -1, host = null;

window.loadTiming = async () => {
  TIMING = await (await fetch('/__build/timing.json')).json();
  host = document.getElementById('scene-host');
  await document.fonts.ready;
  return TIMING.total;
};

window.renderAt = t => {
  const SC = window.SCENES, S = TIMING.scenes;
  let i = S.findIndex((s, k) => t >= s.start && (k === S.length - 1 || t < S[k + 1].start));
  if (i < 0) i = 0;
  if (i !== mounted) { host.innerHTML = sceneMarkup(SC[i]); mounted = i; }
  const local = i === 0 ? t : Math.max(0, t - S[i].start - WIPE_HALF);
  document.getAnimations().forEach(a => { a.pause(); a.currentTime = local * 1000; });
  if (SC[i].update) SC[i].update(local, sel => host.querySelector(sel));

  let wx = -101;
  for (let k = 1; k < S.length; k++) {
    const u = (t - (S[k].start - WIPE_HALF)) / (2 * WIPE_HALF);
    if (u > 0 && u < 1) wx = u < .5 ? -101 * (1 - ease(u * 2)) : 101 * ease(u * 2 - 1);
  }
  document.getElementById('wipe').style.transform = `translateX(${wx}%)`;

  // window.SHAKES: [scene index (0-based), local start s, duration s, amplitude px]
  let sx = 0, sy = 0;
  for (const [si, st, d, amp] of window.SHAKES || []) {
    if (si === i && local >= st && local < st + d) {
      const k = (1 - (local - st) / d) * amp, n = Math.floor(local * 60);
      sx = (rnd(n) - .5) * 2 * k; sy = (rnd(n + 99) - .5) * 2 * k;
    }
  }
  document.getElementById('root').style.transform = `translate(${sx}px,${sy}px)`;
};

window.currentScene = () => mounted;

// Text (and elements marked data-safe) that sits under platform UI. Limits come from the --safe-* CSS variables.
window.checkSafe = () => {
  const cssVar = n => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n));
  const S = { top: cssVar('--safe-top'), bottom: cssVar('--safe-bottom'), left: cssVar('--safe-left'), right: cssVar('--safe-right'), from: cssVar('--safe-right-from'), to: cssVar('--safe-right-to') };
  const W = 360, Hh = 640, tol = 2, found = [];
  const effOpacity = el => { let o = 1; for (let n = el; n && n !== host.parentElement; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden') return 0; o *= parseFloat(cs.opacity); } return o; };
  const label = el => el.id ? '#' + el.id : el.classList[0] ? '.' + el.classList[0] : el.tagName.toLowerCase();
  const test = (r, text, sel) => {
    if (r.width < 1 || r.height < 1) return;
    if (r.right < 0 || r.left > W || r.bottom < 0 || r.top > Hh) return; // entering or leaving off-screen
    const rect = [r.left, r.top, r.right, r.bottom].map(Math.round);
    if (r.top < S.top - tol) found.push({ sel, text, zone: 'top', rect });
    if (r.bottom > Hh - S.bottom + tol) found.push({ sel, text, zone: 'bottom', rect });
    if (r.left < S.left - tol) found.push({ sel, text, zone: 'left', rect });
    if (r.right > W - S.right + tol && r.bottom > S.from && r.top < S.to) found.push({ sel, text, zone: 'right', rect });
    else if (r.right > W - 8) found.push({ sel, text, zone: 'edge', rect });
  };
  host.querySelectorAll('*').forEach(el => {
    if (effOpacity(el) < .2) return;
    if (el.hasAttribute('data-safe')) test(el.getBoundingClientRect(), el.id || el.className.toString(), label(el));
    [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).forEach(n => {
      const rg = document.createRange(); rg.selectNodeContents(n);
      test(rg.getBoundingClientRect(), n.textContent.trim().slice(0, 40), label(el));
    });
  });
  return found;
};
