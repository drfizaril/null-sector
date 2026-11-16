'use strict';
/* Pointer capture isolates concurrent movement, aiming and action fingers. */
const Mobile = (() => {
  let enabled = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  let pointer = null, aim = null, previous = '', target = null;
  const root = $('mobile-controls'), pad = $('joystick'), stick = $('stick');
  const playable = () => G.state === 'play' && !G.modal && !(enabled && innerHeight > innerWidth);
  function reset() {
    Input.clear(); target = null; aim = null;
    const id = pointer; pointer = null;
    if (id !== null && pad.hasPointerCapture(id)) pad.releasePointerCapture(id);
    stick.style.transform = ''; 
  }
  function activate(e) {
    if (e.pointerType === 'touch' || e.pointerType === 'pen') { enabled = true; document.body.classList.add('touch-ui'); }
  }
  document.body.classList.toggle('touch-ui', enabled);
  window.addEventListener('pointerdown', activate, true);
  function move(e) {
    if (e.pointerId !== pointer) return;
    const r = pad.getBoundingClientRect(), radius = r.width * 0.34;
    let x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
    const d = Math.hypot(x, y), scale = d > radius ? radius / d : 1;
    x *= scale; y *= scale;
    stick.style.transform = `translate(${x}px, ${y}px)`;
    // Fixed original walk/crouch speed outside deadzone; no speed rebalance.
    Input.axis.x = d < radius * 0.18 ? 0 : x / radius;
    Input.axis.y = d < radius * 0.18 ? 0 : y / radius;
  }
  pad.addEventListener('pointerdown', e => {
    if (!playable() || pointer !== null) return;
    e.preventDefault(); pointer = e.pointerId; pad.setPointerCapture(pointer); move(e);
  });
  pad.addEventListener('pointermove', move);
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) pad.addEventListener(type, e => {
    if (e.pointerId === pointer) { pointer = null; Input.axis.x = Input.axis.y = 0; stick.style.transform = ''; }
  });
  root.querySelectorAll('button').forEach(b => {
    b.addEventListener('pointerdown', e => {
      if (!playable()) return;
      e.preventDefault(); Input.perform(b.dataset.action); sync();
    });
    // Keyboard accessibility; physical pointer clicks already acted on pointerdown.
    b.addEventListener('click', e => { if (e.detail === 0) Input.perform(b.dataset.action); });
  });
  function setAim(e) {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true; target = mouseGrid();
  }
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') { target = null; return; }
    if (!playable() || aim !== null) return;
    e.preventDefault(); aim = e.pointerId; canvas.setPointerCapture(aim); setAim(e);
  });
  canvas.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse') { target = null; return; }
    if (e.pointerId === aim && playable()) setAim(e);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, e => { if (aim === e.pointerId) aim = null; });
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { reset(); if (G.state === 'play') setPaused(true); } });
  window.addEventListener('resize', () => { reset(); sync(); });
  function sync() {
    const portrait = enabled && innerHeight > innerWidth;
    $('rotate-notice').classList.toggle('hidden', !portrait);
    if (portrait && G.state === 'play') { if (G.modal) closeModals(); setPaused(true); }
    const state = G.state + ':' + G.modal + ':' + portrait;
    if (state !== previous) { reset(); previous = state; }
    root.classList.toggle('hidden', !enabled || !playable());
    if (!playable()) return;
    if (target) { const s = iso(target.x, target.y); mouse.x = (s[0] - cam.x) * cam.z + W / 2; mouse.y = (s[1] - cam.y) * cam.z + H / 2; mouse.on = true; }
    for (const b of root.querySelectorAll('[data-action]')) {
      const a = b.dataset.action, cd = a === 'baton' ? player.cdBaton : a === 'lure' ? player.cdLure : a === 'scan' ? player.cdScan : 0;
      b.classList.toggle('cooling', cd > 0);
      if (a === 'crouch') { b.classList.toggle('on', player.lock); b.setAttribute('aria-pressed', String(player.lock)); }
      if (a === 'interact') b.classList.toggle('on', !!nearestInteract());
    }
  }
  return { sync, reset, get enabled() { return enabled; } };
})();
