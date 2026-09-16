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
  const wasTouching=kart.railContact;kart.railContact=false;
  if (world.line.length < 3) return;
  const c = circuitContact(kart.x, kart.y), limit = TRACK_W - KART.radius;
  if (c.dist <= limit) return;
  kart.railContact=true;
  const nx = (kart.x-c.x)/c.dist, ny = (kart.y-c.y)/c.dist;
  kart.x = c.x + nx*limit; kart.y = c.y + ny*limit;
  // A rail blocks outward motion. Steering and heading remain entirely manual.
  const outward = kart.vx*nx+kart.vy*ny;
  if (outward > 0) { kart.vx -= outward*nx; kart.vy -= outward*ny; }
  if(outward>1){
    cancelCenterBoost();
    if(!wasTouching){race.railHits++;emitRailSparks(kart.x,kart.y,nx,ny);}
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
  const rails=new THREE.InstancedMesh(new THREE.BoxGeometry(.12,.14,1),
    new THREE.MeshLambertMaterial({color:0xc8d2c6}),sections.length);
  const posts=new THREE.InstancedMesh(new THREE.BoxGeometry(.08,.5,.08),
    new THREE.MeshLambertMaterial({color:0x52665c}),sections.length);
  const dummy=new THREE.Object3D();
  sections.forEach((p,i)=>{
    dummy.position.set(p.x,raceHeightAt(p.x,p.y)+.36,-p.y);
    dummy.rotation.y=p.a;dummy.scale.set(1,1,p.length);dummy.updateMatrix();
    rails.setMatrixAt(i,dummy.matrix);
    dummy.position.y=raceHeightAt(p.x,p.y)+.17;dummy.scale.set(1,1,1);
    dummy.updateMatrix();posts.setMatrixAt(i,dummy.matrix);
  });
  rails.castShadow=true;rails.receiveShadow=true;barrierGroup.add(rails,posts);
}

function alignedWithCircuit(hx,hy,s) {
  const a=pointAtS(s-.5),b=pointAtS(s+.5),dx=b[0]-a[0],dy=b[1]-a[1];
  return (hx*dx+hy*dy)/(Math.hypot(dx,dy)||1)>.7;
}
function buildBoostLine(samples) {
  const group=new THREE.Group();group.name='center-boost';
  for(const [width,color,opacity,lift] of [[KART.boostHalfWidth,0xa2ec78,.18,.018],[.1,0xc3fa91,1,.035]]){
    const positions=[],indices=[],last=samples.length-1;
    samples.forEach(([x,y],i)=>{
      const k=i===last?0:i,a=samples[(k-1+last)%last],b=samples[(k+1)%last];
      const dx=b[0]-a[0],dy=b[1]-a[1],n=Math.hypot(dx,dy)||1;
      for(const side of [-1,1]){
        const px=x+dy/n*width*side,py=y-dx/n*width*side;
        positions.push(px,raceHeightAt(px,py)+lift,-py);
      }
      if(i<last){const j=i*2;indices.push(j,j+2,j+1,j+1,j+2,j+3);}
    });
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);
    fitSurfaceAbove(geometry,raceSurface,lift);
    group.add(new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,opacity,transparent:opacity<1,depthWrite:opacity===1,side:THREE.DoubleSide})));
  }
  const positions=[];
  for(let s=0;s<world.length;s+=8){
    const p=pointAtS(s),a=pointAtS(s-.5),b=pointAtS(s+.5),dx=b[0]-a[0],dy=b[1]-a[1],n=Math.hypot(dx,dy)||1;
    for(const side of [-1,1])for(const [forward,right] of [[.55,0],[-.35,side*.5],[-.18,side*.5]]){
      const x=p[0]+dx/n*forward+dy/n*right,y=p[1]+dy/n*forward-dx/n*right;
      positions.push(x,raceHeightAt(x,y)+.05,-y);
    }
  }
  const arrows=new THREE.BufferGeometry();arrows.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  fitSurfaceAbove(arrows,raceSurface,.05);
  group.add(new THREE.Mesh(arrows,new THREE.MeshBasicMaterial({color:0xd2f9b6,side:THREE.DoubleSide})));
  return group;
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
  clearResultPicture();
  const wasOpen=!el('finish').hidden;
  el('finish').hidden=true;document.body?.classList.remove('race-finished');
  if(wasOpen)el('gl').focus?.({preventScroll:true});
}
function finishRace() {
  if(playMode!=='race'||race.finished)return;
  tickRaceClock(performance.now());
  race.finished=true;race.running=false;race.lastTick=null;
  const result={lap:race.lap,time:race.t,name:driverName(),boosts:race.boosts,railHits:race.railHits};race.currentResult=result;race.results.push(result);
  const record=race.best===null||race.t<race.best;
  if(record)race.best=race.t;
  clearTouchControls();keys.clear();kart.vx=kart.vy=0;kart.boosting=false;
  el('finish-time').textContent='You finished it in '+finishDuration(race.t)+'!';
  el('finish-best').textContent=(record?'New best time! · ':'Best time · ')+fmt(race.best);
  el('finish-details').textContent=result.boosts+' boost'+(result.boosts===1?'':'s')+' · '+result.railHits+' rail contact'+(result.railHits===1?'':'s');
  raceStart.goUntil=0;el('race-countdown').hidden=true;
  renderScores();
  currentPodiumEntry=recordPodiumResult(result);renderPodium();
  queueResultPicture();
  el('finish').hidden=false;document.body?.classList.add('race-finished');
  el('race-again').focus?.();hud();
}
el('race-again').onclick=()=>resetKart();
el('finish-visit').onclick=()=>setMode('visit');
