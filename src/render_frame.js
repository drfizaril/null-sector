'use strict';
/* Rendering: lighting mask, depth-sorted pass, overlays, frame. */
function lightPath(c, pts) { c.beginPath(); c.moveTo(...iso(pts[0][0], pts[0][1])); for (let i = 1; i < pts.length; i++) c.lineTo(...iso(pts[i][0], pts[i][1])); c.closePath(); }
function onScreen(l) { const s = iso(l.x, l.y), R = l.r * HW * 1.42 * cam.z, sx = (s[0] - cam.x) * cam.z + W / 2, sy = (s[1] - cam.y) * cam.z + H / 2; return sx > -R && sx < W + R && sy > -R && sy < H + R; }
function cutLight(c, l, col, amul) {
  c.save(); lightPath(c, l.poly); c.clip();
  const s = iso(l.x, l.y), R = l.r * HW * 1.4142, a = l.a * (amul == null ? 1 : amul), f = (v) => (col ? rgba(col, v) : `rgba(0,0,0,${v})`);
  c.translate(s[0], s[1]); c.scale(1, 0.5);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, R);
  g.addColorStop(0, f(a)); g.addColorStop(0.25, f(a * 0.65)); g.addColorStop(0.5, f(a * 0.354)); g.addColorStop(0.75, f(a * 0.125)); g.addColorStop(1, f(0));
  c.fillStyle = g; c.fillRect(-R, -R, R * 2, R * 2); c.restore();
}
function coneColor(l) {
  if (guard.alive && Math.abs(l.x - guard.x) < 1e-6 && Math.abs(l.y - guard.y) < 1e-6) {
    return guard.state === 'hunt' ? [255, 50, 60] : (guard.state === 'suspicious' || guard.state === 'investigate' || guard.susp > 10) ? [255, 215, 70] : G.hacked ? [80, 255, 190] : [80, 215, 255];
  }
  return [255, 60, 70];
}
function renderMask() {
  const c = lctx; c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, lightCv.width, lightCv.height);
  c.fillStyle = `rgba(3,6,11,${AMB})`; c.fillRect(0, 0, lightCv.width, lightCv.height);
  c.globalCompositeOperation = 'destination-out'; setWorld(c);
  for (const l of G.lights) if (onScreen(l)) cutLight(c, l);
  c.globalCompositeOperation = 'source-over';
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-atop'; ctx.drawImage(lightCv, 0, 0); ctx.globalCompositeOperation = 'source-over'; setWorld(ctx);
}
function renderFloorOverlays() {
  ctx.globalCompositeOperation = 'lighter';
  for (const l of G.lights) {
    if (!onScreen(l) || l.t === 'player' || l.t === 'flash') continue;
    if (l.cone) { const col = coneColor(l); cutLight(ctx, l, col, 0.42); ctx.strokeStyle = rgba(col, 0.55); ctx.lineWidth = 1.5; lightPath(ctx, l.poly); ctx.stroke(); }
    else cutLight(ctx, l, l.col, l.col[0] > 240 && l.col[1] > 200 ? 0.1 : 0.3);
  }
  for (const l of G.lights) if (l.t === 'flash') cutLight(ctx, l, l.col, 0.5);
  ctx.globalCompositeOperation = 'source-over';
  for (const r of ripples) onFloor(() => { ctx.strokeStyle = rgba(r.col, r.a); ctx.lineWidth = 0.05; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke(); });
  if (player.scanT > 0 || player.scanR > 0 && player.scanR < 14) onFloor(() => { ctx.strokeStyle = `rgba(61,224,255,${clamp(1 - player.scanR / 14, 0, 1)})`; ctx.lineWidth = 0.12; ctx.beginPath(); ctx.arc(player.x, player.y, player.scanR, 0, TAU); ctx.stroke(); });
  if (G.state === 'play' && mouse.on && G.modal == null) {
    const m = mouseGrid(); let dx = m.x - player.x, dy = m.y - player.y; const d = Math.hypot(dx, dy) || 1, far = d > 9; if (far) { dx *= 9 / d; dy *= 9 / d; }
    const t = rayLimit(player.x, player.y, player.x + dx, player.y + dy), ready = player.cdLure <= 0;
    onFloor(() => { ctx.strokeStyle = ready ? (far ? 'rgba(255,176,46,0.7)' : 'rgba(61,224,255,0.7)') : 'rgba(150,150,150,0.3)'; ctx.lineWidth = 0.05; ctx.setLineDash([0.18, 0.12]); ctx.beginPath(); ctx.arc(t.x, t.y, 0.38, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(t.x - 0.12, t.y); ctx.lineTo(t.x + 0.12, t.y); ctx.moveTo(t.x, t.y - 0.12); ctx.lineTo(t.x, t.y + 0.12); ctx.stroke(); });
  }
}
function fadeFor(tx, ty, h) {
  const i = ty * MW + tx; let tg = 1;
  if (h > 30 && tx + ty + 1 > player.x + player.y + 0.3) { const w = iso(tx + 0.5, ty + 0.5), p = iso(player.x, player.y), dx = Math.abs(w[0] - p[0]), dy = w[1] - p[1]; if (dx < HW * 1.5 && dy > -6 && dy < h + 34) tg = 0.22; }
  fadeMap[i] += (tg - fadeMap[i]) * 0.2; return fadeMap[i];
}
function renderObjects(vb) {
  const items = [], push = (k, f) => items.push({ k, f });
  for (let y = vb.y0; y <= vb.y1; y++) for (let x = vb.x0; x <= vb.x1; x++) {
    const inside = x >= 0 && y >= 0 && x < MW && y < MH;
    if (!inside) { if (x > -18 && y > -18 && x < MW + 18 && y < MH + 18) push(x + y + 1 + x * 1e-4, () => drawOutside(x, y)); continue; }
    const t = L.grid[y][x];
    if (t === 1) push(x + y + 1 + x * 1e-4, () => drawWall(x, y, fadeFor(x, y, WALL_H)));
    else if (t === 3) push(x + y + 1 + x * 1e-4, () => drawDoor(x, y));
    const p = L.propAt[y][x];
    if (p) { const h = ({ pillar: WALL_H, locker: 56, glass: 60, terminal: 40, console: 32 })[p.k] || 0; push(x + y + 1 + x * 1e-4, () => drawProp(p, h ? fadeFor(x, y, h) : 1)); }
  }
  push(16 + 10 - 0.5, () => drawGlassOrb(16, 10));
  for (const c of cams) push(c.x + c.y + 0.8, () => drawCamera(c));
  for (const l of lasers) push(l.x + l.y + 1, () => drawLaser(l));
  push(guard.x + guard.y + 0.01, drawGuard);
  push(player.x + player.y + 0.02, drawPlayer);
  items.sort((a, b) => a.k - b.k);
  for (const it of items) it.f();
}
function w2s(wx, wy) { return [(wx - cam.x) * cam.z + W / 2, (wy - cam.y) * cam.z + H / 2]; }
function renderOverlays() {
  ctx.globalCompositeOperation = 'lighter';
  for (const p of parts) { const s = iso(p.x, p.y), a = clamp(p.life / p.max, 0, 1); ctx.fillStyle = rgba(p.col, a); ctx.fillRect(s[0] - 1, s[1] - p.z - 1, 2.4, 2.4); }
  for (const b of bolts) { const t = b.t / b.dur, x = lerp(b.x0, b.x1, t), y = lerp(b.y0, b.y1, t), s = iso(x, y), z = 34 + Math.sin(t * Math.PI) * 44; glow(s[0], s[1] - z, 14, [255, 210, 120], 0.8); ctx.fillStyle = '#fff'; ctx.fillRect(s[0] - 2, s[1] - z - 2, 4, 4); }
  ctx.globalCompositeOperation = 'source-over';
  for (const b of bolts) { const t = b.t / b.dur, s = iso(lerp(b.x0, b.x1, t), lerp(b.y0, b.y1, t)); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(s[0], s[1], 5, 2.5, 0, 0, TAU); ctx.fill(); }
  // scanner reveal (through darkness & walls)
  if (player.scanT > 0) {
    const a = clamp(player.scanT, 0, 1);
    for (const q of L.props) if (q.act === 'container' && !q.opened) { const s = iso(q.x + 0.5, q.y + 0.5), y = s[1] - 70 + Math.sin(G.t * 4) * 3; ctx.strokeStyle = rgba([255, 176, 46], a); ctx.lineWidth = 2; ctx.fillStyle = rgba([255, 176, 46], a * 0.3); ctx.beginPath(); ctx.moveTo(s[0], y - 8); ctx.lineTo(s[0] + 8, y); ctx.lineTo(s[0], y + 8); ctx.lineTo(s[0] - 8, y); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(s[0], y + 10); ctx.lineTo(s[0], s[1] - 8); ctx.stroke(); }
    if (guard.alive) { const s = iso(guard.x, guard.y), c = [255, 138, 26]; ctx.strokeStyle = rgba(c, a); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(s[0], s[1] - 28, 18, 34, 0, 0, TAU); ctx.stroke(); ctx.fillStyle = rgba(c, 0.18 * a); ctx.fill();
      const pl = castPoly(guard.x, guard.y, guard.range(), 22, 0, guard.head() - 0.49, guard.head() + 0.49); ctx.strokeStyle = rgba(c, a * 0.8); lightPath(ctx, pl); ctx.stroke(); }
    for (const c of cams) if (!c.dead) { const s = iso(c.x, c.y); ctx.strokeStyle = rgba([255, 60, 70], a); ctx.lineWidth = 2; ctx.strokeRect(s[0] - 9, s[1] - 72, 18, 14); }
    for (const l of lasers) if (!G.hacked) { const s = iso(l.x + 0.5, l.y + 0.5); ctx.strokeStyle = rgba([255, 60, 70], a * 0.7); ctx.beginPath(); ctx.arc(s[0], s[1], 8, 0, TAU); ctx.stroke(); }
  }
  // guard suspicion icon + backstab cue
  if (guard.alive) {
    const s = iso(guard.x, guard.y), y = s[1] - 82;
    if (guard.susp > 3 || guard.icon > 0 || guard.state === 'hunt') {
      const hunt = guard.state === 'hunt', c = hunt ? [255, 50, 60] : [255, 215, 70];
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(s[0], y, 13, 0, TAU); ctx.stroke();
      ctx.strokeStyle = rgba(c, 1); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(s[0], y, 13, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(guard.susp / 100, 0.04, 1)); ctx.stroke();
      ctx.fillStyle = rgba(c, 1); ctx.font = "bold 17px 'Rajdhani', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(hunt ? '!' : '?', s[0], y + 1);
    }
    const dx = guard.x - player.x, dy = guard.y - player.y, d = Math.hypot(dx, dy), gf = guard.head(), behind = Math.cos(gf) * (player.x - guard.x) + Math.sin(gf) * (player.y - guard.y) < -0.1 * d;
    if (d < 1.9 && behind && guard.state !== 'hunt' && guard.wind <= 0) { ctx.fillStyle = '#3dffa8'; ctx.font = "bold 13px 'Share Tech Mono', monospace"; ctx.textAlign = 'center'; ctx.fillText(Mobile.enabled ? '[BATON] TAKEDOWN' : '[SPACE] TAKEDOWN', s[0], y - 24); }
  }
  for (const f of floaters) { const s = iso(f.x, f.y); ctx.globalAlpha = clamp(f.life, 0, 1); ctx.fillStyle = f.col; ctx.font = "bold 14px 'Share Tech Mono', monospace"; ctx.textAlign = 'center'; ctx.fillText(f.text, s[0], s[1] - f.z - 30); ctx.globalAlpha = 1; }
  // interaction prompt (screen space)
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (G.state === 'play' && G.modal == null) {
    const q = nearestInteract();
    if (q) {
      const s = iso(q.x + 0.5, q.y + 0.5), h = ({ pillar: 0, locker: 56, terminal: 40, console: 32, bench: 26, crate: 24 })[q.k] || 14, [sx, sy] = w2s(s[0], s[1] - h - 26);
      const txt = q.act === 'terminal' ? (G.hacked ? 'Terminal hijacked' : 'Hijack terminal') : q.act === 'bench' ? 'Use workbench' : 'Search ' + q.label.toLowerCase();
      ctx.font = "14px 'Share Tech Mono', monospace"; const w = ctx.measureText(txt).width + 46, bob = Math.sin(G.t * 4) * 2;
      ctx.fillStyle = 'rgba(6,12,18,0.9)'; ctx.strokeStyle = '#3de0ff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(sx - w / 2, sy - 14 + bob, w, 28, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3de0ff'; ctx.beginPath(); ctx.roundRect(sx - w / 2 + 6, sy - 9 + bob, 20, 18, 3); ctx.fill();
      ctx.fillStyle = '#04070b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = "bold 13px 'Share Tech Mono', monospace"; ctx.fillText(Mobile.enabled ? '●' : 'E', sx - w / 2 + 16, sy + bob + 1);
      ctx.fillStyle = '#e6f6fb'; ctx.textAlign = 'left'; ctx.font = "14px 'Share Tech Mono', monospace"; ctx.fillText(txt, sx - w / 2 + 34, sy + bob + 1);
    }
  }
}
function renderFrame() {
  G.frame++;
  shk.x = G.shake > 0.3 ? (Math.random() - 0.5) * G.shake : 0; shk.y = G.shake > 0.3 ? (Math.random() - 0.5) * G.shake : 0;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); setWorld(ctx);
  const vb = viewBounds();
  drawFloor(vb); drawDecals(vb); drawDust();
  renderMask(); renderFloorOverlays(); renderObjects(vb); renderOverlays();
}
