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
camPos.set(kart.x, heightAt(kart.x, kart.y) + 6, -kart.y + 12);
camAim.set(kart.x, heightAt(kart.x, kart.y), -kart.y);
requestAnimationFrame(frame);
