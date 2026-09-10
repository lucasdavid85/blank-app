/* 09-mapmode.js
   Full-screen map and the racing-line editor.

   Part of Valrose Kart. Loaded as a plain script in the order set by
   index.html, so everything shares one global scope — no bundler needed. */

/* ═══════════════ 8. MAP MODE + TRACK EDITOR ═══════════════ */

const mapEl = el("map"), mapc = el("mapc"), xctx = mapc.getContext("2d");
let mapOpen = false, dragIdx = -1, mapScale = 1;

function toggleMap() {
  mapOpen = !mapOpen;
  mapEl.classList.toggle("on", mapOpen);
  if (mapOpen) {
    const s = Math.min(innerWidth - 60, innerHeight - 170, 780);
    mapc.width = mapc.height = Math.round(s);
    drawMap();
  } else { buildTrack(); resetKart(); }
}

function drawMap() {
  const S = mapc.width;
  xctx.setTransform(1,0,0,1,0,0);
  xctx.fillStyle = "#101a15"; xctx.fillRect(0,0,S,S);
  if (shadeCanvas) xctx.drawImage(shadeCanvas, 6, 6, S-12, S-12);
  mapScale = miniTransform(xctx, S);
  const px = 1/mapScale;

  xctx.strokeStyle = "rgba(230,220,200,.35)"; xctx.lineWidth = px;
  for (const p of world.paths) { if (p.length > 1) { path(xctx, p); xctx.stroke(); } }

  xctx.fillStyle = "rgba(242,236,222,.92)";
  xctx.strokeStyle = "rgba(90,80,65,.9)";
  for (const b of world.buildings) {
    if (b.poly.length < 3) continue;
    path(xctx, b.poly, true); xctx.fill(); xctx.lineWidth = px; xctx.stroke();
  }

  if (world.line.length > 1) {
    xctx.strokeStyle = "rgba(197,106,92,.35)";
    xctx.lineWidth = px * TRACK_W * 2; xctx.lineJoin = xctx.lineCap = "round";
    path(xctx, world.line); xctx.stroke();
    xctx.strokeStyle = "rgba(228,178,74,.95)"; xctx.lineWidth = px*1.6;
    path(xctx, world.line); xctx.stroke();
    xctx.fillStyle = "#e4b24a";
    for (const [x, y] of world.line) {
      xctx.beginPath(); xctx.arc(x, y, px*5, 0, 7); xctx.fill();
    }
  }
  // labels, in screen space
  xctx.setTransform(1,0,0,1,0,0);
  xctx.font = "500 11px 'Avenir Next', system-ui, sans-serif";
  xctx.textAlign = "center"; xctx.fillStyle = "rgba(20,26,22,.85)";
  for (const b of world.buildings) {
    if (!b.name || b.poly.length < 3) continue;
    let cx = 0, cy = 0;
    for (const [x, y] of b.poly) { cx += x; cy += y; }
    cx /= b.poly.length; cy /= b.poly.length;
    xctx.fillText(b.name, S/2 + cx*mapScale, S/2 - cy*mapScale);
  }
}

function mapPick(ev) {
  const r = mapc.getBoundingClientRect();
  const S = mapc.width;
  return [ (ev.clientX - r.left) * (S/r.width) - S/2,
          -((ev.clientY - r.top) * (S/r.height) - S/2) ].map(v => v/mapScale);
}

mapc.addEventListener("mousedown", ev => {
  const [mx, my] = mapPick(ev);
  const tol = 8/mapScale * (mapScale < 1 ? 1 : 1);
  let hit = -1, bd = 9/mapScale;
  world.line.forEach(([x, y], i) => {
    const d = Math.hypot(x-mx, y-my); if (d < bd) { bd = d; hit = i; }
  });
  if (ev.altKey && hit >= 0 && world.line.length > 4) {
    world.line.splice(hit, 1); measureLine(); drawMap(); return;
  }
  if (ev.shiftKey) {
    // insert on the nearest segment
    let bi = 0, best = Infinity;
    for (let i = 0; i < world.line.length - 1; i++) {
      const [ax, ay] = world.line[i], [bx, by] = world.line[i+1];
      const dx = bx-ax, dy = by-ay, l2 = dx*dx+dy*dy||1e-9;
      let t = ((mx-ax)*dx + (my-ay)*dy)/l2; t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(mx-(ax+t*dx), my-(ay+t*dy));
      if (d < best) { best = d; bi = i; }
    }
    world.line.splice(bi+1, 0, [mx, my]); measureLine(); drawMap(); return;
  }
  if (hit >= 0) dragIdx = hit;
});
mapc.addEventListener("mousemove", ev => {
  if (dragIdx < 0) return;
  const [mx, my] = mapPick(ev);
  world.line[dragIdx] = [mx, my];
  // the ring is closed: first and last node move together
  const L = world.line;
  if (dragIdx === 0) L[L.length-1] = [mx, my];
  if (dragIdx === L.length-1) L[0] = [mx, my];
  measureLine(); drawMap();
});
addEventListener("mouseup", () => { dragIdx = -1; });

el("map-close").onclick = toggleMap;
el("map-export").onclick = () => {
  const gj = { type:"FeatureCollection", features:[{
    type:"Feature", properties:{ role:"track", name:"Circuit du parc" },
    geometry:{ type:"LineString", coordinates: world.line.map(([x,y]) => toLonLat(x,y)) } }] };
  download(gj, "valrose-track.geojson");
};
