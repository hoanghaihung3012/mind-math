window.CLIP = { title: 'How Long Is All the DNA in Your Body?' };

// One human cell holds ~6.4 billion base pairs (two copies of the genome) x 0.34 nm = ~2.2 m of DNA, call it 2 m.
// ~37 trillion cells (Bianconi et al. 2013) x 2 m = 74 billion km, if every cell held a full copy (red blood cells don't: see the debate scene).
// Distances from Earth (average, rounded): around Earth 40,075 km, Moon 384,400 km, Sun 149.6 million km, Mars ~225 million km,
// Jupiter ~780 million km, Saturn ~1.4 billion km, Uranus ~2.9 billion km, Neptune ~4.5 billion km, Pluto ~5.9 billion km,
// Voyager 1 ~25.5 billion km (late 2026, ~170 AU). 74 / 25.5 = 2.9x Voyager 1; light needs 74e9 / 299,792 s = ~69 h = ~3 days.
const KM = 7.4e10;
const sparks = (n = 14) => Array.from({ length: n }, (_, i) => `<i class="spark" style="--x:${(i * 37 + 11) % 100};--s:${i % 5}"></i>`).join('');
const bg = (theme, rays = false) => `<div class="bg ${theme}"><div class="stars"></div>${rays ? `<div class="rays"></div>${sparks()}` : ''}</div>`;
const flash = at => `<div class="flash" style="--at:${at}s"></div>`;
const words = s => s.split(' ').map((w, i) => `<span style="--i:${i}">${w}</span>`).join(' ');
const backOut = p => { const c = 1.9; return p <= 0 ? 0 : 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };

// Scene lengths = narration.json "min" (no voice). The progress bar shows from the journey on: empty when it starts, full at the answer slam.
const DUR = [3.8, 4.3, 16.2, 5.0, 4.4], START = DUR.map((_, i) => DUR.slice(0, i).reduce((a, b) => a + b, 0));
const G_END = START[3] + 0.25 + 0.3;
const helixSvg = (cls = 'hx') => `<svg class="${cls}" viewBox="0 0 20 40" preserveAspectRatio="none"><g stroke-width="2.2" stroke-linecap="round"><path d="M5 5h10M3.5 15h13M3.5 25h13M5 35h10" stroke="#ffffff66"/><path d="M2 0C2 10 18 10 18 20S2 30 2 40" fill="none" stroke="#4cc9f0" stroke-width="3"/><path d="M18 0C18 10 2 10 2 20S18 30 18 40" fill="none" stroke="#ff4d6d" stroke-width="3"/></g></svg>`;
const pbar = () => `<div class="abs pbar"><div class="track"><i class="fill"></i></div>
  ${helixSvg('pb-l')}
  <svg class="pb-r" viewBox="0 0 30 30"><path d="M15 1l4 9.5 10 .8-7.6 6.6 2.4 9.8L15 22.4 6.2 27.7l2.4-9.8L1 11.3l10-.8z" fill="#ffd23f"/></svg></div>`;
const barAt = (i, t, q) => {
  const p = clamp((START[i] + t - START[2]) / (G_END - START[2] - 0.25));
  q('.pbar').style.setProperty('--p', p);
  q('.pbar').classList.toggle('done', p >= 1);
};

const cellSvg = (cls, nucleus = true) => `<svg class="${cls}" viewBox="0 0 60 60"><circle cx="30" cy="30" r="27" fill="#ffb3c1" stroke="#ff4d6d" stroke-width="3"/>${nucleus ? '<circle cx="31" cy="29" r="11" fill="#c77dff" stroke="#7b2cbf" stroke-width="2"/><path d="M25 26c3-3 6 3 9 0M25 32c3-3 6 3 9 0" stroke="#fff" stroke-width="1.6" fill="none"/>' : ''}</svg>`;
const rbcSvg = '<svg class="rbc" viewBox="0 0 60 40"><ellipse cx="30" cy="20" rx="28" ry="17" fill="#e63946"/><ellipse cx="30" cy="20" rx="13" ry="7" fill="#a4161a"/></svg>';
const bubble = '<svg class="bub" viewBox="0 0 60 52"><path d="M8 4h44a6 6 0 0 1 6 6v24a6 6 0 0 1-6 6H24l-12 10v-10H8a6 6 0 0 1-6-6V10a6 6 0 0 1 6-6z" fill="#4cc9f0"/><circle cx="18" cy="22" r="4" fill="#fff"/><circle cx="30" cy="22" r="4" fill="#fff"/><circle cx="42" cy="22" r="4" fill="#fff"/></svg>';

// ---- the journey: log scale in km, PX px per power of ten; the strand grows from the ground (0 km) and its tip settles at TOPY by 1,000 km ----
const PX = 200, TOPY = 300, lg = Math.log10;
const SLOW = 1.125; // the journey's beats below are written at 1x, then played 12.5% slower so the labels can be read
// [local time, log10 km]; gaps shrink as the journey speeds up; each milestone gets a ting in sfx.json at its time
const L0 = -3; // 1 m, where the tip leaves the ground
const KEYS = [[0.3, L0], [1.3, lg(40075)], [2.5, lg(3.844e5)], [3.6, lg(1.496e8)], [4.6, lg(2.25e8)], [5.5, lg(7.8e8)], [6.3, lg(1.43e9)], [7.0, lg(2.9e9)], [7.6, lg(4.5e9)], [8.2, lg(5.9e9)], [9.2, lg(2.55e10)], [9.8, lg(2.55e10)], [13.2, lg(KM)]];
const MILES = [[1.3, 'AROUND EARTH'], [2.5, 'THE MOON'], [3.6, 'THE SUN!'], [4.6, 'MARS'], [5.5, 'JUPITER'], [6.3, 'SATURN'], [7.0, 'URANUS'], [7.6, 'NEPTUNE'], [8.2, 'PLUTO!'], [9.2, 'VOYAGER 1'], [13.2, 'ALL OF IT!']];
const altLog = t => {
  if (t <= KEYS[0][0]) return KEYS[0][1];
  for (let k = 1; k < KEYS.length; k++) {
    const [t1, l1] = KEYS[k], [t0, l0] = KEYS[k - 1];
    if (t <= t1) {
      const p = (t - t0) / (t1 - t0);
      const e = k === KEYS.length - 1 ? Math.pow(p, 2.4) : .45 * p + .55 * p * p * (3 - 2 * p);
      return l0 + (l1 - l0) * e;
    }
  }
  return KEYS.at(-1)[1];
};
const kmTxt = km => km < 1 ? [fmt(km * 1000), 'METERS'] : km < 1e6 ? [fmt(km), 'KM'] : km < 1e9 ? [(km / 1e6).toFixed(km < 1e7 ? 1 : 0), 'MILLION KM'] : [(km / 1e9).toFixed(1), 'BILLION KM'];
const ring = '<svg viewBox="0 0 100 40"><ellipse cx="50" cy="20" rx="47" ry="11" fill="none" stroke="#e9d8a6" stroke-width="5"/></svg>';
const voyager = '<svg viewBox="0 0 60 50"><path d="M30 26 8 6M30 26l24-4" stroke="#ccd" stroke-width="2"/><circle cx="30" cy="20" r="15" fill="#e8e8f0"/><circle cx="30" cy="20" r="11" fill="#c9ccd8"/><rect x="24" y="30" width="12" height="10" fill="#ffd23f"/><path d="M30 40v8" stroke="#ccd" stroke-width="2"/></svg>';
// [class, distance km, size px, x left]
const BODIES = [['moon', 3.844e5, 34, 236], ['sun', 1.496e8, 120, 30], ['mars', 2.25e8, 26, 244], ['jupiter', 7.8e8, 64, 44], ['saturn', 1.43e9, 50, 226], ['uranus', 2.9e9, 34, 70], ['neptune', 4.5e9, 34, 238], ['pluto', 5.9e9, 18, 80], ['voy', 2.55e10, 52, 222]];

window.SCENES = [
  { title: 'Hook: all your DNA, unrolled', cap: 'All the DNA in your body, unrolled. How long?',
    visual: '"ALL YOUR DNA" words in, a big twisting double helix slams in with a flash, "UNROLLED END TO END", then "HOW LONG?".',
    fx: 'Rays + sparks, riser into a white flash and slam with a shake, helix twists, question pops and pulses. Vertical progress bar on the left.',
    sfx: 'Riser, thud + chime on the slam, pop on "unrolled", pop on the question. Build-up music starts slow.',
    html: () => `${bg('b1', true)}${flash(.45)}<div class="abs c kicker">${words('ALL YOUR DNA')}</div>
      <div class="abs bighx">${helixSvg('hxv')}</div>
      <div class="abs c unr">UNROLLED<br><span>END TO END</span></div>
      <div class="abs c howlong">HOW LONG?</div>` },

  { title: 'One cell x 37 trillion', cap: '2 m per cell x 37 trillion cells',
    visual: 'A cell pops in, a DNA strand unrolls out of it into a bar with "2 METERS"; then "x 37 TRILLION CELLS" slams and a field of cells fills in.',
    fx: 'Cell pops, strand scales out left to right, "2 m" stamps, 37 trillion slams with a flash, tiny cells pop in fast.',
    sfx: 'Pop on the cell, whoosh as the strand unrolls, pop on 2 m, thud on 37 trillion, fast ticks while cells fill.',
    html: () => `${bg('b4')}${flash(2.0)}<div class="abs c kicker sm">1 CELL</div>
      <div class="abs cell1">${cellSvg('cs')}</div>
      <div class="abs unroll"></div><div class="abs c twom">= 2 METERS</div>
      <div class="abs c x37">× 37 TRILLION</div><div class="abs c cells">CELLS</div>
      <div class="abs c field">${Array.from({ length: 24 }, (_, i) => `<i style="--i:${i}">${cellSvg('ci')}</i>`).join('')}</div>` },

  { title: 'The journey', cap: 'Around Earth, Moon, Sun, planets, Pluto, Voyager... all of it',
    visual: 'One continuous flight: a DNA strand grows up from the ground (counter starts at 0) and away from a shrinking Earth, the camera rides its glowing tip. Distance counter at the top. On a log scale the Moon, Sun, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto and Voyager 1 slide past, each with a banner. Milestones come faster and faster; after Voyager "KEEP GOING..." and the counter races to 74 BILLION KM with "ALL OF IT!".',
    fx: 'Distance eases milestone to milestone, banner pops per landmark, warp streaks grow stronger over time, the counter turns hot red in the final ramp.',
    sfx: 'A ting on every milestone, each a step higher and closer together; long riser from Voyager, ting + thud on "ALL OF IT!". Music speeds up the whole time.',
    html: () => `<div class="bg space"><div class="stars"></div><div class="warp"></div></div>
      <div class="abs earth"></div><div class="abs earthring"></div>
      ${BODIES.map(([k, , s, x]) => `<div class="abs body ${k}" style="width:${k === 'saturn' ? s * 1.9 : s}px;height:${s}px;left:${k === 'saturn' ? x - s * .45 : x}px">${k === 'saturn' ? `<i></i>${ring}` : k === 'voy' ? voyager : ''}</div>`).join('')}
      <div class="abs strand"></div><div class="abs tip"></div>
      <div class="abs c alt" id="alt">1,000</div><div class="abs c unit" id="unit">KM</div>
      <div class="abs c ban" id="ban"></div><div class="abs c go">KEEP GOING...</div>${pbar()}`,
    update: (tt, q) => {
      barAt(2, tt, q);
      const t = tt / SLOW;
      const L = altLog(t), ey = 560, up = clamp((L - L0) / (3 - L0)), tipY = ey - (ey - TOPY) * (1 - Math.pow(1 - up, 2)), Y = l => tipY + (L - l) * PX;
      const [num, unit] = t <= KEYS[0][0] ? ['0', 'KM'] : kmTxt(Math.pow(10, L));
      q('#alt').textContent = num; q('#unit').textContent = unit;
      // the Earth shrinks as the strand flies away
      const R = 420 * Math.pow(10, -Math.max(L - 3, 0) * .36);
      Object.assign(q('.earth').style, { width: `${2 * R}px`, height: `${2 * R}px`, left: `${180 - R}px`, top: `${ey}px` });
      const rp = prog(t, 1.2, .3) * (1 - prog(t, 2.3, .4));
      Object.assign(q('.earthring').style, { width: `${2 * R + 16}px`, height: `${2 * R + 16}px`, left: `${172 - R}px`, top: `${ey - 8}px`, opacity: rp });
      q('.strand').style.top = `${tipY}px`;
      q('.strand').style.height = `${ey + Math.min(R, 6) - tipY}px`;
      q('.tip').style.top = `${tipY - 10}px`;
      q('.strand').style.backgroundPositionY = `${(L * PX * 1.4) % 40}px`;
      for (const [k, km, s] of BODIES) { const y = Y(lg(km)) - s / 2, el = q('.' + k); el.style.top = `${y}px`; el.style.display = y < -160 || y > 700 ? 'none' : ''; }
      q('.stars').style.backgroundPositionY = `${L * 90}px`;
      const w = clamp((t - 3) / 10);
      q('.warp').style.opacity = .15 + .75 * w * w;
      q('.warp').style.backgroundPositionY = `${L * 900}px`;
      const m = MILES.filter(([tm]) => t >= tm).at(-1), ban = q('#ban');
      if (m && (t < 9.8 || t >= 13.2)) { ban.textContent = m[1]; ban.style.opacity = 1; ban.style.transform = `scale(${backOut(prog(t, m[0], .3))})`; }
      else ban.style.opacity = 0;
      q('.go').style.transform = `scale(${t < 13.2 ? backOut(prog(t, 9.8, .4)) : 0})`;
      q('.alt').classList.toggle('hot', t > 9.8);
      q('.tip').style.transform = `scale(${1 + .6 * w + .25 * Math.sin(t * (8 + 20 * w))})`;
    } },

  { title: 'The answer: BOOM', cap: '~74 billion km: 3x past Voyager 1',
    visual: 'Explosion: white flash, shock rings and a burst of rays; "~74 BILLION KM" slams. Then "3× PAST VOYAGER 1" and "LIGHT NEEDS ~3 DAYS" pop in. Progress bar completes at the slam.',
    fx: 'Big flash + shockwave rings + heavy shake; the bar hits 100% and glows; two payoff lines pop.',
    sfx: 'Music drop: silence gap, then boom + thud + chime (the climax); pop on each payoff line.',
    html: () => `${bg('b5', true)}<div class="abs boom"><i></i><i></i><i></i></div>${flash(.3)}
      <div class="abs c kicker sm">THAT'S</div>
      <div class="abs c n74">~74</div><div class="abs c bkm">BILLION KM</div>
      <div class="abs c pay1">3× PAST <span>VOYAGER 1</span></div>
      <div class="abs c pay2">LIGHT NEEDS <span>~3 DAYS</span></div>${pbar()}`,
    update: (t, q) => barAt(3, t, q) },

  { title: 'Debate + subscribe', trans: 'End', cap: 'Red blood cells have no DNA. Count them or not?',
    visual: '"BUT RED BLOOD CELLS / HAVE NO DNA!" over a row of red blood cells with a cross, then "COUNT THEM OR NOT?", comment bubble and Subscribe pill.',
    fx: 'Question slams, red cells wobble, bubble wobbles, Subscribe pulses.',
    sfx: 'Pop on the cells, pop on Comment, chime on Subscribe.',
    html: () => `${bg('b1', true)}<div class="abs c far">BUT RED BLOOD CELLS<br><span>HAVE NO DNA!</span></div>
      <div class="abs c rbcs">${[0, 1, 2].map(i => `<i style="--i:${i}">${rbcSvg}</i>`).join('')}</div>
      <div class="abs c ornot">COUNT THEM OR NOT?</div>
      <div class="abs c cta">${bubble}<b>COMMENT</b></div><div class="abs c sub">SUBSCRIBE</div>` },
];

// [scene index, local start, duration, amplitude]; keep in step with sfx.json thuds
window.SHAKES = [[0, .45, .4, 5], [1, 2.0, .35, 5], [2, 13.2 * SLOW, .35, 4], [3, .3, .8, 9]];
