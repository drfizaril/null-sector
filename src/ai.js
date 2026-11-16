'use strict';
/* OPTIC-01 guard, security cameras, laser gates. */
class Guard {
  constructor(wps) {
    this.wps = wps; this.wi = 0; this.x = wps[0].x; this.y = wps[0].y;
    this.body = 0; this.look = 0; this.sw = 0; this.state = 'patrol'; this.hp = 3; this.susp = 0;
    this.path = []; this.goal = null; this.goalPt = null; this.repath = 0; this.pause = 0; this.scan = 0; this.stun = 0;
    this.wind = 0; this.cd = 0; this.lost = 0; this.last = null; this.phase = 0; this.moving = false; this.alive = true;
    this.sees = false; this.suspT = 0; this.icon = 0;
  }
  head() { return this.body + this.look; }
  range() { return 6.4 * (G.hacked ? 0.65 : 1); }
  canSee() {
    const dx = player.x - this.x, dy = player.y - this.y, d = Math.hypot(dx, dy);
    const rng = this.range() * (player.crouch ? 0.8 : 1);
    if (player.crouch && player.still > 0.25 && G.pl < 0.28 && d > 1.4) return false;
    if (d > rng) return false;
    if (d > 0.6 && Math.abs(angDiff(Math.atan2(dy, dx), this.head())) > 0.49) return false;
    return los(this.x, this.y, player.x, player.y);
  }
  hear(x, y, r) {
    if (!this.alive || this.state === 'hunt' || this.wind > 0) return;
    const d = Math.hypot(x - this.x, y - this.y), eff = los(this.x, this.y, x, y) ? d : d * 1.8;
    if (eff > r) return;
    this.state = 'investigate'; this.goal = { x, y }; this.scan = 0; this.path = []; this.susp = Math.max(this.susp, 20); this.icon = 1.4;
    Sfx.suspicious();
  }
  startHunt() {
    this.state = 'hunt'; this.susp = 100; this.lost = 0; this.path = []; G.stats.spotted++;
    Sfx.alert(); say('OPTIC-01 LOCKED ON — break line of sight, or strike!', 'bad');
  }
  turn(des, rate, dt) { this.body += clamp(angDiff(des, this.body), -rate * dt, rate * dt); }
  goTo(t, speed, dt) {
    this.repath -= dt;
    if (!this.path.length || this.repath <= 0 || !this.goalPt || Math.hypot(this.goalPt.x - t.x, this.goalPt.y - t.y) > 0.8) {
      this.path = findPath(this.x, this.y, t.x, t.y) || []; this.goalPt = { x: t.x, y: t.y }; this.repath = 0.5;
    }
    while (this.path.length > 1 && lineClear(this.x, this.y, this.path[1].x, this.path[1].y)) this.path.shift();
    const n = this.path[0];
    if (!n) { this.moving = false; return; }
    const dx = n.x - this.x, dy = n.y - this.y, d = Math.hypot(dx, dy);
    if (d < 0.12) { this.path.shift(); return; }
    this.turn(Math.atan2(dy, dx), 4.2, dt);
    const s = speed * dt, nx = this.x + (dx / d) * s, ny = this.y + (dy / d) * s;
    if (canStand(nx, this.y, 0.28)) this.x = nx;
    if (canStand(this.x, ny, 0.28)) this.y = ny;
    this.moving = true; this.phase += dt * speed * 4;
  }
  nearestWp() { let b = 0, bd = 1e9; this.wps.forEach((w, i) => { const d = Math.hypot(w.x - this.x, w.y - this.y); if (d < bd) { bd = d; b = i; } }); return b; }
  update(dt) {
    if (!this.alive) return;
    this.cd = Math.max(0, this.cd - dt); this.icon = Math.max(0, this.icon - dt); this.moving = false;
    if (this.stun > 0) { this.stun -= dt; return; }
    const sees = this.canSee(); this.sees = sees;
    if (sees) {
      const d = Math.hypot(player.x - this.x, player.y - this.y), rng = this.range();
      const vf = clamp(0.25 + G.pl * 0.95, 0.25, 1), fill = 1.8 + (player.up.spoof ? 1.5 : 0);
      this.susp = Math.min(100, this.susp + (100 / fill) * vf * (player.crouch ? 0.8 : 1) * (1.2 - 0.5 * d / rng) * dt);
      this.last = { x: player.x, y: player.y }; this.lost = 0;
      if (this.state !== 'hunt') {
        if (this.susp >= 100) this.startHunt();
        else if (this.susp >= 28 && this.state !== 'suspicious') { this.state = 'suspicious'; this.suspT = 0; this.icon = 1.2; Sfx.suspicious(); }
      }
    } else if (this.state === 'hunt') { this.lost += dt; this.susp = Math.max(45, this.susp - 8 * dt); }
    else this.susp = Math.max(0, this.susp - 16 * dt);

    if (this.state === 'patrol') {
      this.look *= 0.92;
      if (this.pause > 0) {
        this.pause -= dt; this.sw += dt; this.look = Math.sin(this.sw * 1.9) * 1.05;
        if (this.pause <= 0) { this.look = 0; this.wi = (this.wi + 1) % this.wps.length; }
        return;
      }
      const w = this.wps[this.wi];
      if (Math.hypot(w.x - this.x, w.y - this.y) < 0.4) { this.pause = w.wait; this.sw = 0; this.path = []; return; }
      this.goTo(w, 1.3, dt);
    } else if (this.state === 'suspicious') {
      this.suspT += dt; this.look *= 0.9;
      const t = this.last || { x: player.x, y: player.y };
      this.turn(Math.atan2(t.y - this.y, t.x - this.x), 3, dt);
      if (!sees && this.suspT > 1.0) { this.state = 'investigate'; this.goal = this.last; this.scan = 0; this.path = []; }
      if (this.susp < 8) this.state = 'patrol';
    } else if (this.state === 'investigate') {
      if (!this.goal) { this.state = 'patrol'; return; }
      if (Math.hypot(this.goal.x - this.x, this.goal.y - this.y) < 0.55) {
        this.scan += dt; this.look = Math.sin(this.scan * 2.2) * 1.2;
        if (this.scan > 3.2) { this.state = 'patrol'; this.look = 0; this.goal = null; this.wi = this.nearestWp(); this.path = []; Sfx.lost(); }
      } else { this.look *= 0.9; this.goTo(this.goal, 1.9, dt); }
    } else if (this.state === 'hunt') {
      this.look *= 0.8;
      const dp = Math.hypot(player.x - this.x, player.y - this.y);
      if (this.wind > 0) {
        this.wind -= dt; this.turn(Math.atan2(player.y - this.y, player.x - this.x), 5, dt);
        if (this.wind <= 0) { if (Math.hypot(player.x - this.x, player.y - this.y) < 1.35) hurtPlayer(22); this.cd = 1.5; }
        return;
      }
      if (sees && dp < 1.1 && this.cd <= 0) { this.wind = 0.55; Sfx.swing(); return; }
      const g = sees ? { x: player.x, y: player.y } : this.last;
      if (g && Math.hypot(g.x - this.x, g.y - this.y) > 0.6) this.goTo(g, 2.5, dt);
      else if (!sees) { this.state = 'investigate'; this.goal = this.last; this.scan = 0; this.path = []; }
      if (!sees && this.lost > 7) { this.state = 'investigate'; this.goal = this.last; this.scan = 0; }
    }
  }
}

function hurtPlayer(d) {
  player.hp = Math.max(0, player.hp - d); player.hurt = 0.4; G.shake = 10; Sfx.hurt();
  const fx = $('fx'); fx.classList.remove('hurt'); void fx.offsetWidth; fx.classList.add('hurt');
  if (player.hp <= 0 && G.state === 'play') die();
}

function alarm(x, y, msg) {
  if (G.alarmCd > 0) return;
  G.alarmCd = 8; Sfx.alert(); G.stats.spotted++;
  say(msg || 'ALARM — guard dispatched to your position', 'bad');
  if (guard.alive && guard.state !== 'hunt') { guard.state = 'investigate'; guard.goal = { x, y }; guard.scan = 0; guard.path = []; guard.susp = Math.max(guard.susp, 40); guard.icon = 1.5; }
}

const laserOn = (l) => !G.hacked && ((G.t + l.ph * 2) % 4) < 2;
const laserWarn = (l) => !G.hacked && !laserOn(l) && ((G.t + l.ph * 2) % 4) > 3.6;

function updateHazards(dt) {
  G.alarmCd = Math.max(0, G.alarmCd - dt);
  for (const c of cams) {
    if (c.dead) continue;
    if (G.hacked) { c.dead = true; spark(c.x, c.y, 50, 14, [255, 200, 90]); Sfx.zap(); continue; }
    if (c.dis > 0) { c.dis -= dt; continue; }
    c.ang = c.base + Math.sin(G.t * 0.7 + c.ph) * c.sweep;
    const dx = player.x - c.x, dy = player.y - c.y, d = Math.hypot(dx, dy);
    let see = d < c.range && Math.abs(angDiff(Math.atan2(dy, dx), c.ang)) < c.fov / 2 && los(c.x, c.y, player.x, player.y);
    if (see && player.crouch && player.still > 0.25 && G.pl < 0.25) see = false;
    c.det = see ? c.det + dt : Math.max(0, c.det - dt * 0.7);
    if (c.det > 0.9) { c.det = 0; alarm(player.x, player.y, 'CAMERA ALERT — guard dispatched'); }
  }
  for (const l of lasers) {
    l.cool = Math.max(0, l.cool - dt);
    if (laserOn(l) && l.cool <= 0 && Math.floor(player.x) === l.x && Math.floor(player.y) === l.y) {
      l.cool = 2; Sfx.laser(); hurtPlayer(8); spark(player.x, player.y, 20, 10, [255, 70, 80]);
      alarm(player.x, player.y, 'LASER TRIPPED — guard dispatched');
    }
  }
}
