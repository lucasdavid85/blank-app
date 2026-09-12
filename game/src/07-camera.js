/* 07-camera.js
   Chase camera, HUD, fixed-timestep loop.

   Part of Valrose Kart. Loaded as a plain script in the order set by
   index.html, so everything shares one global scope — no bundler needed. */

/* ═══════════════ 6. CAMERA + FRAME ═══════════════ */

let camMode = 0;   // 0 chase · 1 far chase · 2 bumper
const camPos = new THREE.Vector3(), camAim = new THREE.Vector3();
let camHeading=0;
const _n = new THREE.Vector3(), _f = new THREE.Vector3(), _up = new THREE.Vector3(0,1,0);

function placeKart() {
  const h = drivingHeightAt(kart.x, kart.y);
  const delta=.35;
  const gx=(drivingHeightAt(kart.x+delta,kart.y)-drivingHeightAt(kart.x-delta,kart.y))/(2*delta);
  const gy=(drivingHeightAt(kart.x,kart.y+delta)-drivingHeightAt(kart.x,kart.y-delta))/(2*delta);
  _n.set(-gx, 1, gy).normalize();                     // terrain normal, three coords
  kartObj.position.set(kart.x, h, -kart.y);
  kartObj.up.copy(_n);
  _f.set(Math.sin(kart.a), 0, -Math.cos(kart.a));
  _f.addScaledVector(_n, -_f.dot(_n)).normalize();    // project heading onto the slope
  kartObj.lookAt(kartObj.position.clone().add(_f));
}

function keepCameraAboveTerrain(position,clearance) {
  position.y=Math.max(position.y,heightAt(position.x,-position.z)+clearance);
}
function clearCameraSightline(position) {
  const target=new THREE.Vector3(kart.x,heightAt(kart.x,kart.y)+1.3,-kart.y);
  for(let i=1;i<=12;i++){
    const t=i/13,x=position.x+(target.x-position.x)*t,z=position.z+(target.z-position.z)*t;
    const floor=heightAt(x,-z)+.35;
    position.y=Math.max(position.y,(floor-target.y*t)/(1-t));
  }
}

function cameraOffsets(speed){
  if(camMode===2)return [.6,1.9];
  if(camMode===1)return [17,8.5];
  if(playMode==='race')return [7.8+speed*.055+(kart.boosting?1:0),document.body.classList.contains('touch')?5.1:4.2];
  return [10.5,4.6];
}
function resetCameraView(){
  camHeading=kart.a;const [back,up]=cameraOffsets(0);
  const x=kart.x-Math.sin(kart.a)*back,y=kart.y-Math.cos(kart.a)*back;
  camPos.set(x,heightAt(x,y)+up,-y);
  camAim.set(kart.x+Math.sin(kart.a)*10,heightAt(kart.x,kart.y)+1.6,-kart.y-Math.cos(kart.a)*10);
}
function updateCamera(dt) {
  const speed = Math.hypot(kart.vx, kart.vy);
  const [back,up]=cameraOffsets(speed);
  const turn=Math.atan2(Math.sin(kart.a-camHeading),Math.cos(kart.a-camHeading));
  camHeading+=turn*(camMode===2?1:1-Math.exp(-8*dt));
  const behindX=kart.x-Math.sin(camHeading)*back,behindY=kart.y-Math.cos(camHeading)*back;
  const want = new THREE.Vector3(behindX,heightAt(behindX,behindY)+up,-behindY);
  const k = 1 - Math.pow(0.0016, dt);
  camPos.lerp(want, camMode === 2 ? 1 : k);
  const ahead=camMode===2?10:10+Math.min(4,speed*.12),side=camMode===2?0:(kart.steering||0)*1.8;
  const lookX=kart.x+Math.sin(kart.a)*ahead+Math.cos(kart.a)*side,lookY=kart.y+Math.cos(kart.a)*ahead-Math.sin(kart.a)*side;
  const aimHeight=Math.max(heightAt(kart.x,kart.y)+1.6,heightAt(lookX,lookY)+.6);
  camAim.lerp(new THREE.Vector3(lookX,aimHeight,-lookY),camMode === 2 ? 1 : k);
  keepCameraAboveTerrain(camPos,camMode === 2 ? .75 : 1.4);
  if(camMode !== 2)clearCameraSightline(camPos);
  camera.position.copy(camPos);
  camera.up.copy(_up);
  camera.lookAt(camAim);
  const fov = 60 + Math.min(16, speed * 0.75)+(playMode==='race'&&kart.boosting?4:0);
  if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov-camera.fov)*(1-Math.exp(-5*dt)); camera.updateProjectionMatrix(); }
  sun.target.position.set(kart.x, heightAt(kart.x, kart.y), -kart.y);
  sun.position.set(kart.x - 160, heightAt(kart.x, kart.y) + 240, -kart.y + 120);
}

const el = id => document.getElementById(id);
const fmt = t => { const cs = Math.max(0, Math.round(t*100)), m = Math.floor(cs/6000), s = (cs%6000)/100;
  return m + ":" + (s < 10 ? "0" : "") + s.toFixed(2); };

function hud() {
  el("clock").textContent = fmt(race.t);
  el("best").textContent = "best · " + (race.best === null ? "—" : fmt(race.best));
  el("lap").textContent = "lap " + race.lap + (kart.offroad ? " · off track" : "");
  el("kmh").innerHTML = Math.round(Math.hypot(kart.vx, kart.vy)*3.6) + "<span>km/h</span>";
  document.body?.classList.toggle('boosting', Boolean(kart.boosting));
  el('boost-status').hidden = playMode !== 'race';
  updateRaceMeters();
  const pct = kart.grade*100;
  el("grade").textContent = (pct >= 0 ? "+" : "") + pct.toFixed(1) + " % grade";
  el("grade").style.color = pct > 3 ? "#e2917f" : pct < -3 ? "#8fd18a" : "";
  el("alt").textContent = kart.alt.toFixed(0) + " m";
}

let last=performance.now(),acc=0,lastHUD=0,lastMini=0,lastDiscovery=0,fpsStart=0,fpsFrames=0;
const DT=1/120,MAX_STEPS=8;
function frame(now){
 requestAnimationFrame(frame);
 updateRacePresentation(now);tickRaceClock(now);
 if(document.hidden){last=now;acc=0;return;}
 const dt=Math.min(MAX_STEPS*DT,Math.max(0,(now-last)/1000));last=now;acc+=dt;
 let steps=0;while(acc>=DT&&steps<MAX_STEPS){step(DT);acc-=DT;steps++;}if(steps===MAX_STEPS)acc=0;
 placeKart();updateCamera(dt);updateRacingVisuals(mapOpen?0:dt,now);renderer.render(scene,camera);
 if(resultCapturePending)captureResultPicture();
 if(now-lastHUD>=100){hud();updateLabels();lastHUD=now;}
 if(now-lastMini>=1000/15){drawMini();lastMini=now;}
 if(now-lastDiscovery>=250){updateDiscovery();lastDiscovery=now;}
 fpsFrames++;if(now-fpsStart>=1000){el('fps').textContent=Math.round(fpsFrames*1000/(now-fpsStart))+' FPS · local rendering';fpsFrames=0;fpsStart=now;}
}
