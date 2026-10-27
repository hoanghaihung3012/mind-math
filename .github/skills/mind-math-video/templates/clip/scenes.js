window.CLIP = { title: 'Your Question Here' };

// Scene metadata (title/visual/fx/sfx/trans) is for storyboard.html; html() and update(t, q) draw the scene.
// Helpers from the skill's engine.js: fmt, easeOut, prog(t, delay, dur), rnd, walker(), footprint, globe.
window.SCENES = [
 { title: 'Hook', trans: 'Yellow whip-wipe', cap: 'Caption for scene 1',
   visual: 'Describe what is on screen.',
   fx: 'Describe the motion: word pops, walk cycle, push-in...',
   sfx: 'Whoosh per word.',
   html: () => `<div class="bg b1"><div class="stars"></div></div>
     <div class="abs title">${'Your question here?'.split(' ').map((w, i) => `<span style="--i:${i}">${w}</span>`).join(' ')}</div>
     <div class="abs hero">${walker()}</div>` },

 { title: 'Reveal', trans: 'End / loop to scene 1', cap: 'Follow for more mind-blowing math',
   visual: 'Giant counter to the answer, stamp slams in.',
   fx: 'Ease-out count-up, stamp with overshoot, camera shake.',
   sfx: 'Counting ticks, bass drop on the stamp.',
   html: () => `<div class="bg b2"><div class="stars"></div></div>
     <div class="abs c cnt" id="cnt">0</div><div class="abs stamp">~ 1 MILLION</div>`,
   update: (t, q) => { q('#cnt').textContent = fmt(1000000 * easeOut(prog(t, .3, 2.5))); } },
];

// [scene index (0-based), local start s, duration s, amplitude px]; keep in step with sfx.json thuds.
window.SHAKES = [[1, 2.9, .4, 5]];
