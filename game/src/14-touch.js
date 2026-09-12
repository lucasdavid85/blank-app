/* The four-arrow phone pad mirrors keyboard driving and supports two fingers. */
const touchReleases=[];
function clearTouchControls(){for(const release of touchReleases)release();}
(function(){
  const coarse=(typeof matchMedia==='function'&&matchMedia('(any-pointer: coarse)').matches)||
    (typeof navigator!=='undefined'&&navigator.maxTouchPoints>0);
  if(!coarse||!document.body)return;
  document.body.classList.add('touch');
  setPanelCollapsed(true);
  el('focus-hint').textContent='Use the four-arrow pad to drive';
  addEventListener('pointerdown',e=>{
    const panel=el('panel');
    if(!panel.classList.contains('min')&&!panel.contains(e.target))setPanelCollapsed(true);
  },{passive:true});
  const orient=()=>document.body.classList.toggle('portrait',innerHeight>innerWidth);
  orient();addEventListener('resize',()=>{clearTouchControls();orient();});
  addEventListener('orientationchange',()=>{clearTouchControls();orient();});
  addEventListener('blur',clearTouchControls);
  document.addEventListener?.('visibilitychange',()=>{if(document.hidden)clearTouchControls();});
  function bindKey(id,key){
    const node=el(id),pointers=new Set();
    const clear=()=>{pointers.clear();node.classList.remove('on');node.setAttribute('aria-pressed','false');keys.delete(key);};
    touchReleases.push(clear);clear();
    node.addEventListener('pointerdown',e=>{
      e.preventDefault();if(race.finished||mapOpen)return;
      pointers.add(e.pointerId);node.classList.add('on');node.setAttribute('aria-pressed','true');
      keys.add(key);node.setPointerCapture?.(e.pointerId);
    });
    const release=e=>{
      e.preventDefault();pointers.delete(e.pointerId);if(!pointers.size)clear();
    };
    for(const event of ['pointerup','pointercancel','lostpointercapture'])node.addEventListener(event,release);
    node.addEventListener('contextmenu',e=>e.preventDefault());
  }
  for(const [id,key] of [['t-up','arrowup'],['t-down','arrowdown'],['t-left','arrowleft'],['t-right','arrowright'],['t-hand',' ']])bindKey(id,key);
  el('t-reset').addEventListener('click',e=>{e.preventDefault();resetKart();});
  el('t-camera').addEventListener('click',e=>{e.preventDefault();camMode=(camMode+1)%3;});
})();
