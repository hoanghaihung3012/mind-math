window.CLIP = { title: 'Double $1 Every Day: When Do You Pass One Million?' };

const money = n => '$' + fmt(n);
const cum = d => Math.pow(2, d) - 1; // total received after d days of doubling from $1
const bars = (n, max) => Array.from({ length: n }, (_, i) => `<i style="--i:${i};--h:${(cum(i + 1) / max).toFixed(6)}"></i>`).join('');
const words = s => s.split(' ').map((w, i) => `<span style="--i:${i}">${w}</span>`).join(' ');
// Linear interpolation through [time, value] keypoints, so the camera can follow the voice-over.
const ramp = (t, pts) => {
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const [t0, v0] = pts[i - 1], [t1, v1] = pts[i]; return v0 + (v1 - v0) * (t - t0) / (t1 - t0); }
  return pts.at(-1)[1];
};

// ---- coin tower: a US dollar coin is 2 mm thick, so the stack after d days is (2^d - 1) * 2 mm ----
// Layout stays inside the safe area (see shared/base.css): content between y 52 and 440, captions below it.
const COIN_M = .002, BASE_Y = 404, TOWER_PX = 230;
const heightM = d => cum(d) * COIN_M;
const fmtH = m => m < 1 ? (m * 100).toFixed(m < .1 ? 1 : 0) + ' cm' : m < 10 ? m.toFixed(1) + ' m' : m < 1000 ? Math.round(m) + ' m' : (m < 1e4 ? (m / 1000).toFixed(1) : fmt(m / 1000)) + ' km';
const mix = (a, b, k) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`;

const SVG = {
  person: `<svg viewBox="0 0 38 100" preserveAspectRatio="none"><circle cx="19" cy="11" r="9" fill="#ffd9b0"/><rect x="8" y="22" width="22" height="42" rx="10" fill="#ff4d6d"/><rect x="9" y="60" width="9" height="40" rx="4" fill="#2b3a67"/><rect x="20" y="60" width="9" height="40" rx="4" fill="#2b3a67"/></svg>`,
  building: `<svg viewBox="0 0 65 100" preserveAspectRatio="none"><rect x="2" y="4" width="61" height="96" rx="3" fill="#5b6fb3"/>${[0, 1, 2].flatMap(r => [0, 1].map(c => `<rect x="${12 + c * 28}" y="${14 + r * 24}" width="16" height="14" fill="#ffd23f"/>`)).join('')}<rect x="26" y="82" width="14" height="18" fill="#2b3a67"/></svg>`,
  bigben: `<svg viewBox="0 0 22 100" preserveAspectRatio="none"><polygon points="11,0 3,26 19,26" fill="#7a5a2b"/><rect x="3" y="26" width="16" height="74" fill="#c9a46a"/><circle cx="11" cy="38" r="6" fill="#fff"/><rect x="5" y="52" width="12" height="3" fill="#a07f4a"/><rect x="5" y="64" width="12" height="3" fill="#a07f4a"/><rect x="5" y="76" width="12" height="3" fill="#a07f4a"/></svg>`,
  eiffel: `<svg viewBox="0 0 40 100" preserveAspectRatio="none"><polygon points="20,0 24,26 30,56 40,100 31,100 27,78 13,78 9,100 0,100 10,56 16,26" fill="#b08968"/><rect x="12" y="52" width="16" height="3" fill="#7a5a3a"/><rect x="14" y="30" width="12" height="3" fill="#7a5a3a"/></svg>`,
  burj: `<svg viewBox="0 0 14 100" preserveAspectRatio="none"><rect x="6.5" y="0" width="1" height="22" fill="#cfe8f7"/><rect x="5" y="20" width="4" height="22" fill="#9ecae1"/><rect x="3.5" y="40" width="7" height="24" fill="#9ecae1"/><rect x="2" y="62" width="10" height="38" fill="#7fb3d5"/></svg>`,
  everest: `<svg viewBox="0 0 90 100" preserveAspectRatio="none"><polygon points="0,100 34,34 46,46 62,2 90,100" fill="#6b7aa1"/><polygon points="62,2 54,30 60,24 66,32 70,22" fill="#fff"/></svg>`,
};
const ICON = {
  star: `<svg width="14" height="14" viewBox="0 0 20 20"><polygon points="10,0 12.5,7 20,7.5 14,12 16,20 10,15.5 4,20 6,12 0,7.5 7.5,7" fill="#ffd23f"/></svg>`,
  iss: `<svg width="30" height="14" viewBox="0 0 44 20"><rect x="0" y="2" width="14" height="16" fill="#4cc9f0"/><rect x="16" y="7" width="12" height="6" fill="#ddd"/><rect x="30" y="2" width="14" height="16" fill="#4cc9f0"/></svg>`,
};
// x = horizontal centre of the silhouette, h = real height in metres, asp = width / height of the drawing
const OBJECTS = [
  { id: 'person', name: 'PERSON', label: '1.75 m', h: 1.75, asp: .38, x: 126 },
  { id: 'building', name: '3-STORY HOUSE', label: '10 m', h: 10, asp: .65, x: 158 },
  { id: 'bigben', name: 'BIG BEN', label: '96 m', h: 96, asp: .22, x: 190 },
  { id: 'eiffel', name: 'EIFFEL TOWER', label: '330 m', h: 330, asp: .4, x: 222 },
  { id: 'burj', name: 'BURJ KHALIFA', label: '828 m', h: 828, asp: .14, x: 252 },
  { id: 'everest', name: 'MT. EVEREST', label: '8,849 m', h: 8849, asp: .9, x: 206 },
];
const MARKERS = [
  { id: 'space', name: 'SPACE 100 km', h: 1e5, icon: ICON.star },
  { id: 'iss', name: 'ISS 408 km', h: 408000, icon: ICON.iss },
];

// The tower is always TOWER_PX tall on screen; the world zooms out so everything else shrinks to real scale.
const towerHtml = () => `<div class="bg" id="sky"></div><div id="stw"><div class="stars"></div></div>
  ${MARKERS.map(m => `<div class="abs mk" id="mk-${m.id}"><span>${m.icon}${m.name}</span></div>`).join('')}
  <div class="abs ground2"></div>
  ${OBJECTS.map(o => `<div class="obj" id="o-${o.id}"><div class="ol">${o.name}<br>${o.label}</div>${SVG[o.id]}</div>`).join('')}
  <div class="abs tw" id="tw"></div><div class="abs hgt" id="hgt"></div>
  <div class="abs c day" id="day"></div><div class="abs c amt" id="amt"></div>`;

function towerUpdate(q, d) {
  const H = Math.max(heightM(d), 1e-6), day = Math.floor(d + 1e-9), amount = money(cum(day));
  const k = clamp((Math.log10(H) + 2) / 7.2);
  q('#sky').style.background = mix([47, 127, 209], [4, 4, 15], k);
  q('#stw').style.opacity = (k * k).toFixed(3);
  q('#day').textContent = 'DAY ' + day;
  q('#amt').textContent = amount;
  q('#amt').style.fontSize = Math.min(46, Math.floor(470 / amount.length)) + 'px';
  q('#hgt').textContent = '↑ ' + fmtH(H);
  const c = COIN_M * TOWER_PX / H; // one coin's height in px
  q('#tw').style.background = c >= 6
    ? `repeating-linear-gradient(to top,#ffd23f 0 ${(c - 2).toFixed(2)}px,#9a6a00 ${(c - 2).toFixed(2)}px ${c.toFixed(2)}px)`
    : 'linear-gradient(90deg,#b57a00,#ffe27a 35%,#e6a817 65%,#8a5a00)';
  for (const o of OBJECTS) {
    const el = q('#o-' + o.id), r = o.h / H, px = r * TOWER_PX;
    if (r > 1 || px < 4) { el.style.display = 'none'; continue; }
    el.style.display = 'block';
    el.style.height = px + 'px';
    el.style.width = px * o.asp + 'px';
    el.style.left = (o.x - px * o.asp / 2) + 'px';
    const lb = el.firstChild;
    lb.style.display = px >= 16 ? 'block' : 'none';
    lb.style.color = r > .6 ? '#ffd23f' : '#fff';
    lb.style.fontSize = r > .6 ? '12px' : '10px';
  }
  for (const m of MARKERS) {
    const el = q('#mk-' + m.id), r = m.h / H;
    if (r > 1.1 || r < .04) { el.style.display = 'none'; continue; }
    el.style.display = 'block';
    el.style.top = (BASE_Y - r * TOWER_PX) + 'px';
    el.style.color = r > .98 ? '#ffd23f' : '#fff';
  }
}

window.SCENES = [
 { title: 'Hook', trans: 'Yellow whip-wipe', cap: 'Take $1,000,000 now... or $1 doubling daily?',
   visual: 'Two choices face off: a green "$1,000,000 right now" card slides in from the left, a gold "$1, doubles every day" card from the right, with an "OR" badge between them.',
   fx: 'Word-pop title, side slide-ins with overshoot (timed to the voice), OR badge pop, coin shine, slow push-in.',
   sfx: 'Whoosh per card, cash-register ding on the million card.',
   html: () => `<div class="bg b1"><div class="stars"></div></div>
     <div class="abs title">${words('Which one would you take?')}</div>
     <div class="abs optA"><small>RIGHT NOW</small><b>$1,000,000</b></div>
     <div class="abs or">OR</div>
     <div class="abs optB"><div class="coin" style="width:62px;height:62px;font-size:26px">$1</div><div><small>DOUBLES</small><b>EVERY DAY</b></div></div>` },

 { title: 'Stacks that double', trans: 'Yellow whip-wipe', cap: 'Every day the pile of coins doubles in height',
   visual: 'Six stacks of gold coins side by side: 1, 2, 4, 8, 16 and 32 coins. Each stack is twice as tall as the one before, with its dollar amount floating above and its day label below.',
   fx: 'Coins drop in one by one with a stagger, labels pop above each stack, a "1 dollar coin = 2 mm thick" note sets up the tower scene.',
   sfx: 'Coin clinks while each stack builds, pitch rising with each day.',
   html: () => `<div class="bg b2"></div>
     <div class="abs c rule">Doubles every day <span class="x2">×2</span></div>
     <div class="abs stks">${[1, 2, 4, 8, 16, 32].map((n, k) => `<div class="sw" style="--d:${[.9, 2.6, 4.4, 5.4, 6.1, 6.7][k]}s"><b>$${n}</b><div class="stk">${Array.from({ length: n }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div></div>`).join('')}</div>
     <div class="abs dls">${[1, 2, 3, 4, 5, 6].map(k => `<span>DAY ${k}</span>`).join('')}</div>
     <div class="abs note2">1 dollar coin = 2 mm thick</div>` },

 { title: 'Slow start', trans: 'Yellow whip-wipe', cap: 'After a week: only $127',
   visual: 'A giant green bar "$1,000,000" towers on the left. On the right, seven tiny bars (the doubling dollar) grow day by day. Counter shows DAY n and the running total, ending at $127 and a 25 cm stack.',
   fx: 'Big bar rises first, tiny bars pop one per day, synchronized DAY/amount counters, contrast in scale.',
   sfx: 'Tick per day, a sad "womp" at the end.',
   html: () => `<div class="bg b3"></div>
     <div class="abs c day" id="day">DAY 1</div><div class="abs c amt" id="amt">$1</div>
     <div class="abs c hgt3">stack height: 25 cm</div>
     <div class="abs mil"><b>$1,000,000</b></div>
     <div class="abs chart small" style="--step:.35s;--start:.6s">${bars(7, 1e6)}</div><div class="abs base"></div>
     <div class="abs lbl2 l1">TAKE IT NOW</div><div class="abs lbl2 l2">YOUR DOUBLING $1</div>`,
   update: (t, q) => { const d = clamp(Math.floor((t - .6) / .35) + 1, 1, 7); q('#day').textContent = 'DAY ' + d; q('#amt').textContent = money(cum(d)); } },

 { title: 'Coin tower', trans: 'Yellow whip-wipe', cap: 'Taller than the Burj Khalifa by day 18',
   visual: 'The coin stack becomes a gold tower while the camera keeps zooming out. A person, a house, Big Ben, the Eiffel Tower and the Burj Khalifa appear at their real size next to it as the tower overtakes each one. Sky darkens as it climbs. Ends on day 20 with "OVER $1 MILLION!".',
   fx: 'Real-scale zoom-out (everything shrinks as the tower doubles), live height readout, coin stripes that thin out, overtaken objects highlighted in yellow, stamp slam + shake.',
   sfx: 'Rising riser that follows the zoom, whoosh as each object is passed, bass drop on the stamp.',
   html: () => towerHtml() + `<div class="abs stamp" style="--d:11s;top:176px">OVER $1 MILLION!</div>`,
   update: (t, q) => towerUpdate(q, ramp(t, [[.6, 3], [3, 9.8], [3.3, 10], [5, 11], [5.8, 13], [6.6, 18], [8.2, 18.75], [10.3, 20]])) },

 { title: 'To space', trans: 'Yellow whip-wipe', cap: 'Day 26: the coin tower reaches space',
   visual: 'The zoom-out continues from day 20 to 30: the tower overtakes Mount Everest, crosses the 100 km space line and the ISS orbit, and ends at 2,147 km. The sky fades to black with stars. Stamps: "$1.07 BILLION" and "2,147 km TALL".',
   fx: 'Same real-scale zoom, dashed altitude markers (space, ISS) with icons, sky-to-space gradient, two stamps with shake.',
   sfx: 'Long riser, wind fading into silence in space, huge impact on the billion stamp.',
   html: () => towerHtml() + `<div class="abs stamp" style="--d:8.2s;top:176px">$1.07 BILLION</div><div class="abs stamp k2" style="--d:8.9s;top:236px">2,147 km TALL</div>`,
   update: (t, q) => towerUpdate(q, ramp(t, [[.6, 20], [1.4, 22.1], [1.7, 23], [3, 23.4], [3.7, 24.2], [4.7, 26], [6.3, 27.6], [7.3, 30]])) },

 { title: 'Call to action', trans: 'End / loop to scene 1', cap: 'Would you still take the million?',
   visual: 'Two buttons: "TAKE $1,000,000" gets struck through and fades, "DOUBLE IT DAILY" glows gold and pulses. A "Follow for more" button appears below.',
   fx: 'Word-pop title, strike-through line grows, pulsing gold button, ripple ring, push-in.',
   sfx: 'Swipe on the strike-through, pop on the follow button, music outro.',
   html: () => `<div class="bg b7"><div class="stars"></div></div>
     <div class="abs cta">${words('Still taking the million?')}</div>
     <div class="abs btnA">TAKE $1,000,000</div><div class="abs btnB">DOUBLE IT DAILY</div>
     <div class="abs rip"></div><div class="abs follow">Follow for more</div>
     <div class="abs src">Day 20: $1,048,575  |  Day 30: $1,073,741,823</div>` },
];

// [scene index (0-based), local start s, duration s, amplitude px]; matches the thuds in sfx.json.
window.SHAKES = [[3, 11, .4, 5], [4, 8.2, .4, 6]];
