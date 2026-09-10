#!/usr/bin/env python3
"""
build_campus.py — regenerate data/valrose.geojson from source data.

Inputs (in ../data):
    valrose-osm-extract.osm   OpenStreetMap extract of the campus (ODbL)
    lap-waypoints.gpx         the lap, as ordered waypoints

What it does:
    1. Reads the OSM extract: park polygon, buildings (with names and levels),
       the alley network, ponds and fountains.
    2. Puts the local metric origin on the campus polygon's centroid.
    3. Snaps each GPX waypoint to the nearest junction in the alley graph and
       runs Dijkstra between consecutive ones, so every metre of the circuit
       sits on a way that exists. Footways cost more than service roads.
    4. Marks as "bridge" any footprint that OSM itself routes a way through —
       the covered passages you drive under. Detecting these from the smoothed
       racing line instead missed one and wedged the kart in it permanently.
    5. Centres the line where an alley threads between two walls, then scatters
       trees on open ground clear of the buildings and the circuit.

Requires: numpy, scipy, matplotlib.
Run from tools/:  python3 build_campus.py

Relief is NOT generated here. The default surface is fitted to the GPX
elevations and lives in src/02-relief.js; the game replaces it at runtime
with IGN RGE ALTI via the "Relief only (IGN)" button.
"""
import os, sys
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data'))

import xml.etree.ElementTree as ET, numpy as np, math, json, heapq, collections

R=ET.parse('valrose-osm-extract.osm').getroot()
N={n.get('id'):(float(n.get('lon')),float(n.get('lat'))) for n in R.findall('node')}
tags=lambda e:{t.get('k'):t.get('v') for t in e.findall('tag')}
WAYS={w.get('id'):(tags(w),[n.get('ref') for n in w.findall('nd')]) for w in R.findall('way')}
RELS=[(tags(r),[(m.get('type'),m.get('ref'),m.get('role')) for m in r.findall('member')])
      for r in R.findall('relation')]

# origin at the centroid of the real campus polygon
uni=next((t,nd) for t,nd in WAYS.values() if t.get('amenity')=='university')
L0=(7.2664257,43.7154157); ML=111132.0; MO=111320.0*math.cos(math.radians(43.7154157))
pts=np.array([[(N[i][0]-L0[0])*MO,(N[i][1]-L0[1])*ML] for i in uni[1] if i in N])
cx,cy=pts.mean(0)
ORIGIN=(L0[0]+cx/MO, L0[1]+cy/ML)
M_LAT=111132.0; M_LON=111320.0*math.cos(math.radians(ORIGIN[1]))
print("origin: %.7f, %.7f"%(ORIGIN[1],ORIGIN[0]))
loc=lambda lon,lat:((lon-ORIGIN[0])*M_LON,(lat-ORIGIN[1])*M_LAT)
ll=lambda x,y:[round(ORIGIN[0]+x/M_LON,7),round(ORIGIN[1]+y/M_LAT,7)]
HALF=300

feats=[]
def ring(nd):
    c=[list(N[i]) for i in nd if i in N]
    if c and c[0]!=c[-1]: c.append(c[0])
    return c
def inbox(c,pad=40):
    return any(abs(loc(*p)[0])<HALF+pad and abs(loc(*p)[1])<HALF+pad for p in c)

# campus
feats.append({"type":"Feature","properties":{"role":"ground","name":uni[0].get('name'),"leisure":"park"},
              "geometry":{"type":"Polygon","coordinates":[ring(uni[1])]}})
for t,nd in WAYS.values():
    if t.get('leisure') in ('park','garden') and inbox(ring(nd)):
        feats.append({"type":"Feature","properties":{"role":"ground","leisure":t['leisure']},
                      "geometry":{"type":"Polygon","coordinates":[ring(nd)]}})

# buildings, with real names and heights
nb=0
def addb(t,c):
    global nb
    lv=t.get('building:levels'); h=t.get('height')
    try: H=float(h) if h else (float(lv)*3.4+3 if lv else 12)
    except: H=12
    feats.append({"type":"Feature","properties":{
        "building":t.get('building','yes'),"name":t.get('name',""),
        "height":round(min(45,max(5,H)),1),
        "landmark":bool(t.get('name') and 'hâteau' in t['name'])},
        "geometry":{"type":"Polygon","coordinates":[c]}})
    nb+=1
seen=set()
for t,mem in RELS:
    if not t.get('building'): continue
    for ty,ref,role in mem:
        if ty=='way' and role in ('outer','') and ref in WAYS:
            seen.add(ref); c=ring(WAYS[ref][1])
            if len(c)>3 and inbox(c): addb(t,c)
for wid,(t,nd) in WAYS.items():
    if not t.get('building') or wid in seen: continue
    c=ring(nd)
    if len(c)>3 and inbox(c): addb(t,c)

# water
nw=0
for t,nd in WAYS.values():
    if t.get('natural')=='water' or t.get('amenity')=='fountain' or t.get('leisure')=='swimming_pool':
        c=ring(nd)
        if len(c)>3 and inbox(c):
            feats.append({"type":"Feature","properties":{"natural":"water"},
                          "geometry":{"type":"Polygon","coordinates":[c]}}); nw+=1

# the alley network
DRIVE={'service','residential','tertiary','unclassified','living_street','pedestrian','footway','path','track'}
nr=0; edges=[]
for t,nd in WAYS.values():
    hw=t.get('highway')
    if not hw: continue
    c=[list(N[i]) for i in nd if i in N]
    if len(c)<2 or not inbox(c): continue
    feats.append({"type":"Feature","properties":{"highway":hw},
                  "geometry":{"type":"LineString","coordinates":c}}); nr+=1
    if hw in DRIVE:
        ids=[i for i in nd if i in N]
        for a,b in zip(ids,ids[1:]): edges.append((a,b,hw))
print("campus %.1f ha | %d buildings | %d water | %d ways (%d drivable segments)"%(
    0.5*abs(np.dot(pts[:,0],np.roll(pts[:,1],1))-np.dot(pts[:,1],np.roll(pts[:,0],1)))/1e4,nb,nw,nr,len(edges)))
json.dump({"feats":feats,"edges":edges,"origin":ORIGIN},open('.stage.json','w'))
import json, math, heapq, numpy as np, xml.etree.ElementTree as ET
st=json.load(open('.stage.json')); ORIGIN=st['origin']
M_LAT=111132.0; M_LON=111320.0*math.cos(math.radians(ORIGIN[1]))
loc=lambda lon,lat:((lon-ORIGIN[0])*M_LON,(lat-ORIGIN[1])*M_LAT)
R=ET.parse('valrose-osm-extract.osm').getroot()
N={n.get('id'):(float(n.get('lon')),float(n.get('lat'))) for n in R.findall('node')}
XY={i:loc(*N[i]) for i in N}

# undirected graph; footways cost a little more than service roads
COST={'service':1.0,'residential':1.0,'tertiary':1.0,'unclassified':1.0,
      'living_street':1.0,'pedestrian':1.3,'footway':1.5,'path':1.7,'track':1.2}
adj={}
for a,b,hw in st['edges']:
    d=math.dist(XY[a],XY[b])*COST.get(hw,1.5)
    adj.setdefault(a,[]).append((b,d,math.dist(XY[a],XY[b])))
    adj.setdefault(b,[]).append((a,d,math.dist(XY[a],XY[b])))
print("graph: %d junctions, %d links"%(len(adj),sum(len(v) for v in adj.values())//2))

g=ET.parse('lap-waypoints.gpx').getroot()
ns={'g':'http://www.topografix.com/GPX/1/1'}
W=[(w.find('g:name',ns).text, float(w.get('lon')), float(w.get('lat')),
    float(w.find('g:ele',ns).text)) for w in g.findall('.//g:wpt',ns)]
anchors=[]
for nm,lo,la,el in W:
    p=loc(lo,la)
    best=min(adj, key=lambda i: math.dist(XY[i],p))
    anchors.append((nm,best,math.dist(XY[best],p),p,el))
print("waypoint -> nearest junction:")
for nm,i,d,p,el in anchors: print("  %-18s snap %5.1f m   at (%6.1f, %6.1f)  ele %.1f"%(nm,d,*p,el))

def dij(s,t):
    D={s:0}; prev={}; Q=[(0,s)]; seen=set()
    while Q:
        d,u=heapq.heappop(Q)
        if u in seen: continue
        seen.add(u)
        if u==t: break
        for v,c,_ in adj.get(u,[]):
            nd=d+c
            if nd<D.get(v,1e18): D[v]=nd; prev[v]=u; heapq.heappush(Q,(nd,v))
    if t not in seen: return None
    p=[t]
    while p[-1]!=s: p.append(prev[p[-1]])
    return p[::-1]

seq=[a[1] for a in anchors]
route=[]; total=0; miss=0
for i in range(len(seq)):
    a,b=seq[i],seq[(i+1)%len(seq)]
    if a==b: continue
    p=dij(a,b)
    if p is None: miss+=1; print("  !! no route %s -> %s"%(anchors[i][0],anchors[(i+1)%len(seq)][0])); continue
    for u,v in zip(p,p[1:]): total+=math.dist(XY[u],XY[v])
    route += p[:-1]
print("routed lap: %.0f m through %d junctions (%d gaps)"%(total,len(route),miss))
P=np.array([XY[i] for i in route])
json.dump({"route":P.tolist(),"wpts":[[nm,p[0],p[1],el] for nm,_,_,p,el in anchors]},open('.route.json','w'))
import json, math, numpy as np
from matplotlib.path import Path as MplPath
st=json.load(open('.stage.json')); ORIGIN=st['origin']; feats=st['feats']
M_LAT=111132.0; M_LON=111320.0*math.cos(math.radians(ORIGIN[1]))
ll=lambda x,y:[round(ORIGIN[0]+x/M_LON,7),round(ORIGIN[1]+y/M_LAT,7)]
mt=lambda p:[(p[0]-ORIGIN[0])*M_LON,(p[1]-ORIGIN[1])*M_LAT]
HALF=300
P=np.array(json.load(open('.route.json'))['route'])

def resample(A,step):
    A=np.vstack([A,A[:1]]); d=np.r_[0,np.cumsum(np.hypot(*np.diff(A,axis=0).T))]
    t=np.arange(0,d[-1],step); return np.c_[np.interp(t,d,A[:,0]),np.interp(t,d,A[:,1])]
def lap(A): return np.roll(A,1,0)+np.roll(A,-1,0)-2*A
T=resample(P,4.0)
for _ in range(25): T=T+0.33*lap(T); T=T-0.34*lap(T)
T=resample(T,4.0)
Lm=np.hypot(*np.diff(np.vstack([T,T[:1]]),axis=0).T).sum()

BP=[]; BI=[]
for k,f in enumerate(feats):
    if f["properties"].get("building"):
        BP.append(np.array([mt(p) for p in f["geometry"]["coordinates"][0]])); BI.append(k)
paths=[MplPath(q) for q in BP]
# A passage is where OSM itself routes a way through a footprint — a covered
# walkway under a building. Testing against my smoothed line instead would have
# missed one of them and wedged the kart in it.
import xml.etree.ElementTree as ET
_R=ET.parse('valrose-osm-extract.osm').getroot()
_N={n.get('id'):(float(n.get('lon')),float(n.get('lat'))) for n in _R.findall('node')}
_lc=lambda lon,lat:np.array([(lon-ORIGIN[0])*M_LON,(lat-ORIGIN[1])*M_LAT])
bridge=set()
for _w in _R.findall('way'):
    _t={x.get('k'):x.get('v') for x in _w.findall('tag')}
    if not _t.get('highway') or _t['highway']=='steps': continue
    _p=[_lc(*_N[i]) for i in [n.get('ref') for n in _w.findall('nd')] if i in _N]
    if len(_p)<2: continue
    _d=[]
    for a,b in zip(_p,_p[1:]):
        for u in np.linspace(0,1,max(2,int(np.hypot(*(b-a))/1.5))): _d.append(a+(b-a)*u)
    _d=np.array(_d)
    for j,pa in enumerate(paths):
        if pa.contains_points(_d).sum()>=2: bridge.add(j)
inside=np.array([p.contains_points(T).sum() for p in paths])
bridge |= set(np.nonzero(inside>=2)[0])
def gap(skip):
    m=1e9
    for j,q in enumerate(BP):
        if j in skip: continue
        e=np.roll(q,-1,0); dd=e-q; L2=np.maximum((dd*dd).sum(1),1e-9)
        for pt in T:
            t=np.clip(((pt-q)*dd).sum(1)/L2,0,1); c=q+dd*t[:,None]
            m=min(m,np.hypot(*(pt-c).T).min())
    return m
print("lap %.0f m, %d nodes | %d footprints driven under | tightest gap to a wall %.1f m"
      %(Lm,len(T),len(bridge),gap(bridge)))
for j in bridge:
    feats[BI[j]]["properties"]["bridge"]=True
    feats[BI[j]]["properties"]["height"]=min(12,feats[BI[j]]["properties"]["height"])
    print("   under:", feats[BI[j]]["properties"]["name"] or "(unnamed)")

# centre the line in the gaps where an alley threads between two walls
def wall(pt,skip):
    best=(1e9,None)
    for j,q in enumerate(BP):
        if j in skip: continue
        e=np.roll(q,-1,0); dd=e-q; L2=np.maximum((dd*dd).sum(1),1e-9)
        t=np.clip(((pt-q)*dd).sum(1)/L2,0,1); c=q+dd*t[:,None]
        h=np.hypot(*(pt-c).T); i=h.argmin()
        if h[i]<best[0]: best=(h[i],c[i])
    return best
orig=T.copy(); tight=0
for _ in range(40):
    for i,pt in enumerate(T):
        d,c=wall(pt,bridge)
        if d<2.6:
            v=pt-c; n=np.hypot(*v) or 1
            cand=pt+v/n*0.25
            if np.hypot(*(cand-orig[i]))<=2.0: T[i]=cand
T=T+0.25*lap(T)
mv=np.hypot(*(T-orig).T)
print("centred in tight gaps: mean %.2f m, max %.2f m | tightest gap now %.1f m"%(mv.mean(),mv.max(),gap(bridge)))

feats.insert(1,{"type":"Feature","properties":{"role":"track","name":"Circuit Valrose"},
                "geometry":{"type":"LineString","coordinates":[ll(*p) for p in T]+[ll(*T[0])]}})

# trees: inside the campus, off the buildings, off the racing line
camp=MplPath(np.array([mt(p) for p in feats[0]["geometry"]["coordinates"][0]]))
rng=np.random.default_rng(3); trees=[]
while len(trees)<190:
    p=rng.uniform(-HALF,HALF,2)
    if not camp.contains_point(p): continue
    if np.hypot(*(T-p).T).min()<14: continue
    if any(pa.contains_point(p) for pa in paths): continue
    if trees and np.hypot(*(np.array(trees)-p).T).min()<15: continue
    trees.append(p.tolist())
for x,y in trees:
    feats.append({"type":"Feature","properties":{"natural":"tree"},
                  "geometry":{"type":"Point","coordinates":ll(x,y)}})
json.dump({"type":"FeatureCollection","features":feats},open('valrose.geojson','w'),separators=(',',':'))
import os; print("pack %d KB | %d features | %d trees"%(os.path.getsize('valrose.geojson')//1024,len(feats),len(trees)))
