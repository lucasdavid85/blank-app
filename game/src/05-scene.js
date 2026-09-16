/* 05-scene.js
   three.js setup and every mesh: terrain, track, buildings, ponds, trees, kart.

   Part of Valrose Kart. Loaded as a plain script in the order set by
   index.html, so everything shares one global scope — no bundler needed. */

/* ═══════════════ 4. SCENE ═══════════════ */

let renderer, scene, camera, sun;
let terrainMesh, trackMesh, buildingGroup, treeGroup, pathGroup, kartObj, skidGroup;

function initThree() {
  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("gl"), antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(QUALITY_PRESETS[qualityMode].ratio, devicePixelRatio || 1));
  renderer.shadowMap.enabled = QUALITY_PRESETS[qualityMode].shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc8dfea);
  scene.fog = new THREE.Fog(0xc8dfea, 400, 1200);

  camera = new THREE.PerspectiveCamera(62, 1, 0.2, 2000);

  scene.add(new THREE.HemisphereLight(0xdfe6e2, 0x6a6248, 0.9));
  sun = new THREE.DirectionalLight(0xffe9c4, 0.9);
  sun.position.set(-160, 240, 120);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera;
  sc.left = -260; sc.right = 260; sc.top = 260; sc.bottom = -260; sc.near = 10; sc.far = 700;
  scene.add(sun, sun.target);
  buildSky();

  buildingGroup = new THREE.Group();
  treeGroup = new THREE.Group();
  pathGroup = new THREE.Group();
  skidGroup = new THREE.Group();
  scene.add(buildingGroup, treeGroup, pathGroup, skidGroup);

  buildKart();buildRaceEffects();buildSplashEffects();
  onResize();
  addEventListener("resize", onResize);
}

function onResize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

/* ---- sky: a gradient dome, a sun disc, and a handful of low-poly clouds ---- */
function buildSky() {
  const zenith = new THREE.Color(0x2f6fb0), horizon = new THREE.Color(0xdceefa);
  scene.fog.color.copy(horizon);
  scene.background = horizon.clone();

  const domeR = 900;
  const domeGeo = new THREE.SphereGeometry(domeR, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2 * 1.02);
  const pos = domeGeo.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = Math.pow(Math.max(0, pos.getY(i) / domeR), 0.55);
    c.copy(horizon).lerp(zenith, t);
    col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
  }
  domeGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const dome = new THREE.Mesh(domeGeo,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  dome.renderOrder = -10;
  scene.add(dome);

  const sunDir = sun.position.clone().normalize();
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial(
    { color: 0xfff3d6, transparent: true, opacity: .92, depthWrite: false, fog: false }));
  sunSprite.scale.set(95, 95, 1);
  sunSprite.position.copy(sunDir).multiplyScalar(domeR * .92);
  scene.add(sunSprite);

  let seed = 90210;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xfbfdff });
  const cloudGroup = new THREE.Group();
  for (let i = 0; i < 16; i++) {
    const angle = random() * Math.PI * 2, dist = 260 + random() * 480, h = 130 + random() * 90;
    const puffGroup = new THREE.Group();
    puffGroup.position.set(Math.cos(angle) * dist, h, Math.sin(angle) * dist);
    puffGroup.rotation.y = random() * Math.PI * 2;
    const puffs = 3 + Math.floor(random() * 3);
    for (let k = 0; k < puffs; k++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(6 + random() * 5, 7, 6), cloudMat);
      puff.position.set((random() - .5) * 16, (random() - .5) * 3, (random() - .5) * 10);
      puff.scale.y = .55;
      puffGroup.add(puff);
    }
    cloudGroup.add(puffGroup);
  }
  scene.add(cloudGroup);
}

/* ---- terrain ---- */
function buildGrassTexture() {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d');let seed=14637;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  ctx.fillStyle='#849e5d';ctx.fillRect(0,0,512,512);
  const greens=['#6c884c','#90a86a','#9ab476','#789856','#b3bb80','#526e3e'];
  for(let i=0;i<18000;i++){
    ctx.fillStyle=greens[Math.floor(random()*greens.length)];
    ctx.globalAlpha=.2+random()*.35;
    ctx.fillRect(random()*512,random()*512,1+random()*3,1+random()*2);
  }
  ctx.globalAlpha=.35;ctx.lineWidth=.7;
  for(let i=0;i<6000;i++){
    const x=random()*512,y=random()*512;
    ctx.strokeStyle=greens[Math.floor(random()*greens.length)];ctx.beginPath();
    ctx.moveTo(x,y);ctx.lineTo(x+(random()-.5)*3,y-2-random()*5);ctx.stroke();
  }
  ctx.globalAlpha=1;
  const texture=new THREE.CanvasTexture(canvas);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(DEM.size/14,DEM.size/14);
  texture.anisotropy=Math.min(8,renderer?.capabilities?.getMaxAnisotropy?.()||1);
  return texture;
}
function buildTerrain() {
  if (terrainMesh) clearGroup(terrainMesh);
  const n = DEM.n, step = DEM.size / n, w = n + 1;
  const pos = new Float32Array(w * w * 3);
  const col = new Float32Array(w * w * 3);
  // Grass detail comes from a repeating local texture; vertex tints describe
  // broad lawn variation and less vegetated steep banks without flattening relief.
  const grass = new THREE.Color(0xe1e9d1), shade = new THREE.Color(0xbacda8),
        earth = new THREE.Color(0xcfb996);
  const uv = new Float32Array(w*w*2);

  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
    const k = j * w + i, x = -HALF + i * step, y = -HALF + j * step;
    let h = DEM.h[k];
    for(const water of world.water)if(inWater(x,y,water))h=Math.min(h,waterLevel(water)-1.2);
    pos[k*3] = x; pos[k*3+1] = h; pos[k*3+2] = -y;
    const [gx, gy] = gradientAt(x, y, step);
    const slope = Math.min(1, Math.hypot(gx, gy) / 0.6);
    const variation = (Math.sin(x*.027+y*.013)+Math.sin(x*.061-y*.047))/2;
    const c = grass.clone().lerp(shade,.22+variation*.15)
      .lerp(earth,Math.max(0,slope-.65)*.8);
    uv[k*2]=i/n;uv[k*2+1]=j/n;
    col[k*3] = c.r; col[k*3+1] = c.g; col[k*3+2] = c.b;
  }
  const idx = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const a = j*w + i, b = a + 1, c = a + w, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  terrainMesh = new THREE.Mesh(g,
    new THREE.MeshLambertMaterial({ vertexColors: true, map: buildGrassTexture(), side: THREE.FrontSide }));
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);
  terrainSurface=terrainSurfaceFor(g);
}

/* ---- racing surface, draped on the relief ---- */
function buildTrack() {
  if (trackMesh) clearGroup(trackMesh);
  trackMesh = null;raceSurface=null;
  buildGeese();
  const L = world.line;
  if (L.length < 3) {buildRaceBarriers();return;}

  // Preserve each mapped bend and use small faces in both directions.
  const samples = [];
  for(let i=0;i<L.length-1;i++){
    const count=Math.max(1,Math.ceil((world.cum[i+1]-world.cum[i])/.8));
    for(let j=0;j<count;j++){
      const t=j/count;samples.push([L[i][0]+(L[i+1][0]-L[i][0])*t,L[i][1]+(L[i+1][1]-L[i][1])*t]);
    }
  }
  samples.push(samples[0]);

  const pos = [], col = [], idx = [];
  const tar=new THREE.Color(0x6f7173),kerb=new THREE.Color(0xc4c1b6),line=new THREE.Color(0xdedbd2);
  const bands=[[-TRACK_W-.9,kerb],[-TRACK_W-.1,line],[-TRACK_W+.35,tar],
    [TRACK_W-.35,tar],[TRACK_W+.1,line],[TRACK_W+.9,kerb]],lanes=[];
  for(let i=0;i<bands.length-1;i++){
    const [a,color]=bands[i],[b,next]=bands[i+1],count=Math.ceil((b-a)/.65);
    for(let j=0;j<count;j++)lanes.push([a+(b-a)*j/count,color.clone().lerp(next,j/count)]);
  }
  lanes.push(bands[bands.length-1]);
  const width=lanes.length,last=samples.length-1;

  // Back to the mapped terrain's own shape — both hills, the dip between
  // them, the real ~24 m climb to the high side — just with a light pass to
  // take the short-wavelength bumps off it. Each point is averaged with a
  // fairly narrow window of its neighbours, so the road still follows the
  // ground closely (nothing floats, nothing merges into a plateau); only the
  // small-scale texture gets sanded down. The last stretch fades back to the
  // raw terrain height so the paved circuit still meets the unpaved entrance
  // connector exactly as before. Cross-track stays perfectly level (one
  // height per sample, not per lane), so neither the road nor the boost line
  // ever tilts sideways — and using the highest ground under the *whole*
  // width at each sample (not just the centreline) means fitSurfaceAbove,
  // below, never has to yank just one lane's edge up higher than the rest,
  // which is what was cracking the kerb paint into that jagged little ridge.
  const n = last; // samples[last] duplicates samples[0], the loop's true length
  const raw = new Array(n), cum = new Array(n + 1); cum[0] = 0;
  for (let i = 0; i < n; i++) {
    const [x,y]=samples[i],k=i,[nx,ny]=samples[(k+1)%n],[px,py]=samples[(k-1+n)%n];
    let dx=nx-px,dy=ny-py,l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;
    let hi=-Infinity;
    for(const [offset] of lanes)hi=Math.max(hi,terrainHeightAt(x+dy*offset,y-dx*offset));
    raw[i]=hi;
  }
  for (let i = 1; i <= n; i++) {
    const [ax,ay]=samples[i-1],[bx,by]=samples[i%n];
    cum[i] = cum[i-1] + Math.hypot(bx-ax, by-ay);
  }
  const loopLen = cum[n], step = loopLen/n || .8;
  const smoothRadius = 45, seamTaper = 45;
  const win = Math.max(1, Math.round(smoothRadius/step));
  const smoothed = new Array(samples.length);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let k = -win; k <= win; k++) sum += raw[((i+k)%n+n)%n];
    const avg = sum/(2*win+1), seamDist = Math.min(cum[i], loopLen-cum[i]);
    const t = Math.min(1, seamDist/seamTaper);
    smoothed[i] = raw[i] + (avg-raw[i])*t;
  }
  smoothed[last] = smoothed[0];

  for(let i=0;i<samples.length;i++){
    const [x,y]=samples[i],k=i===last?0:i;
    const [nx,ny]=samples[(k+1)%last],[px,py]=samples[(k-1+last)%last];
    let dx=nx-px,dy=ny-py,l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;
    const rowY=smoothed[i]+.08;
    for(const [offset,color] of lanes){
      const wx=x+dy*offset,wy=y-dx*offset;
      pos.push(wx,rowY,-wy);col.push(color.r,color.g,color.b);
    }
  }
  for(let i=0;i<last;i++)for(let k=0;k<width-1;k++){
    const a=i*width+k,b=a+1,c=a+width,d=c+1;idx.push(a,c,b,b,c,d);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);
  fitSurfaceAbove(g,terrainSurface,.08);
  trackMesh=new THREE.Mesh(g,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));
  trackMesh.receiveShadow=true;
  raceSurface=indexedSurface(g);
  trackMesh.add(buildBoostLine(samples));trackMesh.add(buildRaceDetails());
  scene.add(trackMesh);buildRaceBarriers();
  if(typeof playMode!=='undefined')trackMesh.visible=playMode==='race';
}

function pointAtS(s) {
  const L = world.line, C = world.cum;
  s = ((s % world.length) + world.length) % world.length;
  let i = 0;
  while (i < C.length - 2 && C[i+1] < s) i++;
  const seg = Math.max(1e-6, C[i+1] - C[i]), t = (s - C[i]) / seg;
  return [L[i][0] + (L[i+1][0]-L[i][0])*t, L[i][1] + (L[i+1][1]-L[i][1])*t];
}

/* ---- buildings ---- */
function buildBuildings() {
  while (buildingGroup.children.length) {
    const m = buildingGroup.children.pop();
    m.geometry.dispose(); buildingGroup.remove(m);
  }
  const stone = new THREE.MeshLambertMaterial({ color: 0xe0dfd8 });  // pale concrete
  const clay  = new THREE.MeshLambertMaterial({ color: 0xdcd0ac });  // château, cream not red
  const roof  = new THREE.MeshLambertMaterial({ color: 0x6a6b66 });  // flat institutional roofing
  const tile  = new THREE.MeshLambertMaterial({ color: 0xac6c45 });  // terracotta, the surrounding houses' actual roofs
  // The aerial photo shows two roof families, not one: pale flat roofs over
  // the campus buildings proper, warm clay tile everywhere else nearby —
  // matched here by OSM's own building tag, since most footprints only carry
  // the generic "yes" (i.e. ordinary houses OpenStreetMap never re-tagged).
  const institutional = tag => /^(university|college|school|sports_centre|public|civic|government)$/.test(tag||'');
  function buildingSeed(b) { let h=0; for (const [x,y] of b.poly) h=((h*31+Math.round(x*10))|0)*31+Math.round(y*10)|0; return ((h>>>0)%1000)/1000; }

  for (const b of world.buildings) {
    if (b.poly.length < 3) continue;
    const shape = new THREE.Shape();
    shape.moveTo(b.poly[0][0], b.poly[0][1]);
    for (let i = 1; i < b.poly.length; i++) shape.lineTo(b.poly[i][0], b.poly[i][1]);
    for (const ring of b.holes || []) { const hole = new THREE.Path(); ring.forEach(([x,y],i) => i ? hole.lineTo(x,y) : hole.moveTo(x,y)); shape.holes.push(hole); }
    // footprints sit on the lowest ground they cover, so nothing floats
    let base = Infinity;
    for (const [x, y] of b.poly) base = Math.min(base, heightAt(x, y));
    const totalHeight = Math.max(3, b.height || 13);
    const grand = /grand ch/i.test(b.name);
    const H = grand ? totalHeight * 0.67 : totalHeight;
    const lift = b.bridge ? 6.5 : 0;
    const foundation=b.properties.laboratories?.includes('ICN')?1.5:0;
    const geo = new THREE.ExtrudeGeometry(shape, { depth: H+foundation, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);          // shape's y becomes -z, extrusion becomes +y
    geo.translate(0, base - 1.5 + lift, 0);
    const mesh = new THREE.Mesh(geo, b.landmark ? clay : stone);
    if (b.bridge) mesh.receiveShadow = false;
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData.name = b.name;
    mesh.userData.building = b;
    buildingGroup.add(mesh);
    // a flat cap in a different tone reads as a roof from the chase camera
    const roofBase = (b.landmark || institutional(b.properties.building)) ? roof : tile;
    const jitter = buildingSeed(b) - 0.5;
    const roofMat = new THREE.MeshLambertMaterial({ color: roofBase.color.clone().offsetHSL(0, jitter*.05, jitter*.12) });
    const cap = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, { depth: 0.8, bevelEnabled: false }), roofMat);
    cap.geometry.rotateX(-Math.PI / 2);
    cap.geometry.translate(0, base - 1.5 + lift + foundation + H, 0);
    cap.castShadow = true;
    if(grand){cap.geometry.dispose(); addCastleRoof(b,base-1.5+lift+H,totalHeight-H,roofMat); } else buildingGroup.add(cap);
    addFacade(b,base-1.5+lift+foundation,H);
    if(grand)addCastleDetails(b,base-1.5+lift,H,totalHeight-H);
  }
}

/* ---- ponds ---- */
let waterGroup = null;
function buildWater() {
  if (!waterGroup) { waterGroup = new THREE.Group(); scene.add(waterGroup); }
  while (waterGroup.children.length) {
    const m = waterGroup.children.pop(); m.geometry.dispose(); waterGroup.remove(m);
  }
  const mat = new THREE.MeshPhongMaterial({ color: 0x327f92, shininess:90, specular:0x93cbd6, side:THREE.DoubleSide });
  for (const w of world.water) {
    if (w.length < 3) continue;
    const shape = new THREE.Shape();
    shape.moveTo(w[0][0], w[0][1]);
    for (let i = 1; i < w.length; i++) shape.lineTo(w[i][0], w[i][1]);
    const base = waterLevel(w);
    for(const ring of w.holes||[]){const h=new THREE.Path();ring.forEach((q,i)=>i?h.lineTo(...q):h.moveTo(...q));shape.holes.push(h);}
    const g = new THREE.ShapeGeometry(shape);
    g.rotateX(-Math.PI / 2);
    g.translate(0, base + 0.15, 0);
    waterGroup.add(new THREE.Mesh(g, mat));
  }
}

/* ---- trees ---- */
function buildTrees() {
  while (treeGroup.children.length) {
    const m = treeGroup.children.pop();
    if (m.geometry) m.geometry.dispose();
    treeGroup.remove(m);
  }
  const N = world.trees.length;
  if (!N) return;

  // The park is a botanical garden: cedars and cypress, Trachycarpus palms,
  // and old olives and broadleaves. One cone for everything looked wrong.
  const SP = [
    { trunk: new THREE.CylinderGeometry(0.3, 0.5, 4.5, 6),
      crown: new THREE.ConeGeometry(2.9, 11, 8),
      tc: 0x4d3d2c, cc: 0x35502f, ty: 2.2, cy: 8.5, w: 1.0 },      // cedar / cypress
    { trunk: new THREE.CylinderGeometry(0.32, 0.42, 6.5, 7),
      crown: new THREE.ConeGeometry(3.4, 2.2, 9),
      tc: 0x7a6749, cc: 0x6f8a3f, ty: 3.2, cy: 7.0, w: 0.75 },     // fan palm
    { trunk: new THREE.CylinderGeometry(0.45, 0.7, 2.6, 6),
      crown: new THREE.SphereGeometry(3.6, 9, 7),
      tc: 0x6b5a44, cc: 0x7f8f63, ty: 1.3, cy: 5.4, w: 1.0 }       // olive / broadleaf
  ];
  const pick = [[],[],[]];
  world.trees.forEach((t, i) => {
    if(world.water.some(w=>inWater(...t,w)))return;
    const h = Math.abs(Math.sin(t[0]*12.9898 + t[1]*78.233) * 43758.5453) % 1;
    pick[h < 0.42 ? 0 : h < 0.68 ? 1 : 2].push(t);
  });

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(),
        p = new THREE.Vector3(), v = new THREE.Vector3();
  SP.forEach((sp, k) => {
    const list = pick[k];
    if (!list.length) return;
    const tr = new THREE.InstancedMesh(sp.trunk, new THREE.MeshLambertMaterial({ color: sp.tc }), list.length);
    const cr = new THREE.InstancedMesh(sp.crown, new THREE.MeshLambertMaterial({ color: sp.cc }), list.length);
    cr.castShadow = true;
    list.forEach(([x, y], i) => {
      const g = heightAt(x, y);
      const r = Math.abs(Math.sin(x*3.1 + y*7.7) * 1234.5) % 1;
      const sc = 0.78 + r * 0.55;
      p.set(x, g + sp.ty * sc, -y); v.set(sc, sc, sc);
      tr.setMatrixAt(i, m.compose(p, q, v));
      p.set(x, g + sp.cy * sc, -y); v.set(sc * sp.w, sc, sc * sp.w);
      cr.setMatrixAt(i, m.compose(p, q, v));
    });
    tr.instanceMatrix.needsUpdate = true;
    cr.instanceMatrix.needsUpdate = true;
    treeGroup.add(tr, cr);
  });
}

/* ---- footpaths ---- */
function buildPaths() {
  while (pathGroup.children.length) {
    const m = pathGroup.children.pop();
    m.geometry.dispose(); pathGroup.remove(m);
  }
  const mat = new THREE.MeshLambertMaterial({ color: 0xb9b5a7, side: THREE.DoubleSide });
  // The race surface no longer sits at exactly terrainHeightAt (it's smoothed
  // to take the small bumps off), so a footpath crossing the circuit can no
  // longer assume the paved road is at raw terrain height either — it needs
  // to duck under the actual road surface there, or it pokes up through the
  // asphalt as a jagged crack right where the two cross.
  const onRoad = raceSurface && world.line.length > 2;
  for (const p of world.paths) {
    const vertices = [], indices = [], half = (p.width || 2) / 2;
    for (let j=1;j<p.length;j++) {
      const a=p[j-1], b=p[j], length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      if (!length) continue;
      const nx=-(b[1]-a[1])/length*half, ny=(b[0]-a[0])/length*half;
      const count=Math.max(1,Math.ceil(length/2));
      for(let k=0;k<count;k++) {
        const offset=vertices.length/3;
        for(const [t,side] of [[k/count,1],[k/count,-1],[(k+1)/count,1],[(k+1)/count,-1]]) {
          const x=a[0]+(b[0]-a[0])*t+nx*side, y=a[1]+(b[1]-a[1])*t+ny*side;
          const h = onRoad && onLine(x,y).dist < TRACK_W+.9 ? raceHeightAt(x,y)-0.05 : heightAt(x,y)+0.12;
          vertices.push(x,h,-y);
        }
        indices.push(offset,offset+2,offset+1,offset+1,offset+2,offset+3);
      }
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
    g.setIndex(indices); g.computeVertexNormals();
    const mesh=new THREE.Mesh(g,mat); mesh.receiveShadow=true; pathGroup.add(mesh);
  }
}

/* ---- kart: a small blue hatchback, low-poly homage to a Peugeot 106 ---- */
function buildKart() {
  kartObj = new THREE.Group();
  const blue = 0x1c56b3, blueDark = 0x17458d, glass = 0x232f3a,
    bumper = 0x272725, trim = 0xd8dadc, headlight = 0xf2eeda, taillight = 0xaf372c;
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 2.95),
    new THREE.MeshLambertMaterial({ color: blue }));
  body.position.y = 0.5; body.castShadow = true; body.receiveShadow = true;
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 0.85),
    new THREE.MeshLambertMaterial({ color: blueDark }));
  hood.position.set(0, 0.78, -1.35);
  const hatch = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 0.5),
    new THREE.MeshLambertMaterial({ color: blueDark }));
  hatch.position.set(0, 0.75, 1.4);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.1, 1.55),
    new THREE.MeshLambertMaterial({ color: blue }));
  roof.position.set(0, 1.18, 0.05); roof.castShadow = true;
  const glassBox = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.38, 1.5),
    new THREE.MeshLambertMaterial({ color: glass }));
  glassBox.position.set(0, 0.96, 0.05);
  for (const [z, sign] of [[-1.66, -1], [1.66, 1]]) {
    const bump = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.28, 0.22),
      new THREE.MeshLambertMaterial({ color: bumper }));
    bump.position.set(0, 0.4, z); kartObj.add(bump);
    for (const x of [-0.55, 0.55]) {
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.06),
        new THREE.MeshLambertMaterial({ color: sign < 0 ? headlight : taillight }));
      light.position.set(x, 0.56, z + sign * 0.07); kartObj.add(light);
    }
  }
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.05),
    new THREE.MeshLambertMaterial({ color: 0x161616 }));
  grille.position.set(0, 0.5, -1.63);
  for (const x of [-0.83, 0.83]) {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 0.22),
      new THREE.MeshLambertMaterial({ color: blueDark }));
    mirror.position.set(x, 0.96, -0.55); kartObj.add(mirror);
  }
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.1, 2.6),
    new THREE.MeshLambertMaterial({ color: trim }));
  skirt.position.set(0, 0.24, 0.05);
  const wheelG = new THREE.CylinderGeometry(0.46, 0.46, 0.34, 14);
  wheelG.rotateZ(Math.PI / 2);
  const wheelM = new THREE.MeshLambertMaterial({ color: 0x1c1c1a });
  kartObj.userData.wheels=[];
  for (const [wx, wz] of [[-0.78,-1.05],[0.78,-1.05],[-0.8,1.1],[0.8,1.1]]) {
    const pivot=new THREE.Group();pivot.position.set(wx,.46,wz);kartObj.add(pivot);
    const w = new THREE.Mesh(wheelG, wheelM);w.castShadow = true;pivot.add(w);
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.08,10),new THREE.MeshLambertMaterial({color:0xcfd2d4}));
    hub.rotation.z=Math.PI/2;hub.position.x=Math.sign(wx)*.19;w.add(hub);
    kartObj.userData.wheels.push({pivot,mesh:w,front:wz<0});
  }
  kartObj.userData.boostFlames=[];
  for(const x of [-.45,.45]){
    const flame=new THREE.Mesh(new THREE.ConeGeometry(.18,1.25,8),new THREE.MeshBasicMaterial({color:0xadef80,transparent:true,opacity:.85,depthWrite:false}));
    flame.rotation.x=Math.PI/2;flame.position.set(x,.5,1.9);flame.visible=false;
    kartObj.add(flame);kartObj.userData.boostFlames.push(flame);
  }
  kartObj.add(body, hood, hatch, roof, glassBox, grille, skirt);
  scene.add(kartObj);
}

function waterLevel(w){return w.elevation??Math.min(...w.map(q=>heightAt(...q)));}

function castleAxes(){
 const origin=toLocal(7.266356,43.716757),end=toLocal(7.266815,43.716827),len=Math.hypot(end[0]-origin[0],end[1]-origin[1]),u=[(end[0]-origin[0])/len,(end[1]-origin[1])/len];
 return {origin,u,v:[-u[1],u[0]],len};
}
function addCastleRoof(b,base,rise,material){
 const axes=castleAxes(),local=q=>{const x=q[0]-axes.origin[0],y=q[1]-axes.origin[1];return[x*axes.u[0]+y*axes.u[1],x*axes.v[0]+y*axes.v[1]];},world=q=>[axes.origin[0]+q[0]*axes.u[0]+q[1]*axes.v[0],axes.origin[1]+q[0]*axes.u[1]+q[1]*axes.v[1]];
 const outline=b.poly.slice(0,-1).map(local);
 function clip(p,axis,value,sign){const out=[];for(let i=0;i<p.length;i++){const a=p[i],c=p[(i+1)%p.length],ai=(a[axis]-value)*sign>=0,ci=(c[axis]-value)*sign>=0;if(ai)out.push(a);if(ai!==ci){const t=(value-a[axis])/(c[axis]-a[axis]);out.push([a[0]+t*(c[0]-a[0]),a[1]+t*(c[1]-a[1])]);}}return out;}
 // Separate the main villa from the theatre using the footprint and map references.
 for(const [part,mid,half,h] of [[clip(outline,0,axes.len,-1),9,9,rise],[clip(outline,0,axes.len,1),24,12,rise*.6]]){
  if(part.length<3)continue;
  for(const sign of [-1,1]){const p=clip(part,1,mid,sign);if(p.length<3)continue;const shape=new THREE.Shape(p.map(q=>new THREE.Vector2(...q))),g=new THREE.ShapeGeometry(shape),pos=g.attributes.position;
   for(let i=0;i<pos.count;i++){const u=pos.getX(i),v=pos.getY(i),q=world([u,v]);pos.setXYZ(i,q[0],base+h*Math.max(0,1-Math.abs(v-mid)/half),-q[1]);}g.computeVertexNormals();const mesh=new THREE.Mesh(g,material);material.side=THREE.DoubleSide;mesh.castShadow=true;buildingGroup.add(mesh);
  }
 }
}
function addCastleDetails(b,base,H,rise){
 const ax=castleAxes(),at=(u,v,h)=>new THREE.Vector3(ax.origin[0]+u*ax.u[0]+v*ax.v[0],base+h,-ax.origin[1]-u*ax.u[1]-v*ax.v[1]);
 const rotation=Math.atan2(-ax.u[1],ax.u[0]),stone=0xddd3ba,slate=0x465263;
 function block(w,h,d,u,v,z,color){const m=box(buildingGroup,w,h,d,0,0,0,color);m.position.copy(at(u,v,z));m.rotation.y=rotation;return m;}
 for(const z of [H*.34,H*.68,H-.15])block(ax.len+1,.28,.5,ax.len/2,-.12,z,stone);
 // Repeated narrow dormers and four corner pinnacles follow the supplied photograph.
 for(const u of [3,10,18,26,34]){
  const v=2.1,z=H+rise*.23;block(1.25,2.4,1.1,u,v,z+1.1,stone);block(.58,1.3,.04,u,v-.57,z+1.2,0x33454f);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(1.0,1.7,4),new THREE.MeshLambertMaterial({color:slate}));roof.position.copy(at(u,v,z+3));roof.rotation.y=rotation+Math.PI/4;roof.castShadow=true;buildingGroup.add(roof);
 }
 for(const u of [0,ax.len])for(const v of [.4,16]){
  block(.85,2.5,.85,u,v,H+1.1,stone);const spire=new THREE.Mesh(new THREE.ConeGeometry(.6,2.3,4),new THREE.MeshLambertMaterial({color:stone}));spire.position.copy(at(u,v,H+3.3));spire.rotation.y=rotation+Math.PI/4;buildingGroup.add(spire);
 }
 // Two flights descending from the front terrace. Dimensions remain approximate.
 for(const side of [-1,1])for(let i=0;i<15;i++){
  const u=ax.len/2+side*(5+i*.55),v=-4-i*.8,q=at(u,v,0),ground=heightAt(q.x,-q.z);const m=box(buildingGroup,4,.3,1.0,q.x,ground+.22,-(-q.z),0xc9bfa6);m.rotation.y=rotation;
 }
}
function addFacade(b,base,H){
 const icn=b.properties.facadeStyle==='icn';
 const glass=new THREE.MeshLambertMaterial({color:b.landmark?0x384c53:icn?0x34474d:0x58747e,side:THREE.DoubleSide});
 const positions=[],indices=[],cladding=[],claddingIndices=[];
 const floors=b.landmark?3:Math.max(1,Math.min(8,Math.round(H/3.4)));
 for(let i=1;i<b.poly.length;i++){
  const a=b.poly[i-1],c=b.poly[i],dx=c[0]-a[0],dy=c[1]-a[1],length=Math.hypot(dx,dy);if(length<3)continue;
  const ux=dx/length,uy=dy/length;let nx=uy,ny=-ux;
  const mx=(a[0]+c[0])/2,my=(a[1]+c[1])/2;
  if(pointInPoly(mx+nx*.1,my+ny*.1,b.poly)){nx=-nx;ny=-ny;}
  if(icn){
   const index=cladding.length/3;
   for(const [t,h] of [[0,0],[1,0],[0,7],[1,7]])
    cladding.push(a[0]+dx*t+nx*.035,base+h,-a[1]-dy*t-ny*.035);
   claddingIndices.push(index,index+1,index+2,index+1,index+3,index+2);
  }
  const ribbon=b.properties.facadeStyle==='ribbon';
  const count=ribbon?1:Math.max(1,Math.floor(length/(b.landmark?3.5:icn?2:3)));
  const width=ribbon?length*.96:icn?length/count*.88:Math.min(1.35,length/count*.45);
  for(let j=0;j<count;j++)for(let f=0;f<floors;f++){
   const x=a[0]+dx*(j+.5)/count,y=a[1]+dy*(j+.5)/count,z=base+(f+.45)*H/floors,index=positions.length/3;
   for(const [u,v] of [[-1,0],[1,0],[-1,1],[1,1]])
    positions.push(x+ux*u*width/2+nx*.065,z+v*Math.min(1.8,H/floors*.5),-y-uy*u*width/2-ny*.065);
   indices.push(index,index+1,index+2,index+1,index+3,index+2);
  }
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
 const windows=new THREE.Mesh(g,glass);windows.userData.facadeFor=b.properties.localId;buildingGroup.add(windows);
 if(cladding.length){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(cladding,3));g.setIndex(claddingIndices);
  const mesh=new THREE.Mesh(g,new THREE.MeshLambertMaterial({color:0xb5794f,side:THREE.DoubleSide}));
  mesh.userData.claddingFor=b.properties.localId;buildingGroup.add(mesh);
 }
}
