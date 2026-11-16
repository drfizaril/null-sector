# NULL//SECTOR Mobile v1.0 — Phase 1 prototype

One vanilla JavaScript + Canvas 2D codebase for desktop and landscape touch devices.
Implementation and Node logic checks complete; browser/device acceptance is PENDING.
See AUDIT_AND_TEST_REPORT.md for exact scope and limitations.

## Run
Extract the ZIP first. Open index.html in a recent desktop browser, or serve this folder:

    python3 -m http.server 8000 --bind 0.0.0.0

Desktop: http://localhost:8000
Phone on the same Wi-Fi: http://<computer-LAN-IP>:8000 (allow the local server through the computer firewall if needed).
Use a trusted local network. The phone must access the extracted folder through HTTP, not a ZIP/file preview app.
No build step, package install or engine migration is required to play.
Google Fonts are optional; system fallbacks are provided. This is not an APK or installed PWA.

## Controls

| Action | Desktop | Mobile |
|---|---|---|
| Move | WASD / arrows | Left joystick, screen-relative direction |
| Crouch | Hold SHIFT / toggle C | Toggle CROUCH |
| Interact/search/hack | E | USE |
| Arc-Baton | SPACE / left mouse | BATON; faces movement direction |
| Lure | Q / right mouse, cursor aim | Tap/drag world to aim, then LURE |
| Field Scan | F | SCAN |
| Pause | ESC | Ⅱ |
| Zoom | Wheel / + / − | + / − |
| Minimap | Always in HUD | MAP toggle |
| Sound | M / pause menu | Pause → TOGGLE SOUND |

Joystick uses the original fixed walk/crouch speed outside a deadzone. Release to stop.
Without a world target, lure throws in the facing direction as in the original keyboard fallback.
Portrait shows a rotation notice and pauses. Any open modal closes (installed puzzle parts remain); rotate and tap RESUME, then USE to reopen it.
Menus and puzzle panels scroll independently. Touch buttons show muted borders during cooldown.

## Checks

    node tests/input.cjs

Dependency-free Node test with DOM/canvas stubs; this does NOT validate browser rendering or real touches.
Browser acceptance script (requires Playwright and Chromium):

    npm install --no-save playwright
    CHROMIUM_PATH=/path/to/chromium GAME_URL=http://127.0.0.1:8000 node tests/browser.cjs

On Windows, set these environment variables using PowerShell syntax. The default Chromium path in the script is /usr/bin/chromium.
Browser script has been supplied but could not execute in the authoring environment; do not interpret its planned assertions as passed results.
