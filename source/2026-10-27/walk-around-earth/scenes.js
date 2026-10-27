window.CLIP = { title: 'How Many Steps to Walk Around the Earth?' };

// Scene metadata (title/visual/fx/sfx/trans) is for storyboard.html; html() and update(t, q) draw the scene.
window.SCENES = [
 { title: 'Hook', trans: 'Yellow whip-wipe', cap: 'If every step is 75 cm...',
   visual: 'Night-sky gradient. A cartoon walker strolls in place while the ground scrolls. A yellow ruler grows under the feet and stamps "75 cm".',
   fx: 'Word-by-word title pop, walk cycle (legs/arms/bob), scrolling ground, ruler grow + bounce label, slow push-in camera.',
   sfx: 'Whoosh per word, soft footsteps loop, "ding" on 75 cm.',
   html: () => `<div class="bg b1"><div class="stars"></div></div>
     <div class="abs s1t">${'How many steps to walk around the world?'.split(' ').map((w, i) => `<span style="--i:${i}" class="${w === 'steps' ? 'y' : w === 'world?' ? 'cy' : ''}">${w}</span>`).join(' ')}</div>
     <div class="abs s1w">${walker()}</div><div class="abs ground"></div>
     <div class="abs ruler"></div><div class="abs c rl">75 cm</div>` },

 { title: 'The distance', trans: 'Yellow whip-wipe', cap: 'The Earth is about 40,000 km around',
   visual: 'A glowing globe spins in. A red equator line draws itself around it while a tiny walker stands on top. A big pill shows "~ 40,075 km".',
   fx: 'Globe scale/rotate entrance, seamless continent scroll, stroke-draw equator, bouncing label pill, glow.',
   sfx: 'Deep sci-fi swell, line-drawing swoosh, impact hit on the label.',
   html: () => `<div class="bg b2"><div class="stars"></div></div>
     <div class="abs pill">~ 40,075 km</div><div class="abs gw">${globe}</div><div class="abs s2w">${walker('#ffd23f')}</div>
     <div class="abs c sub2">one lap around the equator</div>` },

 { title: 'The math', trans: 'Yellow whip-wipe', cap: 'Divide by 0.75 m... it gets wild',
   visual: 'Floating math symbols rise in the background. "40,075,000 m" slides from the left, "/ 0.75 m" from the right, a bar draws, then the answer slot scrambles with random digits.',
   fx: 'Slide-in text from alternate sides, bar draw, digit-scramble slot machine, wobbling question mark, rising symbols.',
   sfx: 'Tick-tick-tick during the scramble, rising riser into the next scene.',
   html: () => `<div class="bg b3"></div>
     ${['÷', '×', '0', '7', '5', '+', '=', '4'].map((s, i) => `<span class="sym" style="left:${10 + i * 12}%;animation-delay:${-i * .8}s;animation-duration:${5 + i % 3}s">${s}</span>`).join('')}
     <div class="m m1">40,075,000 m</div><div class="m m2">÷ 0.75 m</div><div class="abs mline"></div><div class="m m3" id="res">= <span>???</span></div>`,
   update: (t, q) => {
     if (t > 2.5 && t < 4.3) q('#res').textContent = '= ' + fmt(rnd(Math.floor(t * 14)) * 99999999);
     else q('#res').innerHTML = '= <span>?!?</span>';
   } },

 { title: 'The reveal', trans: 'Yellow whip-wipe', cap: '53 million steps.',
   visual: 'Rotating light rays behind a huge counter that races from 0 to 53,433,333. Footprints stomp across the screen, then a yellow stamp slams in: "~ 53 MILLION".',
   fx: 'Eased count-up (ease-out), spinning rays, footprint stomp sequence, stamp slam with overshoot, screen shake on impact.',
   sfx: 'Fast counting ticks, bass drop + stamp hit at the end.',
   html: () => `<div class="bg b4"></div><div class="abs rays"></div>
     <div class="abs c thats">THAT'S</div><div class="abs c cnt" id="cnt">0</div><div class="abs c steps">STEPS</div>
     <div class="abs fps">${Array.from({ length: 9 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div><div class="abs stamp">~ 53 MILLION</div>`,
   update: (t, q) => { q('#cnt').textContent = fmt(53433333 * easeOut(prog(t, .3, 3))); } },

 { title: 'Time it takes', trans: 'Yellow whip-wipe', cap: '10,000 steps a day... 5,000+ days',
   visual: 'A progress ring fills to 10,000 steps. Below, a day counter races to 5,343 while a grid of squares lights up one by one.',
   fx: 'Ring stroke-fill with glow, two synchronized counters, staggered grid fill, pop-in labels.',
   sfx: 'Notification ping at 10,000, rapid calendar flips, coin-like tick for each square.',
   html: () => `<div class="bg b5"></div>
     <svg class="abs ring" viewBox="0 0 180 180"><circle cx="90" cy="90" r="78" stroke="#ffffff22"/><circle class="pg" pathLength="1" cx="90" cy="90" r="78" transform="rotate(-90 90 90)"/></svg>
     <div class="abs ringtxt"><span id="st">0</span><small>STEPS</small></div><div class="abs c perday">every single day</div>
     <div class="abs c days">× <span id="dy">0</span> <small>DAYS</small></div>
     <div class="abs grid">${Array.from({ length: 96 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>`,
   update: (t, q) => { q('#st').textContent = fmt(10000 * easeOut(prog(t, .3, 1.8))); q('#dy').textContent = fmt(5343 * easeOut(prog(t, 2, 2.6))); } },

 { title: 'Payoff', trans: 'Yellow whip-wipe', cap: '14+ years of nonstop walking',
   visual: 'Huge "14+" smashes in over a background that cycles through the four seasons. A walker crosses a timeline while the year counter climbs to 14.6.',
   fx: 'Scale-in slam, seasonal colour cycle, walker moves along progress bar, year counter, subtle shake.',
   sfx: 'Big impact, whoosh of passing time, soft clock ticks.',
   html: () => `<div class="bg b6"></div><div class="bg dim"></div>
     <div class="abs c big">14<span>+</span></div><div class="abs c yrs">YEARS</div><div class="abs c sub6">of nonstop walking. No days off.</div>
     <div class="abs s6w">${walker()}</div><div class="abs track"><i></i></div><div class="abs c yr">Year <b id="yr">0.0</b></div>`,
   update: (t, q) => { q('#yr').textContent = (14.6 * easeOut(prog(t, .8, 4.5))).toFixed(1); } },

 { title: 'Call to action', trans: 'End / loop to scene 1', cap: 'Follow for more mind-blowing math',
   visual: 'A giant golden footprint stamps onto the screen with a ripple. A pulsing "Follow for more" button appears. Source line at the bottom.',
   fx: 'Stamp slam, repeating ripple ring, pulsing button, text bounce-in. Loops smoothly back to the hook.',
   sfx: 'Stamp thud, pop sound on the button, music outro.',
   html: () => `<div class="bg b7"><div class="stars"></div></div><div class="abs cta">Ready for the first step?</div>
     <div class="abs rip"></div><div class="abs foot">${footprint}</div><div class="abs follow">Follow for more</div>
     <div class="src">Equator ~ 40,075 km  |  75 cm per step  |  10,000 steps per day</div>` },
];

// [scene index (0-based), local start s, duration s, amplitude px]; keep in step with sfx.json thuds.
window.SHAKES = [[3, 3.45, .4, 5], [5, .45, .4, 6], [6, .85, .35, 4]];
