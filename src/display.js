'use strict';
/* Fullscreen must be requested directly from a user gesture. Failure never blocks play. */
const Display = (() => {
  const active = () => document.fullscreenElement || document.webkitFullscreenElement;
  function status(text) {
    document.querySelectorAll('.fullscreen-status').forEach(e => { e.textContent = text; });
    if (text && G.state === 'play') say(text, 'warn', 6500);
  }
  function sync() {
    for (const id of ['fullscreen-title', 'fullscreen-pause']) $(id).textContent = active() ? 'EXIT FULLSCREEN' : 'FULLSCREEN';
  }
  async function enter() {
    if (active()) return;
    const el = document.documentElement;
    const request = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!request) { status('Fullscreen is unavailable in this browser. Use its full-screen mode if available.'); return; }
    try {
      await request.call(el);
      status('');
      // Optional mobile enhancement; denial does not undo fullscreen.
      if (Mobile.enabled && window.screen?.orientation?.lock) {
        try { await window.screen.orientation.lock('landscape'); } catch (_) { /* rotate manually */ }
      }
    } catch (_) { status('Fullscreen was not allowed. Try the FULLSCREEN button or your browser full-screen mode.'); }
    sync();
  }
  async function toggle() {
    if (!active()) return enter();
    try { await (document.exitFullscreen || document.webkitExitFullscreen).call(document); }
    catch (_) { status('Use the browser control to exit fullscreen.'); }
    sync();
  }
  for (const id of ['fullscreen-title', 'fullscreen-pause']) $(id).onclick = toggle;
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
  return { enter, toggle };
})();
