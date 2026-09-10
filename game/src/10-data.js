/* 10-data.js
   Live Overpass + IGN fetching, data-pack save/load.

   Part of Valrose Kart. Loaded as a plain script in the order set by
   index.html, so everything shares one global scope — no bundler needed. */

/* ═══════════════ 9. REAL DATA ═══════════════ */

const OVERPASS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter"
];

function say(msg) { el("status").textContent = msg; }
function busy(on) {
  for (const id of ["fetch-all","fetch-osm","fetch-dem"]) el(id).disabled = on;
}

const OQ = `[out:json][timeout:90];
(
  way["building"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
  relation["building"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
  way["highway"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
  relation["natural"="water"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
  way["natural"="water"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
  way["amenity"="fountain"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
  way["leisure"="park"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
  node["natural"="tree"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
);
out geom;`;

async function fetchOSM() {
  say("Asking OpenStreetMap for the campus…");
  let data = null, lastErr = "";
  for (const url of OVERPASS) {
    try {
      const r = await fetch(url, { method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(OQ) });
      if (!r.ok) { lastErr = "HTTP " + r.status; continue; }
      data = await r.json(); break;
    } catch (e) { lastErr = e.message; }
  }
  if (!data) { say("Overpass unreachable (" + lastErr + "). Try again in a minute, or export from overpass-turbo.eu and load the file."); return null; }
  return osmToGeoJSON(data);
}

// Minimal osmtogeojson: `out geom` already gives us coordinates on every way.
function osmToGeoJSON(osm) {
  const feats = [];
  for (const el of osm.elements) {
    const tags = {...el.tags};
    if(tags.amenity === "fountain"){tags.natural="water";tags.waterKind="fountain";}
    if(el.type==="relation"&&String(el.id)==="1891267"){tags.waterKind="lake";tags.name="Lac du parc";}
    if (el.type === "node" && tags.natural === "tree") {
      feats.push({ type:"Feature", properties:tags,
        geometry:{ type:"Point", coordinates:[el.lon, el.lat] } });
    } else if (el.type === "way" && el.geometry) {
      const c = el.geometry.map(p => [p.lon, p.lat]);
      const closed = c.length > 3 &&
        c[0][0] === c[c.length-1][0] && c[0][1] === c[c.length-1][1];
      feats.push({ type:"Feature", properties:tags,
        geometry: (closed && (tags.building || tags.leisure || tags.natural === "water" || tags.amenity === "fountain"))
          ? { type:"Polygon", coordinates:[c] }
          : { type:"LineString", coordinates:c } });
    } else if (el.type === "relation" && el.members) {
      const eq=(a,b)=>a[0]===b[0]&&a[1]===b[1];
      function rings(role){const parts=el.members.filter(m=>(m.role||'outer')===role&&m.geometry).map(m=>m.geometry.map(p=>[p.lon,p.lat])),out=[];
       while(parts.length){let c=parts.shift(),progress=true;while(!eq(c[0],c[c.length-1])&&progress){progress=false;for(let i=0;i<parts.length;i++){let p=parts[i];if(eq(c[c.length-1],p[p.length-1]))p=p.slice().reverse();if(eq(c[c.length-1],p[0])){c.push(...p.slice(1));parts.splice(i,1);progress=true;break;}}}if(c.length>=4&&eq(c[0],c[c.length-1]))out.push(c);}return out;}
      const holes=rings('inner');for(const c of rings('outer'))feats.push({type:'Feature',properties:tags,geometry:{type:'Polygon',coordinates:[c,...holes.filter(h=>pointInPoly(...h[0],c))]}});

    }
  }
  return { type:"FeatureCollection", features:feats };
}

/* IGN RGE ALTI — 1 m lidar-derived elevation, free and open.
   GET is capped by URL length, so we walk the grid in row batches. */
const DEM_N = 176;                    // sample grid (49×49 = 2401 points)
let ignSep = "|";                    // IGN accepts "|"; some deployments want ","

async function ignBatch(slice) {
  const build = sep => "https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json"
      + "?resource=ign_rge_alti_wld&zonly=true&indent=false&delimiter=" + encodeURIComponent(sep)
      + "&lon=" + slice.map(p => p[0].toFixed(6)).join(sep)
      + "&lat=" + slice.map(p => p[1].toFixed(6)).join(sep);
  for (const sep of [ignSep, ignSep === "|" ? "," : "|"]) {
    try {
      const r = await fetch(build(sep));
      if (!r.ok) continue;
      const js = await r.json();
      if (!js.elevations || js.elevations.length !== slice.length) continue;
      ignSep = sep;
      return js.elevations;
    } catch (e) { /* try the other separator, then give up */ }
  }
  return null;
}

async function fetchDEM() {
  const n = DEM_N, step = (2*HALF)/n, pts = [];
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++)
    pts.push(toLonLat(-HALF + i*step, -HALF + j*step));

  const out = new Float32Array(pts.length);
  const BATCH = 150;
  for (let k = 0; k < pts.length; k += BATCH) {
    const slice = pts.slice(k, k + BATCH);
    say(`Sampling IGN relief… ${Math.round(100*k/pts.length)}%`);
    await new Promise(resolve=>setTimeout(resolve,250));
    const arr = await ignBatch(slice);
    if (!arr) {
      say("The IGN elevation service didn't answer. Keeping the synthetic relief — see the comment at the top of the file for the offline route.");
      return false;
    }
    for (let m = 0; m < slice.length; m++) {
      const v = arr[m];
      const z = (v == null) ? NaN : (typeof v === "number" ? v : v.z);
      out[k + m] = (z === -99999 || !isFinite(z)) ? NaN : z;
    }
  }
  // fill any gaps, then resample onto the render grid
  let sum = 0, cnt = 0;
  for (const v of out) if (isFinite(v)) { sum += v; cnt++; }
  if (!cnt) { say("IGN returned no data for this area."); return false; }
  const mean = sum/cnt;
  for (let i = 0; i < out.length; i++) if (!isFinite(out[i])) out[i] = mean;

  const N = DEM.n, dst = new Float32Array((N+1)*(N+1));
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    const fi = i/N*n, fj = j/N*n;
    const a = Math.min(n-1, fi|0), b = Math.min(n-1, fj|0);
    const tx = fi-a, ty = fj-b, w = n+1;
    dst[j*(N+1)+i] =
      (out[b*w+a]*(1-tx) + out[b*w+a+1]*tx)*(1-ty) +
      (out[(b+1)*w+a]*(1-tx) + out[(b+1)*w+a+1]*tx)*ty;
  }
  DEM.h = dst; DEM.real = true; demRange();
  return true;
}

function rebuildAll() {
  indexCollisionBounds();
  buildHillshade(); buildTerrain(); buildTrack();
  buildBuildings(); buildWater(); buildTrees(); buildPaths(); buildLandmarks();
  resetKart();
  if(typeof playMode!=='undefined'){if(trackMesh)trackMesh.visible=playMode==='race';for(const p of gate.pieces)p.mesh.visible=playMode==='race';}
  el("datasrc").textContent =
    (DEM.real ? "IGN RGE ALTI relief" : "GPX-fitted relief") + " · " +
    (world.buildings.length ? world.buildings.length + " buildings" : "no buildings");
}

el("fetch-osm").onclick = async () => {
  busy(true);
  const gj = await fetchOSM();
  if (gj) {
    const got = ingest(gj, { keepTrack: true });
    rebuildAll();
    say(`${got.buildings.length} buildings, ${got.paths.length} paths, ${got.trees.length} trees from OSM. Check your racing line in the campus editor (M).`);
  }
  busy(false);
};
el("fetch-dem").onclick = async () => {
  busy(true);
  if (await fetchDEM()) {
    rebuildAll();
    say(`Relief from IGN: ${DEM.min.toFixed(0)}–${DEM.max.toFixed(0)} m, ${(DEM.max-DEM.min).toFixed(0)} m of drop across the park.`);
  }
  busy(false);
};
el("fetch-all").onclick = async () => {
  busy(true);
  const gj = await fetchOSM();
  if (gj) ingest(gj, { keepTrack: true });
  const ok = await fetchDEM();
  rebuildAll();
  say(`${world.buildings.length} buildings from OSM` +
      (ok ? `, relief ${DEM.min.toFixed(0)}–${DEM.max.toFixed(0)} m from IGN` : ", relief still synthetic") +
      ". Redraw the racing line in map mode (M).");
  busy(false);
};

function exportFeatures() {
 const features=[], feature=(properties,type,coordinates)=>features.push({type:'Feature',properties,geometry:{type,coordinates}}), ll=p=>p.map(q=>toLonLat(...q));
 feature({role:'track'},'LineString',ll(world.line));
 for(const p of world.ground)feature({role:'ground'},'Polygon',[ll(p)]);
 for(const p of world.water)feature({...p.properties,natural:'water',elevation:p.elevation},'Polygon',[ll(p),...(p.holes||[]).map(ll)]);
 for(const b of world.buildings)feature({...b.properties,building:'yes',name:b.name,height:b.height,heightSource:b.heightSource,bridge:b.bridge,passageAssumed:b.passageAssumed},'Polygon',[ll(b.poly),...(b.holes||[]).map(ll)]);
 for(const p of world.paths)feature({...p.properties,highway:p.properties?.highway||'path',width:p.width},'LineString',ll(p));
 for(const p of world.trees)feature({natural:'tree'},'Point',toLonLat(...p));
 return {type:'FeatureCollection',features};
}
el('save-pack').onclick=()=>download({format:'valrose-kart-pack/2',origin:ORIGIN,half:HALF,dem:{n:DEM.n,real:DEM.real,h:Array.from(DEM.h)},features:exportFeatures()},'valrose-pack.json');

function validateImport(j) {
 const gj=j.type==='FeatureCollection'?j:j.features;
 if(!gj||gj.type!=='FeatureCollection'||!Array.isArray(gj.features))throw Error('Expected a GeoJSON FeatureCollection');
 function coords(c){if(!Array.isArray(c)||!c.length)throw Error('Empty geometry');if(typeof c[0]==='number'){if(c.length<2||!c.every(Number.isFinite)||Math.abs(c[0]-ORIGIN.lon)>.02||Math.abs(c[1]-ORIGIN.lat)>.02)throw Error('Coordinates must be near Valrose');}else c.forEach(coords);}
 for(const f of gj.features){if(!f.geometry||!['Point','LineString','Polygon','MultiPolygon','MultiLineString'].includes(f.geometry.type))throw Error('Unsupported geometry');coords(f.geometry.coordinates);const p=f.properties||{};if(p.height!=null&&(!Number.isFinite(parseFloat(p.height))||parseFloat(p.height)<=0))throw Error('Invalid height');}
 if(j.dem&&(!Number.isInteger(j.dem.n)||j.dem.n<2||j.dem.n>512||!Array.isArray(j.dem.h)||j.dem.h.length!==(j.dem.n+1)**2||!j.dem.h.every(Number.isFinite)))throw Error('Invalid terrain grid');
 if(j.origin&&(Math.abs(j.origin.lat-ORIGIN.lat)>1e-7||Math.abs(j.origin.lon-ORIGIN.lon)>1e-7))throw Error('Terrain origin does not match Valrose');
 if(j.half&&(!Number.isFinite(j.half)||j.half<100||j.half>1000))throw Error('Terrain size does not match');
 return gj;
}
el("loadfile").onchange = ev => {
  const f = ev.target.files[0]; if (!f) return;
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const j = JSON.parse(fr.result);
      const gj = validateImport(j);
      if (j.dem && j.dem.h) {
        DEM.h = importTerrain(j.dem,j.half||HALF);
        DEM.real = !!j.dem.real; demRange();
      }
      ingest(gj, { keepTrack: true });
      selection=null; history.length=0;
      rebuildAll();
      say(`Loaded ${world.buildings.length} buildings` + (j.dem ? " and the relief" : "") + " from file.");
    } catch (e) { say("Could not load: " + e.message); }
  };
  fr.readAsText(f);
};

el("hidepanel").onclick = () => el("panel").classList.toggle("min");

function download(obj, name) {
  const b = new Blob([JSON.stringify(obj)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function importTerrain(d,oldHalf){
 const n=DEM.n,out=new Float32Array((n+1)**2),w=d.n+1;
 for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){
  const x=-HALF+2*HALF*i/n,y=-HALF+2*HALF*j/n;
  if(Math.abs(x)>oldHalf||Math.abs(y)>oldHalf){out[j*(n+1)+i]=syntheticHeight(x,y);continue;}
  const fx=(x+oldHalf)/(2*oldHalf)*d.n,fy=(y+oldHalf)/(2*oldHalf)*d.n,a=Math.min(d.n-1,Math.floor(fx)),b=Math.min(d.n-1,Math.floor(fy)),tx=fx-a,ty=fy-b;
  out[j*(n+1)+i]=(d.h[b*w+a]*(1-tx)+d.h[b*w+a+1]*tx)*(1-ty)+(d.h[(b+1)*w+a]*(1-tx)+d.h[(b+1)*w+a+1]*tx)*ty;
 }
 return out;
}
