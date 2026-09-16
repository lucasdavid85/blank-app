/* 03-world.js
   GeoJSON ingest, the racing line, and 2D geometry helpers.

   Part of Valrose Kart. Loaded as a plain script in the order set by
   index.html, so everything shares one global scope — no bundler needed. */

/* ═══════════════ 3. FEATURES ═══════════════ */

const world = { ground: [], water: [], buildings: [], paths: [], trees: [], line: [], cum: [], length: 1 };

/* Real data now. Buildings, alleys, ponds and the park polygon come straight from
   your OSM extract (named footprints and all). The circuit is your 13 GPX
   waypoints routed through the actual alley graph by Dijkstra, so every metre of
   it is on a way that exists. The relief is fitted to the GPX elevations and is
   still the weakest layer — "Relief only (IGN)" replaces it. */
// CAMPUS lives in 04-campus-data.js (generated — do not hand-edit)

function placeholderData() { return CAMPUS; }

function ingest(gj, { keepTrack = false } = {}) {
  const next = { ground: [], water: [], buildings: [], paths: [], trees: [], line: [] };
  const inside = ([x, y]) => x > -HALF - 60 && x < HALF + 60 && y > -HALF - 60 && y < HALF + 60;

  const walk = (g, p) => {
    if (!g) return;
    if (g.type === "GeometryCollection") return g.geometries.forEach(x => walk(x, p));
    if (g.type === "MultiPolygon") return g.coordinates.forEach(c => walk({type:"Polygon",coordinates:c}, p));
    if (g.type === "MultiLineString") return g.coordinates.forEach(c => walk({type:"LineString",coordinates:c}, p));
    if (g.type === "Point") {
      const q = toLocal(g.coordinates[0], g.coordinates[1]);
      if (p.natural === "tree" && inside(q)) next.trees.push(q);
      return;
    }
    if (g.type === "LineString") {
      const pts = g.coordinates.map(c => toLocal(c[0], c[1]));
      if (p.role === "track") { next.line = pts; return; }
      if (p.highway && pts.some(inside)) { pts.properties = {...p}; pts.width = Number.parseFloat(p.width) || ({service:5,residential:6,footway:2,path:1.5,steps:2}[p.highway] || 3); next.paths.push(pts); }
      return;
    }
    if (g.type === "Polygon") {
      const outer = g.coordinates[0].map(c => toLocal(c[0], c[1]));
      if (!outer.some(inside)) return;
      if (p.building || p["building:part"]) {
        const lv = parseFloat(p["building:levels"]);
        next.buildings.push({
          poly: outer,
          holes: g.coordinates.slice(1).map(r => r.map(c => toLocal(...c))),
          properties: {...p},
          heightSource: p.heightSource || (p.height ? "OSM height" : isFinite(lv) ? "Estimated from levels" : "Estimated"),
          name: p.name || "",
          height: p.height ? parseFloat(p.height) : (isFinite(lv) ? lv * 3.2 + 2 : 13),
          landmark: /ch[âa]teau/i.test(p.name || ""),
          bridge: p.bridge === true || p.bridge === "yes",
          passageAssumed: !!p.passageAssumed
        });
      } else if (p.natural === "water") { outer.properties={...p}; outer.holes=g.coordinates.slice(1).map(r=>r.map(c=>toLocal(...c))); if(Number.isFinite(p.elevation))outer.elevation=p.elevation; next.water.push(outer); }
      else next.ground.push(outer);
      return;
    }
  };

  for (const feat of (gj.features || [])) walk(feat.geometry, feat.properties || {});

  world.ground = next.ground; world.water = next.water; world.buildings = next.buildings;
  world.paths = next.paths;   world.trees = next.trees;
  if (next.line.length > 2) world.line = next.line;
  else if (!keepTrack) world.line = [];
  indexCollisionBounds();
  measureLine();
  return next;
}

function measureLine() {
  const L = world.line;
  if (L.length > 2) {
    const a = L[0], b = L[L.length-1];
    if (Math.hypot(a[0]-b[0], a[1]-b[1]) > 0.5) L.push([a[0], a[1]]);
  }
  world.cum = [0];
  for (let i = 1; i < L.length; i++)
    world.cum[i] = world.cum[i-1] + Math.hypot(L[i][0]-L[i-1][0], L[i][1]-L[i-1][1]);
  world.length = world.cum[world.cum.length - 1] || 1;
}

const TRACK_W = 4; // half-width — widened from the alleys' native 3.2m for a roomier circuit

function onLine(px, py, sHint) {
  const L = world.line;
  let best = { dist: Infinity, s: 0 };
  for (let i = 0; i < L.length - 1; i++) {
    if (sHint != null) {                       // the alleys are driven in both
      let ds = world.cum[i] - sHint;           // directions, so only look at the
      if (ds >  world.length/2) ds -= world.length;   // stretch of track we are
      if (ds < -world.length/2) ds += world.length;   // actually on
      if (Math.abs(ds) > 70) continue;
    }
    const [ax, ay] = L[i], [bx, by] = L[i+1];
    const dx = bx-ax, dy = by-ay, l2 = dx*dx + dy*dy || 1e-9;
    let t = ((px-ax)*dx + (py-ay)*dy) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const cx = ax + t*dx, cy = ay + t*dy, d = Math.hypot(px-cx, py-cy);
    if (d < best.dist) best = { dist: d, s: world.cum[i] + t*Math.sqrt(l2) };
  }
  if (best.dist === Infinity) return onLine(px, py, null);
  return best;
}
function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length-1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < (xj-xi)*(py-yi)/(yj-yi+1e-12) + xi) inside = !inside;
  }
  return inside;
}
function closestOnPoly(px, py, poly) {
  let bd = Infinity, bx = px, by = py;
  for (let i = 0, j = poly.length-1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j], [cx, cy] = poly[i];
    const dx = cx-ax, dy = cy-ay, l2 = dx*dx + dy*dy || 1e-9;
    let t = ((px-ax)*dx + (py-ay)*dy) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = ax + t*dx, qy = ay + t*dy, d = Math.hypot(px-qx, py-qy);
    if (d < bd) { bd = d; bx = qx; by = qy; }
  }
  return { x: bx, y: by, dist: bd };
}

function inWater(x,y,w){return pointInPoly(x,y,w)&&!(w.holes||[]).some(h=>pointInPoly(x,y,h));}

function indexCollisionBounds(){for(const b of world.buildings){const xs=b.poly.map(p=>p[0]),ys=b.poly.map(p=>p[1]);b.bounds={minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};}}
