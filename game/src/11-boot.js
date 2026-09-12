/* 11-boot.js
   Startup.

   Part of Valrose Kart. Loaded as a plain script in the order set by
   index.html, so everything shares one global scope — no bundler needed. */

/* ═══════════════ 10. GO ═══════════════ */

loadDefaultTerrain();
ingest(placeholderData());
initThree();
rebuildAll();
setMode('race');
resetCameraView();
requestAnimationFrame(frame);
