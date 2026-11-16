'use strict';
/* Player actions, interactions, modals, HUD, minimap. */
const mouseGrid = () => {
  const z = cam.z, wx = (mouse.x - W / 2) / z + cam.x, wy = (mouse.y - H / 2) / z + cam.y;
  return { x: (wx / HW + wy / HH) / 2, y: (wy / HH - wx / HW) / 2 };
};

function updatePlayer(dt) {
  const p = player;
  p.cdBaton = Math.max(0, p.cdBaton - dt); p.cdLure = Math.max(0, p.cdLure - dt); p.swing = Math.max(0, p.swing - dt); p.hurt = Math.max(0, p.hurt - dt);
  if (p.cdScan > 0) { p.cdScan -= dt; if (p.cdScan <= 0) Sfx.scanReady(); }
  if (p.scanT > 0) { p.scanT -= dt; p.scanR += dt * 14; }
  p.crouch = !!(keys.ShiftLeft || keys.ShiftRight) || p.lock;
  const spd = p.crouch ? 1.8 * (p.up.soles ? 1.3 : 1) : 3.3;
  let mx = 0, my = 0;
  if (keys.KeyW || keys.ArrowUp) { mx -= 1; my -= 1; }
  if (keys.KeyS || keys.ArrowDown) { mx += 1; my += 1; }
  if (keys.KeyA || keys.ArrowLeft) { mx -= 1; my += 1; }
  if (keys.KeyD || keys.ArrowRight) { mx += 1; my -= 1; }
  const touch = Input.movement(); mx += touch.x; my += touch.y;
  p.moving = false;
  if (mx || my) {
    const l = Math.hypot(mx, my); mx /= l; my /= l; p.ang = Math.atan2(my, mx);
    const nx = p.x + mx * spd * dt, ny = p.y + my * spd * dt;
    if (canStand(nx, p.y, 0.28)) { p.x = nx; p.moving = true; }
    if (canStand(p.x, ny, 0.28)) { p.y = ny; p.moving = true; }
    p.phase += dt * spd * 3.2; p.stepT -= dt;
    if (p.stepT <= 0) {
      p.stepT = p.crouch ? 0.6 : 0.42;
      Sfx.step(!p.crouch);
      const r = p.crouch ? 1.1 : 4.4; guard.hear(p.x, p.y, r);
      if (!p.crouch) ripple(p.x, p.y, 1.1, [120, 200, 230]);
    }
  }
  p.still = p.moving ? 0 : p.still + dt;
  // fog of war memory
  if (G.frame % 8 === 0) for (let y = Math.max(0, Math.floor(p.y) - 7); y <= Math.min(MH - 1, Math.floor(p.y) + 7); y++)
    for (let x = Math.max(0, Math.floor(p.x) - 7); x <= Math.min(MW - 1, Math.floor(p.x) + 7); x++)
      if (!explored[y][x] && Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y) < 7 && (L.sight[y][x] || los(p.x, p.y, x + 0.5, y + 0.5))) explored[y][x] = true;
}

function nearestInteract() {
  let best = null, bd = 1.8;
  for (const q of L.props) {
    if (!q.act || (q.act === 'container' && q.opened)) continue;
    const d = Math.hypot(q.x + 0.5 - player.x, q.y + 0.5 - player.y);
    if (d < bd) { bd = d; best = q; }
  }
  return best;
}

function interact() {
  const q = nearestInteract(); if (!q) return;
  if (q.act === 'container') {
    q.opened = true; G.stats.searched++; Sfx.open(); guard.hear(q.x + 0.5, q.y + 0.5, 2.2);
    const lt = q.loot || {}; let got = false;
    if (lt.wire) { player.wires += lt.wire; G.got.wire += lt.wire; floatText(q.x + 0.5, q.y + 0.5, '+' + lt.wire + ' Copper Wire', '#ffb02e'); got = true; }
    if (lt.relay) { player.relays += lt.relay; G.got.relay += lt.relay; floatText(q.x + 0.5, q.y + 0.2, '+' + lt.relay + ' Logic Relay', '#b47bff'); got = true; }
    if (lt.log) { player.logs++; G.stats.logs++; got = true; }
    if (got) { Sfx.pickup(); say(q.label + ' searched.', 'good'); spark(q.x + 0.5, q.y + 0.5, 20, 8, [255, 220, 120], 1.4); }
    if (lt.log) openLog(lt.log);
    updateObjectives();
  } else if (q.act === 'bench') openBench();
  else if (q.act === 'terminal') {
    if (G.hacked) say('Terminal already hijacked. Proceed through the North Bulkhead.', 'warn');
    else { G.modal = 'term'; Puzzle.open(player, { onInv: updateObjectives, onSolved: onHack, onClose: () => { G.modal = null; } }); }
  }
}

function openLog(id) { const l = LOGS[id]; $('log-title').textContent = l[0]; $('log-text').textContent = l[1]; $('log-modal').classList.remove('hidden'); G.modal = 'log'; }
function closeModals() {
  $('log-modal').classList.add('hidden'); $('bench-modal').classList.add('hidden');
  if (G.modal === 'term') Puzzle.close(); else G.modal = null;
}

const UPGRADES = [
  { id: 'soles', name: 'Insulated Soles', d: 'Crouch-walk speed +30%.', w: 2, r: 0 },
  { id: 'cap', name: 'Overcharged Capacitor', d: 'Arc-Baton emits an EMP: jams cameras 8s and staggers the guard.', w: 1, r: 2 },
  { id: 'spoof', name: 'Signal Spoofer', d: 'Guards take 1.5s longer to turn hostile.', w: 0, r: 3 },
];
function openBench() { G.modal = 'bench'; renderBench(); $('bench-modal').classList.remove('hidden'); }
function renderBench() {
  $('b-wire').textContent = player.wires; $('b-relay').textContent = player.relays;
  const box = $('bench-list'); box.innerHTML = '';
  for (const u of UPGRADES) {
    const own = player.up[u.id], ok = !own && player.wires >= u.w && player.relays >= u.r;
    const row = document.createElement('div'); row.className = 'up' + (own ? ' owned' : '');
    row.innerHTML = `<div class="info"><div class="nm">${u.name}</div><div class="ds">${u.d}</div><div class="cost">COST: ${u.w} wire · ${u.r} relay</div></div>`;
    const b = document.createElement('button'); b.textContent = own ? 'DONE' : 'CRAFT'; b.disabled = !ok;
    b.onclick = () => { player.wires -= u.w; player.relays -= u.r; player.up[u.id] = true; Sfx.craft(); say(u.name + ' installed.', 'good'); renderBench(); updateObjectives(); };
    row.appendChild(b); box.appendChild(row);
  }
  const row = document.createElement('div'); row.className = 'up';
  row.innerHTML = '<div class="info"><div class="nm">Field Repair</div><div class="ds">Restore 50 integrity. One use.</div><div class="cost">FREE</div></div>';
  const b = document.createElement('button'); b.textContent = player.repaired ? 'USED' : 'REPAIR'; b.disabled = player.repaired || player.hp >= 100;
  b.onclick = () => { player.hp = Math.min(100, player.hp + 50); player.repaired = true; Sfx.craft(); renderBench(); };
  row.appendChild(b); box.appendChild(row);
}

function onHack() {
  G.hacked = true; G.modal = null; L.solid[0][16] = false; L.sight[0][16] = false;
  L.lights.forEach((l) => { l._poly = null; });
  $('flash').classList.remove('go'); void $('flash').offsetWidth; $('flash').classList.add('go');
  Sfx.glitch(); setTimeout(Sfx.unlock, 350); G.shake = 14;
  const v = $('vera'); v.textContent = 'VERA OPTICS // SPOOFED · CAMERAS DOWN · LASERS OFF · BULKHEAD OPEN'; v.classList.add('hacked');
  say('OPTIC_BUS HIJACKED — vision cones shrink 35%, cameras and lasers disabled.', 'good', 6000);
  hint('afterhack', 'North Bulkhead unlocked — reach the door in the north vestibule.', 6000);
  updateObjectives();
}

function die() {
  G.state = 'dead'; G.deadT = 1.0; Sfx.death(); Sfx.tension(0);
}
function win() {
  G.state = 'win'; Sfx.win(); Sfx.tension(0);
  const s = G.stats, m = Math.floor(s.time / 60), sec = Math.floor(s.time % 60);
  $('stats').innerHTML = `<div><b>${m}:${String(sec).padStart(2, '0')}</b><span>TIME</span></div><div><b>${s.spotted}</b><span>TIMES SPOTTED</span></div><div><b>${s.takedowns}</b><span>TAKEDOWNS</span></div><div><b>${s.logs}/3</b><span>LOGS</span></div>`;
  $('win').classList.remove('hidden'); $('hud').classList.add('hidden');
}

/* ---------- abilities ---------- */
function throwLure() {
  if (player.cdLure > 0) return;
  const m = mouse.on ? mouseGrid() : { x: player.x + Math.cos(player.ang) * 5, y: player.y + Math.sin(player.ang) * 5 };
  let dx = m.x - player.x, dy = m.y - player.y, d = Math.hypot(dx, dy) || 1;
  if (d > 9) { dx *= 9 / d; dy *= 9 / d; }
  const t = rayLimit(player.x, player.y, player.x + dx, player.y + dy);
  player.cdLure = 2.2; Sfx.throw();
  bolts.push({ x0: player.x, y0: player.y, x1: t.x, y1: t.y, t: 0, dur: 0.5 });
}
function landBolt(b) {
  Sfx.clang(); ripple(b.x1, b.y1, 6.2, [255, 200, 90]); spark(b.x1, b.y1, 4, 10, [255, 220, 150], 2);
  flashLight(b.x1, b.y1, 2.5, 0.5, [255, 200, 120], 0.3); guard.hear(b.x1, b.y1, 6.5);
}

function swingBaton() {
  const p = player; if (p.cdBaton > 0) return;
  p.cdBaton = 0.65; p.swing = 0.22; Sfx.swing(); ripple(p.x, p.y, 2.0, [120, 220, 255]);
  const g = guard; if (!g.alive) return;
  const dx = g.x - p.x, dy = g.y - p.y, d = Math.hypot(dx, dy);
  if (d > 1.5 || Math.abs(angDiff(Math.atan2(dy, dx), p.ang)) > 1.7) return;
  Sfx.zap(); spark(g.x, g.y, 36, 18, [120, 220, 255], 3); flashLight(g.x, g.y, 3, 0.7, [120, 220, 255], 0.25); G.shake = 7;
  const gf = g.head(), behind = Math.cos(gf) * (p.x - g.x) + Math.sin(gf) * (p.y - g.y) < -0.1 * d;
  if (player.up.cap) {
    for (const c of cams) if (!c.dead) { c.dis = 8; spark(c.x, c.y, 50, 6, [255, 200, 90]); }
    g.stun = Math.max(g.stun, 1.2); say('EMP burst — cameras jammed.', 'good');
  }
  if (g.state !== 'hunt' && g.wind <= 0 && behind) {
    killGuard(true);
  } else {
    g.hp--; g.stun = Math.max(g.stun, 0.6); g.wind = 0;
    if (g.hp <= 0) killGuard(false);
    else { if (g.state !== 'hunt') g.startHunt(); g.state = 'hunt'; g.last = { x: p.x, y: p.y }; say(`Arc-Baton hit! OPTIC-01 armor damaged (${g.hp}/3).`, 'warn'); }
  }
}
function killGuard(stealth) {
  guard.alive = false; guard.state = 'disabled'; G.stats.takedowns++; player.relays++; G.got.relay++;
  floatText(guard.x, guard.y, '+1 Logic Relay', '#b47bff'); Sfx.pickup(); spark(guard.x, guard.y, 20, 24, [255, 160, 60], 3);
  say(stealth ? 'STEALTH TAKEDOWN — OPTIC-01 disabled. Salvaged a Logic Relay.' : 'OPTIC-01 destroyed. Salvaged a Logic Relay.', 'good', 5000);
  updateObjectives();
}
function fieldScan() {
  if (player.cdScan > 0 || player.scanT > 0) return;
  player.cdScan = 9; player.scanT = 3; player.scanR = 0; G.scanned = true; Sfx.scan();
  for (const q of L.props) if (q.act === 'container') q.scanned = true;
}

/* ---------- HUD ---------- */
const hudCache = {};
function setTxt(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
function updateObjectives() {
  const items = { wires: [Math.min(2, G.got.wire), 2, G.got.wire >= 2], relay: [Math.min(1, G.got.relay), 1, G.got.relay >= 1], hack: [0, 0, G.hacked], exit: [0, 0, false] };
  document.querySelectorAll('#objectives li').forEach((li) => {
    const it = items[li.dataset.k]; const b = li.querySelector('b');
    if (it[1]) b.textContent = it[0] + '/' + it[1];
    li.classList.toggle('done', it[2]);
  });
  const act = ['wires', 'relay', 'hack', 'exit'].find((k) => !items[k][2]);
  document.querySelectorAll('#objectives li').forEach((li) => li.classList.toggle('active', li.dataset.k === act));
  if (G.got.wire >= 2 && G.got.relay >= 1 && !G.hacked) hint('parts', 'Parts secured — find OPTIC_BUS_TERMINAL_01 in the north-east control room.', 6500);
}
function updateHud() {
  const hp = player.hp; $('hp-fill').style.width = hp + '%';
  $('hp-fill').style.background = hp < 35 ? 'linear-gradient(90deg,#b8202f,#ff3b4d)' : '';
  setTxt('hp-num', Math.ceil(hp));
  setTxt('inv-wire', player.wires); setTxt('inv-relay', player.relays); setTxt('inv-log', player.logs);
  const v = $('vis'), st = G.pl < 0.22 ? ['v-hidden', 'HIDDEN'] : G.pl < 0.5 ? ['v-dim', 'DIM'] : ['v-exposed', 'EXPOSED'];
  v.className = 'vis ' + st[0]; setTxt('vis-txt', st[1]);
  const s = $('stance'); s.textContent = player.crouch ? 'CROUCHED' : 'UPRIGHT'; s.classList.toggle('crouch', player.crouch);
  const set = (k, cd, max, on) => { const el = document.querySelector(`.ab[data-k=${k}]`); el.querySelector('.cd').style.height = (cd > 0 ? clamp(cd / max, 0, 1) * 100 : 0) + '%'; el.classList.toggle('ready', cd <= 0); el.classList.toggle('on', !!on); };
  set('lure', player.cdLure, 2.2); set('baton', player.cdBaton, 0.65); set('scan', player.cdScan, 9, player.scanT > 0);
  document.querySelector('.ab[data-k=crouch]').classList.toggle('on', player.crouch);
  const hunt = guard.alive && guard.state === 'hunt'; if (hunt !== G.hunting) { G.hunting = hunt; $('fx').classList.toggle('alert', hunt); }
}
function drawMinimap() {
  const c = $('minimap'), m = c.getContext('2d'), S = 6;
  m.fillStyle = '#03070b'; m.fillRect(0, 0, c.width, c.height);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    if (!explored[y][x]) continue; const g = L.grid[y][x];
    m.fillStyle = g === 1 ? '#25394a' : g === 3 ? (G.hacked ? '#3dffa8' : '#ff3b4d') : g === 2 ? '#1d4152' : '#162b38';
    m.fillRect(x * S, y * S, S, S);
    const q = L.propAt[y][x]; if (q && q.solid) { m.fillStyle = '#31495a'; m.fillRect(x * S + 1, y * S + 1, S - 2, S - 2); }
  }
  for (const q of L.props) if (q.act && explored[q.y][q.x]) {
    m.fillStyle = q.act === 'terminal' ? '#3de0ff' : q.act === 'bench' ? '#ffb02e' : (q.opened ? '#3a4a55' : (q.scanned ? '#ffb02e' : '#7f9aa8'));
    m.fillRect(q.x * S + 1, q.y * S + 1, S - 2, S - 2);
  }
  const showG = guard.alive && (player.scanT > 0 || (guard.sees) || (Math.hypot(guard.x - player.x, guard.y - player.y) < 8 && los(player.x, player.y, guard.x, guard.y)));
  if (showG) { m.fillStyle = guard.state === 'hunt' ? '#ff3b4d' : '#ff8a1a'; m.beginPath(); m.arc(guard.x * S, guard.y * S, 3.5, 0, TAU); m.fill(); }
  m.save(); m.translate(player.x * S, player.y * S); m.rotate(player.ang); m.fillStyle = '#eaffff'; m.beginPath(); m.moveTo(5, 0); m.lineTo(-3, -3.5); m.lineTo(-3, 3.5); m.fill(); m.restore();
}
