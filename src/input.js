'use strict';
/* Shared action dispatch; touch never writes synthetic keyboard events. */
const Input = {
  axis: { x: 0, y: 0 },
  bindings: { KeyE: 'interact', KeyQ: 'lure', Space: 'baton', KeyF: 'scan', KeyC: 'crouch', Equal: 'zoomIn', NumpadAdd: 'zoomIn', Minus: 'zoomOut', NumpadSubtract: 'zoomOut' },
  movement() {
    // Inverse isometric projection: the stick follows the screen direction.
    return { x: this.axis.x + 2 * this.axis.y, y: -this.axis.x + 2 * this.axis.y };
  },
  clear() { this.axis.x = this.axis.y = 0; for (const k in keys) keys[k] = false; mouse.on = false; },
  perform(action) {
    Sfx.init();
    if (G.state !== 'play' || G.modal) return;
    switch (action) {
      case 'interact': interact(); break;
      case 'lure': throwLure(); break;
      case 'baton': swingBaton(); break;
      case 'scan': fieldScan(); break;
      case 'crouch': player.lock = !player.lock; break;
      case 'map': document.body.classList.toggle('show-map'); break;
      case 'pause': setPaused(true); break;
      case 'zoomIn': G.zoomUser = clamp(G.zoomUser + 0.1, 0.7, 1.5); break;
      case 'zoomOut': G.zoomUser = clamp(G.zoomUser - 0.1, 0.7, 1.5); break;
    }
  }
};
