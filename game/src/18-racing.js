/* Valrose's race presentation and center-line boost.
   Original code inspired by the countdown and boost rhythm at race.brayo.co. */
const raceStart={phase:'ready',remaining:3,lastTick:null,goUntil:0};
function raceWaitingForStart(){
  return playMode==='race'&&!race.running&&!race.finished&&raceStart.phase!=='driving';
}
function prepareRaceStart(){
  raceStart.phase=playMode==='race'?'ready':'driving';
  raceStart.remaining=3;raceStart.lastTick=null;raceStart.goUntil=0;
  el('race-intro').hidden=playMode!=='race';el('race-countdown').hidden=true;
  document.body.classList.toggle('race-ready',playMode==='race');
  el('intro-distance').textContent=(world.length/1000).toFixed(2)+' km · one campus lap';
  el('finish-details').textContent='';
  updateRaceMeters();
}
function startRaceCountdown(){
  if(playMode!=='race'||race.finished||race.running||raceStart.phase!=='ready')return;
  raceStart.phase='countdown';raceStart.remaining=3;raceStart.lastTick=performance.now();
  el('race-intro').hidden=true;document.body.classList.remove('race-ready');
  el('race-countdown').hidden=false;el('race-countdown').textContent='3';
  el('gl').focus?.({preventScroll:true});
}
function updateRacePresentation(now){
  if(playMode!=='race')return;
  if(raceStart.phase==='countdown'){
    const elapsed=raceStart.lastTick===null?0:Math.max(0,now-raceStart.lastTick)/1000;
    raceStart.lastTick=now;
    if(!document.hidden&&!mapOpen)raceStart.remaining=Math.max(0,raceStart.remaining-elapsed);
    const label=raceStart.remaining>0?String(Math.ceil(raceStart.remaining)):'GO!';
    if(el('race-countdown').textContent!==label)el('race-countdown').textContent=label;
    if(raceStart.remaining===0){
      raceStart.phase='driving';raceStart.goUntil=now+900;raceStart.lastTick=null;
    }
  }else if(raceStart.phase==='driving'&&now>=raceStart.goUntil)el('race-countdown').hidden=true;
}
document.addEventListener?.('visibilitychange',()=>{raceStart.lastTick=null;});
el('start-race').onclick=startRaceCountdown;
el('intro-visit').onclick=()=>setMode('visit');
addEventListener('keydown',e=>{
  if(e.key==='Enter'&&!/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName||'')){
    if(raceWaitingForStart()){e.preventDefault();startRaceCountdown();}
  }
});

function cancelCenterBoost(){
  kart.boostCharge=0;kart.boostTime=0;kart.boosting=false;kart.onBoostLine=false;
}
function updateCenterBoost(dt,onCenter,canAccelerate){
  if(playMode!=='race'||!race.running||race.finished){cancelCenterBoost();return;}
  kart.onBoostLine=onCenter&&canAccelerate;
  if(!canAccelerate){cancelCenterBoost();return;}
  if(kart.boostTime>0){
    kart.boostTime=Math.max(0,kart.boostTime-dt);kart.boosting=kart.boostTime>0;
    return;
  }
  kart.boostCharge=Math.max(0,Math.min(1,kart.boostCharge+
    (onCenter&&Math.hypot(kart.vx,kart.vy)>4?dt/KART.boostChargeSeconds:-dt*.65)));
  if(kart.boostCharge>=1-1e-9){
    kart.boostCharge=0;kart.boostTime=KART.boostSeconds;kart.boosting=true;race.boosts++;
  }else kart.boosting=false;
}
function updateRaceMeters(){
  const progress=race.finished?100:Math.max(0,Math.min(100,race.progress/(world.length||1)*100));
  el('lap-progress-fill').style.width=progress+'%';
  el('lap-progress').setAttribute('aria-valuenow',String(Math.round(progress)));
  el('lap-progress').setAttribute('aria-valuetext',Math.round(progress)+' percent of lap');
  el('lap-distance').textContent=(race.finished?0:Math.max(0,world.length-race.progress)/1000).toFixed(2)+' km to finish';
  const boost=kart.boosting?kart.boostTime/KART.boostSeconds:kart.boostCharge;
  const percent=Math.max(0,Math.min(100,Math.round((boost||0)*100)));
  el('boost-fill').style.width=percent+'%';
  el('boost-meter').setAttribute('aria-valuenow',String(percent));
  el('boost-meter').setAttribute('aria-label',kart.boosting?'Boost remaining':'Center-line boost charge');
  el('boost-label').textContent=kart.boosting?'BOOST ACTIVE':percent? 'CHARGING · '+percent+'%':'CENTER BOOST';
  el('boost-status').textContent=kart.boosting?'Brake to cancel · steer through the bend':kart.onBoostLine?'Hold the line to charge':'Hold the green line for '+KART.boostChargeSeconds+' seconds';
  el('boost-card').hidden=playMode!=='race';
}

/* One mesh for painted kerbs and the chequered start/finish stripe. */
function buildRaceDetails(){
  const group=new THREE.Group();group.name='race-details';
  if(world.line.length<3)return group;
  const positions=[],colors=[],indices=[];
  function paint(s,offset,length,width,color){
    const p=pointAtS(s),a=pointAtS(s-.5),b=pointAtS(s+.5);
    const dx=b[0]-a[0],dy=b[1]-a[1],n=Math.hypot(dx,dy)||1;
    const c=new THREE.Color(color),index=positions.length/3;
    for(const [forward,side] of [[-1,-1],[-1,1],[1,-1],[1,1]]){
      const x=p[0]+dx/n*forward*length/2+dy/n*(offset+side*width/2);
      const y=p[1]+dy/n*forward*length/2-dx/n*(offset+side*width/2);
      positions.push(x,raceHeightAt(x,y)+.06,-y);colors.push(c.r,c.g,c.b);
    }
    indices.push(index,index+2,index+1,index+1,index+2,index+3);
  }
  for(let s=0;s<world.length;s+=2.5){
    const p=pointAtS(s),a=pointAtS(s-.5),b=pointAtS(s+.5),dx=b[0]-a[0],dy=b[1]-a[1],n=Math.hypot(dx,dy)||1;
    for(const side of [-1,1]){
      const offset=side*(TRACK_W+.4),x=p[0]+dy/n*offset,y=p[1]-dx/n*offset;
      if(onLine(x,y).dist<TRACK_W-.1)continue;
      if(gate.group&&closestSegment([gateSpawn(),world.line[0]],[x,y]).d<TRACK_W-.1)continue;
      paint(s,offset,2.35,.45,Math.floor(s/2.5)%2?0xe4e5d8:0xb86050);
    }
  }
  for(let row=0;row<2;row++)for(let column=0;column<8;column++){
    paint(.35+row*.7,-TRACK_W+(column+.5)*TRACK_W/4,.7,TRACK_W/4,(row+column)%2?0x222c2a:0xf5f1dc);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);
  fitSurfaceAbove(geometry,raceSurface,.06);
  const mesh=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));
  mesh.receiveShadow=true;group.add(mesh);return group;
}

const railSparks=Array.from({length:32},()=>({life:0,x:0,y:0,z:0,vx:0,vy:0,vz:0}));
let railSparkMesh=null,railSparkCursor=0;
function buildRaceEffects(){
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(32*3),3));
  railSparkMesh=new THREE.Points(geometry,new THREE.PointsMaterial({color:0xffcf7d,size:.14,transparent:true,opacity:.9,depthWrite:false}));
  railSparkMesh.frustumCulled=false;railSparkMesh.visible=false;scene.add(railSparkMesh);
}
function emitRailSparks(x,y,nx,ny){
  for(let i=0;i<8;i++){
    const spark=railSparks[railSparkCursor++%railSparks.length],angle=i*2.399;
    Object.assign(spark,{life:.35+i*.018,x,y:heightAt(x,y)+.65,z:-y,
      vx:-nx*(2+i*.2)+Math.cos(angle)*1.5,vy:2+i*.3,vz:ny*(2+i*.2)+Math.sin(angle)*1.5});
  }
}
function resetRaceEffects(){for(const spark of railSparks)spark.life=0;if(railSparkMesh)railSparkMesh.visible=false;if(splashMesh)splashMesh.visible=false;for(const drop of waterSplashes)drop.life=0;}

const waterSplashes=Array.from({length:40},()=>({life:0,x:0,y:0,z:0,vx:0,vy:0,vz:0}));
let splashMesh=null,splashCursor=0;
function buildSplashEffects(){
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(waterSplashes.length*3),3));
  splashMesh=new THREE.Points(geometry,new THREE.PointsMaterial({color:0xe7f6fb,size:.16,transparent:true,opacity:.85,depthWrite:false}));
  splashMesh.frustumCulled=false;splashMesh.visible=false;scene.add(splashMesh);
}
function emitSplash(x,y,level,speed){
  const count=Math.min(9,3+Math.floor(speed*.35));
  for(let i=0;i<count;i++){
    const drop=waterSplashes[splashCursor++%waterSplashes.length],angle=Math.random()*Math.PI*2,spread=.8+Math.random()*1.8;
    Object.assign(drop,{life:.35+Math.random()*.3,x:x+Math.cos(angle)*.35,y:level+.08,z:-(y+Math.sin(angle)*.35),
      vx:Math.cos(angle)*spread,vy:1.8+Math.random()*2.2,vz:Math.sin(angle)*spread});
  }
}
function updateRacingVisuals(dt,now){
  const speed=Math.hypot(kart.vx,kart.vy);
  kart.wheelSpin=(kart.wheelSpin+speed*dt/.42)%(Math.PI*2);
  for(const wheel of kartObj.userData.wheels||[]){
    wheel.pivot.rotation.y=wheel.front?-(kart.steering||0)*.35:0;
    wheel.mesh.rotation.x=kart.wheelSpin;
  }
  for(const flame of kartObj.userData.boostFlames||[]){
    flame.visible=playMode==='race'&&kart.boosting&&!race.finished;
    flame.scale.y=.75+speed/45+Math.sin(now*.027+flame.position.x)*.12;
  }
  if(railSparkMesh){
    const attribute=railSparkMesh.geometry.attributes.position;let count=0;
    for(const spark of railSparks){
      if(spark.life<=0)continue;
      spark.life-=dt;spark.vy-=18*dt;spark.x+=spark.vx*dt;spark.y+=spark.vy*dt;spark.z+=spark.vz*dt;
      spark.y=Math.max(heightAt(spark.x,-spark.z)+.3,spark.y);
      attribute.setXYZ(count++,spark.x,spark.y,spark.z);
    }
    attribute.needsUpdate=true;railSparkMesh.geometry.setDrawRange(0,count);railSparkMesh.visible=count>0;
  }
  if(splashMesh){
    const attribute=splashMesh.geometry.attributes.position;let count=0;
    for(const drop of waterSplashes){
      if(drop.life<=0)continue;
      drop.life-=dt;drop.vy-=16*dt;drop.x+=drop.vx*dt;drop.y+=drop.vy*dt;drop.z+=drop.vz*dt;
      attribute.setXYZ(count++,drop.x,drop.y,drop.z);
    }
    attribute.needsUpdate=true;splashMesh.geometry.setDrawRange(0,count);splashMesh.visible=playMode==='visit'&&count>0;
  }
}
