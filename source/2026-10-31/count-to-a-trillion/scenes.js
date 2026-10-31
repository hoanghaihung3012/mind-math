window.CLIP = { title: 'How Long to Count to a Trillion?' };

// 1 number per second. Year = 365.25 days = 31,557,600 s.
// 1e6 s = 11.57 days, 1e9 s = 31.7 years, 1e12 s = 31,688 years (rounded to 31,700).
const sparks = (n = 14) => Array.from({ length: n }, (_, i) => `<i class="spark" style="--x:${(i * 37 + 11) % 100};--s:${i % 5}"></i>`).join('');
const bg = (theme, rays = false) => `<div class="bg ${theme}"><div class="stars"></div>${rays ? `<div class="rays"></div>${sparks()}` : ''}</div>`;
const flash = at => `<div class="flash" style="--at:${at}s"></div>`;
const words = s => s.split(' ').map((w, i) => `<span style="--i:${i}">${w}</span>`).join(' ');

const clock = '<svg class="clock" viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" fill="#11152d" stroke="#4cc9f0" stroke-width="6"/><path d="M40 12v6M40 62v6M12 40h6M62 40h6" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path class="hand" d="M40 40V18" stroke="#ffd23f" stroke-width="5" stroke-linecap="round"/><circle cx="40" cy="40" r="4" fill="#ff4d6d"/></svg>';
const calendar = '<svg class="cal" viewBox="0 0 80 80"><rect x="6" y="12" width="68" height="62" rx="8" fill="#fff9e8"/><rect x="6" y="12" width="68" height="18" rx="8" fill="#ff4d6d"/><rect x="6" y="22" width="68" height="8" fill="#ff4d6d"/><path d="M22 6v14M58 6v14" stroke="#1b1f5e" stroke-width="6" stroke-linecap="round"/></svg>';
const person = (c, h = 1) => `<svg class="pp" style="--h:${h}" viewBox="0 0 24 56"><circle cx="12" cy="7" r="6" fill="#ffd9b0"/><rect x="6" y="15" width="12" height="22" rx="4" fill="${c}"/><path d="M9 37v16M15 37v16" stroke="#2b3a67" stroke-width="5" stroke-linecap="round"/></svg>`;
const mammoth = '<svg class="mam" viewBox="0 0 90 70"><path d="M14 30c0-16 16-24 34-24s30 8 30 22v26h-9V40H58v14h-9V40H30v14h-9V40c-4-2-7-5-7-10z" fill="#a0764e"/><path d="M14 30c-6 6-8 16-3 24" stroke="#a0764e" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M18 38c4 8 14 10 20 4" stroke="#fff6dc" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="26" cy="22" r="3" fill="#1b1f5e"/></svg>';
const pyramid = '<svg class="pyr" viewBox="0 0 60 44"><polygon points="30,2 58,42 2,42" fill="#ffd23f"/><polygon points="30,2 58,42 34,42" fill="#d9a520"/></svg>';
const bubble = '<svg class="bub" viewBox="0 0 60 52"><path d="M8 4h44a6 6 0 0 1 6 6v24a6 6 0 0 1-6 6H24l-12 10v-10H8a6 6 0 0 1-6-6V10a6 6 0 0 1 6-6z" fill="#4cc9f0"/><circle cx="18" cy="22" r="4" fill="#fff"/><circle cx="30" cy="22" r="4" fill="#fff"/><circle cx="42" cy="22" r="4" fill="#fff"/></svg>';

window.SCENES = [
  { title: 'Hook: count to a trillion', cap: '1 number per second. How long?',
    visual: '"COUNT TO" over a giant "1 TRILLION" slam, the twelve zeros underneath, a ticking clock "= 1 SEC", then "HOW LONG?".',
    fx: 'Rays + rising sparks, riser into a white flash and slam with a shake; clock hand ticks once per second; question pops.',
    sfx: 'Riser, thud + chime on the slam, three clock ticks, pop on the question.',
    html: () => `${bg('b1', true)}${flash(.7)}<div class="abs c kicker">${words('COUNT TO')}</div>
      <div class="abs c big1">1 TRILLION</div><div class="abs c zeros">1,000,000,000,000</div>
      <div class="abs c persec">${clock}<b>= 1 SEC</b></div><div class="abs c howlong">HOW LONG?</div>` },

  { title: 'One million', cap: '1 million: about 11.6 days',
    visual: 'Counter racing to 1,000,000, a calendar with "11.6 DAYS" and 12 day boxes filling.',
    fx: 'Ease-out count-up, calendar pops, day boxes fill one by one.',
    sfx: 'Fast ticks while counting, chime on the answer.',
    html: () => `${bg('b2')}<div class="abs c label">1 MILLION</div><div class="abs c cnt" id="cnt">0</div>
      <div class="abs c ans">${calendar}<b>11.6<small>DAYS</small></b></div>
      <div class="abs c days">${Array.from({ length: 12 }, (_, i) => `<i style="--i:${i}"${i === 11 ? ' class="part"' : ''}></i>`).join('')}</div>`,
    update: (t, q) => { const p = easeOut(prog(t, .3, 1.1)); q('#cnt').textContent = fmt(1e6 * p); q('.days').style.setProperty('--f', clamp((t - 1.8) / 1.0)); } },

  { title: 'One billion', cap: '1 billion: almost 32 years',
    visual: 'Counter racing to 1,000,000,000, then a kid growing into an adult beside "~32 YEARS".',
    fx: 'Count-up, the person grows taller, number pops.',
    sfx: 'Fast ticks, chime on the answer.',
    html: () => `${bg('b3')}<div class="abs c label">1 BILLION</div><div class="abs c cnt sm" id="cnt">0</div>
      <div class="abs c grow"><div class="kid">${person('#4cc9f0')}</div><div class="arrowr">➜</div><div class="adult">${person('#ff4d6d')}</div><b>~32<small>YEARS</small></b></div>`,
    update: (t, q) => { q('#cnt').textContent = fmt(1e9 * easeOut(prog(t, .3, .9))); } },

  { title: 'One trillion: the reveal', cap: '1 trillion: 31,700 YEARS',
    visual: '"1 TRILLION?" then a giant year counter 0 -> 31,700 with rays, "YEARS!" stamp.',
    fx: 'Riser while counting, white flash + stamp slam at the answer, camera shake.',
    sfx: 'Riser and ticks, heavy thud on the stamp.',
    html: () => `${bg('b4', true)}${flash(2.9)}<div class="abs c label pk">1 TRILLION?</div>
      <div class="abs c huge" id="yrs">0</div><div class="abs c stamp">YEARS!</div>`,
    update: (t, q) => { q('#yrs').textContent = fmt(31700 * easeOut(prog(t, 1, 1.4))); } },

  { title: 'Longer than history', cap: 'Start in the Ice Age!',
    visual: 'A timeline: mammoth at 31,700 years ago on the left, pyramid near the right, TODAY at the end. A pink band marks all recorded history (~5,000 years); a yellow dot travels the whole bar.',
    fx: 'Bar draws left to right, dot travels, history band pops, "ICE AGE" label pops at the start.',
    sfx: 'Long whoosh with the bar, pop on the history band, chime on "Ice Age".',
    html: () => `${bg('b5')}<div class="abs c label">LONGER THAN</div><div class="abs c hist">ALL OF HISTORY</div>
      <div class="abs tl"><div class="bar"></div><div class="band"></div><div class="dot"></div>
        <div class="tick t0"></div><div class="tick t1"></div>
        <div class="ic m">${mammoth}</div><div class="ic p">${pyramid}</div>
        <div class="tlab l0">31,700<br>YRS AGO</div><div class="tlab l1">TODAY</div><div class="tlab band-l">WRITTEN HISTORY<br>~5,000 YRS</div></div>
      <div class="abs c ice">❄ ICE AGE ❄</div>` },

  { title: 'Comment + loop', trans: 'End / loops to the hook', cap: 'Ready? One...',
    visual: '"HOW FAR WOULD YOU GET?", comment bubble, Subscribe pill, then a giant "1" that loops into the hook.',
    fx: 'Question pops, bubble wobbles, Subscribe pulses, the "1" slams in at the end.',
    sfx: 'Pop on Comment, chime on Subscribe, a single clock tick on "One".',
    html: () => `${bg('b1', true)}<div class="abs c far">HOW FAR<br><span>WOULD YOU GET?</span></div>
      <div class="abs c cta">${bubble}<b>COMMENT</b></div><div class="abs c sub">SUBSCRIBE</div>
      <div class="abs c one">1</div>` },
];

// [scene index, local start, duration, amplitude]; keep in step with sfx.json thuds
window.SHAKES = [[0, .7, .4, 5], [3, 2.9, .4, 6]];
