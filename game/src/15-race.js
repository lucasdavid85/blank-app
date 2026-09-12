/* Circuit guardrails, a real elapsed-time clock, and the finish scoreboard. */
let barrierGroup = null;

function circuitContact(x, y) {
  const near = onLine(x, y, race.running ? race.s : null);
  const center = world.line.length > 1 ? pointAtS(near.s) : [x, y];
  const a = pointAtS(near.s - .5), b = pointAtS(near.s + .5);
  let tx = b[0] - a[0], ty = b[1] - a[1], n = Math.hypot(tx, ty) || 1;
  let result = {dist: near.dist, x: center[0], y: center[1], tx: tx/n, ty: ty/n};
  // The entrance approach is also protected, until the kart reaches the loop.
  if (!race.running && gate.group && world.line.length > 1) {
    const a = gateSpawn(), b = world.line[0], dx = b[0]-a[0], dy = b[1]-a[1];
    const l2 = dx*dx+dy*dy || 1, t = Math.max(0, Math.min(1, ((x-a[0])*dx+(y-a[1])*dy)/l2));
    const cx = a[0]+t*dx, cy = a[1]+t*dy, dist = Math.hypot(x-cx,y-cy);
    if (dist < result.dist) result = {dist, x:cx, y:cy, tx:dx/Math.sqrt(l2), ty:dy/Math.sqrt(l2)};
  }
  return result;
}

function constrainToCircuit() {
  if (world.line.length < 3) return;
  const c = circuitContact(kart.x, kart.y), limit = TRACK_W - KART.radius;
  if (c.dist <= limit) return;
  const nx = (kart.x-c.x)/c.dist, ny = (kart.y-c.y)/c.dist;
  kart.x = c.x + nx*limit; kart.y = c.y + ny*limit;
  // Redirect outward motion along the rail while retaining its speed.
  if (kart.vx*nx+kart.vy*ny > 0) {
    const speed = Math.hypot(kart.vx,kart.vy);
    const direction = Math.sign(kart.vx*c.tx+kart.vy*c.ty) ||
      Math.sign(Math.sin(kart.a)*c.tx+Math.cos(kart.a)*c.ty) || 1;
    kart.vx = c.tx*speed*direction; kart.vy = c.ty*speed*direction;
    kart.a = Math.atan2(c.tx*direction,c.ty*direction);
  }
  kart.offroad = false;
}

function buildRaceBarriers() {
  clearGroup(barrierGroup);
  barrierGroup = new THREE.Group(); scene.add(barrierGroup);
  barrierGroup.visible = playMode === 'race';
  if (world.line.length < 3) return;
  const sections = [], spacing = 2.5, offset = TRACK_W + .15;
  for (let s=0; s<world.length; s+=spacing) {
    const p=pointAtS(s), a=pointAtS(s-.5), b=pointAtS(s+.5);
    const dx=b[0]-a[0], dy=b[1]-a[1], n=Math.hypot(dx,dy)||1;
    for (const side of [-1,1]) {
      const x=p[0]+dy/n*offset*side, y=p[1]-dx/n*offset*side;
      // Omit internal rails where campus paths cross or share a racing surface.
      if (onLine(x,y).dist < TRACK_W-.1) continue;
      if (gate.group) {
        const launch=closestSegment([gateSpawn(),world.line[0]],[x,y]);
        if (launch.d < TRACK_W-.1) continue;
      }
      sections.push({x,y,a:Math.atan2(dx,-dy),length:spacing+.15});
    }
  }
  if (gate.group) {
    const a=gateSpawn(), b=world.line[0], dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
    for(let s=0;s<length;s+=spacing)for(const side of [-1,1]){
      const x=a[0]+dx*s/length+dy/length*offset*side,y=a[1]+dy*s/length-dx/length*offset*side;
      if(onLine(x,y).dist<TRACK_W-.1)continue;
      sections.push({x,y,a:Math.atan2(dx,-dy),length:Math.min(spacing+.15,length-s)});
    }
  }
  if(!sections.length)return;
  const rails=new THREE.InstancedMesh(new THREE.BoxGeometry(.3,.85,1),
    new THREE.MeshLambertMaterial({color:0xffffff}),sections.length);
  const caps=new THREE.InstancedMesh(new THREE.BoxGeometry(.4,.12,1),
    new THREE.MeshLambertMaterial({color:0xe7e8de}),sections.length);
  const dummy=new THREE.Object3D();
  sections.forEach((p,i)=>{
    dummy.position.set(p.x,heightAt(p.x,p.y)+.55,-p.y);
    dummy.rotation.y=p.a;dummy.scale.set(1,1,p.length);dummy.updateMatrix();
    rails.setMatrixAt(i,dummy.matrix);rails.setColorAt(i,new THREE.Color(Math.floor(i/2)%2?0xf4f1e7:0xca594b));
    dummy.position.y+=.48;dummy.updateMatrix();caps.setMatrixAt(i,dummy.matrix);
  });
  rails.castShadow=true;rails.receiveShadow=true;barrierGroup.add(rails,caps);
}

function tickRaceClock(now) {
  if (race.running && !race.finished && !mapOpen && !document.hidden && race.lastTick !== null)
    race.t += Math.max(0,now-race.lastTick)/1000;
  race.lastTick = race.running && !race.finished ? now : null;
}
document.addEventListener?.('visibilitychange',()=>{race.lastTick=null;});

function finishDuration(t) {
  const centiseconds = Math.round(t*100), minutes = Math.floor(centiseconds/6000);
  const seconds = ((centiseconds%6000)/100).toFixed(2);
  return minutes ? minutes+' '+(minutes===1?'minute':'minutes')+' '+seconds+' seconds' : seconds+' seconds';
}
function closeFinish() {
  const wasOpen=!el('finish').hidden;
  el('finish').hidden=true;document.body?.classList.remove('race-finished');
  if(wasOpen)el('gl').focus?.({preventScroll:true});
}
function finishRace() {
  if(playMode!=='race'||race.finished)return;
  tickRaceClock(performance.now());
  race.finished=true;race.running=false;race.lastTick=null;
  const result={lap:race.lap,time:race.t};race.results.push(result);
  const record=race.best===null||race.t<race.best;
  if(record)race.best=race.t;
  clearTouchControls();keys.clear();kart.vx=kart.vy=0;
  el('finish-time').textContent='You finished it in '+finishDuration(race.t)+'!';
  el('finish-best').textContent=(record?'New best time! · ':'Best time · ')+fmt(race.best);
  const bestLaps=race.results.slice().sort((a,b)=>a.time-b.time).slice(0,5);
  el('score-rows').innerHTML=bestLaps.map((r,i)=>'<tr'+(r===result?' class="current"':'')+'><td>'+(i+1)+'</td><td>Lap '+r.lap+'</td><td>'+fmt(r.time)+'</td></tr>').join('');
  el('finish').hidden=false;document.body?.classList.add('race-finished');
  el('race-again').focus?.();hud();
}
el('race-again').onclick=()=>resetKart();
el('finish-visit').onclick=()=>setMode('visit');
