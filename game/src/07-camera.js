/* 07-camera.js
   Chase camera, HUD, fixed-timestep loop.

   Part of Valrose Kart. Loaded as a plain script in the order set by
   index.html, so everything shares one global scope — no bundler needed. */

/* ═══════════════ 6. CAMERA + FRAME ═══════════════ */

let camMode = 0;   // 0 chase · 1 far chase · 2 bumper
const camPos = new THREE.Vector3(), camAim = new THREE.Vector3();
const _n = new THREE.Vector3(), _f = new THREE.Vector3(), _up = new THREE.Vector3(0,1,0);

function placeKart() {
  const h = heightAt(kart.x, kart.y);
  const [gx, gy] = gradientAt(kart.x, kart.y);
  _n.set(-gx, 1, gy).normalize();                     // terrain normal, three coords
  kartObj.position.set(kart.x, h, -kart.y);
  kartObj.up.copy(_n);
  _f.set(Math.sin(kart.a), 0, -Math.cos(kart.a));
  _f.addScaledVector(_n, -_f.dot(_n)).normalize();    // project heading onto the slope
  kartObj.lookAt(kartObj.position.clone().add(_f));
}

function updateCamera(dt) {
  const speed = Math.hypot(kart.vx, kart.vy);
  const back  = camMode === 1 ? 17 : camMode === 2 ? 0.6 : 10.5;
  const up    = camMode === 1 ? 8.5 : camMode === 2 ? 1.9 : 4.6;
  const want = new THREE.Vector3(
    kart.x - Math.sin(kart.a)*back,
    heightAt(kart.x - Math.sin(kart.a)*back, kart.y - Math.cos(kart.a)*back) + up,
    -(kart.y - Math.cos(kart.a)*back));
  const k = 1 - Math.pow(0.0016, dt);
  camPos.lerp(want, camMode === 2 ? 1 : k);
  camera.position.copy(camPos);
  camAim.lerp(new THREE.Vector3(
    kart.x + Math.sin(kart.a)*14, heightAt(kart.x, kart.y) + 2.4,
    -(kart.y + Math.cos(kart.a)*14)), camMode === 2 ? 1 : k);
  camera.up.copy(_up);
  camera.lookAt(camAim);
  const fov = 60 + Math.min(16, speed * 0.75);
  if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix(); }
  sun.target.position.set(kart.x, heightAt(kart.x, kart.y), -kart.y);
  sun.position.set(kart.x - 160, heightAt(kart.x, kart.y) + 240, -kart.y + 120);
}

const el = id => document.getElementById(id);
const fmt = t => { const m = Math.floor(t/60), s = t - m*60;
  return m + ":" + (s < 10 ? "0" : "") + s.toFixed(2); };

function hud() {
  el("clock").textContent = fmt(race.t);
  el("best").textContent = "best · " + (race.best === null ? "—" : fmt(race.best));
  el("lap").textContent = "lap " + race.lap + (kart.offroad ? " · off track" : "");
  el("kmh").innerHTML = Math.round(Math.hypot(kart.vx, kart.vy)*3.6) + "<span>km/h</span>";
  const pct = kart.grade*100;
  el("grade").textContent = (pct >= 0 ? "+" : "") + pct.toFixed(1) + " % grade";
  el("grade").style.color = pct > 3 ? "#e2917f" : pct < -3 ? "#8fd18a" : "";
  el("alt").textContent = kart.alt.toFixed(0) + " m";
}

let last=performance.now(),acc=0,lastHUD=0,lastMini=0,lastDiscovery=0,fpsStart=0,fpsFrames=0;
const DT=1/120,MAX_STEPS=8;
function frame(now){
 requestAnimationFrame(frame);
 if(document.hidden){last=now;acc=0;return;}
 const dt=Math.min(MAX_STEPS*DT,Math.max(0,(now-last)/1000));last=now;acc+=dt;
 let steps=0;while(acc>=DT&&steps<MAX_STEPS){step(DT);acc-=DT;steps++;}if(steps===MAX_STEPS)acc=0;
 placeKart();updateCamera(dt);renderer.render(scene,camera);
 if(now-lastHUD>=100){hud();updateLabels();lastHUD=now;}
 if(now-lastMini>=1000/15){drawMini();lastMini=now;}
 if(now-lastDiscovery>=250){updateDiscovery();lastDiscovery=now;}
 fpsFrames++;if(now-fpsStart>=1000){el('fps').textContent=Math.round(fpsFrames*1000/(now-fpsStart))+' FPS · local rendering';fpsFrames=0;fpsStart=now;}
}
