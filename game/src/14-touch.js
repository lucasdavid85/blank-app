/* A sliding eight-direction touch pad; diagonal gestures hold two drive keys. */
const touchReleases = [];
function clearTouchControls() { for (const release of touchReleases) release(); }
(function () {
  const coarse = (typeof matchMedia === 'function' && matchMedia('(any-pointer: coarse)').matches) ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
  if (!coarse || !document.body) return;
  document.body.classList.add('touch');
  setPanelCollapsed(true);
  el('focus-hint').textContent = 'Slide on the arrow pad to drive';
  addEventListener('pointerdown', e => {
    const panel = el('panel');
    if (!panel.classList.contains('min') && !panel.contains(e.target)) setPanelCollapsed(true);
  }, {passive: true});
  const orient = () => document.body.classList.toggle('portrait', innerHeight > innerWidth);
  orient();
  addEventListener('resize', () => { clearTouchControls(); orient(); });
  addEventListener('orientationchange', () => { clearTouchControls(); orient(); });
  addEventListener('blur', clearTouchControls);
  document.addEventListener?.('visibilitychange', () => { if (document.hidden) clearTouchControls(); });

  const pad = el('direction-pad'), pointers = new Map(), previousKeys = new Set();
  const arrows = [['t-up','arrowup'], ['t-down','arrowdown'], ['t-left','arrowleft'], ['t-right','arrowright']];
  function syncPad() {
    const next = new Set([...pointers.values()].flat());
    for (const key of previousKeys) if (!next.has(key)) keys.delete(key);
    for (const key of next) keys.add(key);
    previousKeys.clear();
    for (const key of next) previousKeys.add(key);
    for (const [id,key] of arrows) {
      el(id).classList.toggle('on', next.has(key));
      el(id).setAttribute('aria-pressed', String(next.has(key)));
    }
  }
  function directionsAt(e) {
    const r = pad.getBoundingClientRect();
    if (!Number.isFinite(e.clientX) || !Number.isFinite(e.clientY) || !r.width || !r.height) return [];
    const x = (e.clientX-r.left)/r.width*2-1, y = (e.clientY-r.top)/r.height*2-1;
    const radius = Math.hypot(x,y);
    if (Math.abs(x)>1 || Math.abs(y)>1 || radius<.2) return [];
    const active = [], threshold = radius*.4;
    if (y < -threshold) active.push('arrowup');
    if (y > threshold) active.push('arrowdown');
    if (x < -threshold) active.push('arrowleft');
    if (x > threshold) active.push('arrowright');
    return active;
  }
  touchReleases.push(() => { pointers.clear(); syncPad(); });
  syncPad();
  function bindPad(node, initialKey) {
    node.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation?.();
      if (race.finished || mapOpen) return;
      pointers.set(e.pointerId, initialKey ? [initialKey] : directionsAt(e));
      node.setPointerCapture?.(e.pointerId);
      syncPad();
    });
    node.addEventListener('pointermove', e => {
      if (!pointers.has(e.pointerId)) return;
      e.preventDefault(); e.stopPropagation?.();
      pointers.set(e.pointerId, directionsAt(e)); syncPad();
    });
    const release = e => {
      e.preventDefault(); e.stopPropagation?.();
      pointers.delete(e.pointerId); syncPad();
    };
    for (const event of ['pointerup','pointercancel','lostpointercapture']) node.addEventListener(event, release);
    node.addEventListener('contextmenu', e => e.preventDefault());
  }
  bindPad(pad);
  for (const [id,key] of arrows) bindPad(el(id), key);

  const hand = el('t-hand'), handPointers = new Set();
  const clearHand = () => {
    handPointers.clear(); keys.delete(' ');
    hand.classList.remove('on'); hand.setAttribute('aria-pressed','false');
  };
  touchReleases.push(clearHand); clearHand();
  hand.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (race.finished || mapOpen) return;
    handPointers.add(e.pointerId); keys.add(' ');
    hand.classList.add('on'); hand.setAttribute('aria-pressed','true');
    hand.setPointerCapture?.(e.pointerId);
  });
  for (const event of ['pointerup','pointercancel','lostpointercapture']) hand.addEventListener(event, e => {
    e.preventDefault(); handPointers.delete(e.pointerId); if (!handPointers.size) clearHand();
  });
  hand.addEventListener('contextmenu', e => e.preventDefault());
  el('t-reset').addEventListener('click', e => { e.preventDefault(); resetKart(); });
  el('t-camera').addEventListener('click', e => { e.preventDefault(); camMode=(camMode+1)%3; });
})();
