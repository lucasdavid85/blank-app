/* Browser controls. Gameplay stays entirely inside this frame. */
(() => {
 const canvas=document.getElementById('gl');canvas.tabIndex=0;
 canvas.addEventListener('pointerdown',()=>{canvas.focus({preventScroll:true});document.getElementById('focus-hint').hidden=true;});
 document.getElementById('graphics').addEventListener('change',e=>applyQuality(e.target.value));
 document.getElementById('fullscreen').addEventListener('click',async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
  catch{document.getElementById('focus-hint').hidden=false;document.getElementById('focus-hint').textContent='Full screen is unavailable here. You can use F11 instead.';}
  canvas.focus({preventScroll:true});
 });
 window.addEventListener('blur',()=>keys.clear());
 document.addEventListener('visibilitychange',()=>{keys.clear();last=performance.now();acc=0;});
})();

