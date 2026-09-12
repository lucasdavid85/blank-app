/* Playful, faceted white geese: warn, charge in a fixed direction, retreat.
   Charges cannot home in after their warning, so steering around them works. */
let gooseGroup=null, geese=[], gooseNoticeTime=0, gooseHitCooldown=0;
function gooseSafe(x,y) {
  return x>-HALF+5&&x<HALF-5&&y>-HALF+5&&y<HALF-5 &&
    !world.water.some(w=>inWater(x,y,w)) &&
    !world.buildings.some(b=>!b.bridge&&pointInPoly(x,y,b.poly)&&!(b.holes||[]).some(h=>pointInPoly(x,y,h)));
}
function makeGoose() {
  const root=new THREE.Group(), white=new THREE.MeshLambertMaterial({color:0xf9f8ef}),
    wingMat=new THREE.MeshLambertMaterial({color:0xe4e8de}),
    orange=new THREE.MeshLambertMaterial({color:0xec8b32}),
    black=new THREE.MeshBasicMaterial({color:0x182721});
  function oval(parent,sx,sy,sz,x,y,z,mat) {
    const geometry=new THREE.SphereGeometry(1,10,7).toNonIndexed();geometry.computeVertexNormals();
    const m=new THREE.Mesh(geometry,mat);
    m.scale.set(sx,sy,sz);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;
  }
  const body=oval(root,.55,.48,.85,0,.85,0,white);
  const neck=new THREE.Group();neck.position.set(0,1.04,-.5);root.add(neck);
  oval(neck,.18,.58,.2,0,.37,0,white);oval(neck,.26,.25,.33,0,.88,-.12,white);
  oval(neck,.13,.09,.32,0,.83,-.52,orange);
  for(const side of [-1,1])oval(neck,.045,.045,.045,side*.235,.95,-.26,black);
  const wings=[-1,1].map(side=>{
    const pivot=new THREE.Group();pivot.position.set(side*.45,1,0);root.add(pivot);
    oval(pivot,.13,.32,.65,side*.07,-.07,.08,wingMat);return pivot;
  });
  const feet=[-1,1].map(side=>oval(root,.19,.07,.3,side*.25,.12,-.08,orange));
  const ring=new THREE.Mesh(new THREE.RingGeometry(.85,1.05,24),new THREE.MeshBasicMaterial({color:0xf0b647,side:THREE.DoubleSide,transparent:true,opacity:.8}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.07;ring.visible=false;root.add(ring);
  root.scale.setScalar(1.25);
  return {root,body,neck,wings,feet,ring};
}
function buildGeese() {
  clearGroup(gooseGroup);gooseGroup=new THREE.Group();scene.add(gooseGroup);geese=[];
  if(world.line.length<3)return;
  for(let i=0;i<5;i++){
    let home=null,heading=0;
    for(let j=0;j<35&&!home;j++){
      const s=world.length*(.12+i*.16)+j*2,p=pointAtS(s),a=pointAtS(s-.5),b=pointAtS(s+.5);
      const dx=b[0]-a[0],dy=b[1]-a[1],n=Math.hypot(dx,dy)||1,side=i%2?1:-1;
      const q=[p[0]+dy/n*(TRACK_W+2)*side,p[1]-dx/n*(TRACK_W+2)*side];
      if(gooseSafe(...q)){home=q;heading=Math.atan2(dx,dy);}
    }
    if(!home)continue;
    const model=makeGoose();gooseGroup.add(model.root);
    geese.push({...model,home,x:home[0],y:home[1],heading,state:'idle',timer:0,phase:i*1.7,dx:0,dy:0});
  }
  resetGeese();
}
function resetGeese() {
  gooseNoticeTime=0;gooseHitCooldown=0;el('goose-notice').hidden=true;
  for(const g of geese){[g.x,g.y]=g.home;g.state='idle';g.timer=0;g.ring.visible=false;poseGoose(g,0);}
}
function gooseNotice(message) {
  el('goose-notice').textContent=message;el('goose-notice').hidden=false;gooseNoticeTime=1.8;
}
function poseGoose(g,dt) {
  g.phase+=dt*(g.state==='charge'?22:7);
  const moving=g.state==='charge'||g.state==='return',wave=Math.sin(g.phase);
  g.root.position.set(g.x,heightAt(g.x,g.y)+(moving?Math.abs(wave)*.07:0),-g.y);
  g.root.rotation.y=-g.heading;
  g.body.rotation.z=moving?wave*.07:0;
  g.neck.rotation.x=g.state==='charge'?-.65:g.state==='warn'?-.18:Math.sin(g.phase*.35)*.06;
  g.wings.forEach((w,i)=>{w.rotation.z=(i?1:-1)*(g.state==='warn'||g.state==='charge'?.6+Math.abs(wave)*.65:.08);});
  g.feet.forEach((f,i)=>{f.position.z=-.08+(moving?Math.sin(g.phase+i*Math.PI)*.17:0);});
  g.ring.visible=g.state==='warn';
  g.ring.scale.setScalar(1+Math.sin(g.phase*1.5)*.12);
}
function updateGeese(dt) {
  gooseHitCooldown=Math.max(0,gooseHitCooldown-dt);
  gooseNoticeTime=Math.max(0,gooseNoticeTime-dt);if(!gooseNoticeTime)el('goose-notice').hidden=true;
  for(const g of geese){
    const distance=Math.hypot(kart.x-g.x,kart.y-g.y);g.timer-=dt;
    if(g.state==='idle'&&distance<34&&Math.hypot(kart.vx,kart.vy)>.5){
      g.state='warn';g.timer=.95;
      // Aim for an intercept after the warning; the direction is then locked.
      const rx=kart.x+kart.vx*g.timer-g.x,ry=kart.y+kart.vy*g.timer-g.y;
      const a=kart.vx*kart.vx+kart.vy*kart.vy-81,b=2*(rx*kart.vx+ry*kart.vy),c=rx*rx+ry*ry;
      const discriminant=b*b-4*a*c;
      let intercept=.5;
      if(Math.abs(a)<1e-6&&Math.abs(b)>1e-6)intercept=Math.max(0,-c/b);
      else if(discriminant>=0){
        const roots=[(-b-Math.sqrt(discriminant))/(2*a),(-b+Math.sqrt(discriminant))/(2*a)].filter(t=>t>=0&&t<=1.8);
        if(roots.length)intercept=Math.min(...roots);
      }
      const tx=rx+kart.vx*intercept,ty=ry+kart.vy*intercept,n=Math.hypot(tx,ty)||1;
      g.dx=tx/n;g.dy=ty/n;g.heading=Math.atan2(g.dx,g.dy);
      gooseNotice('Honk! Goose incoming — steer around it!');
    }else if(g.state==='warn'&&g.timer<=0){g.state='charge';g.timer=1.8;}
    else if(g.state==='charge'){
      const x=g.x+g.dx*9*dt,y=g.y+g.dy*9*dt;
      if(gooseSafe(x,y)){g.x=x;g.y=y;}else g.timer=0;
      if(distance<KART.radius+.65&&gooseHitCooldown<=0){
        // A comic bump, with brief immunity so one attack cannot repeatedly stop you.
        kart.vx*=.68;kart.vy*=.68;gooseHitCooldown=1.5;g.timer=0;
        gooseNotice('Honk! You got a goose bump!');
      }
      if(g.timer<=0){g.state='return';g.timer=0;}
    }else if(g.state==='return'){
      const dx=g.home[0]-g.x,dy=g.home[1]-g.y,n=Math.hypot(dx,dy);
      if(n<.15){[g.x,g.y]=g.home;g.state='cooldown';g.timer=4;}
      else{g.x+=dx/n*Math.min(n,3*dt);g.y+=dy/n*Math.min(n,3*dt);g.heading=Math.atan2(dx,dy);}
    }else if(g.state==='cooldown'&&g.timer<=0)g.state='idle';
    poseGoose(g,dt);
  }
}
