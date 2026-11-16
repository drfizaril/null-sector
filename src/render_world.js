'use strict';
/* Rendering: world geometry (floors, decals, walls, props). */
let shk = { x: 0, y: 0 };
function setWorld(c) { c.setTransform(DPR * cam.z, 0, 0, DPR * cam.z, DPR * (W / 2 - (cam.x + shk.x) * cam.z), DPR * (H / 2 - (cam.y + shk.y) * cam.z)); }
function viewBounds() {
  const z = cam.z, pts = [[0, 0], [W, 0], [0, H], [W, H]].map(([sx, sy]) => {
    const wx = (sx - W / 2) / z + cam.x, wy = (sy - H / 2) / z + cam.y; return [(wx / HW + wy / HH) / 2, (wy / HH - wx / HW) / 2]; });
  return { x0: Math.floor(Math.min(...pts.map((p) => p[0]))) - 1, x1: Math.ceil(Math.max(...pts.map((p) => p[0]))) + 4,
    y0: Math.floor(Math.min(...pts.map((p) => p[1]))) - 1, y1: Math.ceil(Math.max(...pts.map((p) => p[1]))) + 4 };
}
const DK = (a) => `rgba(3,6,11,${clamp(a, 0, 1).toFixed(3)})`;
function poly(...pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill(); }
const fp = (P, Q, u, v, h) => [P[0] + (Q[0] - P[0]) * u, P[1] + (Q[1] - P[1]) * u - v * h];
function overlay(pts, a0, a1, p0, p1) {
  if (a0 < 0.02 && a1 < 0.02) return;
  if (Math.abs(a0 - a1) < 0.03) ctx.fillStyle = DK((a0 + a1) / 2);
  else { const g = ctx.createLinearGradient(p0[0], p0[1], p1[0], p1[1]); g.addColorStop(0, DK(a0)); g.addColorStop(1, DK(a1)); ctx.fillStyle = g; }
  poly(...pts);
}
/* lit prism: tile (tx,ty) supplies the vertex-light samples; footprint x0..x1,y0..y1 */
function prism(tx, ty, x0, y0, x1, y1, h, cT, cL, cR, alpha, noLight) {
  const A = iso(x0, y0), B = iso(x1, y0), C = iso(x1, y1), D = iso(x0, y1);
  const Ch = [C[0], C[1] - h], Dh = [D[0], D[1] - h], Bh = [B[0], B[1] - h], Ah = [A[0], A[1] - h];
  ctx.globalAlpha = alpha == null ? 1 : alpha;
  ctx.fillStyle = cL; poly(D, C, Ch, Dh);
  ctx.fillStyle = cR; poly(C, B, Bh, Ch);
  ctx.fillStyle = cT; poly(Ah, Bh, Ch, Dh);
  if (!noLight) {
    const lD = vl(tx, ty + 1), lC = vl(tx + 1, ty + 1), lB = vl(tx + 1, ty);
    overlay([D, C, Ch, Dh], AMB * (1 - lD), AMB * (1 - lC), D, C);
    overlay([C, B, Bh, Ch], AMB * (1 - lC), AMB * (1 - lB), C, B);
    overlay([Ah, Bh, Ch, Dh], AMB * 0.82 * (1 - (lD + lC + lB) / 3), AMB * 0.82 * (1 - (lD + lC + lB) / 3), Ah, Ch);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.09)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(Dh[0], Dh[1]); ctx.lineTo(Ch[0], Ch[1]); ctx.lineTo(Bh[0], Bh[1]); ctx.stroke();
  return { A, B, C, D, h };
}
const glow = (x, y, r, col, a) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0)); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
const mood = () => mixc([255, 60, 70], [60, 220, 255], G.hackT);

/* ---------- floor ---------- */
function drawFloor(vb) {
  for (let y = Math.max(0, vb.y0); y <= Math.min(MH - 1, vb.y1); y++) for (let x = Math.max(0, vb.x0); x <= Math.min(MW - 1, vb.x1); x++) {
    const t = L.grid[y][x]; if (t === 1) continue;
    const a = iso(x, y), b = iso(x + 1, y), c = iso(x + 1, y + 1), d = iso(x, y + 1), h = hash(x, y);
    ctx.fillStyle = t === 2 ? '#1c2a35' : `rgb(${36 + h * 12 | 0},${50 + h * 12 | 0},${64 + h * 14 | 0})`; poly(a, b, c, d);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
    if (t === 2) {
      ctx.strokeStyle = G.hacked ? 'rgba(61,255,168,0.35)' : 'rgba(61,224,255,0.3)'; ctx.lineWidth = 1.5;
      for (let i = 1; i < 5; i++) { const u = i / 5; ctx.beginPath(); ctx.moveTo(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u); ctx.lineTo(d[0] + (c[0] - d[0]) * u, d[1] + (c[1] - d[1]) * u); ctx.stroke(); }
    } else {
      if (h > 0.55) { ctx.strokeStyle = 'rgba(255,255,255,0.05)'; const m = iso(x + 0.5, y + 0.5); ctx.beginPath(); ctx.moveTo(m[0], m[1] - 10); ctx.lineTo(m[0] + 20, m[1]); ctx.lineTo(m[0], m[1] + 10); ctx.lineTo(m[0] - 20, m[1]); ctx.closePath(); ctx.stroke(); }
      if (h < 0.3) { ctx.fillStyle = 'rgba(0,0,0,0.45)'; for (const [u, v] of [[0.12, 0.12], [0.88, 0.12], [0.12, 0.88], [0.88, 0.88]]) { const p = iso(x + u, y + v); ctx.fillRect(p[0] - 1, p[1] - 0.5, 2, 1.2); } }
    }
  }
}
function onFloor(fn) { ctx.save(); ctx.transform(HW, HH, -HW, HH, 0, 0); fn(); ctx.restore(); }
function drawDecals(vb) {
  for (const d of L.decals) {
    const px = d.x != null ? d.x : d.x0, py = d.y != null ? d.y : d.y0;
    if (px < vb.x0 - 4 || px > vb.x1 + 4 || py < vb.y0 - 4 || py > vb.y1 + 4) continue;
    onFloor(() => {
      if (d.k === 'text') { ctx.font = `${d.s}px 'Share Tech Mono', monospace`; ctx.fillStyle = 'rgba(210,230,240,0.16)'; ctx.fillText(d.t, d.x, d.y); }
      else if (d.k === 'ring') { ctx.strokeStyle = G.hacked ? 'rgba(61,255,168,0.28)' : 'rgba(61,224,255,0.25)'; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.stroke(); }
      else if (d.k === 'line') { ctx.strokeStyle = 'rgba(61,224,255,0.2)'; ctx.lineWidth = 0.04; ctx.setLineDash([0.3, 0.2]); ctx.beginPath(); ctx.moveTo(d.x0, d.y0); ctx.lineTo(d.x1, d.y1); ctx.stroke(); }
      else if (d.k === 'hazard') {
        ctx.save(); ctx.beginPath(); ctx.rect(d.x, d.y + 0.1, d.w, 0.28); ctx.clip();
        for (let i = -2; i < d.w * 4 + 2; i++) { ctx.fillStyle = i % 2 ? 'rgba(255,190,40,0.55)' : 'rgba(10,10,10,0.6)'; ctx.beginPath(); ctx.moveTo(d.x + i * 0.25, d.y + 0.1); ctx.lineTo(d.x + i * 0.25 + 0.25, d.y + 0.1); ctx.lineTo(d.x + i * 0.25 + 0.5, d.y + 0.38); ctx.lineTo(d.x + i * 0.25 + 0.25, d.y + 0.38); ctx.fill(); }
        ctx.restore();
      } else if (d.k === 'arrow') { ctx.fillStyle = 'rgba(255,190,40,0.35)'; ctx.beginPath(); ctx.moveTo(d.x - 0.7, d.y + 0.5); ctx.lineTo(d.x, d.y - 0.5); ctx.lineTo(d.x + 0.7, d.y + 0.5); ctx.lineTo(d.x, d.y + 0.25); ctx.fill(); }
      else if (d.k === 'cable') { ctx.strokeStyle = 'rgba(5,8,12,0.8)'; ctx.lineWidth = 0.09; ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.quadraticCurveTo(d.x + Math.cos(d.a) * d.l * 0.5 + d.c, d.y + Math.sin(d.a) * d.l * 0.5 - d.c, d.x + Math.cos(d.a) * d.l, d.y + Math.sin(d.a) * d.l); ctx.stroke(); }
      else if (d.k === 'stain') { const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r); g.addColorStop(0, 'rgba(10,25,20,0.5)'); g.addColorStop(1, 'rgba(10,25,20,0)'); ctx.fillStyle = g; ctx.fillRect(d.x - d.r, d.y - d.r, d.r * 2, d.r * 2); }
      else if (d.k === 'scorch') { const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r); g.addColorStop(0, 'rgba(0,0,0,0.7)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(d.x - d.r, d.y - d.r, d.r * 2, d.r * 2); }
    });
  }
}
function drawDust() {
  ctx.fillStyle = 'rgba(190,225,240,0.5)';
  for (const m of dust) { const p = iso(m.x, m.y); ctx.fillRect(p[0], p[1] - m.z, 1.6, 1.6); }
}

/* ---------- walls & outside mass ---------- */
function drawOutside(x, y) {
  const far = x >= MW || y >= MH, h = far ? 10 + hash(x, y) * 10 : 26 + hash(x, y) * 34, v = hash(y, x);
  const k = 13 + v * 8 | 0;
  prism(x, y, x, y, x + 1, y + 1, h, `rgb(${k + 6},${k + 14},${k + 22})`, `rgb(${k - 2},${k + 4},${k + 10})`, `rgb(${k - 6},${k},${k + 6})`, 1, true);
  if (v > 0.9) { const p = iso(x + 0.5, y + 0.5); ctx.fillStyle = 'rgba(255,60,70,0.8)'; ctx.fillRect(p[0] - 1, p[1] - h - 1, 2, 2); }
}
function drawWall(x, y, alpha) {
  const hh = WALL_H, hs = hash(x, y);
  const left = y + 1 < MH && L.grid[y][x] !== undefined && L.grid[y + 1][x] !== 1;
  const right = x + 1 < MW && L.grid[y][x + 1] !== 1;
  const q = prism(x, y, x, y, x + 1, y + 1, hh, '#4a5f73', left ? '#30445a' : '#243445', right ? '#223244' : '#1c2a38', alpha);
  ctx.globalAlpha = alpha;
  if (left) {
    const D = q.D, C = q.C;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
    const m = fp(D, C, 0.5, 0, hh), m0 = fp(D, C, 0.5, 1, hh); ctx.beginPath(); ctx.moveTo(m[0], m[1]); ctx.lineTo(m0[0], m0[1]); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; poly(D, C, fp(D, C, 1, 0.14, hh), fp(D, C, 0, 0.14, hh));
    if (hs < 0.2) { ctx.fillStyle = 'rgba(255,190,40,0.55)'; for (let i = 0; i < 4; i++) poly(fp(D, C, i * 0.25, 0.14, hh), fp(D, C, i * 0.25 + 0.12, 0.14, hh), fp(D, C, i * 0.25 + 0.12, 0.02, hh), fp(D, C, i * 0.25, 0.02, hh)); }
    else if (hs < 0.38) { ctx.strokeStyle = 'rgba(120,150,170,0.5)'; ctx.lineWidth = 5; ctx.beginPath(); let a = fp(D, C, 0, 0.5, hh), b = fp(D, C, 1, 0.5, hh); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(a[0], a[1] - 2); ctx.lineTo(b[0], b[1] - 2); ctx.stroke(); }
    else if (hs < 0.5) { ctx.fillStyle = 'rgba(0,0,0,0.4)'; poly(fp(D, C, 0.25, 0.65, hh), fp(D, C, 0.75, 0.65, hh), fp(D, C, 0.75, 0.4, hh), fp(D, C, 0.25, 0.4, hh)); ctx.strokeStyle = 'rgba(120,150,170,0.35)'; for (let i = 1; i < 5; i++) { const a = fp(D, C, 0.25, 0.4 + i * 0.05, hh), b = fp(D, C, 0.75, 0.4 + i * 0.05, hh); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } }
  }
  if (right && hs > 0.45 && hs < 0.6) { const B = q.B, C = q.C; ctx.strokeStyle = 'rgba(120,150,170,0.45)'; ctx.lineWidth = 5; const a = fp(C, B, 0, 0.55, hh), b = fp(C, B, 1, 0.55, hh); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  // emissive emergency strip
  if (hs > 0.78 && (left || right)) {
    const c = mood(); ctx.globalAlpha = alpha * (0.6 + 0.4 * Math.sin(G.t * 3 + x));
    ctx.fillStyle = rgba(c, 1);
    if (left) poly(fp(q.D, q.C, 0.1, 0.9, hh), fp(q.D, q.C, 0.9, 0.9, hh), fp(q.D, q.C, 0.9, 0.86, hh), fp(q.D, q.C, 0.1, 0.86, hh));
    else poly(fp(q.C, q.B, 0.1, 0.9, hh), fp(q.C, q.B, 0.9, 0.9, hh), fp(q.C, q.B, 0.9, 0.86, hh), fp(q.C, q.B, 0.1, 0.86, hh));
  }
  ctx.globalAlpha = 1;
}
function drawDoor(x, y) {
  const hh = WALL_H, q = prism(x, y, x, y, x + 1, y + 1, hh, '#4a5f73', '#30445a', '#223244', 1), D = q.D, C = q.C, o = G.doorT, c = mood();
  const pan = (u0, u1, v0, v1, f) => { ctx.fillStyle = f; poly(fp(D, C, u0, v0, hh), fp(D, C, u1, v0, hh), fp(D, C, u1, v1, hh), fp(D, C, u0, v1, hh)); };
  pan(0.08, 0.92, 0, 0.94, '#07090c');                       // opening
  if (o > 0.02) { const mid = fp(D, C, 0.5, 0.2, hh); glow(mid[0], mid[1], 50, [150, 255, 220], 0.7 * o); }
  pan(0.08, 0.92, o * 0.9 + 0.02, 0.94, G.hacked ? '#26503f' : '#4a2128');  // sliding panel
  ctx.fillStyle = 'rgba(255,190,40,0.6)'; for (let i = 0; i < 6; i++) { const v = o * 0.9 + 0.02; poly(fp(D, C, 0.08 + i * 0.14, v + 0.05, hh), fp(D, C, 0.08 + i * 0.14 + 0.07, v + 0.05, hh), fp(D, C, 0.08 + i * 0.14 + 0.07, v, hh), fp(D, C, 0.08 + i * 0.14, v, hh)); }
  ctx.fillStyle = rgba(c, 0.55 + 0.45 * Math.sin(G.t * 4)); const lb = [fp(D, C, 0.3, 0.97, hh), fp(D, C, 0.7, 0.97, hh), fp(D, C, 0.7, 0.99, hh), fp(D, C, 0.3, 0.99, hh)]; poly(...lb);
  const e = (u) => { ctx.fillStyle = rgba(c, 0.9); poly(fp(D, C, u, 0, hh), fp(D, C, u + 0.03, 0, hh), fp(D, C, u + 0.03, 0.94, hh), fp(D, C, u, 0.94, hh)); };
  e(0.06); e(0.91);
}
