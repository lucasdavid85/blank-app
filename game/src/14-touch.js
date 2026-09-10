/* 14-touch.js
   On-screen driving pad for phones and tablets.

   Part of Valrose Kart. Loaded as a plain script in the order set by
   index.html, so everything shares one global scope — no bundler needed.
   Runs after 06-kart.js (keys, resetKart) and 07-camera.js (el, camMode).

   Each pad button just adds/removes the same key string that keydown/keyup
   push into `keys`, so 06-kart.js's step() needs no changes at all — the
   pad is indistinguishable from a held key. */

(function () {
  // Guarded rather than assumed: the node test harness runs this file in a
  // stub DOM with no matchMedia/navigator/document.body.
  const coarse = (typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches) ||
    (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0);
  if (!coarse || !document.body) return;
  document.body.classList.add("touch");

  // Give phones/iPads the full screen to drive on: start with the settings
  // panel collapsed (tap "+" to reopen it) instead of a ~200px-wide option
  // list eating a chunk of a narrow screen before the driver has even moved.
  const panel = el("panel"), toggle = el("hidepanel");
  if (panel && toggle) { panel.classList.add("min"); toggle.textContent = "+"; }

  const setOrientationClass = () => {
    document.body.classList.toggle("portrait", innerHeight > innerWidth);
  };
  setOrientationClass();
  addEventListener("resize", setOrientationClass);
  addEventListener("orientationchange", setOrientationClass);

  // Holding a button fires pointerdown once; pointerup/cancel/leave all
  // release it so a dragged-off or interrupted touch never sticks a key on.
  function bindKey(id, key) {
    const node = el(id);
    if (!node) return;
    const press = e => { e.preventDefault(); node.classList.add("on"); keys.add(key); };
    const release = e => { e.preventDefault(); node.classList.remove("on"); keys.delete(key); };
    node.addEventListener("pointerdown", press);
    node.addEventListener("pointerup", release);
    node.addEventListener("pointercancel", release);
    node.addEventListener("pointerleave", release);
    node.addEventListener("contextmenu", e => e.preventDefault());
  }

  bindKey("t-up", "arrowup");
  bindKey("t-down", "arrowdown");
  bindKey("t-left", "arrowleft");
  bindKey("t-right", "arrowright");
  bindKey("t-hand", " ");

  el("t-reset")?.addEventListener("pointerup", e => { e.preventDefault(); resetKart(); });
  el("t-camera")?.addEventListener("pointerup", e => { e.preventDefault(); camMode = (camMode + 1) % 3; });
})();
