// Storyboard preview: cards per scene + a full-length player. Reads window.SCENES and /narration.json.
(async () => {
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const NAR = await (await fetch('/narration.json')).json();
  const SC = window.SCENES;
  const CLIP = window.CLIP || {};

  let t0 = 0;
  SC.forEach((s, i) => { s.vo = NAR[i].text; s.dur = NAR[i].min; s.start = t0; t0 += s.dur; });
  const total = t0;
  const clock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  document.getElementById('title').textContent = CLIP.title || 'Untitled clip';
  document.title = `Storyboard - ${CLIP.title || 'clip'}`;
  document.getElementById('chips').innerHTML = [['Format', '9:16 Short'], ['Length', `~${Math.round(total)} s (adjusted to the voice)`], ['Scenes', SC.length], ['Status', 'Preview only (no audio)']]
    .map(([k, v]) => `<span class="chip">${k} <b>${v}</b></span>`).join('');

  function scaleAll() { document.querySelectorAll('.stage').forEach(s => { const sc = `scale(${s.clientWidth / 360})`; s.querySelector('.inner').style.transform = sc; s.querySelectorAll('.safeov').forEach(o => { o.style.transform = sc; }); }); }
  new ResizeObserver(scaleAll).observe(document.body);
  document.querySelectorAll('.stage').forEach(s => s.insertAdjacentHTML('beforeend', '<div class="safeov"><i class="zt"></i><i class="zb"></i><i class="zr"></i></div>'));
  document.getElementById('safe').onclick = () => document.body.classList.toggle('show-safe');

  // Plays the scene live: CSS animates by itself, update() is driven by elapsed time.
  function mount(stage, i) {
    const sc = SC[i], tok = stage._tok = (stage._tok || 0) + 1, inner = stage.querySelector('.inner');
    inner.innerHTML = sceneMarkup(sc);
    if (!sc.update) return;
    const q = sel => inner.querySelector(sel), t0 = performance.now();
    const step = now => { if (stage._tok !== tok) return; sc.update((now - t0) / 1000, q); requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  const cardsEl = document.getElementById('cards');
  SC.forEach((sc, i) => {
    const el = document.createElement('article'); el.className = 'card';
    el.innerHTML = `
      <div class="stage"><div class="inner"></div><button class="rp">Replay</button><div class="safeov"><i class="zt"></i><i class="zb"></i><i class="zr"></i></div></div>
      <div>
        <h3><em>Scene ${i + 1}</em>${sc.title}<span class="tag">${clock(sc.start)} - ${clock(sc.start + sc.dur)} | ${sc.dur}s</span></h3>
        <div class="row"><b>Visual</b>${sc.visual || ''}</div>
        <div class="row"><b>Animation</b>${sc.fx || ''}</div>
        <div class="row"><b>Voice-over (ElevenLabs text)</b><div class="vo">${esc(sc.vo).replace(/&lt;break[^&]*\/&gt;/g, m => `<code>${m}</code>`)}</div></div>
        <div class="row"><b>SFX</b>${sc.sfx || 'Transition whoosh only.'}</div>
        <div class="row"><b>Transition out</b>${sc.trans || 'Yellow whip-wipe'}</div>
      </div>`;
    cardsEl.appendChild(el);
    const stage = el.querySelector('.stage');
    el.querySelector('.rp').onclick = () => mount(stage, i);
    new IntersectionObserver((es, ob) => { if (es[0].isIntersecting) { mount(stage, i); ob.disconnect(); } }, { threshold: .4 }).observe(stage);
  });

  const main = document.getElementById('main'), wipe = main.querySelector('.wipe'), prog = document.getElementById('prog'), dots = document.getElementById('dots');
  let seq = 0, cur = { i: 0, t0: 0 }, raf = 0;
  SC.forEach((s, i) => { const b = document.createElement('button'); b.textContent = i + 1; b.onclick = () => play(i); dots.appendChild(b); });
  const mark = i => [...dots.children].forEach((b, k) => b.classList.toggle('on', k === i));
  const tick = () => { prog.style.width = Math.min(100, (SC[cur.i].start + (performance.now() - cur.t0) / 1000) / total * 100) + '%'; raf = requestAnimationFrame(tick); };

  function play(from = 0) {
    const my = ++seq; cancelAnimationFrame(raf);
    const go = i => {
      if (my !== seq) return;
      if (i >= SC.length) { cancelAnimationFrame(raf); prog.style.width = '100%'; document.getElementById('play').textContent = 'Replay full preview'; return; }
      const show = () => { if (my !== seq) return; cur = { i, t0: performance.now() }; mark(i); mount(main, i); setTimeout(() => go(i + 1), SC[i].dur * 1000); };
      if (i > from) { wipe.classList.remove('go'); void wipe.offsetWidth; wipe.classList.add('go'); setTimeout(show, 250); } else show();
    };
    cur = { i: from, t0: performance.now() }; tick(); go(from);
    document.getElementById('play').textContent = 'Restart';
  }
  document.getElementById('play').onclick = () => play(0);
  document.getElementById('stop').onclick = () => { seq++; cancelAnimationFrame(raf); main._tok++; main.querySelector('.inner').innerHTML = ''; prog.style.width = '0'; mark(-1); document.getElementById('play').textContent = 'Play full preview'; };

  scaleAll(); play(0);
})();
