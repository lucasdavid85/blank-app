const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..'),THREE=require(path.join(root,'vendor/three.min.js'));
const noop=()=>{},context=new Proxy({},{get:(t,k)=>k in t?t[k]:k==='measureText'?()=>({width:20}):noop});
const elements=new Map();let nowMs=0;
function classList(){const values=new Set();return{add:v=>values.add(v),remove:v=>values.delete(v),contains:v=>values.has(v),toggle:(v,on)=>{const next=on===undefined?!values.has(v):on;next?values.add(v):values.delete(v);return next;}};}
function element(id){if(!elements.has(id))elements.set(id,{tagName:'DIV',value:id==='edit-layer'?'track':'',checked:true,width:700,height:700,style:{},classList:classList(),attributes:{},setAttribute:function(k,v){this.attributes[k]=String(v);},addEventListener:function(k,fn){this[k]=fn;},getContext:()=>context,getBoundingClientRect:()=>({left:0,top:0,width:700,height:700}),setPointerCapture:noop});return elements.get(id);}
const ctx=vm.createContext({THREE,document:{body:element('body'),getElementById:element,createElement:()=>element('temp')},navigator:{maxTouchPoints:2},addEventListener:noop,innerWidth:1200,innerHeight:900,performance:{now:()=>nowMs},advanceTime:ms=>{nowMs+=ms;},console,URL,Blob,setTimeout,Float32Array,requestAnimationFrame:noop});
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
if(!/class="btn external" target="_blank" rel="noopener noreferrer" href="https:\/\/www\.vip-studio360\.fr\//.test(html))throw Error('Safe 360 campus tour link missing');
if(!/<div id="panel" class="min">/.test(html))throw Error('Settings panel is not collapsed by default');
if(!/id="direction-pad"/.test(html))throw Error('Four-arrow mobile pad missing');
if(!/body\.touch #panel:not\(\.min\) #hidepanel\{[\s\S]*position:fixed/.test(html))throw Error('Mobile close button is not fixed');
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


vm.runInContext(`
// The supplied route uses some shared alleys; verify a full tour stays ordered.
let routeHint=0,routeProgress=0;
for(let s=.25;s<world.length;s+=.25){
 const p=pointAtS(s),near=onLine(...p,routeHint);let ds=near.s-routeHint;
 if(ds>world.length/2)ds-=world.length;if(ds<-world.length/2)ds+=world.length;
 routeProgress+=ds;routeHint=near.s;
 if(Math.abs(routeProgress-s)>2)throw Error('Full-circuit lap progress lost its route');
}
console.log('Passed: full supplied circuit lap progress');
`,ctx);

vm.runInContext(`
const savedLine=world.line, savedBuildings=world.buildings, savedWater=world.water,
  savedTerrain=DEM.h, savedGateGroup=gate.group, savedGeese=geese;
world.line=[[0,0],[0,100],[100,100],[100,0],[0,0]];measureLine();
world.buildings=[];world.water=[];DEM.h=new Float32Array(DEM.h.length).fill(42);demRange();
gate.group=null;geese=[];setMode('race');

// A side impact stays on the road and retains its full velocity magnitude.
race.running=true;race.s=50;kart.x=10;kart.y=50;kart.vx=15;kart.vy=5;kart.a=1;
const impactSpeed=Math.hypot(kart.vx,kart.vy);constrainToCircuit();
if(Math.abs(kart.x-(TRACK_W-KART.radius))>1e-8||Math.abs(kart.y-50)>1e-8)throw Error('Barrier did not keep the kart inside the track');
if(Math.abs(Math.hypot(kart.vx,kart.vy)-impactSpeed)>1e-8||Math.abs(kart.vx)>1e-8)throw Error('Barrier lost speed or failed to redirect motion');
buildRaceBarriers();
if(barrierGroup.children.length!==2||!barrierGroup.children[0].isInstancedMesh)throw Error('Race barriers missing');
for(const mesh of barrierGroup.children)if(!Array.from(mesh.instanceMatrix.array).every(Number.isFinite))throw Error('Invalid barrier geometry');

// The clock measures actual elapsed time, including a slow frame.
race.t=0;race.lastTick=performance.now();advanceTime(2000);tickRaceClock(performance.now());
if(race.t!==2)throw Error('Race timer does not use elapsed seconds');
mapOpen=true;advanceTime(5000);tickRaceClock(performance.now());mapOpen=false;
if(race.t!==2)throw Error('Race timer counted time in the map');
document.hidden=true;advanceTime(3000);tickRaceClock(performance.now());document.hidden=false;
if(race.t!==2)throw Error('Race timer counted hidden time');
advanceTime(1000);tickRaceClock(performance.now());if(race.t!==3)throw Error('Race clock did not resume');
if(finishDuration(59.999)!=='1 minute 0.00 seconds'||finishDuration(12.5)!=='12.50 seconds')throw Error('Finish time formatting failed');

// Reversing just over the start must not nearly complete a tour.
resetKart();race.running=true;race.s=.01;race.progress=0;race.t=12;
kart.x=0;kart.y=.01;kart.a=0;kart.vx=0;kart.vy=-3;step(1/120);
if(race.finished||race.progress>=world.length-1)throw Error('Reversing counted as a lap');

// Cross the finish after a complete tour and open a scoreboard exactly once.
resetKart();race.running=true;race.s=world.length-.1;race.progress=world.length-.1;race.t=72.34;
kart.x=.1;kart.y=0;kart.a=-Math.PI/2;kart.vx=-20;kart.vy=0;
keys.add('arrowup');step(1/120);
if(!race.finished||race.running||el('finish').hidden||race.results.length!==1)throw Error('Finish screen did not open');
if(el('finish-time').textContent!=='You finished it in 1 minute 12.34 seconds!')throw Error('Finish duration not shown');
if(race.best!==72.34||!el('score-rows').innerHTML.includes('Lap 1'))throw Error('Scoreboard missing best lap');
const frozen=[kart.x,kart.y,race.t];step(1);finishRace();
if(race.results.length!==1||JSON.stringify(frozen)!==JSON.stringify([kart.x,kart.y,race.t]))throw Error('Finish did not freeze driving or duplicated score');
el('race-again').onclick();
if(race.finished||!el('finish').hidden||race.best!==72.34||race.lap!==2)throw Error('Race again did not preserve scores');
race.running=true;race.t=65;finishRace();
if(race.best!==65||!el('score-rows').innerHTML.includes('Lap 2'))throw Error('Faster lap not ranked');
el('finish-visit').onclick();
if(playMode!=='visit'||!el('panel').hidden||!el('discovery').hidden||barrierGroup.visible||!el('finish').hidden)throw Error('Visit mode still contains menus or barriers');
kart.x=50;kart.y=50;kart.a=0;kart.vx=0;kart.vy=10;step(1/120);
if(onLine(kart.x,kart.y).dist<40)throw Error('Visit mode was constrained to the race');
setMode('race');if(el('panel').hidden||!barrierGroup.visible)throw Error('Race settings or rails did not return');

// Pointer cancellation, multiple fingers on one arrow, and reset clear input.
const touch=id=>({pointerId:id,preventDefault(){}});
el('t-up').pointerdown(touch(3));el('t-up').pointerdown(touch(4));el('t-up').pointerup(touch(3));
if(!keys.has('arrowup'))throw Error('Releasing one finger cleared another finger');
el('t-up').pointercancel(touch(4));if(keys.has('arrowup'))throw Error('Cancelled touch stuck');
el('t-left').pointerdown(touch(5));el('t-left').lostpointercapture(touch(5));
if(keys.has('arrowleft')||el('t-left').attributes['aria-pressed']!=='false')throw Error('Lost pointer left a held arrow');
el('t-up').pointerdown(touch(6));el('t-reset').click({preventDefault(){}});
if(keys.size||el('t-up').attributes['aria-pressed']!=='false')throw Error('Reset left a held touch');

// Geese signal before a charge, keep their direction, and can be dodged.
buildGeese();if(geese.length!==5)throw Error('Animated geese missing');
const goose=geese[0];geese=[goose];kart.x=goose.x;kart.y=goose.y+10;kart.vx=0;kart.vy=2;
updateGeese(1/120);
if(goose.state!=='warn'||!goose.ring.visible||el('goose-notice').hidden)throw Error('Goose did not warn before attacking');
const chargeDirection=[goose.dx,goose.dy];kart.x+=20;updateGeese(1);
if(goose.state!=='charge'||JSON.stringify(chargeDirection)!==JSON.stringify([goose.dx,goose.dy]))throw Error('Goose charge homed after warning');
kart.vx=10;kart.vy=0;updateGeese(.1);
if(kart.vx!==10)throw Error('Dodging goose still applied a hit');
kart.x=goose.x;kart.y=goose.y;kart.vx=10;kart.vy=0;updateGeese(1/120);
if(Math.abs(kart.vx-6.8)>1e-8||goose.state!=='return')throw Error('Goose contact did not produce a single bump');
resetGeese();
if(goose.state!=='idle'||Math.hypot(goose.x-goose.home[0],goose.y-goose.home[1])>.001||!el('goose-notice').hidden)throw Error('Geese did not reset');

// At race speed, staying on the predicted line gets a bump; a lane change avoids it.
function runGooseApproach(dodge){
 resetGeese();kart.x=goose.home[0]+5.2;kart.y=goose.home[1]-32;kart.vx=0;kart.vy=20;
 updateGeese(1/120);if(goose.state!=='warn')throw Error('Fast approach did not trigger a warning');
 if(dodge)kart.x+=2.3;
 for(let i=0;i<300;i++){kart.y+=20/120;updateGeese(1/120);if(kart.vy<19)return true;}
 return false;
}
if(!runGooseApproach(false))throw Error('A goose cannot intercept a kart at race speed');
if(runGooseApproach(true))throw Error('Steering around a charge still caused a bump');
resetGeese();
gooseGroup.traverse(m=>{if(m.geometry&&!Array.from(m.geometry.attributes.position.array).every(Number.isFinite))throw Error('Invalid goose geometry');});

world.line=savedLine;world.buildings=savedBuildings;world.water=savedWater;DEM.h=savedTerrain;gate.group=savedGateGroup;geese=savedGeese;measureLine();demRange();setMode('race');
console.log('Passed: barrier speed and geometry, elapsed clock, finish scoreboard, replay and reverse crossing');
console.log('Passed: menu-free visit, touch cancellation/reset, goose warning, dodge, contact and reset');
`,ctx);

const realRenderer=THREE.WebGLRenderer;let renderedFrames=0;
THREE.WebGLRenderer=function(){
 this.shadowMap={};
 this.setPixelRatio=noop;this.setSize=noop;this.render=()=>{renderedFrames++;};
};
context.createImageData=(w,h)=>({data:new Uint8ClampedArray(w*h*4)});
ctx.devicePixelRatio=1;
vm.runInContext(fs.readFileSync(path.join(root,'src/11-boot.js'),'utf8'),ctx,{filename:'src/11-boot.js'});
vm.runInContext(`
if(!kartObj||!gate.group||!barrierGroup||geese.length!==5)throw Error('Default game startup missed scene objects');
if(!barrierGroup.visible||el('panel').hidden)throw Error('Default race mode did not initialize');
frame(performance.now()+16);
`,ctx);
THREE.WebGLRenderer=realRenderer;
if(renderedFrames!==1)throw Error('Startup did not reach the frame renderer');
console.log('Passed: default startup and one frame with a stub renderer (no WebGL visual check)');
