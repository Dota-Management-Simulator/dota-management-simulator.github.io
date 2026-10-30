import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapEras } from '../src/map-eras';
import { hasMapLineOfSight, hasWalkableMapLine, isTerrainWalkable, nearestWalkablePoint, nextWalkableWaypoint, terrainCellAt, terrainForEra, terrainVisibleTiles, teamVisionCells, visionCells, wardPlacementReason, wardVisionPreview } from '../src/map-vision';
import type { TerrainGrid } from '../src/map-vision';
import { geometryForEra } from '../src/map-geometry';

function flat():TerrainGrid {
  const n=41,size=n*n;
  return {n,x:0,y:0,cellSize:1,height:new Uint16Array(size),treeTop:new Uint16Array(size),walkable:new Uint8Array(size).fill(1),blocker:new Uint8Array(size),noWard:new Uint8Array(size),quality:'traced',label:'Test terrain'};
}
const center=20*41+20;
const at=(dx:number,dy:number)=>center+dx+dy*41;

test('all eleven eras have independent, bounded terrain; exported eras retain real grid facts',()=>{
  const grids=mapEras.map(terrainForEra);
  assert.equal(new Set(grids).size,11);
  assert.deepEqual(grids.map(g=>g.quality),['traced','traced','traced','exported','exported','exported','exported','exported','exported','exported','exported']);
  for(const g of grids) {
    assert.equal(g.height.length,g.n*g.n);
    assert.ok(g.treeTop.filter(v=>v>0).length>8000);
    assert.ok(g.walkable.some(v=>v===1)&&g.walkable.some(v=>v===0));
    assert.ok(g.height.some(v=>v>0));
    assert.ok(g.noWard.some(v=>v===1));
  }
  assert.equal(terrainForEra('2026.1'),grids.at(-1));
  assert.notDeepEqual(grids[0].treeTop,grids[1].treeTop);
  assert.notDeepEqual(grids[1].treeTop,grids[2].treeTop);
  assert.equal(grids[3].n,260);
  assert.equal(grids[10].n,327);
});

test('open ground gives a complete circular footprint and clips outside the map',()=>{
  const map=flat(),seen=terrainVisibleTiles(map,center,10);
  assert.equal(seen.length,317);
  assert.ok(seen.includes(at(10,0))&&!seen.includes(at(10,1)));
  assert.equal(terrainVisibleTiles(map,-1,10).length,0);
  assert.equal(terrainVisibleTiles(map,center,NaN).length,0);
  assert.equal(terrainCellAt(map,NaN,0),-1);
  assert.equal(terrainCellAt(map,-.1,1),-1);
  assert.ok([...terrainVisibleTiles(map,0,10)].every(i=>i>=0&&i<map.n*map.n));
});

test('high ground hides itself and ground behind it; a high observer sees down',()=>{
  const low=flat();for(let y=-3;y<=3;y++)low.height[at(4,y)]=20;
  const seen=terrainVisibleTiles(low,center,12);
  assert.ok(!seen.includes(at(4,0))&&!seen.includes(at(8,0)));
  assert.ok(seen.includes(at(-8,0)));
  const high=flat();high.height.set(low.height);high.height[center]=20;
  assert.ok(terrainVisibleTiles(high,center,12).includes(at(8,0)));
});

test('tree canopy and Valve blockers cast shadows; elevated sources can see over lower trees',()=>{
  const map=flat();for(let y=-2;y<=2;y++)map.treeTop[at(3,y)]=40;
  assert.ok(!terrainVisibleTiles(map,center,12).includes(at(8,0)));
  const high=flat();high.treeTop.set(map.treeTop);high.height[center]=60;
  assert.ok(terrainVisibleTiles(high,center,12).includes(at(8,0)));
  const blocker=flat();for(let y=-2;y<=2;y++)blocker.blocker[at(3,y)]=1;
  assert.ok(!terrainVisibleTiles(blocker,center,12).includes(at(8,0)));
});

test('exact placement rejects trees, forbidden areas, nonfinite and out of bounds; never nudges a chosen ward',()=>{
  for(const era of mapEras) {
    const map=terrainForEra(era);
    const tree=map.treeTop.findIndex(v=>v>0),x=map.x+(tree%map.n+.5)*map.cellSize,y=map.y+(Math.floor(tree/map.n)+.5)*map.cellSize;
    assert.ok(wardPlacementReason(era,x,y));
    assert.equal(wardVisionPreview(era,x,y).valid,false);
    assert.equal(wardVisionPreview(era,x,y).cells.length,0);
    assert.ok(wardPlacementReason(era,NaN,10));
    assert.ok(wardPlacementReason(era,-10000,10));
  }
});

test('preview, engine LOS and team fog agree on exported terrain',()=>{
  for(const era of mapEras) {
    const map=terrainForEra(era),pos=map.walkable.findIndex((walk,i)=>!!walk&&!map.treeTop[i]&&!map.blocker[i]&&!map.noWard[i]);
    const x=map.x+(pos%map.n+.5)*map.cellSize,y=map.y+(Math.floor(pos/map.n)+.5)*map.cellSize;
    const preview=wardVisionPreview(era,x,y,100);
    assert.equal(preview.valid,true,era.id);
    assert.deepEqual(preview.cells,visionCells(era,x,y,100));
    assert.deepEqual(preview.cells,teamVisionCells(era,[{x,y,radius:100}]).cells);
    for(const p of preview.cells.filter((_,i)=>i%23===0))assert.ok(hasMapLineOfSight(era,{x,y},{x:p[0]+map.cellSize/2,y:p[1]+map.cellSize/2},100),era.id);
    assert.deepEqual(teamVisionCells(era,[]).cells,[]);
  }
});

test('source unions do not duplicate overlapping vision and repeated calculations are stable',()=>{
  const era=mapEras.at(-1)!,source={x:400,y:400,radius:100};
  const once=teamVisionCells(era,[source]),twice=teamVisionCells(era,[source,source]);
  assert.deepEqual(once,twice);
  assert.deepEqual(once,teamVisionCells(era,[source]));
});

test('ward cliffs permit exact placement without requiring the hero to stand on the cliff',()=>{
  const era=mapEras.at(-1)!,map=terrainForEra(era);
  let tested=0;
  for(let i=0;i<map.n*map.n&&tested<12;i++) {
    const x=map.x+(i%map.n+.5)*map.cellSize,y=map.y+(Math.floor(i/map.n)+.5)*map.cellSize;
    if(x<50||x>750||y<50||y>750||map.walkable[i]||map.treeTop[i]||map.blocker[i]||map.noWard[i]||map.height[i]<20)continue;
    const ground=nearestWalkablePoint(era,x,y,40);if(!ground)continue;
    assert.equal(wardPlacementReason(era,x,y),undefined);
    assert.equal(wardVisionPreview(era,x,y).valid,true);tested++;
  }
  assert.equal(tested,12,'exported map contains actual legal ward cliff positions');
});

test('every era supports tree-safe base-to-base walking with bounded smoothed waypoints',()=>{
  for(const era of mapEras) {
    const geometry=geometryForEra(era),start=nearestWalkablePoint(era,...geometry.bases[0]),goal=nearestWalkablePoint(era,...geometry.bases[1]);
    assert.ok(start&&goal,`${era.id}: bases project to connected ground`);
    let current=start,steps=0;
    for(;Math.hypot(current.x-goal.x,current.y-goal.y)>4&&steps<100;steps++) {
      const next=nextWalkableWaypoint(era,current,goal);
      assert.ok(next,`${era.id}: route exists`);
      assert.ok(isTerrainWalkable(era,next.x,next.y),`${era.id}: open waypoint`);
      assert.ok(hasWalkableMapLine(era,current,next),`${era.id}: no corner or tree crossing`);
      assert.ok(Math.hypot(next.x-current.x,next.y-current.y)>.01,`${era.id}: no stalled waypoint`);
      current=next;
    }
    assert.ok(steps<100,`${era.id}: converges without route cycles`);
  }
});

test('movement projection preserves an already legal point and rejects nonfinite/unreachable goals',()=>{
  const era=mapEras.at(-1)!,p=nearestWalkablePoint(era,400,400)!;
  assert.deepEqual(nearestWalkablePoint(era,p.x,p.y),p);
  assert.equal(nearestWalkablePoint(era,NaN,400),undefined);
  assert.equal(nearestWalkablePoint(era,-10000,-10000),undefined);
  assert.equal(nextWalkableWaypoint(era,p,{x:NaN,y:400}),undefined);
  assert.equal(nextWalkableWaypoint(era,p,{x:-10000,y:-10000}),undefined);
});
