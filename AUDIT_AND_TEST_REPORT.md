# NULL//SECTOR Mobile v1.0 — Fasa 1: Mobile Controls
Tarikh: 16 November 2026
Status: prototaip implementasi; penerimaan browser/peranti BELUM DISAHKAN.

## Audit sumber
Input asal: 13 fail (10 JavaScript, HTML, CSS, README), tanpa framework, bundler, engine pihak ketiga, aset binari atau backend. Classic scripts berkongsi global; urutan script mesti dikekalkan. Satu codebase diteruskan.

| Fail asal | Tanggungjawab / dapatan audit |
|---|---|
| index.html | Canvas dunia, HUD DOM, skrin title/pause/dead/win, modal log/bench/terminal; script dimuat secara berurutan. |
| style.css | Tema cyan/amber, HUD mutlak, modal; breakpoint asal 900px tidak mencukupi untuk skrin landscape rendah. |
| src/core.js | State G, player, kamera, utiliti iso, collision, LOS, A*, cahaya dan kesan; tile 64×32, map daripada Lab. |
| src/main.js | Keyboard state + aksi keydown, mouse untuk lure/baton, wheel zoom; requestAnimationFrame dengan dt dihadkan 0.05; camera smoothing; resize canvas mengikut viewport dan DPR maksimum 2. |
| src/actions.js | updatePlayer membaca keys; normalize pergerakan, collision, crouch/footstep, loot, crafting, combat, lure, scan, HUD/minimap. Mouse bukan aim baton: baton mengikut player.ang daripada pergerakan. |
| src/map.js | Peta tetap 34×24, bilik, prop, loot, patrol waypoints, laser, kamera, cahaya; derived collision/sight grids. |
| src/ai.js | Guard patrol → suspicious/investigate/hunt, pendengaran, LOS, serangan, kamera, laser. |
| src/puzzle.js | Puzzle solder melalui SVG click, gelombang melalui Canvas dan range input; animation loop sendiri. |
| src/render_world.js | Transform dunia→skrin, view culling, lantai/dinding/decal, geometri isometrik prosedural. |
| src/render_props.js | Prop dan watak dilukis secara prosedural; tiada spritesheet wajib. |
| src/render_frame.js | Floor/light mask offscreen, depth sorting, objek/watak, FX dan prompt; render utama dikekalkan. |
| src/audio.js | Audio prosedural Web Audio, init daripada user gesture; tiada fail muzik luaran. |
| README.md | Arahan pelancaran desktop asal; diganti dengan panduan gabungan. |

Rendering kekal Canvas 2D, dengan offscreen canvas untuk mask cahaya, DOM untuk HUD/menu dan SVG untuk solder puzzle. Tiada justifikasi teknikal untuk migrasi engine pada Fasa 1.

## Perubahan

| Fail | Perubahan |
|---|---|
| src/input.js — baharu | Action dispatcher dikongsi desktop/touch; axis sentuh berasingan daripada keys; inverse isometric direction; clear input. |
| src/mobile.js — baharu | Joystick deadzone, pointer capture dan pointer IDs, multi-pointer handler, aim dunia, touch actions, cooldown visual, map toggle, reset/cancel/blur, portrait pause. |
| src/main.js | Pemetaan aksi keyboard ke dispatcher; mouse dipindah kepada Pointer Events ditapis pointerType mouse untuk elak serangan daripada compatibility mouse event; mobile sync; hint adaptif. |
| src/actions.js | Tambah vektor touch sebelum normalisasi gerakan asal sahaja. Formula damage, AI, loot, speed, collision, stealth dan cooldown tidak diubah. |
| src/render_frame.js | Label prompt USE/baton untuk touch sahaja. Rendering pipeline tidak diganti. |
| index.html | viewport-fit=cover; touch controls, rotation notice, panduan sentuh, dua script baharu. |
| style.css | UI landscape/safe-area, menu boleh ditatal, range input 44px, HUD ringkas, MAP toggle. |
| README.md | Arahan run, kawalan, batasan dan ujian. |
| tests/input.cjs — baharu | Regression logik yang boleh dijalankan tanpa dependency. |
| tests/browser.cjs — baharu | Skrip penerimaan browser desktop/touch yang masih menunggu pelaksanaan berjaya. |
| AUDIT_AND_TEST_REPORT.md — baharu | Laporan ini. |

core.js, map.js, ai.js, puzzle.js, audio.js, render_world.js dan render_props.js tidak berubah bait demi bait berbanding ZIP asal.

## Hasil ujian sebenar

| Semakan | Keputusan |
|---|---|
| node --check semua 12 fail src/*.js | LULUS |
| Boot kesemua script mengikut index.html dalam Node VM dengan DOM/canvas stub | LULUS |
| Jarak gerak keyboard vs joystick pada dt sama | LULUS |
| SHIFT crouch dan CROUCH toggle | LULUS |
| Pointer berasingan untuk move + scan | LULUS dalam mock event harness |
| pointercancel melepaskan joystick | LULUS dalam mock event harness |
| Aim sentuh tidak mencetuskan baton | LULUS dalam mock event harness |
| Lure, cooldown elak lontaran berulang, baton | LULUS dalam logic harness |
| Modal reset, pause/resume, portrait pause, blur reset | LULUS dalam logic harness |
| Pelancaran Chromium/Playwright | TERHALANG sebelum game dimuat: executable default tiada; Chromium sistem gagal socket() dengan Operation not permitted. |
| Browser berasingan → pelayan preview | TERHALANG: ERR_CONNECTION_REFUSED. |
| Visual QA, real multi-touch, puzzle sentuhan dalam browser, prestasi FPS | BELUM DISAHKAN |

Ujian mock tidak membuktikan layout, audio, browser pointer capture sebenar atau rendering betul. Tiada dakwaan sesi permainan penuh atau ujian telefon sebenar telah lulus.

## Isu terbuka / acceptance seterusnya

1. Jalankan tests/browser.cjs dan playtest pada Android Chrome serta iOS Safari. Skrip browser menggunakan fixture posisi/inventori untuk uji interaksi; ia bukan walkthrough penuh.
2. Semak HUD, title, modal panjang, joystick/action overlap dan safe areas pada 844×390, 740×360, 667×375, 568×320 serta tablet. CSS direka untuk landscape, tetapi belum diperiksa secara visual dalam browser.
3. Pastikan sentuhan serentak gerak+aksi, finger keluar pad, pointercancel, app background, rotate dan restart tidak meninggalkan input tersekat.
4. Semak solder tiga slot, ketepatan slider gelombang dan kemenangan puzzle dengan sentuhan. Logik puzzle asal kekal; feel slider masih perlu playtest.
5. Orientation menggunakan overlay + pause, bukan OS-level orientation lock. Putaran menutup modal agar loop puzzle tidak terus berjalan di belakang rotation notice; buka semula melalui USE selepas resume.
6. Canvas DPR sehingga 2, per-frame light/LOS dan depth sorting boleh berat pada telefon rendah spesifikasi. Tiada FPS/performance benchmark dijalankan; tidak mengurangkan visual secara spekulatif.
7. Google Fonts masih luaran dengan fallback; tiada offline cache/PWA/APK/save-system baharu dalam fasa ini.
8. Known pre-existing observation: Puzzle.success menggunakan delayed callback; reset tidak membatalkan timeout kejayaan itu. Tidak diubah kerana di luar input mobile, tetapi patut diuji ketika restart segera selepas solve.

ZIP asal dikekalkan; prototaip ini dikeluarkan sebagai salinan berasingan.
