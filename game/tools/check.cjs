const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..'),THREE=require(path.join(root,'vendor/three.min.js'));
const noop=()=>{},context=new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:20}):noop});
const elements=new Map();
function classList(){const values=new Set();return{add:v=>values.add(v),remove:v=>values.delete(v),contains:v=>values.has(v),toggle:(v,on)=>{const next=on===undefined?!values.has(v):on;next?values.add(v):values.delete(v);return next;}};}
function element(id){if(!elements.has(id))elements.set(id,{tagName:'DIV',value:id==='edit-layer'?'track':'',checked:true,width:700,height:700,style:{},classList:classList(),attributes:{},setAttribute:function(k,v){this.attributes[k]=String(v);},addEventListener:function(k,fn){this[k]=fn;},getContext:()=>context,getBoundingClientRect:()=>({left:0,top:0,width:700,height:700}),setPointerCapture:noop});return elements.get(id);}
const ctx=vm.createContext({THREE,document:{body:element('body'),getElementById:element,createElement:()=>element('temp')},navigator:{maxTouchPoints:2},addEventListener:noop,innerWidth:1200,innerHeight:900,performance:{now:()=>0},console,URL,Blob,setTimeout,Float32Array,requestAnimationFrame:noop});
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
if(!/class="btn external" target="_blank" rel="noopener noreferrer" href="https:\/\/www\.vip-studio360\.fr\//.test(html))throw Error('Safe 360 campus tour link missing');
if(!/<div id="panel" class="min">/.test(html))throw Error('Settings panel is not collapsed by default');
if(!/id="touch-steer"[\s\S]*id="touch-center"[\s\S]*id="touch-pedals"/.test(html))throw Error('Two-thumb mobile layout missing');
for(const m of html.matchAll(/<script src="(src\/[^"]+)"/g)){if(m[1].includes('11-boot'))continue;vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),ctx,{filename:m[1]});}
vm.runInContext(`
loadDefaultTerrain();ingest(CAMPUS);
globalThis.counts={buildings:world.buildings.length,paths:world.paths.length,water:world.water.length};
if(!document.body.classList.contains('touch')||!el('panel').classList.contains('min'))throw Error('Touch layout was not activated');
const touchEvent=id=>({pointerId:id,preventDefault(){}});el('t-up').pointerdown(touchEvent(1));el('t-right').pointerdown(touchEvent(2));if(!keys.has('arrowup')||!keys.has('arrowright'))throw Error('Simultaneous touch controls failed');el('t-up').pointerup(touchEvent(1));if(keys.has('arrowup')||!keys.has('arrowright'))throw Error('Touch control release affected another held button');el('t-right').pointerup(touchEvent(2));if(keys.size)throw Error('Touch control remained held after release');
const before=exportFeatures();ingest(before);const after=exportFeatures();
if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Export round trip changed features');
validateImport(before);
let rejected=false;try{validateImport({dem:{n:4,h:[1]},features:before});}catch(e){rejected=true;}if(!rejected)throw Error('Invalid DEM accepted');
scene=new THREE.Scene();buildingGroup=new THREE.Group();pathGroup=new THREE.Group();treeGroup=new THREE.Group();
buildTerrain();buildBuildings();buildWater();buildPaths();
for(const group of [buildingGroup,pathGroup,waterGroup])for(const mesh of group.children){const p=mesh.geometry.attributes.position;if(!p||!Array.from(p.array).every(Number.isFinite))throw Error('Nonfinite mesh');}
mapc.width=mapc.height=700;drawMap();
const q=[21.5,-36.2],sp=screen(q),back=mapPick({clientX:sp[0],clientY:sp[1]});if(Math.hypot(back[0]-q[0],back[1]-q[1])>1e-8)throw Error('Map projection failed');
el('focus-castle').onclick();if(!selection||!/Grand/.test(world.buildings[selection.i].name))throw Error('Castle focus failed');
el('feature-size').value='21';el('feature-apply').onclick();if(world.buildings[selection.i].height!==21)throw Error('Height edit failed');
el('map-undo').onclick();if(world.buildings.find(b=>/Grand/.test(b.name)).height!==20)throw Error('Undo failed');
el('focus-lake').onclick();if(selection?.kind!=='water')throw Error('Lake focus failed');
el('feature-size').value='67.5';el('feature-apply').onclick();const lake=selection.i;ingest(exportFeatures());if(world.water[lake].elevation!==67.5)throw Error('Water elevation lost');
skidGroup=new THREE.Group();camera=new THREE.PerspectiveCamera();buildLandmarks();
if(labelGroup.children.length<world.buildings.length)throw Error('Building labels missing');
landmarkGroup.traverse(m=>{if(m.geometry&&!Array.from(m.geometry.attributes.position.array).every(Number.isFinite))throw Error('Invalid landmark geometry');});
resetKart();const spawn=gateSpawn();if(Math.hypot(kart.x-spawn[0],kart.y-spawn[1])>.01)throw Error('Entrance spawn failed');
const f=gate.forward,qg=gate.position;let previous=[qg[0]-f[0]*2,qg[1]-f[1]*2];kart.x=qg[0];kart.y=qg[1];kart.vx=f[0];kart.vy=f[1];updateGate(1/120,previous);if(gate.broken)throw Error('Slow impact should stop at gate');
kart.x=qg[0]+f[0]*.1;kart.y=qg[1]+f[1]*.1;kart.vx=f[0]*10;kart.vy=f[1]*10;updateGate(1/120,previous);if(!gate.broken)throw Error('Fast impact did not break gate');
resetKart();mapOpen=false;keys.add('arrowup');for(let i=0;i<600&&!gate.broken;i++)step(1/120);keys.clear();if(!gate.broken)throw Error('Gate cannot be broken by driving from spawn');
if(Math.hypot(kart.vx,kart.vy)<KART.maxSpeed*.9)throw Error('Race launch did not reach full speed through the gate');
resetKart();if(gate.broken||gate.pieces.some(p=>p.mesh.position.distanceTo(p.home)>.001))throw Error('Gate reset failed');
focusFeature('building',0);el('feature-name').value='My laboratory';el('feature-note').value='Check the west entrance';el('feature-apply').onclick();ingest(exportFeatures());if(world.buildings[0].name!=='My laboratory'||world.buildings[0].properties.annotation!=='Check the west entrance')throw Error('Annotation did not persist');
const oldTerrain=importTerrain({n:2,h:Array(9).fill(42)},300);if(Math.abs(oldTerrain[(DEM.n/2)*(DEM.n+1)+DEM.n/2]-42)>.001)throw Error('Previous terrain pack not compatible');
const originalCircuit=CAMPUS.features.find(f=>f.properties.role==='track').geometry.coordinates;
el('restore-circuit').onclick();if(JSON.stringify(world.line.map(p=>toLonLat(...p)))!==JSON.stringify(originalCircuit))throw Error('Supplied circuit changed');
setMode('visit');if(trackMesh&&trackMesh.visible)throw Error('Racing surface visible in visit');
kart.x=380;kart.y=380;kart.a=Math.PI/2;kart.vx=100;kart.vy=0;race.t=0;race.running=true;step(1/120);if(Math.hypot(kart.vx,kart.vy)<90)throw Error('Visitor speed was capped');if(race.t!==0)throw Error('Visitor lap timer running');
const destination=placeLocation(places[0]);[kart.x,kart.y]=destination;updateDiscovery();if(!discovered.has(0))throw Error('Campus discovery did not register');
const lakeFeature=world.water.find(w=>w.properties.waterKind==='lake');if(!lakeFeature||lakeFeature.holes.length!==1)throw Error('Main lake or island missing');
if(world.water.some(w=>w.properties.leisure==='swimming_pool'))throw Error('Private pools included');
if(Math.abs(heightAt(...toLocal(7.267384,43.718247))-68.43)>.15)throw Error('Montebello elevation mismatch');
const toGeom=p=>p.map(q=>({lon:q[0],lat:q[1]})),lakeSource=CAMPUS.features.find(f=>f.properties.waterKind==='lake');const importedLake=osmToGeoJSON({elements:[{type:'relation',id:1891267,tags:{natural:'water'},members:[{role:'outer',geometry:toGeom(lakeSource.geometry.coordinates[0])},{role:'inner',geometry:toGeom(lakeSource.geometry.coordinates[1])}]}]});if(importedLake.features[0].geometry.coordinates.length!==2||importedLake.features[0].properties.waterKind!=='lake')throw Error('Live lake import loses island');
console.log('Passed: original circuit, visit speed, inactive timer, discoveries, lake island and IGN elevation');
console.log('Passed: touch controls, gate launch, reset, labels and annotations');
console.log('Passed: geometry, complete round trip, invalid DEM, map coordinates, castle edit and undo, lake edit persistence',counts);
`,ctx);
