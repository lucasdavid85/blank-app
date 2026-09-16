/* 08-minimap.js
   Hillshaded minimap.

   Part of Valrose Kart. Loaded as a plain script in the order set by
   index.html, so everything shares one global scope — no bundler needed. */

/* ═══════════════ 7. MINIMAP ═══════════════ */

const mini = el("mini"), mctx = mini.getContext("2d");
let shadeCanvas = null;

function buildHillshade() {
  const n = DEM.n;
  const c = document.createElement("canvas"); c.width = c.height = n;
  const g = c.getContext("2d"), img = g.createImageData(n, n);
  const step = DEM.size / n;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = -HALF + i*step, y = -HALF + j*step;
    const [gx, gy] = gradientAt(x, y, step);
    // light from the north-west, as on an IGN map
    const l = Math.max(0, Math.min(1, 0.55 + (-gx*0.7 + gy*0.7) * 1.4));
    const t = (heightAt(x, y) - DEM.min) / Math.max(1, DEM.max - DEM.min);
    const k = ((n - 1 - j)*n + i) * 4;   // flip: canvas y grows south
    img.data[k]   = 30 + 70*l + 40*t;
    img.data[k+1] = 45 + 85*l + 30*t;
    img.data[k+2] = 32 + 60*l + 25*t;
    img.data[k+3] = 235;
  }
  g.putImageData(img, 0, 0);
  shadeCanvas = c;
}

// Zoom + click-to-navigate, visit mode only: miniZoom>1 recentres the view
// on the kart (like a GPS), and mapSelection is whichever building the
// player last clicked, kept as a live name+distance readout.
let miniZoom = 1, mapSelection = null;
const MINI_ZOOM_MIN = 1, MINI_ZOOM_MAX = 6;

function miniCenter() { return miniZoom > 1 ? [kart.x, kart.y] : [0, 0]; }
function miniTransform(ctx, size) {
  const pad = 6, sc = (size - 2*pad) / (2*HALF) * miniZoom;
  const [cx, cy] = miniCenter();
  ctx.setTransform(sc, 0, 0, -sc, size/2 - cx*sc, size/2 + cy*sc);
  return sc;
}
// Canvas-pixel (not CSS-pixel) coordinates, inverse of miniTransform.
function miniToWorld(px, py, size) {
  const sc = ((size - 12) / (2*HALF)) * miniZoom, [cx, cy] = miniCenter();
  return [(px - (size/2 - cx*sc)) / sc, -(py - (size/2 + cy*sc)) / sc];
}
function polyCentroid(p) {
  const n = p.length - 1 || 1; // the ring repeats its first point last
  let x = 0, y = 0;
  for (let i = 0; i < n; i++) { x += p[i][0]; y += p[i][1]; }
  return [x/n, y/n];
}
function updateMiniTag() {
  const tag = el('mini-tag');
  if (!tag) return;
  if (!mapSelection) { tag.hidden = true; return; }
  const d = Math.hypot(kart.x - mapSelection.x, kart.y - mapSelection.y);
  tag.hidden = false;
  tag.textContent = mapSelection.name + ' · ' + Math.round(d) + (d < 20 ? ' m · you are here' : ' m away');
}
function miniClickWorld(e) {
  const rect = mini.getBoundingClientRect();
  const px = (e.clientX - rect.left) * (mini.width / rect.width);
  const py = (e.clientY - rect.top) * (mini.height / rect.height);
  return miniToWorld(px, py, mini.width);
}
mini.addEventListener('click', e => {
  if (playMode !== 'visit') return;
  const [wx, wy] = miniClickWorld(e);
  let hit = world.buildings.find(b => b.poly.length > 2 && pointInPoly(wx, wy, b.poly));
  if (!hit) {
    // Missed every footprint (small building, imprecise tap) — fall back to
    // the nearest centroid within a small on-screen tolerance.
    const sc = ((mini.width - 12) / (2*HALF)) * miniZoom, tolerance = 11/sc;
    let bestD = tolerance;
    for (const b of world.buildings) {
      if (b.poly.length < 3) continue;
      const c = polyCentroid(b.poly), d = Math.hypot(c[0]-wx, c[1]-wy);
      if (d < bestD) { bestD = d; hit = b; }
    }
  }
  // Tapping the already-selected building again clears the selection.
  if (hit && mapSelection?.name === displayName(hit)) hit = null;
  const c = hit && polyCentroid(hit.poly);
  mapSelection = hit ? { name: displayName(hit), x: c[0], y: c[1] } : null;
  updateMiniTag();
});
mini.addEventListener('wheel', e => {
  if (playMode !== 'visit') return;
  e.preventDefault();
  miniZoom = Math.max(MINI_ZOOM_MIN, Math.min(MINI_ZOOM_MAX, miniZoom * (e.deltaY < 0 ? 1.18 : 1/1.18)));
}, { passive: false });
el('mini-zoom-in')?.addEventListener('click', () => { miniZoom = Math.min(MINI_ZOOM_MAX, miniZoom * 1.6); });
el('mini-zoom-out')?.addEventListener('click', () => { miniZoom = Math.max(MINI_ZOOM_MIN, miniZoom / 1.6); });

function drawMini() {
  if (playMode !== 'visit') miniZoom = 1;   // racing always shows the whole circuit
  const S = mini.width;
  mctx.setTransform(1,0,0,1,0,0);
  mctx.clearRect(0, 0, S, S);
  if (shadeCanvas) {
    mctx.globalAlpha = 0.9;
    mctx.drawImage(shadeCanvas, 6, 6, S-12, S-12);
    mctx.globalAlpha = 1;
  }
  const sc = miniTransform(mctx, S);
  const px = 1/sc;

  mctx.strokeStyle = "rgba(230,220,200,.28)"; mctx.lineWidth = px;
  for (const p of world.paths) { if (p.length > 1) { path(mctx, p); mctx.stroke(); } }

  if (playMode==='race' && world.line.length > 1) {
    mctx.strokeStyle = "rgba(225,205,160,.95)";
    mctx.lineWidth = px * 5; mctx.lineJoin = mctx.lineCap = "round";
    path(mctx, world.line); mctx.stroke();
  }
  mctx.fillStyle = "rgba(242,236,222,.9)";
  for (const b of world.buildings) { if (b.poly.length > 2) { path(mctx, b.poly, true); mctx.fill(); } }

  mctx.fillStyle='#4faec2';for(const w of world.water){path(mctx,w,true);for(const h of w.holes||[]){mctx.moveTo(...h[0]);h.slice(1).forEach(q=>mctx.lineTo(...q));mctx.closePath();}mctx.fill('evenodd');}
  if(playMode==='visit'){const q=placeLocation(places[selectedPlace]);if(q){mctx.fillStyle='#57bfff';mctx.beginPath();mctx.arc(...q,px*8,0,Math.PI*2);mctx.fill();}}
  if (playMode==='visit' && mapSelection) {
    mctx.fillStyle='#ffd35c';mctx.strokeStyle='#3a2f08';mctx.lineWidth=px*1.4;
    mctx.beginPath();mctx.arc(mapSelection.x,mapSelection.y,px*9,0,Math.PI*2);mctx.fill();mctx.stroke();
  }
  // kart, drawn as a triangle so heading is readable
  mctx.save();
  mctx.translate(kart.x, kart.y);
  mctx.rotate(-kart.a);
  mctx.fillStyle = "#c56a5c";
  mctx.beginPath();
  mctx.moveTo(0, px*11); mctx.lineTo(px*7, -px*8); mctx.lineTo(-px*7, -px*8);
  mctx.closePath(); mctx.fill();
  mctx.restore();

  // Zoomed in enough that per-building names are actually legible.
  if (playMode==='visit' && miniZoom > 2.2) {
    const [cx, cy] = miniCenter();
    mctx.setTransform(1,0,0,1,0,0);
    mctx.font = '600 10px system-ui, sans-serif'; mctx.textAlign = 'center';
    for (const b of world.buildings) {
      if (b.poly.length < 3 || !b.name) continue;
      const c = polyCentroid(b.poly);
      const bx = S/2 + (c[0]-cx)*sc, by = S/2 - (c[1]-cy)*sc;
      if (bx < 6 || bx > S-6 || by < 12 || by > S-6) continue;
      const label = englishPlaceName(b.name), w = mctx.measureText(label).width;
      mctx.fillStyle = 'rgba(12,20,17,.72)'; mctx.fillRect(bx-w/2-3, by-15, w+6, 13);
      mctx.fillStyle = '#eef4ea'; mctx.fillText(label, bx, by-5);
    }
  }
  updateMiniTag();
}

function path(ctx, pts, close) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}
