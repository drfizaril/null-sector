'use strict';
/* Rendering: props, characters, cameras, lasers. */
function screenQuad(P, Q, h, u0, u1, v0, v1, col, a, lines) {
  ctx.globalAlpha = a; ctx.fillStyle = col; poly(fp(P, Q, u0, v0, h), fp(P, Q, u1, v0, h), fp(P, Q, u1, v1, h), fp(P, Q, u0, v1, h));
  if (lines) { ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; for (let i = 1; i < lines; i++) { const v = v0 + (v1 - v0) * i / lines, s = fp(P, Q, u0, v, h), e = fp(P, Q, u1, v, h); ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(e[0], e[1]); ctx.stroke(); } }
  ctx.globalAlpha = 1;
}
const SCR = { cyan: '#3de0ff', amber: '#ffb02e', red: '#ff3b4d', green: '#3dffa8' };

function drawProp(p, fade) {
  const x = p.x, y = p.y, k = p.k;
  if (k === 'table') {
    const q = prism(x, y, x + 0.06, y + 0.06, x + 0.94, y + 0.94, 14, '#6a8299', '#44586c', '#2f4050', fade);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const s = iso(x + 0.2 + i * 0.2, y + 0.2 + j * 0.2); ctx.fillRect(s[0] - 1, s[1] - 14 - 0.5, 2, 1.2); }
    if (hash(x, y) > 0.4) { const s = iso(x + 0.5, y + 0.5); ctx.fillStyle = 'rgba(61,224,255,0.9)'; ctx.fillRect(s[0] - 2, s[1] - 22, 4, 8); glow(s[0], s[1] - 18, 10, [61, 224, 255], 0.5); }
  } else if (k === 'crate') {
    const q = prism(x, y, x + 0.1, y + 0.1, x + 0.9, y + 0.9, 24, '#6c7a66', '#46544a', '#303b34', fade);
    ctx.globalAlpha = fade; ctx.fillStyle = 'rgba(255,190,40,0.6)'; poly(fp(q.D, q.C, 0.1, 0.55, 24), fp(q.D, q.C, 0.9, 0.55, 24), fp(q.D, q.C, 0.9, 0.4, 24), fp(q.D, q.C, 0.1, 0.4, 24)); ctx.globalAlpha = 1;
    if (p.act && !p.opened) { const s = iso(x + 0.5, y + 0.5); glow(s[0], s[1] - 26, 14, [255, 176, 46], 0.35 + 0.25 * Math.sin(G.t * 3)); }
  } else if (k === 'pillar') {
    const q = prism(x, y, x + 0.1, y + 0.1, x + 0.9, y + 0.9, WALL_H, '#586d82', '#3a4e63', '#293a4b', fade);
    screenQuad(q.D, q.C, WALL_H, 0.42, 0.58, 0.06, 0.94, rgba(mood(), 1), 0.55 * fade);
    ctx.globalAlpha = fade; ctx.fillStyle = 'rgba(0,0,0,0.35)'; poly(q.D, q.C, fp(q.D, q.C, 1, 0.08, WALL_H), fp(q.D, q.C, 0, 0.08, WALL_H)); ctx.globalAlpha = 1;
  } else if (k === 'locker') {
    const q = prism(x, y, x + 0.12, y + 0.14, x + 0.88, y + 0.86, 56, '#46657d', '#304a5e', '#22374a', fade);
    ctx.globalAlpha = fade; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.2;
    const a = fp(q.D, q.C, 0.5, 0, 56), b = fp(q.D, q.C, 0.5, 1, 56); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    for (let i = 0; i < 3; i++) { const s = fp(q.D, q.C, 0.12, 0.8 - i * 0.05, 56), e = fp(q.D, q.C, 0.38, 0.8 - i * 0.05, 56); ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(e[0], e[1]); ctx.stroke(); }
    ctx.globalAlpha = 1;
    if (p.act) { const led = fp(q.D, q.C, 0.62, 0.9, 56); ctx.fillStyle = p.opened ? '#2a3a44' : (Math.sin(G.t * 3 + x) > 0 ? '#ffb02e' : '#7a5a1a'); ctx.fillRect(led[0] - 1.5, led[1] - 1.5, 3, 3); }
  } else if (k === 'glass') {
    prism(x, y, x, y, x + 1, y + 1, 4, '#1a2530', '#141d27', '#0e151d', fade);
    const A = iso(x + 0.04, y + 0.04), B = iso(x + 0.96, y + 0.04), C = iso(x + 0.96, y + 0.96), D = iso(x + 0.04, y + 0.96), h = 60;
    ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(90,210,235,0.17)'; poly(D, C, [C[0], C[1] - h], [D[0], D[1] - h]);
    ctx.fillStyle = 'rgba(90,210,235,0.11)'; poly(C, B, [B[0], B[1] - h], [C[0], C[1] - h]);
    ctx.fillStyle = 'rgba(160,240,255,0.1)'; poly([A[0], A[1] - h], [B[0], B[1] - h], [C[0], C[1] - h], [D[0], D[1] - h]);
    ctx.strokeStyle = 'rgba(150,240,255,0.55)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(D[0], D[1]); ctx.lineTo(D[0], D[1] - h); ctx.lineTo(C[0], C[1] - h); ctx.lineTo(B[0], B[1] - h); ctx.moveTo(C[0], C[1]); ctx.lineTo(C[0], C[1] - h); ctx.stroke();
  } else if (k === 'console') {
    const q = prism(x, y, x + 0.08, y + 0.08, x + 0.92, y + 0.92, 32, '#33465a', '#222f3e', '#18222e', fade);
    const c = SCR[p.screen] || SCR.cyan, fl = 0.75 + 0.25 * Math.sin(G.t * 5 + x * 2);
    screenQuad(q.D, q.C, 32, 0.12, 0.88, 0.3, 0.88, c, 0.85 * fl * fade, 6);
    const sc = fp(q.D, q.C, 0.5, 0.6, 32); glow(sc[0], sc[1], 26, hexToRgb(c), 0.25 * fade);
  } else if (k === 'bench') {
    const q = prism(x, y, x + 0.06, y + 0.06, x + 0.94, y + 0.94, 26, '#76654f', '#4f4332', '#382f23', fade);
    const s = iso(x + 0.5, y + 0.5); ctx.fillStyle = '#9aa7b3'; ctx.fillRect(s[0] - 9, s[1] - 28, 6, 3); ctx.fillStyle = '#ff5a3c'; ctx.fillRect(s[0] + 2, s[1] - 28, 7, 3);
    ctx.fillStyle = 'rgba(255,176,46,0.95)'; ctx.beginPath(); ctx.arc(s[0] + 10, s[1] - 38, 3, 0, TAU); ctx.fill(); glow(s[0] + 10, s[1] - 38, 30, [255, 176, 46], 0.5);
    ctx.strokeStyle = '#444'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s[0] + 10, s[1] - 26); ctx.lineTo(s[0] + 10, s[1] - 38); ctx.stroke();
  } else if (k === 'terminal') {
    const q = prism(x, y, x + 0.06, y + 0.06, x + 0.94, y + 0.94, 40, '#3a4d62', '#26364a', '#1b2736', fade);
    const c = G.hacked ? SCR.green : SCR.cyan, fl = 0.8 + 0.2 * Math.sin(G.t * 7);
    screenQuad(q.D, q.C, 40, 0.1, 0.9, 0.25, 0.92, c, 0.9 * fl, 8);
    screenQuad(q.C, q.B, 40, 0.15, 0.85, 0.3, 0.85, c, 0.55 * fl);
    const sc = fp(q.D, q.C, 0.5, 0.6, 40); glow(sc[0], sc[1], 60, hexToRgb(c), 0.35);
  } else if (k === 'drone') {
    const s = iso(x + 0.5, y + 0.5), fl = fade;
    ctx.save(); ctx.translate(s[0], s[1]); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(0, 3, 15, 7, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2a3642'; ctx.lineWidth = 2.5; for (const a of [0.5, 1.6, 2.7, 3.9, 5.0]) { ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(Math.cos(a) * 17, Math.sin(a) * 8 + 2); ctx.stroke(); }
    ctx.fillStyle = '#3b4a58'; ctx.beginPath(); ctx.ellipse(0, -4, 10, 7, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#546778'; ctx.beginPath(); ctx.ellipse(-2, -7, 5, 3, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = Math.sin(G.t * 1.4 + x) > 0.6 ? '#ff3b4d' : '#4a1018'; ctx.fillRect(3, -5, 3, 2);
    if (p.act && !p.opened) glow(0, -8, 16, [255, 176, 46], 0.3 + 0.2 * Math.sin(G.t * 3));
    ctx.restore();
  }
}
function hexToRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function drawGlassOrb(cx, cy) {
  const s = iso(cx, cy), t = G.t, y = s[1] - 26 + Math.sin(t * 1.6) * 3, c = G.hacked ? [61, 255, 168] : [61, 224, 255];
  glow(s[0], y, 44, c, 0.55); ctx.fillStyle = rgba(c, 0.95); ctx.beginPath(); ctx.arc(s[0], y, 7, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(c, 0.8); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(s[0], y, 17, 6, t * 1.3, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.ellipse(s[0], y, 12, 4, -t * 2, 0, TAU); ctx.stroke();
}

/* ---------- characters ---------- */
const scrDir = (a) => { const vx = Math.cos(a), vy = Math.sin(a), sx = (vx - vy) * HW, sy = (vx + vy) * HH, n = Math.hypot(sx, sy) || 1; return [sx / n, sy / n]; };
const sh = (c, k) => `rgb(${c[0] * k | 0},${c[1] * k | 0},${c[2] * k | 0})`;
function limb(x0, y0, x1, y1, w, col) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }

function drawPlayer() {
  const p = player, s = iso(p.x, p.y), k = 0.45 + 0.55 * clamp(lightAt(p.x, p.y, 2) + 0.25, 0, 1);
  const sc = p.crouch ? 0.72 : 1, [fx, fy] = scrDir(p.ang), swing = Math.sin(p.phase) * (p.moving ? 1 : 0);
  ctx.save(); ctx.translate(s[0], s[1]);
  const ring = G.pl < 0.22 ? [61, 255, 168] : G.pl < 0.5 ? [255, 176, 46] : [255, 59, 77];
  ctx.strokeStyle = rgba(ring, 0.55); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 2, p.crouch ? 13 : 17, p.crouch ? 6.5 : 8.5, 0, 0, TAU); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(0, 2, 12, 5.5, 0, 0, TAU); ctx.fill();
  const bob = p.moving ? Math.abs(Math.sin(p.phase)) * 1.5 : 0;
  limb(-4, -14 * sc, -4 + swing * 2, -2 + swing * 2.5, 5, sh([38, 52, 66], k)); limb(4, -14 * sc, 4 - swing * 2, -2 - swing * 2.5, 5, sh([38, 52, 66], k));
  const top = -(34 * sc) - bob;
  if (fy < 0.1) { ctx.fillStyle = sh([70, 82, 96], k); ctx.fillRect(-9 - fx * 3, top + 4, 18, 18 * sc); }           // backpack behind
  const g = ctx.createLinearGradient(0, top, 0, top + 22 * sc); g.addColorStop(0, sh([58, 112, 140], k)); g.addColorStop(1, sh([34, 66, 88], k));
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-9, top + 4, 18, 20 * sc, 5); ctx.fill();
  if (fy >= 0.1) { ctx.fillStyle = sh([70, 82, 96], k); ctx.fillRect(-7 + fx * 6, top + 8, 5, 10 * sc); }
  ctx.fillStyle = '#ffb02e'; ctx.fillRect(-9, top + 14 * sc, 18, 2);
  limb(-10, top + 8, -11 - swing * 2, top + 20 * sc, 4, sh([50, 90, 114], k)); limb(10, top + 8, 11 + swing * 2, top + 20 * sc, 4, sh([50, 90, 114], k));
  ctx.fillStyle = sh([90, 118, 138], k); ctx.beginPath(); ctx.arc(0, top - 2, 9, 0, TAU); ctx.fill();
  if (fy > -0.35) { ctx.fillStyle = '#3de0ff'; ctx.beginPath(); ctx.ellipse(fx * 4.5, top - 1 + fy * 2, 5, 3, 0, 0, TAU); ctx.fill(); glow(fx * 4.5, top - 1, 14, [61, 224, 255], 0.5); }
  if (p.swing > 0) { const a = p.swing / 0.22; ctx.strokeStyle = rgba([150, 230, 255], a); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(fx * 12, top + 14 + fy * 6, 14, p.ang - 1.2, p.ang + 1.2); ctx.stroke(); glow(fx * 14, top + 14, 28, [150, 230, 255], 0.6 * a); }
  ctx.restore();
}

function drawGuard() {
  const g = guard, s = iso(g.x, g.y), k = 0.4 + 0.6 * clamp(lightAt(g.x, g.y, 2) + 0.2, 0, 1), [fx, fy] = scrDir(g.head());
  ctx.save(); ctx.translate(s[0], s[1]);
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.ellipse(0, 2, 18, 8, 0, 0, TAU); ctx.fill();
  if (!g.alive) {
    ctx.fillStyle = sh([50, 62, 74], 0.8); ctx.beginPath(); ctx.ellipse(0, -5, 15, 8, 0.2, 0, TAU); ctx.fill(); ctx.fillStyle = sh([70, 84, 98], 0.8); ctx.beginPath(); ctx.arc(10, -6, 6, 0, TAU); ctx.fill();
    if (Math.random() < 0.05) spark(g.x, g.y, 8, 2, [120, 220, 255], 1); ctx.restore(); return;
  }
  const sw = g.moving ? Math.sin(g.phase) : 0, wind = g.wind > 0, bob = g.moving ? Math.abs(Math.sin(g.phase)) * 1.8 : 0;
  limb(-6, -22, -6 + sw * 3, -2 + sw * 3, 6, sh([42, 54, 68], k)); limb(6, -22, 6 - sw * 3, -2 - sw * 3, 6, sh([42, 54, 68], k));
  const top = -50 - bob, g1 = ctx.createLinearGradient(0, top, 0, top + 30); g1.addColorStop(0, sh([86, 104, 122], k)); g1.addColorStop(1, sh([46, 58, 72], k));
  ctx.fillStyle = g1; ctx.beginPath(); ctx.roundRect(-14, top + 4, 28, 30, 6); ctx.fill();
  ctx.fillStyle = sh([255, 122, 26], k); ctx.fillRect(-14, top + 20, 28, 4);
  const ec = g.state === 'hunt' ? [255, 42, 58] : (g.state === 'suspicious' || g.state === 'investigate') ? [255, 225, 74] : g.stun > 0 ? [120, 220, 255] : [255, 163, 26];
  if (fy > -0.35) { ctx.fillStyle = rgba(ec, 0.9); ctx.beginPath(); ctx.arc(fx * 4, top + 24 + fy * 2, 3, 0, TAU); ctx.fill(); glow(fx * 4, top + 24, 12, ec, 0.5); }
  limb(-16, top + 8, -19 - sw * 2, top + 26, 5, sh([60, 74, 90], k));
  if (wind) { const a = 1 - g.wind / 0.55; limb(16, top + 8, 20, top - 12, 5, sh([60, 74, 90], k)); limb(20, top - 12, 24 + fx * 6, top - 24, 3, rgba([255, 120, 60], 0.6 + 0.4 * Math.sin(a * 30))); glow(24, top - 22, 26, [255, 90, 60], 0.7); }
  else limb(16, top + 8, 19 + sw * 2, top + 26, 5, sh([60, 74, 90], k));
  ctx.fillStyle = sh([100, 118, 136], k); ctx.beginPath(); ctx.arc(-14, top + 8, 6, 0, TAU); ctx.arc(14, top + 8, 6, 0, TAU); ctx.fill();
  ctx.fillStyle = sh([58, 70, 84], k); ctx.beginPath(); ctx.roundRect(-9, top - 14, 18, 17, 5); ctx.fill();
  if (fy > -0.35) { ctx.fillStyle = rgba(ec, 0.95); ctx.fillRect(fx * 5 - 7, top - 8 + fy * 2, 14, 4); glow(fx * 5, top - 6, 24, ec, 0.7); }
  limb(0, top - 14, 0, top - 22, 1.5, '#555'); ctx.fillStyle = rgba(ec, 0.8 + 0.2 * Math.sin(G.t * 6)); ctx.beginPath(); ctx.arc(0, top - 23, 2, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawCamera(c) {
  const s = iso(c.x, c.y), alive = !c.dead && c.dis <= 0 && !G.hacked, ang = alive ? c.ang : c.base;
  ctx.save(); ctx.translate(s[0], s[1] - 64);
  ctx.fillStyle = '#26323e'; ctx.fillRect(-5, -4, 10, 5);
  const [fx, fy] = scrDir(ang); ctx.fillStyle = '#3a4a5a'; ctx.beginPath(); ctx.roundRect(fx * 4 - 7, fy * 2 - 4, 14, 9, 3); ctx.fill();
  ctx.fillStyle = alive ? (c.det > 0 ? '#ff3b4d' : '#ff7a3a') : '#3a3030'; ctx.beginPath(); ctx.arc(fx * 10, fy * 5, 2.4, 0, TAU); ctx.fill();
  if (alive) glow(fx * 10, fy * 5, 16, [255, 60, 70], 0.55);
  ctx.restore();
}
function drawLaser(l) {
  const on = laserOn(l), warn = laserWarn(l); if (!on && !(warn && Math.sin(G.t * 40) > 0)) return;
  const a = iso(l.x + 0.5, l.y), b = iso(l.x + 0.5, l.y + 1), z = 14;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = on ? 'rgba(255,50,70,0.95)' : 'rgba(255,120,120,0.5)'; ctx.lineWidth = on ? 3 : 1.5; ctx.shadowColor = '#f00'; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.moveTo(a[0], a[1] - z); ctx.lineTo(b[0], b[1] - z); ctx.stroke(); ctx.restore();
}
