/* 02-relief.js
   Height grid and the surface fitted to the GPX elevations.

   Part of Valrose Kart. Loaded as a plain script in the order set by
   index.html, so everything shares one global scope — no bundler needed. */

/* ═══════════════ 2. RELIEF ═══════════════ */

const DEM = { n: 176, size: 2 * HALF, h: null, min: 0, max: 0, real: false };

// Relief fitted to the elevations in your GPX: a regional plane through all 13
// points, plus each point's residual spread over a 70 m Gaussian. Reproduces the
// measured altitudes to about 3.6 m RMS. A placeholder with real numbers behind
// it, not a guess — but still 13 samples, so fetch IGN for the truth.
const ELE_PLANE = [53.3747, 0.034579, 0.045736];
const ELE_PTS = [[-202.2,-117.8,-4.45],[-52.1,-51.2,-4.00],[-68.9,-92.9,-0.14],[-33.8,-120.0,5.55],[6.5,-50.6,6.50],[76.8,100.8,-0.17],[24.1,115.3,-6.28],[-40.4,51.0,-5.52],[-118.7,-9.7,-0.62],[-157.5,19.7,9.15],[-124.6,130.0,4.55],[-197.8,26.2,0.65],[-197.8,-92.2,-5.22]];
function syntheticHeight(x, y) {
  let h = ELE_PLANE[0] + ELE_PLANE[1]*x + ELE_PLANE[2]*y;
  let ws = 0, wr = 0;
  for (const [px, py, r] of ELE_PTS) {
    const w = Math.exp(-(((x-px)**2 + (y-py)**2)) / (2*70*70));
    ws += w; wr += w*r;
  }
  return ws > 1e-6 ? h + wr/ws : h;
}

function buildSyntheticDEM() {
  const n = DEM.n, step = DEM.size / n, h = new Float32Array((n + 1) * (n + 1));
  for (let j = 0; j <= n; j++)
    for (let i = 0; i <= n; i++)
      h[j * (n + 1) + i] = syntheticHeight(-HALF + i * step, -HALF + j * step);
  DEM.h = h; DEM.real = false;
  demRange();
}

function demRange() {
  let mn = Infinity, mx = -Infinity;
  for (const v of DEM.h) { if (v < mn) mn = v; if (v > mx) mx = v; }
  DEM.min = mn; DEM.max = mx;
}

/* Bilinear height and gradient. Everything — physics, meshes, minimap —
   goes through these two, so swapping the DEM changes the whole world. */
function heightAt(x, y) {
  const n = DEM.n, step = DEM.size / n;
  let fi = (x + HALF) / step, fj = (y + HALF) / step;
  fi = Math.max(0, Math.min(n - 1e-4, fi));
  fj = Math.max(0, Math.min(n - 1e-4, fj));
  const i = fi | 0, j = fj | 0, tx = fi - i, ty = fj - j, w = n + 1;
  const a = DEM.h[j * w + i],       b = DEM.h[j * w + i + 1];
  const c = DEM.h[(j + 1) * w + i], d = DEM.h[(j + 1) * w + i + 1];
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
}
function gradientAt(x, y, e = 3) {
  return [(heightAt(x + e, y) - heightAt(x - e, y)) / (2 * e),
          (heightAt(x, y + e) - heightAt(x, y - e)) / (2 * e)];
}

// The mapped relief arrives on a 176×176 grid (its real IGN sample spacing,
// 5 m/cell) rendered as just two flat triangles per cell — visibly faceted
// on the hills. Upsampling it here re-samples that same bilinear surface at
// 4x the density (2x per axis), so each cell's true curve shows instead of
// being flattened into two planes. It adds no new real elevation data —
// heightAt() already interpolates the coarse grid the same way — it only
// gives the render mesh, and everything draped on it (road, buildings,
// kerbs), enough triangles to actually show that curve.
function upsampleGrid(n, h, factor) {
  const w = n + 1, N = n * factor, dst = new Float32Array((N + 1) * (N + 1));
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    const fi = i / factor, fj = j / factor;
    const a = Math.min(n - 1, fi | 0), b = Math.min(n - 1, fj | 0);
    const tx = fi - a, ty = fj - b;
    dst[j * (N + 1) + i] =
      (h[b * w + a] * (1 - tx) + h[b * w + a + 1] * tx) * (1 - ty) +
      (h[(b + 1) * w + a] * (1 - tx) + h[(b + 1) * w + a + 1] * tx) * ty;
  }
  return dst;
}
function loadDefaultTerrain(){
  DEM.n=TERRAIN_DATA.n*2;
  DEM.h=upsampleGrid(TERRAIN_DATA.n,TERRAIN_DATA.h,2);
  DEM.real=true;demRange();
}
