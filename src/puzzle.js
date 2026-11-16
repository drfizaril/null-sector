'use strict';
/* Lab 01 terminal: (1) solder salvaged parts across 3 broken traces, (2) track + lock VERA's drifting carrier wave. */
const Puzzle = (function () {
  const $ = (id) => document.getElementById(id);
  const SVGNS = 'http://www.w3.org/2000/svg';
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  let modal, pcb, scope, sctx, step1, step2;
  let sl = {}, led = {}, val = {};
  let inv = null, hooks = null, raf = 0, last = 0, time = 0, lock = 0, solved = false, opened = false, inited = false, wired = false;
  const slots = [
    { y: 56, need: 'wire', done: false, label: 'TRACE A' },
    { y: 107, need: 'wire', done: false, label: 'TRACE B' },
    { y: 158, need: 'relay', done: false, label: 'AMP NODE' },
  ];
  const target = { freq: 4, gain: 0.7, off: 1 };

  function svg(tag, attrs, parent) {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function init() {
    if (inited) return;
    inited = true;
    modal = $('term-modal'); pcb = $('pcb'); scope = $('scope'); sctx = scope.getContext('2d');
    step1 = $('step1'); step2 = $('step2');
    sl = { freq: $('sl-freq'), gain: $('sl-gain'), off: $('sl-off') };
    led = { freq: $('led-freq'), gain: $('led-gain'), off: $('led-off') };
    val = { freq: $('v-freq'), gain: $('v-gain'), off: $('v-off') };
    target.freq = 2.6 + Math.random() * 4;
    target.gain = 0.5 + Math.random() * 0.4;
    target.off = Math.random() * TAU;
    if (!wired) { wired = true; $('term-close').addEventListener('click', close);
    for (const k in sl) {
      sl[k].addEventListener('input', () => Sfx.lock());
      sl[k].addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); e.stopPropagation(); });
    } }
    buildBoard();
  }

  function buildBoard() {
    pcb.innerHTML = '';
    const defs = svg('defs', {}, pcb);
    // chips
    for (const [x, name] of [[10, 'SENSOR BUS'], [548, 'VERA CORE']]) {
      svg('rect', { x, y: 18, width: 62, height: 178, rx: 4, fill: '#0b1620', stroke: '#2a4a5c', 'stroke-width': 2 }, pcb);
      const t = svg('text', { x: x + 31, y: 110, 'text-anchor': 'middle', transform: `rotate(-90 ${x + 31} 110)` }, pcb);
      t.textContent = name;
      for (let i = 0; i < 9; i++) svg('rect', { x: x < 300 ? x + 62 : x - 6, y: 26 + i * 19, width: 6, height: 8, fill: '#2a4a5c' }, pcb);
    }
    slots.forEach((s, i) => {
      const y = s.y;
      svg('path', { class: 'trace', d: `M72 ${y} H268` }, pcb);
      svg('path', { class: 'trace', d: `M352 ${y} H548` }, pcb);
      svg('circle', { cx: 268, cy: y, r: 6, fill: '#1b3a4a' }, pcb);
      svg('circle', { cx: 352, cy: y, r: 6, fill: '#1b3a4a' }, pcb);
      const g = svg('g', { class: 'gap ' + s.need, 'data-i': i }, pcb);
      svg('rect', { class: 'gaprect', x: 262, y: y - 22, width: 96, height: 44, rx: 4 }, g);
      const lab = svg('text', { x: 310, y: y + 4, 'text-anchor': 'middle', class: 'gaplabel' }, g);
      lab.textContent = s.need === 'wire' ? `${s.label}: SOLDER WIRE` : `${s.label}: SEAT RELAY`;
      s.g = g; s.lab = lab;
      g.addEventListener('click', () => install(i));
      if (s.done) paintInstalled(i);
    });
  }

  function paintInstalled(i) {
    const s = slots[i], y = s.y;
    s.g.style.display = 'none';
    if (s.need === 'wire') {
      svg('path', { d: `M268 ${y} C 290 ${y - 30}, 330 ${y - 30}, 352 ${y}`, stroke: '#ffb02e', 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round' }, pcb);
    } else {
      svg('rect', { x: 286, y: y - 16, width: 48, height: 32, rx: 4, fill: '#2a1a4a', stroke: '#b47bff', 'stroke-width': 2 }, pcb);
      const t = svg('text', { x: 310, y: y + 4, 'text-anchor': 'middle', style: 'fill:#d9bfff' }, pcb); t.textContent = 'RELAY';
      svg('path', { d: `M268 ${y} H286 M334 ${y} H352`, stroke: '#b47bff', 'stroke-width': 4, fill: 'none' }, pcb);
    }
    svg('path', { class: 'flow', d: `M72 ${y} H548` }, pcb);
  }

  function updateS1() {
    const n = slots.filter((s) => s.done).length;
    $('s1-state').textContent = n + '/3';
    $('s1-inv').textContent = `You carry ${inv.wires} wire(s) and ${inv.relays} relay(s).`;
    if (n === 3) {
      step1.classList.add('done');
      step2.classList.remove('locked');
      $('s2-state').textContent = 'TRACKING';
    }
  }

  function install(i) {
    const s = slots[i];
    if (s.done) return;
    const have = s.need === 'wire' ? inv.wires : inv.relays;
    if (have <= 0) {
      $('s1-inv').textContent = s.need === 'wire' ? 'No copper wire in your pack! Search lockers & crates.' : 'No logic relay in your pack! Check drones & crates.';
      Sfx.empty();
      return;
    }
    if (s.need === 'wire') inv.wires--; else inv.relays--;
    s.done = true;
    Sfx.solder();
    paintInstalled(i);
    if (hooks && hooks.onInv) hooks.onInv();
    updateS1();
  }

  function targetAt(x) {
    const ph = target.off + Math.sin(time * 0.37) * 0.9;
    const g = target.gain + Math.sin(time * 0.8) * 0.035;
    return g * Math.sin(TAU * target.freq * x + ph);
  }

  function frame(now) {
    if (!opened) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
    const w = scope.width, h = scope.height, mid = h / 2, amp = h * 0.42;
    const f = +sl.freq.value, gn = +sl.gain.value, of = +sl.off.value;
    val.freq.textContent = f.toFixed(2); val.gain.textContent = gn.toFixed(2); val.off.textContent = of.toFixed(2);

    // accuracy
    let mad = 0; const N = 120;
    for (let i = 0; i < N; i++) {
      const x = i / (N - 1);
      mad += Math.abs(targetAt(x) - gn * Math.sin(TAU * f * x + of));
    }
    mad /= N;
    const acc = clamp(1 - mad * 1.5, 0, 1);

    // per-parameter lamps
    const tph = target.off + Math.sin(time * 0.37) * 0.9;
    const ef = Math.abs(f - target.freq), eg = Math.abs(gn - target.gain);
    let eo = Math.abs(((of - tph + Math.PI * 3) % TAU) - Math.PI);
    setLed(led.freq, ef, 0.05, 0.4); setLed(led.gain, eg, 0.07, 0.25); setLed(led.off, eo, 0.3, 1.1);

    const unlocked = slots.every((s) => s.done);
    if (unlocked && !solved) {
      if (acc >= 0.9) lock += dt / 1.6; else lock = Math.max(0, lock - dt * 1.6);
      if (lock >= 1) { solved = true; success(); }
    }
    $('sync').textContent = 'SYNC ' + Math.round(acc * 100) + '%';
    $('lock-fill').style.width = clamp(lock, 0, 1) * 100 + '%';

    // draw scope
    sctx.clearRect(0, 0, w, h);
    sctx.fillStyle = '#03070b'; sctx.fillRect(0, 0, w, h);
    sctx.strokeStyle = 'rgba(61,224,255,0.09)'; sctx.lineWidth = 1;
    for (let x = 0; x <= w; x += w / 12) { sctx.beginPath(); sctx.moveTo(x, 0); sctx.lineTo(x, h); sctx.stroke(); }
    for (let y = 0; y <= h; y += h / 6) { sctx.beginPath(); sctx.moveTo(0, y); sctx.lineTo(w, y); sctx.stroke(); }
    sctx.strokeStyle = 'rgba(61,224,255,0.25)'; sctx.beginPath(); sctx.moveTo(0, mid); sctx.lineTo(w, mid); sctx.stroke();
    const plot = (fn, col, lw, blur) => {
      sctx.save(); sctx.shadowColor = col; sctx.shadowBlur = blur; sctx.strokeStyle = col; sctx.lineWidth = lw; sctx.beginPath();
      for (let px = 0; px <= w; px += 2) { const y = mid - fn(px / w) * amp; if (px === 0) sctx.moveTo(px, y); else sctx.lineTo(px, y); }
      sctx.stroke(); sctx.restore();
    };
    plot(targetAt, '#ff3b4d', 2.5, 10);
    plot((x) => gn * Math.sin(TAU * f * x + of), acc >= 0.9 ? '#3dffa8' : '#3de0ff', 2.5, 12);
    if (!unlocked) {
      sctx.fillStyle = 'rgba(0,0,0,0.55)'; sctx.fillRect(0, 0, w, h);
    }
    raf = requestAnimationFrame(frame);
  }

  function setLed(el, err, on, near) {
    el.className = 'led' + (err < on ? ' on' : err < near ? ' near' : '');
  }

  function success() {
    $('s2-state').textContent = 'LOCKED ✓';
    step2.classList.add('done');
    Sfx.success();
    setTimeout(() => { close(); if (hooks && hooks.onSolved) hooks.onSolved(); }, 700);
  }

  function open(inventory, h) {
    init();
    inv = inventory; hooks = h || {};
    modal.classList.remove('hidden');
    opened = true; last = performance.now();
    updateS1();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  function close() {
    if (!opened) return;
    opened = false;
    cancelAnimationFrame(raf);
    modal.classList.add('hidden');
    if (hooks && hooks.onClose) hooks.onClose();
  }

  function reset() {
    inited = false; solved = false; lock = 0; time = 0; opened = false;
    slots.forEach((s) => { s.done = false; });
    if (modal) {
      modal.classList.add('hidden');
      step1.classList.remove('done'); step2.classList.remove('done'); step2.classList.add('locked');
      $('s2-state').textContent = 'LOCKED'; sl.freq.value = 2; sl.gain.value = 0.3; sl.off.value = 0;
    }
    cancelAnimationFrame(raf);
  }

  return { open, close, reset, isOpen: () => opened, isSolved: () => solved,
    _debugSolve() { // test hook
      init(); slots.forEach((s) => (s.done = true)); sl.freq.value = target.freq.toFixed(2); sl.gain.value = target.gain.toFixed(2);
    }, _target: target, _phase: () => target.off + Math.sin(time * 0.37) * 0.9 };
})();
