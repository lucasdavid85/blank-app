let playMode='race',selectedPlace=0;
const discovered=new Set();
const places=[
 {match:/grand ch/i,name:'Grand Château',text:'The château houses the university presidency. Look for the theater and gardens too.'},
 {match:/biblioth/i,name:'University Library',text:'Find the campus library for books, learning resources, and independent study.'},
 {match:/resto u/i,name:'University Restaurant',text:'Find the Montebello restaurant for lunch breaks on campus.'},
 {match:/résidence universitaire montebello/i,name:'Montebello Residence',text:'The residence is in the upper part of campus. Compare its entrance with the restaurant entrance.'},
 {match:/petit ch/i,name:'Petit Château · Student Services',text:'A useful landmark for student services and the campus administration.'},
 {match:/chimie recherche/i,name:'Chemistry · ICN',text:'Identify the chemistry buildings and distinguish research, teaching labs, and the lecture hall.'},
 {match:/centre sportif/i,name:'Sports Center',text:'Find the sports center and its entrance from the campus paths.'},
 {lake:true,name:'Park Lake',text:'The main lake contains an island. The smaller pools elsewhere in the park are fountains.'}
];
function placeLocation(place){const p=place.lake?world.water.find(w=>w.properties.waterKind==='lake'):world.buildings.find(b=>place.match.test(b.name))?.poly;if(!p)return null;return p.slice(0,-1).reduce((a,q)=>[a[0]+q[0]/(p.length-1),a[1]+q[1]/(p.length-1)],[0,0]);}
function setMode(value){
 if(mapOpen)toggleMap();
 playMode=value==='visit'?'visit':'race';
 const racing=playMode==='race';
 el('play-mode').value=playMode;
 document.body?.classList.toggle('visiting',!racing);
 el('timing').style.display=racing?'block':'none';
 el('discovery').hidden=true;
 el('panel').hidden=!racing;
 setPanelCollapsed(true);
 for(const [id,mode] of [['mode-race','race'],['mode-visit','visit']])el(id).setAttribute('aria-pressed',String(playMode===mode));
 if(trackMesh)trackMesh.visible=racing;
 if(barrierGroup)barrierGroup.visible=racing;
 resetKart();for(const p of gate.pieces)p.mesh.visible=racing;updateDiscovery();hud();
}
function updateDiscovery(){if(playMode!=='visit')return;for(let i=0;i<places.length;i++){const p=placeLocation(places[i]);if(p&&Math.hypot(kart.x-p[0],kart.y-p[1])<25)discovered.add(i);}const place=places[selectedPlace],p=placeLocation(place),d=p?Math.hypot(kart.x-p[0],kart.y-p[1]):null;el('place-title').textContent=place.name;el('place-text').textContent=place.text;el('place-distance').textContent=d===null?'Position unavailable':Math.round(d)+' m straight-line distance · '+(discovered.has(selectedPlace)?'Discovered':'Follow the blue marker on the map');el('discovery-progress').textContent=discovered.size+' / '+places.length+' places discovered';}
el('play-mode').onchange=e=>setMode(e.target.value);
el('mode-race').onclick=()=>setMode('race');
el('mode-visit').onclick=()=>setMode('visit');
el('place-select').onchange=e=>{selectedPlace=Number(e.target.value);updateDiscovery();};
el('next-place').onclick=()=>{selectedPlace=(selectedPlace+1)%places.length;el('place-select').value=String(selectedPlace);updateDiscovery();};
el('restore-circuit').onclick=()=>{const f=CAMPUS.features.find(f=>f.properties.role==='track');world.line=f.geometry.coordinates.map(q=>toLocal(...q));measureLine();buildTrack();setMode('race');say('Your supplied circuit is restored.');};
