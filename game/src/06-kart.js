/* 06-kart.js
   Arcade kart physics, wall contacts, lap progress.

   Part of Valrose Kart. Loaded as a plain script in the order set by
   index.html, so everything shares one global scope — no bundler needed. */

/* ═══════════════ 5. PHYSICS ═══════════════ */

const KART = {
  radius: 0.85, engine: 21, brake: 34, launchSpeed: 20, maxSpeed: 20,
  maxBoostSpeed: 28, slopeGain: 3.2,
  boostHalfWidth: 0.7, centerBoost: 1.85, boostChargeSeconds: 2, boostSeconds: 2.5,
  steerResponse: 10,
  steer: 2.5, gripOn: 0.87, gripSlide: 0.975, drag: 0.9965,
  launchBoost: 1.6  // race-only acceleration multiplier from the entrance to the circuit
};
const G = 9.81;

const kart = { x: 0, y: 0, a: 0, vx: 0, vy: 0, offroad: false, wet: false, slip: 0, grade: 0, alt: 0 };
const race = { s: 0, progress: 0, lap: 1, t: 0, best: null, running: false,
  finished: false, results: [], lastTick: null, course: '', boosts: 0, railHits: 0 };
const skids = [];

function resetKart() {
  const L = world.line;
  if (L.length > 1) {
    kart.x = L[0][0]; kart.y = L[0][1];
    kart.a = Math.atan2(L[1][0]-L[0][0], L[1][1]-L[0][1]);
  } else { kart.x = kart.y = 0; kart.a = 0; }
  if(gate.group){[kart.x,kart.y]=gateSpawn();kart.a=Math.atan2(...gate.forward);resetGate();}
  kart.vx = kart.vy = 0; kart.slip = 0; kart.offroad = false; kart.wet = false; kart.splashTimer = 0;
  kart.steering=0;kart.wheelSpin=0;kart.railContact=false;kart.wallContact=false;cancelCenterBoost();
  race.boosts=0;race.railHits=0;resetRaceEffects();
  race.s = onLine(kart.x, kart.y).s;
  const course = JSON.stringify(world.line);
  if (race.course !== course) {
    race.best = null; race.results.length = 0; race.course = course;
    podiumEntries = loadPodium(); currentPodiumEntry = null; renderPodium();
  }
  race.progress = 0; race.lap = race.results.length + 1; race.t = 0;
  race.running = false; race.finished = false; race.lastTick = null; race.currentResult = null;
  closeFinish(); clearTouchControls(); keys.clear(); resetGeese();
  while (skidGroup.children.length) {
    const m = skidGroup.children.pop(); m.geometry.dispose(); skidGroup.remove(m);
  }
  skids.length = 0;
  prepareRaceStart();resetCameraView();
}

const keys = new Set();
addEventListener("keydown", e => {
  if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  const k = e.key.toLowerCase();
  if (["arrowup","arrowdown","arrowleft","arrowright"," "].includes(k)) e.preventDefault();
  if (k === "r") resetKart();
  if (k === "c") camMode = (camMode + 1) % 3;
  if (k === "m") toggleMap();
  if (k === "h") setPanelCollapsed(!document.getElementById("panel").classList.contains("min"));
  keys.add(k);
});
addEventListener("keyup", e => keys.delete(e.key.toLowerCase()));
const held = (...k) => k.some(x => keys.has(x));

function step(dt) {
  if (mapOpen || race.finished || raceWaitingForStart()) return;
  const visiting=playMode==='visit';
  const throttle = held("arrowup","w","z");
  const braking  = held("arrowdown","s");
  const steerIn  = (held("arrowright","d") ? 1 : 0) - (held("arrowleft","a","q") ? 1 : 0);
  const hand     = held(" ");

  const hx = Math.sin(kart.a), hy = Math.cos(kart.a);
  const rx = hy, ry = -hx;
  let fwd = kart.vx*hx + kart.vy*hy;
  let lat = kart.vx*rx + kart.vy*ry;

  const near = onLine(kart.x, kart.y, race.running ? race.s : null);
  kart.offroad = visiting && near.dist > TRACK_W;
  // Visiting lets you drive straight into the lake — wading through it costs
  // grip and speed instead of the hard wall the race circuit still has.
  const water = visiting ? world.water.find(w => inWater(kart.x, kart.y, w)) : null;
  kart.wet = !!water;
  const launching = !visiting && !race.running;
  const canAccelerate=throttle&&!braking&&!hand&&fwd>=0&&alignedWithCircuit(hx,hy,near.s);
  updateCenterBoost(dt,near.dist<=KART.boostHalfWidth,canAccelerate);
  const acceleration = kart.boosting||kart.onBoostLine ? KART.centerBoost : launching ? KART.launchBoost : 1;
  if (throttle) fwd += KART.engine * acceleration * dt;
  if (braking)  fwd -= (fwd > 0 ? KART.brake : KART.engine * 0.5) * dt;

  // ── the relief acts here ──
  // component of gravity along the heading; uphill bleeds speed, downhill adds it,
  // visit mode can exceed the flat-ground speed; race remains capped.
  const [gx, gy] = drivingGradientAt(kart.x, kart.y);
  const alongSlope = gx*hx + gy*hy;                    // rise per metre travelled
  kart.grade = alongSlope;
  fwd -= G * (visiting ? 1 : KART.slopeGain) * alongSlope /
         Math.sqrt(1 + alongSlope*alongSlope) * dt;
  const speedLimit = kart.boosting ? KART.maxBoostSpeed : KART.maxSpeed;
  if (!visiting) fwd = Math.max(-KART.maxSpeed*.4, Math.min(speedLimit, fwd));
  // sideways slope nudges the kart downhill across the track
  lat -= G * 0.5 * (gx*rx + gy*ry) * dt;

  const speedFactor = Math.min(1, Math.abs(fwd)/8) * (1 - Math.min(.45, Math.abs(fwd)/60));
  kart.steering=visiting?steerIn:kart.steering+(steerIn-kart.steering)*(1-Math.exp(-KART.steerResponse*dt));
  if(Math.abs(kart.steering)<.001)kart.steering=0;
  kart.a += kart.steering * KART.steer * speedFactor * dt * Math.sign(fwd || 1);

  const grip = hand ? KART.gripSlide : (kart.offroad ? 0.94 : KART.gripOn);
  lat *= Math.pow(grip, dt*60);
  fwd *= Math.pow(KART.drag, dt*60);
  if (hand) fwd *= Math.pow(0.985, dt*60);
  if (water) { fwd *= Math.pow(.88, dt*60); lat *= Math.pow(.88, dt*60); }

  kart.slip = Math.abs(lat);
  kart.vx = hx*fwd + rx*lat;
  kart.vy = hy*fwd + ry*lat;
  if (!visiting) {
    const speed = Math.hypot(kart.vx,kart.vy);
    if (speed > speedLimit) { kart.vx *= speedLimit/speed; kart.vy *= speedLimit/speed; }
  }
  const previous=[kart.x,kart.y];
  kart.x += kart.vx*dt;  kart.y += kart.vy*dt;
  applyBoundaryWall();

  if (!visiting) {
    updateGate(dt,previous);
    for(const w of world.water)if(inWater(kart.x,kart.y,w)){[kart.x,kart.y]=previous;kart.vx=kart.vy=0;break;}
  } else if (water) {
    kart.splashTimer = (kart.splashTimer||0) - dt;
    const speed = Math.hypot(kart.vx,kart.vy);
    if (kart.splashTimer <= 0 && speed > 1) { emitSplash(kart.x, kart.y, waterLevel(water), speed); kart.splashTimer = .07; }
  } else kart.splashTimer = 0;

  // Resolve every wall in one go. Doing them one at a time made the kart
  // ping-pong between the two buildings the alley threads past, and the
  // per-contact damping bled all its speed away until it stopped.
  let pushX = 0, pushY = 0, nX = 0, nY = 0, contacts = 0;
  for (const b of world.buildings) {
    if (b.poly.length < 3 || b.bridge) continue;
    const bb=b.bounds;if(bb&&(kart.x<bb.minX-KART.radius||kart.x>bb.maxX+KART.radius||kart.y<bb.minY-KART.radius||kart.y>bb.maxY+KART.radius))continue;
    const inHole = (b.holes || []).some(h => pointInPoly(kart.x,kart.y,h));
    const ins = pointInPoly(kart.x, kart.y, b.poly) && !inHole;
    const rings = [b.poly,...(b.holes || [])];
    const c = rings.map(r => closestOnPoly(kart.x,kart.y,r)).sort((a,b)=>a.dist-b.dist)[0];
    if (!ins && c.dist >= KART.radius) continue;
    let nx = kart.x - c.x, ny = kart.y - c.y;
    const n = Math.hypot(nx, ny) || 1; nx /= n; ny /= n;
    if (ins) { nx = -nx; ny = -ny; }
    const depth = ins ? c.dist + KART.radius : KART.radius - c.dist;
    pushX += nx*depth; pushY += ny*depth;
    nX += nx; nY += ny; contacts++;
  }
  if (contacts) {
    if(!visiting)cancelCenterBoost();
    kart.x += pushX / contacts;
    kart.y += pushY / contacts;
    const n = Math.hypot(nX, nY) || 1;
    const ux = nX/n, uy = nY/n;
    const vn = kart.vx*ux + kart.vy*uy;
    if (vn < 0) { kart.vx -= vn*ux; kart.vy -= vn*uy; }   // slide, don't stop
    kart.vx *= 0.985; kart.vy *= 0.985;
  }

  if (!visiting) constrainToCircuit();
  updateGeese(dt);
  kart.alt = heightAt(kart.x, kart.y);

  const after = onLine(kart.x, kart.y, race.running ? race.s : null);
  const s = after.s;
  let ds = s - race.s;
  if (ds >  world.length/2) ds -= world.length;
  if (ds < -world.length/2) ds += world.length;
  race.s = s;
  if (!visiting && after.dist < TRACK_W && !race.running && Math.hypot(kart.vx, kart.vy) > 0.5) {
    race.running = true; race.lastTick = performance.now(); ds = 0;
    el('gate-status').textContent = 'Follow the circuit · dodge the geese!';
  }
  if (!visiting && race.running) {
    // Keep signed progress: reversing across the start must not count as a lap.
    race.progress += ds;
    if (race.progress >= world.length) finishRace();
  }

  if (kart.slip > 3.2 && Math.hypot(kart.vx, kart.vy) > 4) addSkid();
}

const skidMat = new THREE.MeshBasicMaterial({ color: 0x241c12, transparent: true, opacity: 0.35 });
const skidGeo = new THREE.PlaneGeometry(1.6, 1.6);
function addSkid() {
  if (skids.length > 260) {
    const old = skidGroup.children.shift(); skidGroup.remove(old); skids.shift();
  }
  const m = new THREE.Mesh(skidGeo, skidMat);
  m.position.set(kart.x, heightAt(kart.x, kart.y) + 0.3, -kart.y);
  m.rotation.x = -Math.PI/2;
  skidGroup.add(m); skids.push(m);
}

addEventListener("blur", () => keys.clear());
