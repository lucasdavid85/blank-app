let landmarkGroup=null, labelGroup=null, labelsVisible=true;
const gate={broken:false,pieces:[],position:[0,0],forward:[1,0],halfWidth:3.6};
function clearGroup(group){if(!group)return;group.traverse(m=>{m.geometry?.dispose();const mats=Array.isArray(m.material)?m.material:[m.material];for(const mat of mats){mat?.map?.dispose();mat?.dispose();}});scene.remove(group);}
function box(parent,w,h,d,x,y,z,color){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color}));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function labelTexture(text){
 const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d');
 g.fillStyle='#182c35';g.fillRect(0,0,c.width,c.height);g.strokeStyle='#e1c889';g.lineWidth=4;g.strokeRect(3,3,506,122);
 g.fillStyle='#fff7df';g.textAlign='center';g.textBaseline='middle';g.font='600 24px Segoe UI';
 const words=text.split(/\s+/),lines=[];let line='';for(const word of words){const candidate=line?line+' '+word:word;if(g.measureText(candidate).width>465&&line){lines.push(line);line=word;}else line=candidate;}if(line)lines.push(line);
 const shown=lines.slice(0,3);shown.forEach((t,i)=>g.fillText(t,256,64+(i-(shown.length-1)/2)*31,470));
 const texture=new THREE.CanvasTexture(c);texture.minFilter=THREE.LinearFilter;return texture;
}
const ENGLISH_PLACE_NAMES=new Map([
 ['Amphi Chimie','Chemistry Lecture Hall'],['Amphi Informatique','Computer Science Lecture Hall'],
 ['Amphi Physique','Physics Lecture Hall'],['Bibliothèque universitaire','University Library'],
 ['Bâtiment T','Building T'],['Centre sportif','Sports Center'],['Entrée Principale','Main Entrance'],
 ['Grand Château et Théâtre','Grand Château and Theater'],['IBV · Centre de Biochimie','IBV · Biochemistry Center'],
 ['ICN · Chimie Recherche','ICN · Chemistry Research'],['Laboratoire J. A. Dieudonné','J. A. Dieudonné Laboratory'],
 ['Laboratoire Lagrange · Hippolyte Fizeau','Lagrange Laboratory · Hippolyte Fizeau'],
 ['Lac du parc','Park Lake'],['Mathématiques · Amphi Henri Poincaré','Mathematics · Henri Poincaré Lecture Hall'],
 ['Petit Château · Scolarité','Petit Château · Student Services'],['Resto U Montebello','Montebello University Restaurant'],
 ['Résidence Universitaire Alvéole','Alvéole University Residence'],
 ['Résidence universitaire Montebello','Montebello University Residence'],
 ['TP Chimie','Chemistry Teaching Labs'],['TP Physique et Électronique','Physics and Electronics Teaching Labs']
]);
function englishPlaceName(name){
 const fountain=/^Fontaine (\d+)$/i.exec(name||'');
 return fountain?'Fountain '+fountain[1]:(ENGLISH_PLACE_NAMES.get(name)||name);
}
function displayName(b){return (b.properties.campusRefs?.length?b.properties.campusRefs.join(' / ')+' · ':'')+(englishPlaceName(b.name)||'Building '+(b.properties.localId||String(world.buildings.indexOf(b)+1)));}
function buildLabels(){
 clearGroup(labelGroup);labelGroup=new THREE.Group();scene.add(labelGroup);labelGroup.visible=labelsVisible;
 for(const b of world.buildings){
  // Every building can be named, including unnamed neighbouring footprints.
  const p=b.poly;if(p.length<4)continue;
  const edge=p.slice(1).map((q,i)=>({a:p[i],b:q,length:Math.hypot(q[0]-p[i][0],q[1]-p[i][1])})).sort((a,b)=>b.length-a.length)[0];
  if(edge.length<2)continue;
  const dx=(edge.b[0]-edge.a[0])/edge.length,dy=(edge.b[1]-edge.a[1])/edge.length;
  let nx=dy,ny=-dx;const x=(edge.a[0]+edge.b[0])/2,y=(edge.a[1]+edge.b[1])/2;
  if(pointInPoly(x+nx*.2,y+ny*.2,p)){nx=-nx;ny=-ny;}
  const width=Math.min(22,edge.length*.88),height=width/4;
  const texture=labelTexture(displayName(b));
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
  sign.position.set(x+nx*.16,Math.min(...p.map(q=>heightAt(...q)))+Math.min(b.height*.7,7),-y-ny*.16);sign.rotation.y=Math.atan2(nx,-ny);sign.userData.building=b;labelGroup.add(sign);
  if(b.name){const marker=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:true,transparent:true}));marker.position.set(x,heightAt(x,y)+b.height+4,-y);marker.scale.set(22,5.5,1);marker.userData.overhead=true;labelGroup.add(marker);}
 }
}
function updateLabels(){if(!labelGroup)return;for(const m of labelGroup.children)if(m.userData.overhead){m.visible=labelsVisible&&m.position.distanceTo(camera.position)<150;}}
function toggleLabels(){labelsVisible=!labelsVisible;if(labelGroup)labelGroup.visible=labelsVisible;el('toggle-labels').textContent=labelsVisible?'Hide building names':'Show building names';}
function buildGate(){
 const q=toLocal(...CAMPUS_REFERENCE.entrance),target=world.line[0]||[q[0]+20,q[1]],length=Math.hypot(target[0]-q[0],target[1]-q[1])||1;
 gate.position=q;gate.forward=[(target[0]-q[0])/length,(target[1]-q[1])/length];gate.pieces=[];gate.broken=false;
 const group=new THREE.Group();group.position.set(q[0],heightAt(...q),-q[1]);group.rotation.y=Math.atan2(gate.forward[0],-gate.forward[1]);landmarkGroup.add(group);gate.group=group;
 for(const x of [-4.2,4.2]){box(group,1.1,3.8,1.1,x,1.9,0,0xc9bea4);box(group,1.45,.3,1.45,x,3.95,0,0xe5d7b5);}
 for(const side of [-1,1]){const leaf=new THREE.Group();leaf.position.x=side*1.8;group.add(leaf);for(let j=0;j<9;j++)box(leaf,.08,2.8,.10,-1.6+j*.4,1.55,0,0x273d3b);for(const y of [.45,1.8,2.85])box(leaf,3.5,.1,.14,0,y,0,0x304847);gate.pieces.push({mesh:leaf,home:leaf.position.clone(),velocity:new THREE.Vector3()});}
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(6,1.5),new THREE.MeshBasicMaterial({map:labelTexture('UNIVERSITÉ · VALROSE'),side:THREE.FrontSide}));sign.position.set(0,4.7,-.06);sign.rotation.y=Math.PI;
 sign.userData.gateSign='start';group.add(sign);gate.sign=sign;
 const backSign=sign.clone();backSign.position.z=.06;backSign.rotation.set(0,0,0);backSign.userData.gateSign='campus';group.add(backSign);
}
function resetGate(){gate.broken=false;for(const p of gate.pieces){p.mesh.position.copy(p.home);p.mesh.rotation.set(0,0,0);p.velocity.set(0,0,0);}if(el('gate-status'))el('gate-status').textContent='Accelerate through the entrance gate';}
function gateSpawn(){return[gate.position[0]-gate.forward[0]*10,gate.position[1]-gate.forward[1]*10];}
function updateGate(dt,previous){
 if(gate.broken){for(let i=0;i<gate.pieces.length;i++){const p=gate.pieces[i];p.velocity.y-=9.81*dt;p.mesh.position.addScaledVector(p.velocity,dt);p.mesh.rotation.x+=p.velocity.length()*.03*dt;p.mesh.rotation.z+=(i?1:-1)*dt;if(p.mesh.position.y<.05){p.mesh.position.y=.05;p.velocity.multiplyScalar(Math.exp(-5*dt));}}return;}
 const q=gate.position,f=gate.forward,side=(kart.x-q[0])*f[1]-(kart.y-q[1])*f[0],along=(kart.x-q[0])*f[0]+(kart.y-q[1])*f[1],before=(previous[0]-q[0])*f[0]+(previous[1]-q[1])*f[1];
 if(Math.abs(side)>gate.halfWidth+KART.radius||!(Math.abs(along)<KART.radius||along*before<0))return;
 const speed=Math.hypot(kart.vx,kart.vy);
 if(speed>=3){gate.broken=true;gate.pieces.forEach((p,i)=>p.velocity.set(i?2.5:-2.5,3,Math.min(10,speed*.6)));
  // Restore the original capped launch speed when the entrance gate breaks.
  const boost=KART.launchSpeed,n=speed||1;kart.vx=kart.vx/n*boost;kart.vy=kart.vy/n*boost;
  el('gate-status').textContent='Gate broken · explore the campus';}
 else{const sign=before<=0?-1:1;kart.x+=f[0]*(sign*(KART.radius+.06)-along);kart.y+=f[1]*(sign*(KART.radius+.06)-along);kart.vx=kart.vy=0;}
}
function buildLandmarks(){
 clearGroup(landmarkGroup);landmarkGroup=new THREE.Group();scene.add(landmarkGroup);buildGate();
 const lake=world.water.find(w=>w.properties.waterKind==='lake');
 if(lake?.holes?.length){const island=lake.holes[0],center=island.slice(0,-1).reduce((s,q)=>[s[0]+q[0]/(island.length-1),s[1]+q[1]/(island.length-1)],[0,0]),level=Math.max(waterLevel(lake)+.3,heightAt(...center)),group=new THREE.Group();group.position.set(center[0],level,-center[1]);landmarkGroup.add(group);
 for(const x of [-.65,.65])for(const z of [-.65,.65])box(group,.12,1.4,.12,x,.9,z,0x82624b);const shelter=new THREE.Mesh(new THREE.ConeGeometry(1.45,.95,4),new THREE.MeshLambertMaterial({color:0x766454}));shelter.position.y=1.95;shelter.rotation.y=Math.PI/4;group.add(shelter);
 }

 for(const water of world.water){if(water.properties.waterKind!=='fountain'||!world.ground.some(g=>pointInPoly(...water[0],g)))continue;const q=water[0],c=water.slice(0,-1).reduce((s,p)=>[s[0]+p[0]/(water.length-1),s[1]+p[1]/(water.length-1)],[0,0]);const jet=new THREE.Mesh(new THREE.ConeGeometry(.12,1.8,8),new THREE.MeshPhongMaterial({color:0xc0e1db,transparent:true,opacity:.65}));jet.position.set(c[0],waterLevel(water)+1,-c[1]);landmarkGroup.add(jet);}
 buildLabels();
}
function polygonArea(p){return Math.abs(p.reduce((s,q,i)=>{const a=p[(i+1)%p.length];return s+q[0]*a[1]-a[0]*q[1];},0))/2;}

el('gl').addEventListener('dblclick',e=>{
 if(mapOpen)return;const r=el('gl').getBoundingClientRect(),mouse=new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),ray=new THREE.Raycaster();ray.setFromCamera(mouse,camera);
 const hit=ray.intersectObjects([...buildingGroup.children,...labelGroup.children]).find(h=>h.object.userData.building);
 if(!hit)return;const i=world.buildings.indexOf(hit.object.userData.building);toggleMap();focusFeature('building',i);
});
