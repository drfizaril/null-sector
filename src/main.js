'use strict';
/* Input, update loop, screens. */
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2); W = window.innerWidth; H = window.innerHeight;
  for (const c of [canvas, lightCv]) { c.width = Math.floor(W * DPR); c.height = Math.floor(H * DPR); }
}
window.addEventListener('resize', resize); resize();
const baseZoom = () => clamp(W / (30 * HW), 0.8, 1.9);

function startGame() {
  Input.clear(); Sfx.init(); newGame(); G.state = 'play';
  $('title').classList.add('hidden'); $('pause').classList.add('hidden'); $('dead').classList.add('hidden'); $('win').classList.add('hidden'); $('hud').classList.remove('hidden');
  $('toasts').innerHTML = ''; $('fx').classList.remove('alert');
  const v = $('vera'); v.textContent = 'VERA OPTICS // ACTIVE'; v.classList.remove('hacked');
  updateObjectives();
  hint('start', Mobile.enabled ? 'Left stick: move · CROUCH: toggle · tap world to aim LURE' : 'WASD to move · hold SHIFT to crouch · stay out of the light', 6500);
  setTimeout(() => { if (G.state === 'play') hint('scan', Mobile.enabled ? 'Tap SCAN to reveal loot and guards through walls' : 'Press F — Field Scan reveals loot and guards through walls', 6000); }, 9000);
}
function setPaused(p) {
  Input.clear();
  if (p && G.state === 'play') { G.state = 'paused'; $('pause').classList.remove('hidden'); }
  else if (!p && G.state === 'paused') { G.state = 'play'; $('pause').classList.add('hidden'); }
}

window.addEventListener('keydown', (e) => {
  if (e.target && e.target.tagName === 'INPUT' && e.code !== 'Escape') return;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  Sfx.init();
  if (G.state === 'title') { if (e.code === 'Enter' || e.code === 'Space') startGame(); return; }
  if (G.state === 'dead' && G.deadT <= 0 && (e.code === 'Enter' || e.code === 'KeyR')) { startGame(); return; }
  if (G.state === 'win' && (e.code === 'Enter' || e.code === 'KeyR')) { startGame(); return; }
  if (e.code === 'KeyM') { const m = Sfx.toggleMute(); say(m ? 'Sound off' : 'Sound on', ''); return; }
  if (e.code === 'Escape') { if (G.modal) closeModals(); else if (G.state === 'play') setPaused(true); else if (G.state === 'paused') setPaused(false); return; }
  if (G.state === 'paused') { if (e.code === 'KeyR') startGame(); return; }
  if (G.state !== 'play') return;
  if (G.modal) { if ((e.code === 'KeyE') && G.modal !== 'term') closeModals(); return; }
  keys[e.code] = true;
  if (e.repeat) return;
  const action = Input.bindings[e.code]; if (action) Input.perform(action);
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; if (G.state === 'play' && !G.modal) setPaused(true); });
canvas.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true; });
canvas.addEventListener('mouseleave', () => { mouse.on = false; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'mouse') return;
  Sfx.init(); if (G.state !== 'play' || G.modal) return;
  mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true;
  if (e.button === 0) swingBaton(); else if (e.button === 2) throwLure();
});
canvas.addEventListener('wheel', (e) => { if (G.state === 'play') G.zoomUser = clamp(G.zoomUser - Math.sign(e.deltaY) * 0.08, 0.7, 1.5); }, { passive: true });
$('start-btn').onclick = startGame; $('resume-btn').onclick = () => setPaused(false); $('restart-btn').onclick = startGame;
$('mute-btn').onclick = () => Sfx.toggleMute(); $('retry-btn').onclick = startGame; $('again-btn').onclick = startGame;
$('log-close').onclick = closeModals; $('bench-close').onclick = closeModals;

function updateFx(dt) {
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; p.vz -= 150 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z = Math.max(0, p.z + p.vz * dt); if (p.life <= 0) parts.splice(i, 1); }
  for (let i = floaters.length - 1; i >= 0; i--) { const f = floaters[i]; f.life -= dt; f.z += 18 * dt; if (f.life <= 0) floaters.splice(i, 1); }
  for (let i = ripples.length - 1; i >= 0; i--) { const r = ripples[i]; r.r += 5 * dt; r.a -= 1.3 * dt; if (r.a <= 0 || r.r > r.max) ripples.splice(i, 1); }
  for (let i = flashes.length - 1; i >= 0; i--) { flashes[i].life -= dt; if (flashes[i].life <= 0) flashes.splice(i, 1); }
  for (let i = bolts.length - 1; i >= 0; i--) { const b = bolts[i]; b.t += dt; if (b.t >= b.dur) { landBolt(b); bolts.splice(i, 1); } }
  for (const m of dust) { m.x += m.vx * dt; m.y += m.vy * dt; m.z += m.vz * dt; if (m.z < 0 || m.z > 70) m.vz = -m.vz;
    if (Math.abs(m.x - player.x) > 10) m.x = player.x - Math.sign(m.x - player.x) * 9; if (Math.abs(m.y - player.y) > 10) m.y = player.y - Math.sign(m.y - player.y) * 9; }
  if (Math.random() < dt * 0.5) spark(9.5, 7.4, 40, 4, [255, 200, 120], 1.2); // broken light near west atrium
  G.shake = Math.max(0, G.shake - dt * 30);
  if (G.hacked) { G.hackT = Math.min(1, G.hackT + dt * 0.7); if (G.hackT > 0.4) G.doorT = Math.min(1, G.doorT + dt * 0.5); }
}

function updateCamera(dt) {
  cam.z = baseZoom() * G.zoomUser;
  let tx, ty;
  if (G.state === 'title') { const t = performance.now() / 1000; [tx, ty] = iso(16 + Math.cos(t * 0.07) * 8, 10 + Math.sin(t * 0.05) * 3); }
  else { [tx, ty] = iso(player.x, player.y); ty -= 14; }
  const k = Math.min(1, dt * (G.state === 'title' ? 1.5 : 7));
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
}

let last = performance.now();
function loop(now) {
  Mobile.sync();
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (G.state === 'play' && !G.modal) {
    G.t += dt; G.stats.time += dt;
    G.pl = lightAt(player.x, player.y, 3);
    updatePlayer(dt); guard.update(dt); updateHazards(dt);
    if (G.hacked && player.hp > 0 && Math.floor(player.y) === 0 && Math.floor(player.x) === 16) win();
    // contextual hints
    if (guard.alive && Math.hypot(guard.x - player.x, guard.y - player.y) < 10) hint('guard', 'OPTIC-01 sees only inside its cone. Break line of sight — or strike from BEHIND with the baton.', 7000);
    if (Math.hypot(player.x - 28, player.y - 10.5) < 5) hint('laser', 'Laser gates pulse on and off. Cross while the beam is dark.', 6000);
    if (nearestInteract()) hint('interact', Mobile.enabled ? 'Tap USE to search lockers, crates and drones for parts.' : 'Press E to search lockers, crates and drones for parts.', 5000);
    if (G.pl > 0.5 && guard.alive && guard.state === 'patrol' && Math.hypot(guard.x - player.x, guard.y - player.y) < 13) hint('light', 'You are EXPOSED in bright light. Stay in shadow and crouch.', 5000);
  } else if (G.state === 'title' || G.state === 'paused' || G.modal) { G.t += dt * (G.state === 'title' ? 1 : 0); }
  if (G.state === 'dead') { G.t += dt; G.deadT = Math.max(0, G.deadT - dt); if (G.deadT <= 0 && $('dead').classList.contains('hidden')) { $('dead').classList.remove('hidden'); $('hud').classList.add('hidden'); } }
  if (G.state === 'play' && !G.modal || G.state === 'title' || G.state === 'dead') updateFx(dt);
  updateCamera(dt); buildLights(); renderFrame();
  if (G.state === 'play') {
    if (G.frame % 3 === 0) { updateHud(); drawMinimap(); }
    Sfx.tension(G.hunting ? 1 : guard.state === 'suspicious' || guard.state === 'investigate' ? 0.35 : 0);
    if (G.hunting || player.hp < 35) { G.beatT -= dt; if (G.beatT <= 0) { G.beatT = G.hunting ? 0.75 : 1.1; Sfx.beat(); } }
  }
  requestAnimationFrame(loop);
}
newGame();
window.__ns = { G, get player() { return player; }, get guard() { return guard; }, get L() { return L; }, cam, keys, startGame, onHack, Puzzle, win, interact, swingBaton, throwLure, fieldScan, mouse };
requestAnimationFrame(loop);
