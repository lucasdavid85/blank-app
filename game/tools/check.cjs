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
resetKart();startRaceCountdown();advanceTime(3100);updateRacePresentation(performance.now());mapOpen=false;keys.add('arrowup');for(let i=0;i<600&&!gate.broken;i++)step(1/120);keys.clear();if(!gate.broken)throw Error('Gate cannot be broken by driving from spawn');
if(Math.hypot(kart.vx,kart.vy)<KART.launchSpeed*.9)throw Error('Race launch did not reach full speed through the gate');
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
const slideEvent=(id,x,y)=>({pointerId:id,clientX:x,clientY:y,preventDefault(){},stopPropagation(){}});
clearTouchControls();keys.clear();
el('t-up').pointerdown(slideEvent(20,350,60));
el('t-up').pointermove(slideEvent(20,620,80));
if(!keys.has('arrowup')||!keys.has('arrowright')||el('t-right').attributes['aria-pressed']!=='true')throw Error('Sliding diagonally did not accelerate and steer');
el('t-up').pointermove(slideEvent(20,640,350));
if(keys.has('arrowup')||!keys.has('arrowright'))throw Error('Sliding to right left the old arrow held');
el('t-up').pointermove(slideEvent(20,350,640));
if(keys.has('arrowright')||!keys.has('arrowdown'))throw Error('Sliding to brake did not switch directions');
el('t-up').pointermove(slideEvent(20,60,600));
if(!keys.has('arrowleft')||!keys.has('arrowdown'))throw Error('Reverse steering diagonal failed');
el('t-up').pointermove(slideEvent(20,350,350));if(keys.size)throw Error('Center dead zone did not release directions');
el('t-up').pointermove(slideEvent(20,-20,350));if(keys.size)throw Error('Sliding outside the pad left a held key');
el('t-up').pointermove(slideEvent(20,350,60));if(!keys.has('arrowup'))throw Error('Sliding back into the pad did not resume');
el('t-up').pointercancel(slideEvent(20,350,60));if(keys.size)throw Error('Sliding cancellation stuck');
el('t-up').pointerdown(slideEvent(21,350,60));el('t-right').pointerdown(slideEvent(22,640,350));
el('t-up').pointermove(slideEvent(21,640,350));el('t-up').pointerup(slideEvent(21,640,350));
if(!keys.has('arrowright'))throw Error('Releasing one sliding finger released another');
el('t-right').pointerup(slideEvent(22,640,350));
el('t-up').pointerdown(slideEvent(23,350,60));clearTouchControls();
el('t-up').pointerdown(slideEvent(24,350,60));el('t-up').lostpointercapture(slideEvent(23,350,60));
if(!keys.has('arrowup'))throw Error('Old pointer capture cleared a new gesture');
el('t-up').pointerup(slideEvent(24,350,60));
el('direction-pad').pointerdown(slideEvent(25,620,80));
if(!keys.has('arrowup')||!keys.has('arrowright'))throw Error('Starting a diagonal between arrows failed');
el('direction-pad').pointerup(slideEvent(25,620,80));
if(keys.size)throw Error('Pad surface release failed');
console.log('Passed: continuous slide, diagonals, neutral center, outside/re-entry and multiple fingers');
`,ctx);

vm.runInContext(`
const savedLine=world.line, savedBuildings=world.buildings, savedWater=world.water,
  savedTerrain=DEM.h, savedGateGroup=gate.group, savedGeese=geese;
world.line=[[0,0],[0,100],[100,100],[100,0],[0,0]];measureLine();
world.buildings=[];world.water=[];DEM.h=new Float32Array(DEM.h.length).fill(42);demRange();
gate.group=null;geese=[];setMode('race');

// A rail impact blocks outward velocity without correcting the driver's heading.
race.running=true;race.s=50;kart.x=10;kart.y=50;kart.vx=15;kart.vy=5;kart.a=1;
const impactHeading=kart.a;constrainToCircuit();
if(Math.abs(kart.x-(TRACK_W-KART.radius))>1e-8||Math.abs(kart.y-50)>1e-8)throw Error('Barrier did not keep the kart inside the track');
if(kart.a!==impactHeading||Math.abs(kart.vx)>1e-8||Math.abs(kart.vy-5)>1e-8)throw Error('Barrier corrected heading or added tangential motion');
buildRaceBarriers();
if(barrierGroup.children.length!==2||!barrierGroup.children[0].isInstancedMesh)throw Error('Race barriers missing');
for(const mesh of barrierGroup.children)if(!Array.from(mesh.instanceMatrix.array).every(Number.isFinite))throw Error('Invalid barrier geometry');


// Race limits are restored while visit remains uncapped.
function testDrive(mode,x,speed,options={}){
 setMode(mode);race.running=true;race.s=50;race.progress=0;
 kart.x=x;kart.y=50;kart.a=options.heading||0;kart.vx=0;kart.vy=speed;
 if(options.boost)kart.boostTime=KART.boostSeconds;
 if(options.throttle)keys.add('arrowup');if(options.brake)keys.add('arrowdown');if(options.hand)keys.add(' ');
 step(1/120);return {speed:Math.hypot(kart.vx,kart.vy),boosting:kart.boosting,onBoostLine:kart.onBoostLine};
}
const raceFast=testDrive('race',1.6,100),visitFast=testDrive('visit',1.6,100);
if(raceFast.speed>KART.maxSpeed||raceFast.speed<19||visitFast.speed<90)throw Error('Race speed limit was not restored or visit was capped');
const cappedBoost=testDrive('race',0,100,{throttle:true,boost:true});
if(!cappedBoost.boosting||cappedBoost.speed>KART.maxBoostSpeed||cappedBoost.speed<27)throw Error('Center boost speed cap failed');
const centerDrive=testDrive('race',0,10,{throttle:true}),side=testDrive('race',1.6,10,{throttle:true});
if(!centerDrive.onBoostLine||centerDrive.boosting||side.onBoostLine||side.boosting||centerDrive.speed<=side.speed)throw Error('Center line did not give an exclusive acceleration boost');
if(testDrive('race',0,10,{throttle:true,brake:true}).boosting)throw Error('Boost applied while braking');
if(testDrive('race',0,10,{throttle:true,hand:true}).boosting)throw Error('Boost applied while handbraking');
if(testDrive('race',0,-10,{throttle:true,heading:Math.PI}).boosting)throw Error('Boost applied against the circuit direction');
if(testDrive('visit',0,10,{throttle:true}).boosting)throw Error('Visit mode received the race boost');
setMode('race');buildTrack();
if(!trackMesh.children.some(g=>g.name==='center-boost'&&g.children.length===3))throw Error('Green center line or chevrons missing');
trackMesh.traverse(m=>{if(m.geometry&&!Array.from(m.geometry.attributes.position.array).every(Number.isFinite))throw Error('Invalid center line geometry');});
const railPositions=barrierGroup.children[0].geometry.attributes.position.array;
if(Math.max(...Array.from(railPositions).filter((v,i)=>i%3===1))>.1)throw Error('Rails are still tall blocks');
console.log('Passed: restored race speed, capped center boost, uncapped visit and slim rails');

// Holding the center line earns a timed boost; isolate driving from goose attacks.
geese=[];setMode('race');race.running=true;race.s=5;kart.x=0;kart.y=5;kart.a=0;kart.vx=0;kart.vy=10;keys.add('arrowup');
for(let i=0;i<239;i++)step(1/120);
if(kart.boosting||kart.boostCharge<.95||race.boosts!==0)throw Error('Boost fired before the center hold completed');
step(1/120);
if(!kart.boosting||race.boosts!==1)throw Error('Center hold did not earn a boost');
for(let i=0;i<45;i++)step(1/120);
if(Math.hypot(kart.vx,kart.vy)<27||Math.hypot(kart.vx,kart.vy)>KART.maxBoostSpeed)throw Error('Earned boost did not reach the capped speed: '+JSON.stringify({speed:Math.hypot(kart.vx,kart.vy),boost:kart.boostTime,x:kart.x,y:kart.y,steering:kart.steering,keys:[...keys]}));
kart.x=1.6;step(1/120);
if(!kart.boosting||kart.onBoostLine)throw Error('Earned burst did not carry off the center line');
keys.add('arrowdown');step(1/120);
if(kart.boosting||kart.boostCharge||Math.hypot(kart.vx,kart.vy)>KART.maxSpeed)throw Error('Braking did not cancel the burst');
keys.clear();kart.boostTime=.01;kart.boosting=true;updateCenterBoost(.02,false,true);
if(kart.boosting||kart.boostTime)throw Error('Boost did not expire');
kart.boostCharge=.5;updateCenterBoost(.2,false,true);
if(kart.boostCharge>=.5)throw Error('Leaving the line did not lose unearned charge');
kart.vx=kart.vy=0;kart.boostCharge=0;updateCenterBoost(3,true,true);
if(kart.boosting||kart.boostCharge)throw Error('Standing still farmed a boost');
kart.vx=20;kart.vy=0;kart.boostTime=2;kart.boosting=true;kart.x=10;kart.y=50;kart.railContact=false;
const railHitsBefore=race.railHits,railHeadingBefore=kart.a;constrainToCircuit();
if(kart.boosting||race.railHits!==railHitsBefore+1||kart.a!==railHeadingBefore)throw Error('Rail impact failed to cancel boost, record contact, or preserve heading');

// Heading stays under the driver, including while the boost is active.
setMode('race');race.running=true;race.s=20;kart.x=0;kart.y=20;kart.a=.2;
kart.vx=Math.sin(.2)*10;kart.vy=Math.cos(.2)*10;kart.boostTime=2;keys.add('arrowup');
for(let i=0;i<12;i++)step(1/120);
if(kart.a!==.2)throw Error('Race or boost corrected the driver heading');
setMode('race');race.running=true;race.s=20;kart.x=0;kart.y=20;kart.a=0;kart.vx=0;kart.vy=10;
keys.add('arrowup');keys.add('arrowright');step(1/120);
if(kart.a<=0||kart.steering<=0||kart.steering>=1)throw Error('Manual steering did not respond smoothly');
keys.delete('arrowright');for(let i=0;i<120;i++)step(1/120);
const releasedHeading=kart.a;for(let i=0;i<12;i++)step(1/120);
if(kart.a!==releasedHeading)throw Error('Released steering continued to alter heading');
setMode('race');buildTrack();
if(!trackMesh.children.some(g=>g.name==='race-details'&&g.children[0].geometry.index.count>48))throw Error('Kerbs or chequered finish paint missing');
console.log('Passed: center hold, earned boost burst and expiry, brake/contact cancellation, no boost farming and smooth manual steering');

race.running=true;

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
console.log('Passed: manual heading at rails, barrier geometry, elapsed clock, finish scoreboard, replay and reverse crossing');
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



vm.runInContext(`
setMode('race');
if(el('race-intro').hidden||raceStart.phase!=='ready'||!document.body.classList.contains('race-ready'))throw Error('Race intro was not prepared');
const countdownSpawn=[kart.x,kart.y];keys.add('arrowup');step(1/120);
if(JSON.stringify(countdownSpawn)!==JSON.stringify([kart.x,kart.y])||race.running||race.t)throw Error('Kart moved or lap timer started before countdown');
el('start-race').onclick();advanceTime(900);updateRacePresentation(performance.now());
if(raceStart.phase!=='countdown'||el('race-countdown').textContent!=='3')throw Error('Countdown did not begin');
document.hidden=true;advanceTime(5000);updateRacePresentation(performance.now());document.hidden=false;
if(Math.abs(raceStart.remaining-2.1)>1e-8)throw Error('Countdown ran in a hidden tab');
mapOpen=true;advanceTime(5000);updateRacePresentation(performance.now());mapOpen=false;
if(Math.abs(raceStart.remaining-2.1)>1e-8)throw Error('Countdown ran in the map');
advanceTime(1100);updateRacePresentation(performance.now());
if(el('race-countdown').textContent!=='1')throw Error('Countdown display skipped its final second');
advanceTime(1000);updateRacePresentation(performance.now());
if(raceWaitingForStart()||el('race-countdown').textContent!=='GO!'||race.t)throw Error('GO did not release driving without timing the launch');
step(1/120);if(Math.hypot(kart.vx,kart.vy)<=0)throw Error('Throttle did not drive after GO');
advanceTime(1000);updateRacePresentation(performance.now());
if(!el('race-countdown').hidden)throw Error('GO overlay did not clear');
race.running=true;race.progress=world.length*.5;race.s=world.length*.5;
kart.boostCharge=.5;updateRaceMeters();
if(el('lap-progress-fill').style.width!=='50%'||el('boost-meter').attributes['aria-valuenow']!=='50')throw Error('Progress or boost HUD did not update');
kart.boosting=true;kart.boostTime=2;kart.steering=.5;kart.vx=0;kart.vy=20;
updateRacingVisuals(1/60,performance.now());
if(kartObj.userData.boostFlames.some(m=>!m.visible)||!kartObj.userData.wheels.some(w=>w.front&&w.pivot.rotation.y<0)||!kart.wheelSpin)throw Error('Boost or wheel animation missing');
emitRailSparks(kart.x,kart.y,1,0);updateRacingVisuals(1/60,performance.now());
if(!railSparkMesh.visible||railSparkMesh.geometry.drawRange.count!==8)throw Error('Rail sparks missing');
resetKart();
if(railSparkMesh.visible||kart.boosting||kart.boostTime||kart.boostCharge||raceStart.phase!=='ready')throw Error('Replay left stale race effects or boost');
setMode('visit');keys.add('arrowup');step(1/120);
if(!el('race-intro').hidden||!el('race-countdown').hidden||!el('boost-card').hidden||raceWaitingForStart()||Math.hypot(kart.vx,kart.vy)<=0)throw Error('Visit was blocked by the racing presentation');
setMode('race');
console.log('Passed: ready screen, countdown freeze and pause, GO, progress HUD, boost/wheel/spark visuals, replay and immediate visit');
`,ctx);

vm.runInContext(`
const terrainGeometry=terrainMesh.geometry,terrainPositions=terrainGeometry.attributes.position;
const triangleIndex=terrainGeometry.index.array;
for(let i=0;i<triangleIndex.length;i+=3){
 const a=triangleIndex[i],b=triangleIndex[i+1],c=triangleIndex[i+2];
 const upward=(terrainPositions.getZ(b)-terrainPositions.getZ(a))*(terrainPositions.getX(c)-terrainPositions.getX(a))-
  (terrainPositions.getX(b)-terrainPositions.getX(a))*(terrainPositions.getZ(c)-terrainPositions.getZ(a));
 if(upward<=0)throw Error('Terrain triangle faces downward and can disappear from above');
}
const grassMap=terrainMesh.material.map;
if(!terrainGeometry.attributes.uv||terrainGeometry.attributes.uv.count!==terrainPositions.count||
 !grassMap||grassMap.wrapS!==THREE.RepeatWrapping||grassMap.wrapT!==THREE.RepeatWrapping||
 Math.abs(grassMap.repeat.x-DEM.size/14)>1e-8)throw Error('Terrain grass texture is not mapped in world scale');
if(terrainMesh.material.side!==THREE.FrontSide)throw Error('Terrain winding fix was hidden by double-sided rendering');

gate.group.updateMatrixWorld(true);
const startSignNormal=gate.sign.getWorldDirection(new THREE.Vector3());
const entranceFacing=new THREE.Vector3(-gate.forward[0],0,gate.forward[1]);
if(startSignNormal.dot(entranceFacing)<.999||gate.sign.material.side!==THREE.FrontSide)throw Error('Entrance sign does not face the race start');
const campusSign=gate.group.children.find(m=>m.userData.gateSign==='campus');
if(!campusSign||campusSign.getWorldDirection(new THREE.Vector3()).dot(entranceFacing)>-.999)throw Error('Campus side of the gate sign is reversed');
const signOrigin=gate.sign.getWorldPosition(new THREE.Vector3()),signSpawn=gateSpawn();
if(startSignNormal.dot(new THREE.Vector3(signSpawn[0],signOrigin.y,-signSpawn[1]).sub(signOrigin))<=0)throw Error('Race spawn sees the mirrored back of the entrance sign');

const previousCameraMode=camMode;
for(const mode of [0,1,2]){
 camMode=mode;
 for(let s=0;s<world.length;s+=12){
  const p=pointAtS(s),next=pointAtS(s+2);kart.x=p[0];kart.y=p[1];kart.a=Math.atan2(next[0]-p[0],next[1]-p[1]);
  const driverHeading=kart.a;camPos.set(p[0],heightAt(...p)-3,-p[1]);camAim.set(p[0],heightAt(...p),-p[1]);
  updateCamera(1/60);
  if(camera.position.y<heightAt(camera.position.x,-camera.position.z)+(mode===2?.75:1.4)-1e-8)throw Error('Smoothed camera entered the hill');
  if(kart.a!==driverHeading||![camera.position.x,camera.position.y,camera.position.z].every(Number.isFinite))throw Error('Camera changed heading or produced invalid coordinates');
 }
}
const sampledHeightAt=heightAt;
try{
 heightAt=(x,y)=>42+12*Math.max(0,1-Math.abs(y+5)/2);
 kart.x=kart.y=0;const ridgeCamera=new THREE.Vector3(0,46.6,10.5);
 clearCameraSightline(ridgeCamera);
 if(ridgeCamera.y<=46.6)throw Error('Camera did not rise above the intervening ridge');
 for(let i=1;i<=12;i++){
  const t=i/13,z=ridgeCamera.z*(1-t),sightHeight=ridgeCamera.y*(1-t)+43.3*t;
  if(sightHeight<heightAt(0,-z)+.35-1e-8)throw Error('Terrain still blocks the sampled chase-camera sightline');
 }
}finally{heightAt=sampledHeightAt;camMode=previousCameraMode;resetKart();}
globalThis.lapBenchmark={length:world.length,baseSpeed:KART.maxSpeed,boostSpeed:KART.maxBoostSpeed,
 idealBaseSeconds:world.length/KART.maxSpeed,idealBoostSeconds:world.length/KART.maxBoostSpeed};
console.log('Passed: upward terrain faces, mapped grass, readable gate orientation, camera ground and ridge clearance');
console.log('Ideal full-centerline timing (constant speed, no braking or collisions):',lapBenchmark);
`,ctx);


vm.runInContext(`
const groundPosition=terrainMesh.geometry.attributes.position;
function renderedGroundHeight(x,y){
 const step=DEM.size/DEM.n,w=DEM.n+1,fx=(x+HALF)/step,fy=(y+HALF)/step;
 const i=Math.max(0,Math.min(DEM.n-1,Math.floor(fx))),j=Math.max(0,Math.min(DEM.n-1,Math.floor(fy)));
 const u=fx-i,v=fy-j,a=j*w+i,b=a+1,c=a+w,d=c+1;
 return u+v<=1?groundPosition.getY(a)*(1-u-v)+groundPosition.getY(b)*u+groundPosition.getY(c)*v:
   groundPosition.getY(d)*(u+v-1)+groundPosition.getY(c)*(1-u)+groundPosition.getY(b)*(1-v);
}
const roadPosition=trackMesh.geometry.attributes.position,roadIndex=trackMesh.geometry.index;
let lowestRoadClearance=Infinity,roadChecks=0;
for(let offset=0;offset<roadIndex.count;offset+=3){
 const ids=[roadIndex.getX(offset),roadIndex.getX(offset+1),roadIndex.getX(offset+2)];
 for(let u=0;u<=5;u++)for(let v=0;v<=5-u;v++){
  const weights=[u/5,v/5,1-(u+v)/5];
  const x=ids.reduce((s,i,k)=>s+roadPosition.getX(i)*weights[k],0);
  const y=ids.reduce((s,i,k)=>s-roadPosition.getZ(i)*weights[k],0);
  const h=ids.reduce((s,i,k)=>s+roadPosition.getY(i)*weights[k],0);
  lowestRoadClearance=Math.min(lowestRoadClearance,h-renderedGroundHeight(x,y));roadChecks++;
 }
}
if(lowestRoadClearance<.0799)throw Error('Grass intersects the asphalt at a road interior or edge: '+lowestRoadClearance);

let paintChecks=0;
for(const group of trackMesh.children)for(const mesh of group.children){
 const p=mesh.geometry.attributes.position,index=mesh.geometry.index,count=index?.count??p.count;
 for(let offset=0;offset<count;offset+=3){
  const ids=[0,1,2].map(k=>index?index.getX(offset+k):offset+k);
  for(const weights of [[1/3,1/3,1/3],[.5,.5,0],[0,.5,.5],[.5,0,.5]]){
   const x=ids.reduce((s,i,k)=>s+p.getX(i)*weights[k],0);
   const y=ids.reduce((s,i,k)=>s-p.getZ(i)*weights[k],0);
   const h=ids.reduce((s,i,k)=>s+p.getY(i)*weights[k],0);
   if(h<renderedGroundHeight(x,y)+.01||h<raceHeightAt(x,y)+.0175)
    throw Error('Road paint is buried in the grass or asphalt: '+group.name);
   paintChecks++;
  }
 }
}
console.log('Passed: boost bands, chevrons, kerbs and finish stripe remain above grass and asphalt',{paintChecks});

const expectedSites=new Map([
 ['B116',['ICN']],['B086',['LJAD']],['B082',['Lagrange']],
 ['B128',['CCMA']],['B083',['IBV Biochimie']],['B109',['IBV','ECOSEAS']]
]);
for(const [id,labs] of expectedSites){
 const building=world.buildings.find(b=>b.properties.localId===id);
 if(!building||labs.some(name=>!building.properties.laboratories?.includes(name)))throw Error('Laboratory not represented: '+id);
 if(!labelGroup.children.some(m=>m.userData.building===building))throw Error('Laboratory has no visible building label: '+id);
}
const icn=world.buildings.find(b=>b.properties.localId==='B116');
if(icn.height!==27||icn.properties.building==='roof'||icn.properties.wall==='no')throw Error('ICN still uses a roof-only height');
const icnBody=buildingGroup.children.find(m=>m.userData.building===icn),icnBase=Math.min(...icn.poly.map(p=>heightAt(...p)));
icnBody.geometry.computeBoundingBox();
if(Math.abs(icnBody.geometry.boundingBox.max.y-(icnBase+27))>.0001)throw Error('ICN roof does not reach the official elevation');
const icnWindows=buildingGroup.children.find(m=>m.userData.facadeFor==='B116'),icnCladding=buildingGroup.children.find(m=>m.userData.claddingFor==='B116');
if(!icnWindows||!icnCladding)throw Error('ICN window bands or ground-floor cladding missing');
const windows=icnWindows.geometry.attributes.position;
for(let i=0;i<windows.count;i+=4){
 let x=0,y=0;for(let k=0;k<4;k++){x+=windows.getX(i+k)/4;y-=windows.getZ(i+k)/4;}
 if(pointInPoly(x,y,icn.poly))throw Error('ICN windows face into the solid building');
}
const formerPhysics=world.buildings.find(b=>b.properties.localId==='B001');
if(!formerPhysics.properties.formerLaboratories?.includes('InPhyNi'))throw Error('Former Valrose physics laboratory footprint missing');
for(let s=0;s<world.length;s+=4){
 const p=pointAtS(s);[kart.x,kart.y]=p;placeKart();
 if(kartObj.position.y<renderedGroundHeight(...p)+.0799||Math.abs(kartObj.position.y-raceHeightAt(...p))>1e-5)
  throw Error('Kart does not follow the visible asphalt');
}
console.log('Passed: full road/grass clearance, ICN official height and outward façade, all campus laboratory sites and kart contact',{
 roadTriangles:roadIndex.count/3,roadChecks,lowestRoadClearance,laboratorySites:expectedSites.size,icnHeight:icn.height});
resetKart();
`,ctx);



vm.runInContext(`
resetKart();startRaceCountdown();advanceTime(3100);updateRacePresentation(performance.now());
let driveSteps=0,launchSteps=0;
keys.add('arrowup');
while(!race.running&&launchSteps++<1200){step(1/120);advanceTime(1000/120);tickRaceClock(performance.now());}
keys.clear();
if(!race.running)throw Error('Full-lap driving check could not reach the circuit');
for(;driveSteps<30000&&!race.finished;driveSteps++){
 const speed=Math.hypot(kart.vx,kart.vy),look=pointAtS(race.s+Math.max(3,speed*.4));
 const desired=Math.atan2(look[0]-kart.x,look[1]-kart.y);
 const error=Math.atan2(Math.sin(desired-kart.a),Math.cos(desired-kart.a));
 const p0=pointAtS(race.s),p1=pointAtS(race.s+5),p2=pointAtS(race.s+13);
 const first=Math.atan2(p1[0]-p0[0],p1[1]-p0[1]),second=Math.atan2(p2[0]-p1[0],p2[1]-p1[1]);
 const turn=Math.abs(Math.atan2(Math.sin(second-first),Math.cos(second-first)));
 const targetSpeed=Math.min(17,1.8/(turn/9+.06),Math.abs(error)>.65?6:20);
 keys.clear();
 if(error>.035)keys.add('arrowright');if(error<-.035)keys.add('arrowleft');
 if(speed>targetSpeed+.6)keys.add('arrowdown');else keys.add('arrowup');
 step(1/120);advanceTime(1000/120);tickRaceClock(performance.now());
}
if(!race.finished||race.railHits)throw Error('Full original-circuit lap did not finish cleanly using manual drive inputs');
console.log('Passed: complete original-circuit lap using only throttle, brake and steering keys',{finished:race.finished,seconds:race.t,progress:race.progress,length:world.length,steps:driveSteps,railHits:race.railHits,boosts:race.boosts});
resetKart();keys.clear();
`,ctx);

(async()=>{
  const downloads=[],urls=[],text=[];
  let created=0,shared=null,shareStarted=false;
  const actualCreate=ctx.document.createElement,actualSetTimeout=ctx.setTimeout;
  ctx.File=File;
  ctx.URL={createObjectURL:blob=>{const url='blob:result-'+urls.length;urls.push({url,blob});return url;},revokeObjectURL:noop};
  ctx.setTimeout=fn=>{fn();return 0;};
  ctx.document.body.appendChild=noop;
  ctx.document.createElement=tag=>{
    const node=element('share-node-'+created++);node.tagName=tag.toUpperCase();
    if(tag==='canvas'){
      node.getContext=()=>new Proxy({measureText:t=>({width:t.length*24}),fillText:t=>text.push(t)},{get:(t,k)=>k in t?t[k]:noop});
      node.toBlob=callback=>callback(new Blob(['test png'],{type:'image/png'}));
    }
    if(tag==='a'){node.click=()=>downloads.push({filename:node.download,href:node.href});node.remove=noop;}
    return node;
  };
  await vm.runInContext(`
    el('driver-name').value='<b>Alice & Bob</b>';race.running=true;race.t=82.5;finishRace();
    captureResultPicture();
  `,ctx);
  vm.runInContext(`
    if(el('result-preview').hidden||el('share-result').disabled||el('download-result').disabled)throw Error('Result picture did not become ready');
    if(!resultImageBlob||resultImageBlob.type!=='image/png')throw Error('Picture was not exported as PNG');
    if(!el('score-rows').innerHTML.includes('&lt;b&gt;Alice &amp; Bob&lt;/b&gt;')||el('score-rows').innerHTML.includes('<b>Alice'))throw Error('Driver name was not escaped in the scoreboard');
  `,ctx);
  assert(text.includes('<b>Alice & Bob</b>'),'Name missing from postcard');
  assert(text.includes('1:22.50'),'Finish time missing from postcard');
  vm.runInContext(`el('driver-name').value='Chloé';el('driver-name').input();`,ctx);
  await Promise.resolve();
  assert(text.includes('Chloé'),'Edited name missing from regenerated postcard');
  ctx.navigator.canShare=data=>data.files[0].type==='image/png';
  ctx.navigator.share=data=>{shareStarted=true;shared=data;return Promise.resolve();};
  const sharePromise=vm.runInContext('shareResult()',ctx);
  assert(shareStarted,'Native share was delayed until after the user activation');
  await sharePromise;
  assert(shared.files[0].name.includes('Chloé'),'Share filename missing driver name');
  assert(shared.text.includes('1 minute 22.50 seconds'),'Share caption missing time');
  assert.equal(downloads.length,0,'Native share also downloaded');
  ctx.navigator.canShare=()=>false;
  await vm.runInContext('shareResult()',ctx);
  assert.equal(downloads.length,1,'Unsupported file sharing did not download a picture');
  assert(downloads[0].filename.endsWith('.png'),'Download was not a PNG');
  ctx.navigator.canShare=()=>true;ctx.navigator.share=()=>Promise.reject({name:'AbortError'});
  await vm.runInContext('shareResult()',ctx);
  assert.equal(downloads.length,1,'Cancelling native share downloaded unexpectedly');
  ctx.navigator.share=()=>Promise.reject({name:'NotAllowedError'});
  await vm.runInContext('shareResult()',ctx);
  assert.equal(downloads.length,2,'Blocked native sharing did not fall back to download');

  // A delayed PNG callback must not replace a more recently edited name.
  const callbacks=[];
  ctx.document.createElement=tag=>{
    const node=element('async-share-'+created++);node.tagName=tag.toUpperCase();
    if(tag==='canvas'){
      node.getContext=()=>new Proxy({measureText:t=>({width:20})},{get:(t,k)=>k in t?t[k]:noop});
      node.toBlob=callback=>callbacks.push(callback);
    }
    return node;
  };
  const old=vm.runInContext(`race.currentResult.name='Old name';prepareResultImage();`,ctx);
  const latest=vm.runInContext(`el('driver-name').value='Latest name';race.currentResult.name=driverName();prepareResultImage();`,ctx);
  const newerBlob=new Blob(['latest'],{type:'image/png'}),olderBlob=new Blob(['old'],{type:'image/png'});
  callbacks[1](newerBlob);await latest;
  callbacks[0](olderBlob);await old;
  assert.equal(vm.runInContext('resultImageBlob',ctx),newerBlob,'A stale picture replaced the latest name');
  const pending=vm.runInContext('prepareResultImage()',ctx);vm.runInContext('resetKart()',ctx);
  callbacks[2](new Blob(['stale'],{type:'image/png'}));await pending;
  vm.runInContext(`if(resultImageBlob||!el('result-preview').hidden||!el('share-result').disabled)throw Error('Closing finish retained a stale share image');`,ctx);
  ctx.document.createElement=actualCreate;ctx.setTimeout=actualSetTimeout;
  console.log('Passed: named PNG postcard, name escaping/updates, immediate native share, download fallback, cancellation and stale exports');
})().catch(error=>{console.error(error);process.exitCode=1;});
