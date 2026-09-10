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

function miniTransform(ctx, size) {
  const pad = 6, sc = (size - 2*pad) / (2*HALF);
  ctx.setTransform(sc, 0, 0, -sc, size/2, size/2);
  return sc;
}

function drawMini() {
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
  // kart, drawn as a triangle so heading is readable
  mctx.save();
  mctx.translate(kart.x, kart.y);
  mctx.rotate(-kart.a);
  mctx.fillStyle = "#c56a5c";
  mctx.beginPath();
  mctx.moveTo(0, px*11); mctx.lineTo(px*7, -px*8); mctx.lineTo(-px*7, -px*8);
  mctx.closePath(); mctx.fill();
  mctx.restore();
}

function path(ctx, pts, close) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}
