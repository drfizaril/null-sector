'use strict';
/* Procedural audio (Web Audio). No external files. Every call is safe if audio is unavailable. */
const Sfx = (function () {
  let ac = null, master = null, muted = false, noiseBuf = null;
  let tensionGain = null, ambTimer = 0;

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = muted ? 0 : 0.6;
      const comp = ac.createDynamicsCompressor();
      master.connect(comp); comp.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      startAmbience();
    } catch (e) { ac = null; }
  }

  function startAmbience() {
    // low machine drone
    const o1 = ac.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 46;
    const f1 = ac.createBiquadFilter(); f1.type = 'lowpass'; f1.frequency.value = 130;
    const g1 = ac.createGain(); g1.gain.value = 0.07;
    o1.connect(f1); f1.connect(g1); g1.connect(master); o1.start();
    const o2 = ac.createOscillator(); o2.type = 'sine'; o2.frequency.value = 69.3;
    const g2 = ac.createGain(); g2.gain.value = 0.05;
    o2.connect(g2); g2.connect(master); o2.start();
    const lfo = ac.createOscillator(); lfo.frequency.value = 0.07;
    const lg = ac.createGain(); lg.gain.value = 3;
    lfo.connect(lg); lg.connect(o2.frequency); lfo.start();
    // air / ventilation
    const n = ac.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 380; bp.Q.value = 0.6;
    const ng = ac.createGain(); ng.gain.value = 0.02;
    n.connect(bp); bp.connect(ng); ng.connect(master); n.start();
    const lfo2 = ac.createOscillator(); lfo2.frequency.value = 0.11;
    const lg2 = ac.createGain(); lg2.gain.value = 0.012;
    lfo2.connect(lg2); lg2.connect(ng.gain); lfo2.start();
    // tension layer (raised when hunted)
    const o3 = ac.createOscillator(); o3.type = 'square'; o3.frequency.value = 92;
    const f3 = ac.createBiquadFilter(); f3.type = 'lowpass'; f3.frequency.value = 260;
    tensionGain = ac.createGain(); tensionGain.gain.value = 0;
    o3.connect(f3); f3.connect(tensionGain); tensionGain.connect(master); o3.start();
    const lfo3 = ac.createOscillator(); lfo3.frequency.value = 2.2;
    const lg3 = ac.createGain(); lg3.gain.value = 0.03;
    lfo3.connect(lg3); lg3.connect(tensionGain.gain); lfo3.start();
    // random distant machine noises
    ambTimer = setInterval(() => {
      if (!ac || muted || Math.random() < 0.4) return;
      const r = Math.random();
      if (r < 0.4) tone(90 + Math.random() * 60, 1.6, { type: 'sine', gain: 0.05, slide: -30 });
      else if (r < 0.75) { for (let i = 0; i < 3; i++) noise(0.04, { freq: 2500 + Math.random() * 2000, q: 4, gain: 0.05, delay: i * 0.11 }); }
      else tone(220 + Math.random() * 200, 0.5, { type: 'triangle', gain: 0.025, slide: -80 });
    }, 4800);
  }

  function tone(freq, dur, o = {}) {
    if (!ac || muted) return;
    const t0 = ac.currentTime + (o.delay || 0);
    const osc = ac.createOscillator(); osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.slide) osc.frequency.linearRampToValueAtTime(Math.max(20, freq + o.slide), t0 + dur);
    const g = ac.createGain();
    const peak = o.gain == null ? 0.2 : o.gain;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + (o.attack || 0.012));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, o = {}) {
    if (!ac || muted) return;
    const t0 = ac.currentTime + (o.delay || 0);
    const src = ac.createBufferSource(); src.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = o.type || 'bandpass';
    f.frequency.value = o.freq || 1000; f.Q.value = o.q || 1;
    const g = ac.createGain();
    const peak = o.gain == null ? 0.2 : o.gain;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0, Math.random()); src.stop(t0 + dur + 0.05);
  }

  const api = {
    init,
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.6;
      return muted;
    },
    isMuted() { return muted; },
    tension(v) { if (tensionGain && ac) tensionGain.gain.setTargetAtTime(v * 0.07, ac.currentTime, 0.25); },
    step(loud) { noise(0.05, { freq: loud ? 900 : 500, q: 1.2, gain: loud ? 0.09 : 0.03 }); },
    pickup() { tone(660, 0.1, { type: 'square', gain: 0.07 }); tone(990, 0.16, { type: 'square', gain: 0.07, delay: 0.09 }); },
    open() { noise(0.18, { freq: 700, q: 2, gain: 0.1 }); tone(180, 0.12, { type: 'triangle', gain: 0.08 }); },
    empty() { tone(150, 0.14, { type: 'triangle', gain: 0.06, slide: -40 }); },
    clang() {
      [520, 1130, 1760, 2480].forEach((f, i) => tone(f * (0.96 + Math.random() * 0.08), 0.6 - i * 0.08, { type: 'sine', gain: 0.1 / (i + 1), slide: -f * 0.03 }));
      noise(0.06, { freq: 3200, q: 3, gain: 0.1 });
    },
    throw() { noise(0.12, { type: 'highpass', freq: 1800, q: 0.7, gain: 0.05 }); },
    swing() { noise(0.1, { type: 'highpass', freq: 1500, q: 0.8, gain: 0.06 }); },
    zap() {
      tone(900, 0.22, { type: 'sawtooth', gain: 0.12, slide: -780 });
      noise(0.22, { freq: 4000, q: 1.5, gain: 0.12 });
    },
    hit() { tone(90, 0.25, { type: 'sine', gain: 0.35, slide: -50 }); noise(0.12, { freq: 400, q: 0.8, gain: 0.2 }); },
    hurt() { tone(110, 0.35, { type: 'sawtooth', gain: 0.25, slide: -70 }); noise(0.25, { freq: 300, q: 0.7, gain: 0.2 }); },
    alert() {
      tone(760, 0.18, { type: 'square', gain: 0.14, slide: -260 });
      tone(540, 0.34, { type: 'square', gain: 0.14, slide: -240, delay: 0.17 });
    },
    suspicious() { tone(420, 0.12, { type: 'triangle', gain: 0.08 }); tone(520, 0.14, { type: 'triangle', gain: 0.08, delay: 0.11 }); },
    lost() { tone(400, 0.25, { type: 'triangle', gain: 0.07, slide: -150 }); },
    laser() {
      tone(1300, 0.4, { type: 'sawtooth', gain: 0.1, slide: -900 });
      noise(0.3, { freq: 2500, q: 2, gain: 0.08 });
    },
    laserBlink() { tone(2400, 0.04, { type: 'sine', gain: 0.025 }); },
    scan() {
      tone(180, 0.9, { type: 'sine', gain: 0.14, slide: 700 });
      tone(90, 0.9, { type: 'triangle', gain: 0.08, slide: 300 });
    },
    scanReady() { tone(1200, 0.07, { type: 'sine', gain: 0.05 }); },
    ui() { tone(780, 0.05, { type: 'square', gain: 0.05 }); },
    click() { noise(0.03, { freq: 2200, q: 4, gain: 0.1 }); },
    solder() { noise(0.35, { freq: 5000, q: 1, gain: 0.1 }); tone(1500, 0.1, { type: 'square', gain: 0.05, delay: 0.3 }); },
    craft() { tone(330, 0.1, { type: 'square', gain: 0.08 }); tone(495, 0.1, { type: 'square', gain: 0.08, delay: 0.1 }); tone(660, 0.2, { type: 'square', gain: 0.08, delay: 0.2 }); },
    lock() { tone(500, 0.08, { type: 'sine', gain: 0.06 }); },
    success() { [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, { type: 'triangle', gain: 0.12, delay: i * 0.09 })); },
    glitch() { noise(0.5, { freq: 1800, q: 0.5, gain: 0.18 }); tone(70, 0.6, { type: 'sawtooth', gain: 0.12, slide: 60 }); },
    unlock() { tone(60, 1.4, { type: 'sawtooth', gain: 0.18, slide: 20 }); noise(1.0, { freq: 300, q: 0.7, gain: 0.12 }); },
    beat() { tone(52, 0.18, { type: 'sine', gain: 0.35 }); tone(46, 0.2, { type: 'sine', gain: 0.25, delay: 0.19 }); },
    death() { tone(300, 1.6, { type: 'sawtooth', gain: 0.2, slide: -280 }); noise(1.2, { freq: 600, q: 0.6, gain: 0.15 }); },
    win() { [262, 330, 392, 523, 659, 784].forEach((f, i) => tone(f, 0.5, { type: 'triangle', gain: 0.13, delay: i * 0.12 })); },
  };
  return api;
})();
