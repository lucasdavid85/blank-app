/* A named race postcard, prepared before clicks so native sharing retains
   the browser's user activation. All drawing and image data stay local. */
let resultCapturePending=false, resultPhoto=null, resultImageBlob=null, resultImageUrl=null, resultImageVersion=0;
function cleanDriverName(value) {
  return [...String(value||'').replace(/[\u0000-\u001f\u007f]/g,'').trim()].slice(0,28).join('')||'Driver';
}
function driverName() { return cleanDriverName(el('driver-name').value); }
function escapeResultText(value) {
  const escapes={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
  return String(value).replace(/[&<>"']/g,c=>escapes[c]);
}
function renderScores() {
  const best=race.results.slice().sort((a,b)=>a.time-b.time).slice(0,5);
  el('score-rows').innerHTML=best.map((r,i)=>'<tr'+(r===race.currentResult?' class="current"':'')+'><td>'+(i+1)+'</td><td>'+escapeResultText(r.name||'Driver')+'<small>Lap '+r.lap+'</small></td><td>'+fmt(r.time)+'</td></tr>').join('');
}
function clearResultPicture() {
  resultImageVersion++;resultCapturePending=false;resultPhoto=null;resultImageBlob=null;
  if(resultImageUrl){URL.revokeObjectURL(resultImageUrl);resultImageUrl=null;}
  el('result-preview').hidden=true;el('result-preview').removeAttribute?.('src');
  el('share-result').disabled=true;el('download-result').disabled=true;el('share-status').textContent='';
}
function queueResultPicture() {
  clearResultPicture();resultCapturePending=true;
  el('share-status').textContent='Preparing your race picture…';
}
function captureResultPicture() {
  resultCapturePending=false;
  if(!race.finished||!race.currentResult)return;
  const source=el('gl');
  try {
    resultPhoto=document.createElement('canvas');
    const scale=Math.min(1,1600/source.width);
    resultPhoto.width=Math.max(1,Math.round(source.width*scale));
    resultPhoto.height=Math.max(1,Math.round(source.height*scale));
    // Called immediately after the frame renders: no preserved WebGL buffer needed.
    resultPhoto.getContext('2d').drawImage(source,0,0,resultPhoto.width,resultPhoto.height);
  } catch { resultPhoto=null; }
  return prepareResultImage();
}
function fittedText(ctx,text,x,y,maxWidth,size,font) {
  do { ctx.font='600 '+size+'px '+font;size--; } while(ctx.measureText(text).width>maxWidth&&size>20);
  ctx.fillText(text,x,y,maxWidth);
}
function drawResultRoute(ctx,x,y,width,height) {
  if(world.line.length<2)return;
  const xs=world.line.map(p=>p[0]),ys=world.line.map(p=>p[1]),
    minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const scale=Math.min(width/(maxX-minX||1),height/(maxY-minY||1));
  const left=x+(width-(maxX-minX)*scale)/2,top=y+(height-(maxY-minY)*scale)/2;
  ctx.beginPath();
  world.line.forEach(([px,py],i)=>{
    const sx=left+(px-minX)*scale,sy=top+(maxY-py)*scale;
    if(i)ctx.lineTo(sx,sy);else ctx.moveTo(sx,sy);
  });
  ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=5;ctx.strokeStyle='#bee98f';ctx.stroke();
}
function drawResultCard(result,photo,best) {
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1440;
  const ctx=canvas.getContext('2d'),sans='"Segoe UI",system-ui,sans-serif',mono='monospace';
  ctx.fillStyle='#132920';ctx.fillRect(0,0,1200,1440);
  ctx.fillStyle='#c7ed9b';ctx.font='600 28px '+sans;ctx.fillText('VALROSE KART',72,92);
  ctx.fillStyle='#a9bfae';ctx.font='20px '+sans;ctx.fillText('RACE FINISHED',72,148);
  ctx.fillStyle='#f7f4e8';fittedText(ctx,result.name,72,242,1056,72,sans);
  ctx.fillStyle='#cbd7ca';ctx.font='26px '+sans;ctx.fillText('You finished the Valrose circuit.',72,294);
  ctx.fillStyle='#314a3b';ctx.fillRect(64,340,1072,590);
  if(photo&&photo.width&&photo.height){
    const scale=Math.max(1072/photo.width,590/photo.height);
    const sw=1072/scale,sh=590/scale;
    ctx.drawImage(photo,(photo.width-sw)/2,(photo.height-sh)/2,sw,sh,64,340,1072,590);
  }else drawResultRoute(ctx,264,395,672,480);
  ctx.strokeStyle='#69836b';ctx.lineWidth=2;ctx.strokeRect(64,340,1072,590);
  ctx.fillStyle='#bdcfb8';ctx.font='600 20px '+sans;ctx.fillText('FINISH TIME',72,1004);
  ctx.fillStyle='#f8f4e5';fittedText(ctx,fmt(result.time),72,1138,640,116,mono);
  ctx.fillStyle='#bdcfb8';ctx.font='23px '+sans;ctx.fillText(finishDuration(result.time),72,1192,660);
  ctx.fillStyle='#bdcfb8';ctx.font='600 18px '+sans;ctx.fillText('SESSION BEST',830,1004);
  ctx.fillStyle='#c7ed9b';ctx.font='600 38px '+mono;ctx.fillText(fmt(best),830,1066,300);
  drawResultRoute(ctx,850,1114,240,160);
  ctx.fillStyle='#69836b';ctx.fillRect(72,1308,1056,2);
  ctx.fillStyle='#cbd7ca';ctx.font='24px '+sans;ctx.fillText('Lap '+result.lap+'  ·  Valrose Campus',72,1366);
  return canvas;
}
async function prepareResultImage() {
  if(!race.finished||!race.currentResult)return;
  const version=++resultImageVersion;
  resultImageBlob=null;el('share-result').disabled=true;el('download-result').disabled=true;
  el('share-status').textContent='Preparing your race picture…';
  try {
    const card=drawResultCard(race.currentResult,resultPhoto,race.best);
    const blob=await new Promise(resolve=>card.toBlob(resolve,'image/png'));
    if(version!==resultImageVersion||!race.finished)return;
    if(!blob)throw Error('Image could not be created');
    if(resultImageUrl)URL.revokeObjectURL(resultImageUrl);
    resultImageBlob=blob;resultImageUrl=URL.createObjectURL(blob);
    el('result-preview').src=resultImageUrl;el('result-preview').hidden=false;
    el('share-result').disabled=false;el('download-result').disabled=false;
    el('share-status').textContent='Add your name, then share or download your picture.';
  } catch {
    if(version===resultImageVersion)el('share-status').textContent='Could not create the picture. Try changing your name to retry.';
  }
}
function resultFilename() {
  const name=driverName().replace(/[^\p{L}\p{N}_-]+/gu,'-').replace(/^-+|-+$/g,'')||'driver';
  return 'valrose-'+name+'-'+fmt(race.currentResult.time).replace(/[:.]/g,'-')+'.png';
}
function downloadResult() {
  if(!resultImageBlob||!race.currentResult)return false;
  const url=URL.createObjectURL(resultImageBlob),link=document.createElement('a');
  link.href=url;link.download=resultFilename();document.body.appendChild(link);link.click();link.remove();
  const cleanup=setTimeout(()=>URL.revokeObjectURL(url),1000);cleanup?.unref?.();
  el('share-status').textContent='Save the picture and send it to your friend.';
  return true;
}
async function shareResult() {
  if(!resultImageBlob||!race.currentResult)return;
  try {
    const file=new File([resultImageBlob],resultFilename(),{type:'image/png'});
    if(typeof navigator.share!=='function'||typeof navigator.canShare!=='function'||!navigator.canShare({files:[file]})){
      downloadResult();return;
    }
    // No awaits before share(): the click still carries transient user activation.
    await navigator.share({files:[file],title:'Valrose Kart · '+driverName(),text:driverName()+' finished the circuit in '+finishDuration(race.currentResult.time)+'!'});
    el('share-status').textContent='Your race picture was shared.';
  } catch(error) {
    if(error.name==='AbortError')el('share-status').textContent='Sharing cancelled. Your picture is still available.';
    else downloadResult();
  }
}
el('driver-name').addEventListener('input',()=>{
  if(!race.currentResult||!race.finished)return;
  race.currentResult.name=driverName();renderScores();
  if(!resultCapturePending)prepareResultImage();
});
el('share-result').addEventListener('click',shareResult);
el('download-result').addEventListener('click',downloadResult);
