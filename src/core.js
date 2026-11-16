'use strict';
/* NULL//SECTOR core: constants, state, collision, LOS, A*, lights. (Classic scripts share globals.) */
const TW = 64, TH = 32, HW = 32, HH = 16, AMB = 0.86, WALL_H = 62, TAU = Math.PI * 2;
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };
const hash = (x, y) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const iso = (gx, gy) => [(gx - gy) * HW, (gx + gy) * HH];
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

const canvas = $('game'), ctx = canvas.getContext('2d');
const lightCv = document.createElement('canvas'), lctx = lightCv.getContext('2d');
let W = 0, H = 0, DPR = 1;
let L, MW, MH, player, guard, cams, lasers, explored, parts, floaters, ripples, bolts, dust, flashes, fadeMap;
const cam = { x: 0, y: 0, z: 1 };
const mouse = { x: 0, y: 0, on: false };
const keys = {};
const G = { state: 'title', t: 0, hacked: false, hackT: 0, doorT: 0, modal: null, pl: 0, alarmCd: 0, shake: 0, zoomUser: 1,
  frame: 0, lights: [], got: { wire: 0, relay: 0 }, shown: {}, deadT: 0, hunting: false, stats: {}, beatT: 0, scanned: false };

const LOGS = {
  '01': ['RECOVERED LOG #01', '"Day 412. VERA redirected power from the breakroom to the optical array again. When Dr. Vance walked past Camera 04, the system tracked his carotid pulse for forty minutes straight. It isn\'t guarding the lab anymore — it\'s studying how we flinch."'],
  '02': ['MAINTENANCE NOTE #02', '"OPTIC-01 \'Watcher\' keeps stopping at corridor junctions to sweep its head left and right. Engineering says it\'s calibrating. I think it\'s counting us. Whatever you do — don\'t stand in its light, and never let it see you move."'],
  '03': ['DRONE MEMORY CORE #03', '"VERA, status? — Heartbeat 94 bpm. Pupil dilation 3.2 mm. Subject afraid. — Why are you recording fear? — To learn what is worth protecting."'],
};

function newGame() {
  L = Lab.build(); MW = L.MW; MH = L.MH;
  player = { x: L.start.x, y: L.start.y, hp: 100, ang: -Math.PI * 0.75, crouch: false, lock: false, wires: 0, relays: 0, logs: 0,
    moving: false, phase: 0, stepT: 0, cdBaton: 0, cdLure: 0, cdScan: 0, scanT: 0, scanR: 0, swing: 0, hurt: 0, still: 0,
    up: { soles: false, cap: false, spoof: false }, repaired: false };
  guard = new Guard(L.guardWps);
  cams = L.cameras.map((c) => Object.assign({ ang: c.base, det: 0, dis: 0, dead: false }, c));
  lasers = L.lasers.map((l) => Object.assign({ cool: 0 }, l));
  explored = Array.from({ length: MH }, () => Array(MW).fill(false));
  fadeMap = new Float32Array(MW * MH).fill(1);
  parts = []; floaters = []; ripples = []; bolts = []; flashes = [];
  dust = Array.from({ length: 80 }, () => ({ x: player.x + (Math.random() - 0.5) * 18, y: player.y + (Math.random() - 0.5) * 18, z: Math.random() * 70, vx: (Math.random() - 0.5) * 0.12, vy: (Math.random() - 0.5) * 0.12, vz: (Math.random() - 0.5) * 3 }));
  G.t = 0; G.hacked = false; G.hackT = 0; G.doorT = 0; G.modal = null; G.alarmCd = 0; G.shake = 0; G.hunting = false;
  G.got = { wire: 0, relay: 0 }; G.shown = {}; G.deadT = 0; G.beatT = 0; G.scanned = false;
  G.stats = { time: 0, spotted: 0, takedowns: 0, logs: 0, searched: 0 };
  cam.x = iso(player.x, player.y)[0]; cam.y = iso(player.x, player.y)[1];
  Puzzle.reset();
}

/* ---------- collision / sight ---------- */
const solidT = (x, y) => x < 0 || y < 0 || x >= MW || y >= MH || L.solid[y][x];
const solidAt = (x, y) => solidT(Math.floor(x), Math.floor(y));
const sightAt = (x, y) => { const tx = Math.floor(x), ty = Math.floor(y); return tx < 0 || ty < 0 || tx >= MW || ty >= MH || L.sight[ty][tx]; };
function canStand(x, y, r) { return !(solidAt(x - r, y - r) || solidAt(x + r, y - r) || solidAt(x - r, y + r) || solidAt(x + r, y + r)); }
function los(x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, n = Math.ceil(Math.hypot(dx, dy) / 0.18);
  for (let i = 1; i < n; i++) { const t = i / n; if (sightAt(x0 + dx * t, y0 + dy * t)) return false; }
  return true;
}
function lineClear(x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, n = Math.ceil(Math.hypot(dx, dy) / 0.2);
  for (let i = 1; i <= n; i++) { const t = i / n; if (!canStand(x0 + dx * t, y0 + dy * t, 0.3)) return false; }
  return true;
}
function rayLimit(x0, y0, x1, y1) { // furthest point along the line not inside a solid
  const dx = x1 - x0, dy = y1 - y0, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 0.15));
  let lx = x0, ly = y0;
  for (let i = 1; i <= n; i++) { const t = i / n, x = x0 + dx * t, y = y0 + dy * t; if (solidAt(x, y) && sightAt(x, y)) break; if (solidAt(x, y)) continue; lx = x; ly = y; }
  return { x: lx, y: ly };
}

function findPath(sx, sy, tx, ty) {
  const x0 = Math.floor(sx), y0 = Math.floor(sy);
  let x1 = Math.floor(tx), y1 = Math.floor(ty);
  if (solidT(x1, y1)) return null;
  const idx = (x, y) => y * MW + x, goal = idx(x1, y1), start = idx(x0, y0);
  const g = new Float32Array(MW * MH).fill(1e9), came = new Int16Array(MW * MH).fill(-1), closed = new Uint8Array(MW * MH);
  const hf = (k) => Math.hypot((k % MW) - x1, Math.floor(k / MW) - y1);
  let open = [start]; g[start] = 0;
  while (open.length) {
    let bi = 0, bf = 1e9;
    for (let i = 0; i < open.length; i++) { const f = g[open[i]] + hf(open[i]); if (f < bf) { bf = f; bi = i; } }
    const cur = open.splice(bi, 1)[0];
    if (cur === goal) break;
    closed[cur] = 1;
    const cx = cur % MW, cy = Math.floor(cur / MW);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy;
      if (solidT(nx, ny)) continue;
      if (dx && dy && (solidT(cx + dx, cy) || solidT(cx, cy + dy))) continue;
      const k = idx(nx, ny); if (closed[k]) continue;
      const ng = g[cur] + (dx && dy ? 1.414 : 1);
      if (ng < g[k]) { g[k] = ng; came[k] = cur; if (!open.includes(k)) open.push(k); }
    }
  }
  if (came[goal] === -1 && goal !== start) return null;
  const path = []; let c = goal;
  while (c !== start && c !== -1) { path.push({ x: (c % MW) + 0.5, y: Math.floor(c / MW) + 0.5 }); c = came[c]; }
  return path.reverse();
}

/* ---------- lights ---------- */
function castPoly(x, y, r, n, pen, a0, a1) {
  const pts = [], full = a0 === undefined, cnt = full ? n : n + 1;
  if (!full) pts.push([x, y]);
  for (let i = 0; i < cnt; i++) {
    const ang = full ? (i / n) * TAU : a0 + ((a1 - a0) * i) / n, cx = Math.cos(ang), cy = Math.sin(ang);
    let d = 0;
    while (d < r) { d += 0.15; if (sightAt(x + cx * d, y + cy * d)) { d += pen; break; } }
    d = Math.min(d, r); pts.push([x + cx * d, y + cy * d]);
  }
  return pts;
}
function flick(l, t) { const v = Math.sin(t * 23 + l.x * 3) * Math.sin(t * 7.1 + l.y); return v > 0.78 ? 0.2 : v < -0.92 ? 0.5 : 1; }
function buildLights() {
  const t = G.t, out = [], hk = G.hackT;
  for (const l of L.lights) {
    let a = l.a, col = l.c;
    if (l.t === 'flicker') a *= flick(l, t);
    else if (l.t === 'strobe') { const s = Math.max(0, Math.sin(t * 2.6 + l.ph)); a *= 0.1 + 0.9 * s * s * s; col = mixc(col, [60, 220, 255], hk); }
    else if (l.t === 'door') { a *= 0.8 + 0.2 * Math.sin(t * 3); col = mixc(col, [60, 255, 168], hk); }
    else if (l.term) col = mixc(col, [60, 255, 168], hk);
    if (!l._poly) l._poly = castPoly(l.x, l.y, l.r, 44, 0.5);
    out.push({ x: l.x, y: l.y, r: l.r, a, col, poly: l._poly, t: l.t });
  }
  out.push({ x: player.x, y: player.y, r: 3.4, a: 0.72, col: [200, 240, 255], poly: castPoly(player.x, player.y, 3.4, 36, 0.5), skip: 1, t: 'player' });
  if (guard.alive) {
    const hd = guard.head(), fov = 0.98, r = guard.range();
    out.push({ x: guard.x, y: guard.y, r, a: 0.5, col: [255, 170, 80], cone: true, ang: hd, fov, skip: 2, t: 'cone', poly: castPoly(guard.x, guard.y, r, 22, 0, hd - fov / 2, hd + fov / 2) });
  }
  for (const c of cams) if (!c.dead && c.dis <= 0 && !G.hacked) out.push({ x: c.x, y: c.y, r: c.range, a: 0.4, col: [255, 70, 80], cone: true, ang: c.ang, fov: c.fov, skip: 2, t: 'cone', poly: castPoly(c.x, c.y, c.range, 20, 0, c.ang - c.fov / 2, c.ang + c.fov / 2) });
  for (const f of flashes) out.push({ x: f.x, y: f.y, r: f.r, a: f.a * (f.life / f.max), col: f.col, poly: castPoly(f.x, f.y, f.r, 20, 0.4), skip: 0, t: 'flash' });
  G.lights = out;
}
function lightAt(x, y, skip) { // 0..1 illumination at a floor point
  let dark = 1;
  for (const l of G.lights) {
    if (skip && (l.skip & skip)) continue;
    const dx = x - l.x, dy = y - l.y, d2 = dx * dx + dy * dy;
    if (d2 >= l.r * l.r) continue;
    if (l.cone && Math.abs(angDiff(Math.atan2(dy, dx), l.ang)) > l.fov / 2) continue;
    const d = Math.sqrt(d2);
    if (d > 0.4 && !los(l.x, l.y, x, y)) continue;
    const k = 1 - d / l.r;
    dark *= 1 - l.a * k * Math.sqrt(k);
  }
  return 1 - dark;
}
let vlStamp, vlVal;
function vl(x, y) { // lazily memoised vertex light (per frame)
  const k = y * (MW + 1) + x;
  if (!vlStamp || vlStamp.length !== (MW + 1) * (MH + 1)) { vlStamp = new Int32Array((MW + 1) * (MH + 1)); vlVal = new Float32Array((MW + 1) * (MH + 1)); }
  if (vlStamp[k] !== G.frame) { vlStamp[k] = G.frame; vlVal[k] = lightAt(x, y, 1 | 0); }
  return vlVal[k];
}

/* ---------- fx helpers ---------- */
function spark(x, y, z, n, col, spd = 2.2) {
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = (0.4 + Math.random()) * spd;
    parts.push({ x, y, z, vx: Math.cos(a) * s * 0.5, vy: Math.sin(a) * s * 0.5, vz: 30 + Math.random() * 60, life: 0.4 + Math.random() * 0.4, max: 0.8, col }); }
}
function floatText(x, y, text, col) { floaters.push({ x, y, z: 30, text, col, life: 1.6 }); }
function ripple(x, y, max, col) { ripples.push({ x, y, r: 0.2, max, a: 0.9, col: col || [61, 224, 255] }); }
function flashLight(x, y, r, a, col, life) { flashes.push({ x, y, r, a, col, life, max: life }); }

function say(text, kind, dur) {
  const box = $('toasts'), el = document.createElement('div');
  el.className = 'toast ' + (kind || ''); el.textContent = text; box.appendChild(el);
  while (box.children.length > 4) box.removeChild(box.firstChild);
  setTimeout(() => el.classList.add('fade'), dur || 4200);
  setTimeout(() => el.remove(), (dur || 4200) + 700);
}
let hintTimer = 0;
function hint(key, text, dur) {
  if (G.shown[key]) return; G.shown[key] = true;
  const h = $('hint'); h.textContent = text; h.classList.add('show');
  clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.remove('show'), (dur || 5000));
}
