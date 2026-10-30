import exportedTerrain from './data/map-terrain.json';
import sourceStructures from './data/map-structures.json';
import { earlyTreeGroves } from './early-map-terrain';
import type { TerrainPolygon } from './early-map-terrain';
import { mapEras, mapEraForPatch } from './map-eras';
import type { MapEra } from './map-eras';
import { geometryForEra } from './map-geometry';

export const MAP_VISION_VERSION = 'terrain-vision-v1-exported-and-traced';
export const OBSERVER_VISION_RADIUS = 80;
const terrainSignatureInput=JSON.stringify(exportedTerrain)+JSON.stringify(sourceStructures)+JSON.stringify(['pre682','682','686'].map(earlyTreeGroves));
let terrainSignature=2166136261;
for(let i=0;i<terrainSignatureInput.length;i++)terrainSignature=Math.imul(terrainSignature^terrainSignatureInput.charCodeAt(i),16777619)>>>0;
/** Includes every imported grid and every traced grove; combat-inputs also hashes code. */
export const MAP_TERRAIN_SIGNATURE=`terrain-${terrainSignature.toString(16).padStart(8,'0')}`;
export type VisionPoint = {x:number;y:number} | readonly [number,number];
export interface VisionSource { x:number;y:number;radius:number; }
export interface TerrainGrid {
  n:number;x:number;y:number;cellSize:number;
  height:Uint16Array;treeTop:Uint16Array;walkable:Uint8Array;blocker:Uint8Array;noWard:Uint8Array;
  quality:'exported'|'traced';label:string;
}
export interface WardVisionPreview {
  valid:boolean;reason?:string;cells:[number,number][];cellSize:number;
  bounds:{x:number;y:number;width:number;height:number};radius:number;
  terrainQuality:TerrainGrid['quality'];terrainLabel:string;
}
const terrainCache=new Map<string,TerrainGrid>();
const fields=new WeakMap<TerrainGrid,Map<string,Int32Array>>();
const point=(p:VisionPoint):[number,number]=>Array.isArray(p)?[p[0],p[1]]:[(p as {x:number}).x,(p as {y:number}).y];
function eraOf(era:MapEra|string):MapEra {
  return typeof era==='string'?(mapEras.find(e=>e.id===era)??mapEraForPatch({id:era})):era;
}
function inside(x:number,y:number,polygon:TerrainPolygon) {
  let result=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const a=polygon[i],b=polygon[j];
    if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])result=!result;
  }
  return result;
}
function segmentGap(x:number,y:number,a:readonly[number,number],b:readonly[number,number]) {
  const dx=b[0]-a[0],dy=b[1]-a[1],q=dx*dx+dy*dy;
  const t=q?Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/q)):0;
  return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);
}
/** Every displayed era has its own terrain. 7.00+ imports actual exported grid
 * facts. The earlier illustrated grove footprints are explicitly approximate. */
export function terrainForEra(value:MapEra|string):TerrainGrid {
  const era=eraOf(value),existing=terrainCache.get(era.id);if(existing)return existing;
  const raw=(exportedTerrain as Record<string,{n:number;worldMin:number;worldMax:number;runs:string}>)[era.id];
  const n=raw?.n??200,size=n*n;
  const result:TerrainGrid={n,x:raw?400+raw.worldMin/20:0,y:raw?400-raw.worldMax/20:0,cellSize:raw?3.2:4,
    height:new Uint16Array(size),treeTop:new Uint16Array(size),walkable:new Uint8Array(size),blocker:new Uint8Array(size),noWard:new Uint8Array(size),
    quality:raw?'exported':'traced',label:raw?`${era.version} exported terrain; aligned overview`:`${era.version} traced groves and ground (approximate)`};
  if(raw) {
    let at=0;
    for(const run of raw.runs.split(',')) {
      const [v,c]=run.split('.'),value=parseInt(v,36),count=parseInt(c,36);
      if(!Number.isFinite(count)||count<1||at+count>size)throw Error(`Invalid terrain grid ${era.id}`);
      result.height.fill(value&255,at,at+count);result.treeTop.fill((value>>8)&511,at,at+count);
      result.walkable.fill((value>>17)&1,at,at+count);result.blocker.fill((value>>18)&1,at,at+count);result.noWard.fill((value>>19)&1,at,at+count);at+=count;
    }
    if(at!==size)throw Error(`Incomplete terrain grid ${era.id}`);
  } else {
    const groves=earlyTreeGroves(era.id),geometry=geometryForEra(era);
    for(let row=0;row<n;row++)for(let col=0;col<n;col++) {
      const i=row*n+col,x=(col+.5)*4,y=(row+.5)*4;
      const border=x<12||y<12||x>788||y>788;
      const river=geometry.river.some((p,k)=>k>0&&segmentGap(x,y,geometry.river[k-1],p)<17);
      const base=geometry.bases.some(p=>Math.hypot(p[0]-x,p[1]-y)<83);
      result.height[i]=base?40:river?0:20;
      result.treeTop[i]=groves.some(p=>inside(x/8,y/8,p))?result.height[i]+40:0;
      result.blocker[i]=Number(border);result.walkable[i]=Number(!border&&!result.treeTop[i]);result.noWard[i]=Number(border);
    }
  }
  terrainCache.set(era.id,result);return result;
}
export function terrainCellAt(map:TerrainGrid,x:number,y:number):number {
  if(!Number.isFinite(x)||!Number.isFinite(y))return -1;
  const col=Math.floor((x-map.x)/map.cellSize),row=Math.floor((y-map.y)/map.cellSize);
  return col<0||row<0||col>=map.n||row>=map.n?-1:row*map.n+col;
}
/** Source-relative elevation/tree shadows. A tile's blocking terrain and the
 * ground behind it remain hidden; high ground sees over lower tree canopies. */
export function terrainVisibleTiles(map:TerrainGrid,at:number,radius:number):Int32Array {
  if(at<0||at>=map.n*map.n||!Number.isFinite(radius)||radius<0)return new Int32Array();
  let cache=fields.get(map);if(!cache){cache=new Map();fields.set(map,cache);}
  const r=Math.min(map.n,Math.floor(radius/map.cellSize)),key=`${at}:${r}`;
  const cached=cache.get(key);if(cached)return cached;
  const n=map.n,cx=at%n,cy=Math.floor(at/n),height=map.height[at],seen=new Set<number>([at]);
  const opaque=(x:number,y:number)=>x<0||y<0||x>=n||y>=n||map.height[y*n+x]>height||map.treeTop[y*n+x]>height||map.blocker[y*n+x]===1;
  const cast=(row:number,start:number,end:number,xx:number,xy:number,yx:number,yy:number)=>{
    if(start<end)return;
    let next=start;
    for(let distance=row;distance<=r;distance++) {
      let blocked=false;
      for(let dx=-distance;dx<=0;dx++) {
        const dy=-distance,left=(dx-.5)/(dy+.5),right=(dx+.5)/(dy-.5);
        if(start<right)continue;if(end>left)break;
        const x=cx+dx*xx+dy*xy,y=cy+dx*yx+dy*yy,wall=opaque(x,y);
        if(!wall&&dx*dx+dy*dy<=r*r)seen.add(y*n+x);
        if(blocked){if(wall){next=right;continue;}blocked=false;start=next;}
        else if(wall&&distance<r){blocked=true;cast(distance+1,start,left,xx,xy,yx,yy);next=right;}
      }
      if(blocked)break;
    }
  };
  for(const [xx,xy,yx,yy]of[[1,0,0,1],[0,1,1,0],[0,-1,1,0],[-1,0,0,1],[-1,0,0,-1],[0,-1,-1,0],[0,1,-1,0],[1,0,0,-1]])cast(1,1,0,xx,xy,yx,yy);
  const out=Int32Array.from(seen).sort();
  // Bound moving-hero cache memory; no per-tick accumulation across long maps.
  if(cache.size>=256)cache.delete(cache.keys().next().value!);
  cache.set(key,out);return out;
}
/** Both engine sight and the preview use the same shadowcasting footprint. */
export function hasMapLineOfSight(era:MapEra|string,from:VisionPoint,to:VisionPoint,radius=240):boolean {
  const map=terrainForEra(era),[x,y]=point(from),[tx,ty]=point(to),a=terrainCellAt(map,x,y),b=terrainCellAt(map,tx,ty);
  if(a<0||b<0)return false;
  if(a===b)return true;
  const seen=terrainVisibleTiles(map,a,radius);
  let lo=0,hi=seen.length-1;while(lo<=hi){const mid=(lo+hi)>>1,v=seen[mid];if(v===b)return true;if(v<b)lo=mid+1;else hi=mid-1;}return false;
}
export function wardPlacementReason(era:MapEra|string,x:number,y:number):string|undefined {
  const map=terrainForEra(era),at=terrainCellAt(map,x,y);
  if(at<0)return 'Choose a position inside the battlefield.';
  if(map.noWard[at])return 'Wards cannot be placed in this area.';
  if(map.treeTop[at])return 'A tree occupies this position.';
  // Ward cliffs are intentionally unwalkable. Placement legality comes from
  // the exported no-ward layer; the hero casts from nearby reachable ground.
  if(map.blocker[at])return 'Terrain blocks placement at this position.';
  return undefined;
}
export function visionCells(era:MapEra|string,x:number,y:number,radius:number):[number,number][] {
  const map=terrainForEra(era),at=terrainCellAt(map,x,y);
  return Array.from(terrainVisibleTiles(map,at,radius),i=>[map.x+(i%map.n)*map.cellSize,map.y+Math.floor(i/map.n)*map.cellSize]);
}
export function wardVisionPreview(era:MapEra|string,x:number,y:number,radius=OBSERVER_VISION_RADIUS):WardVisionPreview {
  const map=terrainForEra(era),reason=wardPlacementReason(era,x,y);
  return {valid:!reason,reason,cells:reason?[]:visionCells(era,x,y,radius),cellSize:map.cellSize,
    bounds:{x:map.x,y:map.y,width:map.n*map.cellSize,height:map.n*map.cellSize},radius,terrainQuality:map.quality,terrainLabel:map.label};
}
/** Union for the fog renderer; sources use the exact same cells as ward preview.
 * Sorting and row merging let callers render hundreds of rects, not thousands. */
export function teamVisionCells(era:MapEra|string,sources:readonly VisionSource[]):{cells:[number,number][];cellSize:number} {
  const map=terrainForEra(era),union=new Set<number>();
  for(const s of sources)for(const i of terrainVisibleTiles(map,terrainCellAt(map,s.x,s.y),s.radius))union.add(i);
  return {cells:Array.from(union).sort((a,b)=>a-b).map(i=>[map.x+(i%map.n)*map.cellSize,map.y+Math.floor(i/map.n)*map.cellSize]),cellSize:map.cellSize};
}

const movementCache=new WeakMap<TerrainGrid,Uint8Array>();
/** Isolated ward cliffs and pockets are valid terrain but cannot be reached by
 * walking. Strategic ground movement uses the main connected walkable region. */
function movementCells(map:TerrainGrid):Uint8Array {
  const cached=movementCache.get(map);if(cached)return cached;
  const size=map.n*map.n,open=new Uint8Array(size),seen=new Uint8Array(size),queue=new Int32Array(size);
  for(let i=0;i<size;i++)open[i]=Number(map.walkable[i]===1&&map.treeTop[i]===0);
  let largest:number[]=[];
  for(let start=0;start<size;start++) {
    if(!open[start]||seen[start])continue;
    let read=0,length=1;queue[0]=start;seen[start]=1;
    while(read<length){const at=queue[read++],x=at%map.n,y=Math.floor(at/map.n);
      for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
        const next=at+dx+dy*map.n;if(x+dx<0||y+dy<0||x+dx>=map.n||y+dy>=map.n||!open[next]||seen[next])continue;
        seen[next]=1;queue[length++]=next;
      }
    }
    if(length>largest.length)largest=Array.from(queue.subarray(0,length));
  }
  const result=new Uint8Array(size);for(const i of largest)result[i]=1;
  movementCache.set(map,result);return result;
}
const walkAt=(map:TerrainGrid,i:number)=>i>=0&&i<map.n*map.n&&movementCells(map)[i]===1;
const cellPoint=(map:TerrainGrid,i:number)=>({x:map.x+(i%map.n+.5)*map.cellSize,y:map.y+(Math.floor(i/map.n)+.5)*map.cellSize});
export function isTerrainWalkable(era:MapEra|string,x:number,y:number):boolean {
  const map=terrainForEra(era);return walkAt(map,terrainCellAt(map,x,y));
}
/** Spawn/retreat correction only. Ward placement never silently moves a click. */
export function nearestWalkablePoint(era:MapEra|string,x:number,y:number,maxRadius=64):{x:number;y:number}|undefined {
  const map=terrainForEra(era),at=terrainCellAt(map,x,y);
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(maxRadius)||maxRadius<0)return;
  if(walkAt(map,at))return {x,y};
  const col=Math.floor((x-map.x)/map.cellSize),row=Math.floor((y-map.y)/map.cellSize),r=Math.ceil(maxRadius/map.cellSize);
  let best=-1,gap=maxRadius*maxRadius;
  for(let y0=Math.max(0,row-r);y0<=Math.min(map.n-1,row+r);y0++)for(let x0=Math.max(0,col-r);x0<=Math.min(map.n-1,col+r);x0++) {
    const i=y0*map.n+x0;if(!walkAt(map,i))continue;
    const p=cellPoint(map,i),d=(x-p.x)**2+(y-p.y)**2;
    if(d<gap){best=i;gap=d;}
  }
  return best>=0?cellPoint(map,best):undefined;
}
function walkLine(map:TerrainGrid,from:VisionPoint,to:VisionPoint):boolean {
  const [ax,ay]=point(from),[bx,by]=point(to),a=terrainCellAt(map,ax,ay),b=terrainCellAt(map,bx,by);
  if(!walkAt(map,a)||!walkAt(map,b))return false;
  let x=a%map.n,y=Math.floor(a/map.n);
  const dx=bx-ax,dy=by-ay,sx=Math.sign(dx),sy=Math.sign(dy),tx=dx?map.cellSize/Math.abs(dx):Infinity,ty=dy?map.cellSize/Math.abs(dy):Infinity;
  let nextX=dx?((map.x+(sx>0?x+1:x)*map.cellSize-ax)/dx):Infinity;
  let nextY=dy?((map.y+(sy>0?y+1:y)*map.cellSize-ay)/dy):Infinity;
  for(let count=0;count<map.n*2+2;count++) {
    if(x+y*map.n===b)return true;
    if(Math.abs(nextX-nextY)<1e-10) {
      if(!walkAt(map,y*map.n+x+sx)||!walkAt(map,(y+sy)*map.n+x))return false;
      x+=sx;y+=sy;nextX+=tx;nextY+=ty;
    }else if(nextX<nextY){x+=sx;nextX+=tx;}else{y+=sy;nextY+=ty;}
    if(x<0||y<0||x>=map.n||y>=map.n||!walkAt(map,y*map.n+x))return false;
  }
  return false;
}
export function hasWalkableMapLine(era:MapEra|string,from:VisionPoint,to:VisionPoint):boolean {
  return walkLine(terrainForEra(era),from,to);
}
interface RouteWork { cost:Float32Array;parent:Int32Array;stamp:Uint32Array;generation:number;routes:Map<number,Map<number,number>>; }
const routeWork=new WeakMap<TerrainGrid,RouteWork>();
/** Bounded grid A*: no tree crossing or diagonal corner cutting. Routes cache
 * next hops toward a destination; callers can retain their own current waypoint.
 * A disconnected or excessively long search returns undefined, never a shortcut
 * through blocked terrain. Existing strategic lane routing supplies the goals.
 * The cache holds one A* path per (start cell, goal cell), a pure function of
 * that pair, so a hit always equals a fresh search. Battles share it without
 * one simulation's history changing another's routes. */
export function nextWalkableWaypoint(era:MapEra|string,from:VisionPoint,to:VisionPoint):{x:number;y:number}|undefined {
  const map=terrainForEra(era),[fx,fy]=point(from),[tx,ty]=point(to);
  const start=nearestWalkablePoint(era,fx,fy,32),target=nearestWalkablePoint(era,tx,ty,64);
  if(!start||!target)return;
  if(start.x!==fx||start.y!==fy)return start;
  if(walkLine(map,start,target))return target;
  const a=terrainCellAt(map,fx,fy),b=terrainCellAt(map,target.x,target.y);
  let work=routeWork.get(map);
  if(!work){work={cost:new Float32Array(map.n*map.n),parent:new Int32Array(map.n*map.n),stamp:new Uint32Array(map.n*map.n),generation:0,routes:new Map()};routeWork.set(map,work);}
  const key=a*map.n*map.n+b;
  let hops=work.routes.get(key);
  const smooth=()=>{
    if(!hops?.has(a))return undefined;
    let cursor=a,chosen=a;
    for(let limit=0;limit<96&&cursor!==b;limit++) {
      const next=hops.get(cursor);if(next==null)break;
      if(!walkLine(map,start,cellPoint(map,next)))break;
      chosen=next;cursor=next;
    }
    return chosen===a?undefined:cellPoint(map,chosen);
  };
  if(hops)return smooth();
  // Lazy initialization avoids filling 100,000 costs on every moving target.
  work.generation++;if(work.generation===0xffffffff){work.stamp.fill(0);work.generation=1;}
  const generation=work.generation,heap:{id:number;priority:number}[]=[];
  const push=(id:number,priority:number)=>{
    let i=heap.length;heap.push({id,priority});
    while(i>0){const parent=(i-1)>>1;if(heap[parent].priority<=priority)break;heap[i]=heap[parent];i=parent;}heap[i]={id,priority};
  };
  const pop=()=>{
    const top=heap[0],last=heap.pop()!;
    if(heap.length){let i=0;while(true){let child=i*2+1;if(child>=heap.length)break;if(child+1<heap.length&&heap[child+1].priority<heap[child].priority)child++;if(heap[child].priority>=last.priority)break;heap[i]=heap[child];i=child;}heap[i]=last;}
    return top.id;
  };
  const bx=b%map.n,by=Math.floor(b/map.n);
  const heuristic=(i:number)=>{const dx=Math.abs(i%map.n-bx),dy=Math.abs(Math.floor(i/map.n)-by);return (Math.max(dx,dy)+.41421356*Math.min(dx,dy))*1.3;};
  work.cost[a]=0;work.stamp[a]=generation;work.parent[a]=-1;push(a,heuristic(a));
  let reached=false;
  for(let visited=0;heap.length&&visited<32000;visited++) {
    const id=pop();if(id===b){reached=true;break;}
    const col=id%map.n,row=Math.floor(id/map.n),g=work.cost[id];
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++) {
      if((!dx&&!dy)||col+dx<0||row+dy<0||col+dx>=map.n||row+dy>=map.n)continue;
      const next=id+dy*map.n+dx;
      if(!walkAt(map,next)||(dx&&dy&&(!walkAt(map,id+dx)||!walkAt(map,id+dy*map.n))))continue;
      const cost=g+(dx&&dy?1.41421356:1);
      if(work.stamp[next]===generation&&work.cost[next]<=cost)continue;
      work.cost[next]=cost;work.stamp[next]=generation;work.parent[next]=id;push(next,cost+heuristic(next));
    }
  }
  hops=new Map();
  let cursor=b;
  // Unreachable or broken paths cache as empty, which smooth() reports as no route.
  for(let limit=0;reached&&cursor!==a&&limit<map.n*map.n;limit++){const previous=work.parent[cursor];if(previous<0){hops.clear();break;}hops.set(previous,cursor);cursor=previous;}
  if(work.routes.size>=1024)work.routes.delete(work.routes.keys().next().value!);
  work.routes.set(key,hops);
  return smooth();
}
