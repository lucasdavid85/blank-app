/* Keep the road and its paint above the actual triangulated terrain.
   Height differences between two triangle planes reach their maximum at
   vertices of their intersection polygon, including terrain edges inside a
   road face. Sampling road corners alone misses those grass intersections. */
let terrainSurface = null, raceSurface = null;

function surfaceTriangle(geometry, offset) {
  const p=geometry.attributes.position, index=geometry.index;
  const ids=[0,1,2].map(k=>index?index.getX(offset+k):offset+k);
  const points=ids.map(i=>[p.getX(i),-p.getZ(i),p.getY(i)]);
  const [a,b,c]=points, dx=b[0]-a[0],dy=b[1]-a[1],ex=c[0]-a[0],ey=c[1]-a[1];
  const det=dx*ey-dy*ex;
  if(Math.abs(det)<1e-10)return null;
  const sx=((b[2]-a[2])*ey-(c[2]-a[2])*dy)/det;
  const sy=(dx*(c[2]-a[2])-ex*(b[2]-a[2]))/det;
  return {ids,points,det,sx,sy,constant:a[2]-sx*a[0]-sy*a[1]};
}
function surfacePlaneHeight(triangle,x,y){return triangle.sx*x+triangle.sy*y+triangle.constant;}
function surfaceBounds(points){
  return {minX:Math.min(...points.map(p=>p[0])),maxX:Math.max(...points.map(p=>p[0])),
    minY:Math.min(...points.map(p=>p[1])),maxY:Math.max(...points.map(p=>p[1]))};
}
function terrainSurfaceFor(geometry){
  const n=DEM.n,step=DEM.size/n;
  return {geometry,query(bounds){
    const offsets=[];
    const loX=Math.max(0,Math.floor((bounds.minX+HALF)/step));
    const hiX=Math.min(n-1,Math.floor((bounds.maxX+HALF)/step));
    const loY=Math.max(0,Math.floor((bounds.minY+HALF)/step));
    const hiY=Math.min(n-1,Math.floor((bounds.maxY+HALF)/step));
    for(let j=loY;j<=hiY;j++)for(let i=loX;i<=hiX;i++){
      const offset=(j*n+i)*6;offsets.push(offset,offset+3);
    }
    return offsets;
  }};
}
function indexedSurface(geometry){
  const size=5,buckets=new Map(),count=geometry.index?.count??geometry.attributes.position.count;
  for(let offset=0;offset<count;offset+=3){
    const triangle=surfaceTriangle(geometry,offset);if(!triangle)continue;
    const bounds=surfaceBounds(triangle.points);
    for(let j=Math.floor(bounds.minY/size);j<=Math.floor(bounds.maxY/size);j++)
      for(let i=Math.floor(bounds.minX/size);i<=Math.floor(bounds.maxX/size);i++){
        const key=i+','+j;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(offset);
      }
  }
  return {geometry,query(bounds){
    const offsets=new Set();
    for(let j=Math.floor(bounds.minY/size);j<=Math.floor(bounds.maxY/size);j++)
      for(let i=Math.floor(bounds.minX/size);i<=Math.floor(bounds.maxX/size);i++)
        for(const offset of buckets.get(i+','+j)||[])offsets.add(offset);
    return offsets;
  }};
}
function triangleIntersection(subject,clip){
  let polygon=subject.map(p=>[p[0],p[1]]);
  const orientation=Math.sign(clip.det);
  for(let edge=0;edge<3&&polygon.length;edge++){
    const a=clip.points[edge],b=clip.points[(edge+1)%3];
    const distance=p=>orientation*((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]));
    const next=[];let previous=polygon[polygon.length-1],before=distance(previous);
    for(const point of polygon){
      const after=distance(point),inside=after>=-1e-9,wasInside=before>=-1e-9;
      if(inside!==wasInside){
        const t=before/(before-after);
        next.push([previous[0]+t*(point[0]-previous[0]),previous[1]+t*(point[1]-previous[1])]);
      }
      if(inside)next.push(point);previous=point;before=after;
    }
    polygon=next;
  }
  return polygon;
}
function surfaceHeightAt(surface,x,y,fallback=-Infinity){
  if(!surface)return fallback;
  let height=fallback;
  for(const offset of surface.query({minX:x,maxX:x,minY:y,maxY:y})){
    const triangle=surfaceTriangle(surface.geometry,offset);if(!triangle)continue;
    const p=triangle.points,sign=Math.sign(triangle.det);
    if(p.every((a,i)=>{const b=p[(i+1)%3];return sign*((b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]))>=-1e-7;}))
      height=Math.max(height,surfacePlaneHeight(triangle,x,y));
  }
  return height;
}
function fitSurfaceAbove(geometry,surface,clearance){
  if(!surface)return;
  const p=geometry.attributes.position,lifts=new Float32Array(p.count);
  const count=geometry.index?.count??p.count;
  for(let offset=0;offset<count;offset+=3){
    const triangle=surfaceTriangle(geometry,offset);if(!triangle)continue;
    let lift=0;
    for(const otherOffset of surface.query(surfaceBounds(triangle.points))){
      const other=surfaceTriangle(surface.geometry,otherOffset);if(!other)continue;
      for(const [x,y] of triangleIntersection(triangle.points,other))
        lift=Math.max(lift,surfacePlaneHeight(other,x,y)+clearance-surfacePlaneHeight(triangle,x,y));
    }
    for(const id of triangle.ids)lifts[id]=Math.max(lifts[id],lift);
  }
  // Closed seams and duplicate paint vertices must share the same final height.
  const shared=new Map();
  for(let i=0;i<p.count;i++){
    const key=p.getX(i)+','+p.getZ(i);
    shared.set(key,Math.max(shared.get(key)??-Infinity,p.getY(i)+lifts[i]));
  }
  for(let i=0;i<p.count;i++)p.setY(i,shared.get(p.getX(i)+','+p.getZ(i))+1e-5);
  p.needsUpdate=true;geometry.computeVertexNormals();
}
function terrainHeightAt(x,y){return surfaceHeightAt(terrainSurface,x,y,heightAt(x,y));}
function raceHeightAt(x,y){return surfaceHeightAt(raceSurface,x,y,terrainHeightAt(x,y));}
function drivingHeightAt(x,y){return playMode==='race'?raceHeightAt(x,y):terrainHeightAt(x,y);}
// Physics slope: goes through the same flat race surface while racing, so the
// circuit's old small hills no longer speed up or slow down a lap.
function drivingGradientAt(x,y,e=3){
  return [(drivingHeightAt(x+e,y)-drivingHeightAt(x-e,y))/(2*e),
          (drivingHeightAt(x,y+e)-drivingHeightAt(x,y-e))/(2*e)];
}
