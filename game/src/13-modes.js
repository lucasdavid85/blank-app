let playMode='race',selectedPlace=0;
const discovered=new Set();
const places=[
 {match:/grand ch/i,name:'Grand Château',text:'Le château accueille la présidence de l’université. Repérez aussi le théâtre et les jardins.'},
 {match:/biblioth/i,name:'Bibliothèque universitaire',text:'Le lieu à repérer pour les livres, les ressources documentaires et le travail personnel.'},
 {match:/resto u/i,name:'Restaurant universitaire',text:'Repérez le restaurant Montebello pour vos pauses déjeuner sur le campus.'},
 {match:/résidence universitaire montebello/i,name:'Résidence Montebello',text:'La résidence se trouve dans la partie haute du campus. Comparez son accès avec celui du restaurant.'},
 {match:/petit ch/i,name:'Petit Château · Scolarité',text:'Un repère pour trouver les services de scolarité et l’administration du campus.'},
 {match:/chimie recherche/i,name:'Chimie · ICN',text:'Identifiez les bâtiments de chimie et distinguez recherche, travaux pratiques et amphithéâtre.'},
 {match:/centre sportif/i,name:'Centre sportif',text:'Repérez le centre sportif et son accès depuis les allées du campus.'},
 {lake:true,name:'Lac du parc',text:'Le grand plan d’eau possède une île. Les petits bassins ailleurs dans le parc sont des fontaines.'}
];
function placeLocation(place){const p=place.lake?world.water.find(w=>w.properties.waterKind==='lake'):world.buildings.find(b=>place.match.test(b.name))?.poly;if(!p)return null;return p.slice(0,-1).reduce((a,q)=>[a[0]+q[0]/(p.length-1),a[1]+q[1]/(p.length-1)],[0,0]);}
function setMode(value){playMode=value==='visit'?'visit':'race';el('play-mode').value=playMode;el('timing').style.display=playMode==='race'?'block':'none';el('discovery').hidden=playMode!=='visit';if(trackMesh)trackMesh.visible=playMode==='race';resetKart();for(const p of gate.pieces)p.mesh.visible=playMode==='race';updateDiscovery();}
function updateDiscovery(){if(playMode!=='visit')return;for(let i=0;i<places.length;i++){const p=placeLocation(places[i]);if(p&&Math.hypot(kart.x-p[0],kart.y-p[1])<25)discovered.add(i);}const place=places[selectedPlace],p=placeLocation(place),d=p?Math.hypot(kart.x-p[0],kart.y-p[1]):null;el('place-title').textContent=place.name;el('place-text').textContent=place.text;el('place-distance').textContent=d===null?'Position unavailable':Math.round(d)+' m à vol d’oiseau · '+(discovered.has(selectedPlace)?'Découvert':'Suivez le repère bleu sur la carte');el('discovery-progress').textContent=discovered.size+' / '+places.length+' lieux découverts';}
el('play-mode').onchange=e=>setMode(e.target.value);
el('place-select').onchange=e=>{selectedPlace=Number(e.target.value);updateDiscovery();};
el('next-place').onclick=()=>{selectedPlace=(selectedPlace+1)%places.length;el('place-select').value=String(selectedPlace);updateDiscovery();};
el('restore-circuit').onclick=()=>{const f=CAMPUS.features.find(f=>f.properties.role==='track');world.line=f.geometry.coordinates.map(q=>toLocal(...q));measureLine();buildTrack();setMode('race');say('Your supplied circuit is restored.');};
