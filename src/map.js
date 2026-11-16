'use strict';
/* NULL//SECTOR — Lab 01 map + world data.
   Grid coordinates: x = gx (right-down on screen), y = gy (left-down on screen). */
const Lab = (function () {
  const MW = 34, MH = 24;

  function build() {
    const grid = Array.from({ length: MH }, () => Array(MW).fill(1));
    const carve = (x0, y0, x1, y1, v = 0) => {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y][x] = v;
    };

    // ---- Rooms & corridors ----
    carve(1, 18, 5, 22);   // safe room (SW)
    carve(6, 20, 7, 21);   // safe room corridor
    carve(8, 17, 25, 22);  // south optical range (gallery)
    carve(10, 15, 12, 16); // west passage gallery -> atrium
    carve(21, 15, 23, 16); // east passage gallery -> atrium
    carve(8, 6, 25, 14);   // central atrium
    carve(14, 1, 18, 5);   // north vestibule
    carve(1, 1, 6, 13);    // west test bays + corridor
    for (let x = 1; x <= 4; x++) { grid[4][x] = 1; grid[8][x] = 1; } // bay partitions
    carve(7, 9, 7, 11);    // west corridor -> atrium
    carve(26, 10, 32, 11); // east laser corridor
    carve(27, 1, 32, 6);   // terminal room (NE)
    carve(31, 7, 32, 9);   // corridor north to terminal room
    carve(27, 14, 32, 22); // calibration bay (SE)
    carve(26, 19, 26, 20); // gallery -> calibration bay

    // grating accents
    carve(9, 20, 24, 20, 2);
    carve(28, 2, 31, 5, 2);
    carve(28, 17, 31, 19, 2);
    carve(14, 11, 17, 12, 2);

    grid[0][16] = 3; // north blast door

    // ---- Props ----
    const P = [];
    const prop = (k, x, y, o = {}) => P.push(Object.assign({ k, x, y, solid: 1 }, o));

    // Safe room
    prop('bench', 2, 18, { act: 'bench', label: 'Workbench' });
    prop('locker', 1, 20, { sight: 1, act: 'container', id: 'L_safe', label: 'Locker', loot: { wire: 1 } });
    prop('console', 4, 18, { screen: 'amber' });
    prop('crate', 5, 22);
    // South gallery
    prop('table', 11, 18); prop('table', 12, 18);
    prop('table', 16, 19); prop('table', 17, 19); prop('table', 18, 19);
    prop('table', 13, 21); prop('table', 14, 21);
    prop('pillar', 14, 18, { sight: 1 }); prop('pillar', 20, 21, { sight: 1 });
    prop('crate', 8, 22, { act: 'container', id: 'C_supply', label: 'Supply Crate', loot: { wire: 1 } });
    prop('crate', 22, 22); prop('crate', 24, 18);
    prop('locker', 25, 17, { sight: 1 });
    prop('drone', 23, 19, { solid: 0, act: 'container', id: 'D_gallery', label: 'Dead Drone', loot: { relay: 1 } });
    // Atrium
    prop('pillar', 11, 8, { sight: 1 }); prop('pillar', 11, 12, { sight: 1 });
    prop('pillar', 22, 8, { sight: 1 }); prop('pillar', 22, 12, { sight: 1 });
    prop('glass', 15, 9); prop('glass', 16, 9); prop('glass', 15, 10); prop('glass', 16, 10);
    prop('table', 19, 12); prop('table', 20, 12);
    prop('console', 9, 6, { screen: 'cyan' }); prop('console', 10, 6, { screen: 'cyan' });
    prop('console', 20, 6, { screen: 'cyan' }); prop('console', 21, 6, { screen: 'cyan' });
    prop('crate', 9, 13); prop('crate', 24, 7);
    // Vestibule
    prop('console', 14, 1, { screen: 'red' }); prop('console', 18, 1, { screen: 'red' });
    // West test bays
    prop('locker', 1, 2, { sight: 1, act: 'container', id: 'L_west1', label: 'Researcher Locker', loot: { log: '01' } });
    prop('locker', 1, 6, { sight: 1, act: 'container', id: 'L_west2', label: 'Researcher Locker', loot: { wire: 1 } });
    prop('crate', 2, 10, { act: 'container', id: 'C_west', label: 'Parts Crate', loot: { relay: 1 } });
    prop('locker', 1, 13, { sight: 1 });
    prop('table', 3, 6); prop('table', 3, 2);
    // Terminal room
    prop('terminal', 30, 1, { act: 'terminal', label: 'OPTIC_BUS_TERMINAL_01' });
    prop('console', 28, 1, { screen: 'cyan' }); prop('console', 32, 1, { screen: 'cyan' });
    prop('locker', 32, 4, { sight: 1, act: 'container', id: 'L_term', label: 'Engineer Locker', loot: { log: '02' } });
    prop('crate', 27, 5); prop('crate', 27, 6);
    // Calibration bay
    prop('crate', 28, 15); prop('crate', 31, 15);
    prop('table', 29, 20); prop('table', 30, 20);
    prop('locker', 32, 20, { sight: 1, act: 'container', id: 'L_bay', label: 'Calibration Locker', loot: { wire: 1, relay: 1 } });
    prop('drone', 28, 21, { solid: 0, act: 'container', id: 'D_bay', label: 'Dead Drone', loot: { log: '03' } });

    // ---- Lights (tile units) ----
    // t: lamp | flicker | strobe | emit | door | amber
    const lights = [
      { x: 3.5, y: 20.5, r: 5.4, a: 0.95, c: [255, 176, 70], t: 'lamp' },
      { x: 2.5, y: 19.2, r: 2.6, a: 0.7, c: [255, 190, 90], t: 'lamp' },
      { x: 10.5, y: 19.5, r: 5.6, a: 0.9, c: [190, 225, 255], t: 'flicker' },
      { x: 17.5, y: 21.0, r: 6.0, a: 0.9, c: [190, 225, 255], t: 'lamp' },
      { x: 23.5, y: 18.5, r: 5.2, a: 0.85, c: [190, 225, 255], t: 'lamp' },
      { x: 8.6, y: 17.6, r: 4.2, a: 0.85, c: [255, 60, 70], t: 'strobe', ph: 0 },
      { x: 11.5, y: 15.5, r: 3.4, a: 0.55, c: [160, 200, 230], t: 'lamp' },
      { x: 22.5, y: 15.5, r: 3.4, a: 0.55, c: [160, 200, 230], t: 'lamp' },
      { x: 12.5, y: 10.5, r: 6.2, a: 0.9, c: [190, 225, 255], t: 'lamp' },
      { x: 19.5, y: 9.2, r: 6.2, a: 0.9, c: [190, 225, 255], t: 'flicker' },
      { x: 17.5, y: 13.0, r: 5.0, a: 0.7, c: [190, 225, 255], t: 'lamp' },
      { x: 16.0, y: 11.5, r: 4.6, a: 0.85, c: [60, 220, 255], t: 'emit' },
      { x: 9.5, y: 7.4, r: 4.6, a: 0.85, c: [255, 60, 70], t: 'strobe', ph: 2.1 },
      { x: 24.4, y: 13.4, r: 4.6, a: 0.85, c: [255, 60, 70], t: 'strobe', ph: 4.2 },
      { x: 16.5, y: 2.6, r: 5.6, a: 0.9, c: [255, 60, 70], t: 'door' },
      { x: 3.5, y: 3.0, r: 4.2, a: 0.85, c: [190, 225, 255], t: 'flicker' },
      { x: 3.5, y: 7.2, r: 4.0, a: 0.6, c: [190, 225, 255], t: 'lamp' },
      { x: 3.5, y: 11.0, r: 4.4, a: 0.8, c: [190, 225, 255], t: 'lamp' },
      { x: 5.8, y: 6.0, r: 3.6, a: 0.45, c: [150, 200, 230], t: 'lamp' },
      { x: 27.6, y: 10.7, r: 3.8, a: 0.6, c: [170, 210, 240], t: 'lamp' },
      { x: 29.5, y: 10.7, r: 3.2, a: 0.5, c: [170, 210, 240], t: 'flicker' },
      { x: 31.6, y: 8.4, r: 3.2, a: 0.55, c: [170, 210, 240], t: 'lamp' },
      { x: 30.5, y: 2.5, r: 5.8, a: 0.9, c: [60, 220, 255], t: 'emit', term: 1 },
      { x: 28.6, y: 4.4, r: 4.2, a: 0.6, c: [120, 210, 255], t: 'lamp' },
      { x: 29.6, y: 17.2, r: 5.2, a: 0.85, c: [190, 225, 255], t: 'flicker' },
      { x: 30.5, y: 21.2, r: 5.0, a: 0.8, c: [190, 225, 255], t: 'lamp' },
      { x: 27.6, y: 14.6, r: 3.6, a: 0.75, c: [255, 60, 70], t: 'strobe', ph: 1.0 },
    ];

    // ---- Lasers (corridor gates, tiles) ----
    const lasers = [];
    for (const y of [10, 11]) { lasers.push({ x: 28, y, ph: 0 }); lasers.push({ x: 30, y, ph: 1 }); }

    // ---- Security cameras (wall mounted) ----
    const cameras = [
      { x: 27.55, y: 1.15, base: 0.78, sweep: 0.62, range: 6.4, fov: 0.95, ph: 0 },
      { x: 25.6, y: 6.5, base: 2.35, sweep: 0.5, range: 6.8, fov: 0.95, ph: 1.7 },
    ];

    const guardWps = [
      { x: 20.5, y: 10.5, wait: 1.4 }, { x: 14.5, y: 7.5, wait: 1.6 }, { x: 9.5, y: 10.5, wait: 0.4 },
      { x: 5.5, y: 10.5, wait: 0.6 }, { x: 5.5, y: 2.5, wait: 1.8 }, { x: 5.5, y: 10.5, wait: 0.2 },
      { x: 9.5, y: 12.5, wait: 0.2 }, { x: 11.5, y: 15.5, wait: 0.4 }, { x: 11.5, y: 19.5, wait: 1.4 },
      { x: 22.5, y: 19.5, wait: 1.6 }, { x: 22.5, y: 15.5, wait: 0.4 }, { x: 23.5, y: 12.5, wait: 0.4 },
    ];

    // ---- Floor decals (seeded) ----
    const decals = [
      { k: 'text', x: 12.2, y: 21.6, s: 0.5, t: 'OPTICAL RANGE // A' },
      { k: 'text', x: 9.6, y: 7.9, s: 0.45, t: 'SENSOR & PERCEPTION' },
      { k: 'text', x: 27.6, y: 12.9, s: 0.34, t: 'CALIBRATION BAY' },
      { k: 'text', x: 14.7, y: 4.5, s: 0.4, t: 'NORTH BULKHEAD' },
      { k: 'ring', x: 16, y: 10, r: 3.1 },
      { k: 'ring', x: 16, y: 10, r: 3.6 },
      { k: 'line', x0: 9, y0: 19.5, x1: 24.5, y1: 19.5 },
      { k: 'line', x0: 9, y0: 21.5, x1: 24.5, y1: 21.5 },
      { k: 'hazard', x: 14, y: 1, w: 5, h: 1 },
      { k: 'arrow', x: 16.5, y: 3.8 },
    ];
    let seed = 1234567;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < 70; i++) {
      const x = 1 + rnd() * (MW - 2), y = 1 + rnd() * (MH - 2);
      if (grid[Math.floor(y)][Math.floor(x)] === 1) continue;
      const kind = rnd();
      if (kind < 0.45) decals.push({ k: 'cable', x, y, a: rnd() * 6.28, l: 1.2 + rnd() * 2.2, c: rnd() * 2 - 1 });
      else if (kind < 0.8) decals.push({ k: 'stain', x, y, r: 0.4 + rnd() * 0.8 });
      else decals.push({ k: 'scorch', x, y, r: 0.3 + rnd() * 0.5 });
    }

    // ---- derived grids ----
    const solid = Array.from({ length: MH }, (_, y) => Array.from({ length: MW }, (_, x) => grid[y][x] === 1 || grid[y][x] === 3));
    const sight = Array.from({ length: MH }, (_, y) => Array.from({ length: MW }, (_, x) => grid[y][x] === 1 || grid[y][x] === 3));
    const propAt = Array.from({ length: MH }, () => Array(MW).fill(null));
    for (const p of P) {
      p.opened = false;
      if (p.solid) solid[p.y][p.x] = true;
      if (p.sight) sight[p.y][p.x] = true;
      propAt[p.y][p.x] = p;
    }

    return {
      MW, MH, grid, props: P, lights, lasers, cameras, guardWps, decals, solid, sight, propAt,
      start: { x: 3.5, y: 21.5 },
      door: { x: 16, y: 0 },
    };
  }

  return { build, MW, MH };
})();
