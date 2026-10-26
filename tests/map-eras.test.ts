import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mapChangeForPatch, mapEraForPatch, mapEras, roshanPit } from "../src/map-eras";
import { geometryForEra } from "../src/map-geometry";
import { pathsForEra } from "../src/map-paths";
import { historicalPatches, patchForSeason } from "../src/patches";
import { LaneBattle } from "../src/battle";
import { mapStructures } from "../src/map-objectives";
import { buildBattleConfig, createCampaign, DEFAULT_SETTINGS, events, prepareEvent } from "../src/game";

test("each composite shows the Dota map of its era", () => {
  const at = (id: string) => mapEraForPatch({ id }).version;
  assert.equal(at("2011.1"), "6.70–6.81");
  assert.equal(at("2014.2"), "6.70–6.81");
  assert.equal(at("2015.1"), "6.82");
  assert.equal(at("2017.1"), "7.00");
  assert.equal(at("2019.1"), "7.20");
  assert.equal(at("2023.1"), "7.33");
  assert.equal(at("2025.1"), "7.38");
  assert.equal(at("2026.2"), "7.40");
  assert.equal(mapEraForPatch(patchForSeason(2028, 1)).version, "7.40");
  for (const era of mapEras) {
    assert.ok(existsSync(`public/${era.image}`), era.image);
    assert.ok(historicalPatches.some(p => p.id === era.firstPatch), era.firstPatch);
  }
});

test("patch notes list map changes only when a new map arrives", () => {
  assert.equal(mapChangeForPatch({ id: "2017.1" })?.version, "7.00");
  assert.equal(mapChangeForPatch({ id: "2017.2" }), undefined);
  assert.ok(mapEras.every(era => era.changes.length && era.source.startsWith("https://")));
});

test("two-pit eras move Roshan with day and night", () => {
  const waters = mapEraForPatch({ id: "2025.1" }), frontiers = mapEraForPatch({ id: "2023.1" }), classic = mapEraForPatch({ id: "2012.1" });
  assert.deepEqual(roshanPit(waters, 400), waters.roshan.day, "7.38 starts in the bottom pit until 15:00");
  assert.deepEqual(roshanPit(waters, 1000), waters.roshan.night, "15:00–20:00 is night");
  assert.deepEqual(roshanPit(waters, 1300), waters.roshan.day);
  assert.deepEqual(roshanPit(frontiers, 400), frontiers.roshan.night);
  assert.deepEqual(roshanPit(classic, 1300), classic.roshan.day);
});

test("walkers reach the far side of every map without crossing blocked terrain", () => {
  for (const era of mapEras) {
    const paths = pathsForEra(era);
    const geometry = geometryForEra(era), [radiant,dire] = geometry.bases;
    for (const lane of geometry.lanes) for (const [x,y] of lane)
      assert.ok(paths.isWalkable(x,y), `${era.id} lane (${x},${y})`);
    const trips: [number, number, number, number][] = [
      [...radiant, ...era.roshan.day], [...radiant, ...dire],
      [...dire, ...geometry.lanes[2][3]], [...geometry.lanes[0][3], ...geometry.lanes[2][6]],
      ...(era.roshan.night ? [[...radiant,...era.roshan.night] as [number,number,number,number]] : []),
      ...geometry.camps.map(p => [...radiant,...p] as [number,number,number,number]),
    ];
    for (const [ax, ay, bx, by] of trips) {
      let x = ax, y = ay, steps = 0;
      while (Math.hypot(bx - x, by - y) > 4 && steps++ < 600) {
        const [wx, wy] = paths.waypoint(x, y, bx, by), d = Math.hypot(wx - x, wy - y);
        const step = Math.min(d, 5);
        x += (wx - x) / d * step; y += (wy - y) / d * step;
        assert.ok(paths.isWalkable(x, y), `${era.id}: (${ax},${ay})→(${bx},${by}) left the paths at (${x.toFixed(0)},${y.toFixed(0)})`);
      }
      assert.ok(steps < 600, `${era.id}: (${ax},${ay})→(${bx},${by}) did not arrive`);
    }
  }
});

test("match heroes stay on the era's open ground", () => {
  const config = buildBattleConfig(prepareEvent(createCampaign(DEFAULT_SETTINGS), events[0]), events[0], 9);
  for (const patchId of ["2012.1", "2019.1", "2025.1"]) {
    const battle = new LaneBattle({ ...config, patchId, captureReplay: false });
    const paths = pathsForEra(mapEraForPatch({ id: patchId }));
    let samples = 0, open = 0;
    for (let i = 0; i < 3000 && battle.winner === null; i++) {
      battle.step();
      if (i % 10) continue;
      for (const u of battle.units) if (u.kind === "hero" && !u.dead) { samples++; if (paths.isWalkable(u.x, u.y)) open++; }
    }
    // Chasing and knockback can briefly leave a corridor; walking never should.
    assert.ok(open / samples > .97, `${patchId}: ${(open / samples * 100).toFixed(1)}% on open ground`);
  }
});

test("every patch uses the same terrain anchors for combat towers, bases and displayed structures", () => {
  const config = buildBattleConfig(prepareEvent(createCampaign(DEFAULT_SETTINGS), events[0]), events[0], 9);
  for (const patch of historicalPatches) {
    const era = mapEraForPatch(patch), geometry = geometryForEra(era);
    const battle = new LaneBattle({ ...config, patchId: patch.id, captureReplay: false });
    const frame = battle.snapshot(), structures = mapStructures(frame, era);
    for (const team of [0,1] as const) {
      const base = frame.units.find(u => u.kind === "base" && u.team === team)!;
      assert.deepEqual([base.x,base.y], geometry.bases[team].map(Math.round), `${patch.id} base`);
      for (let lane=0;lane<3;lane++) for (let tier=1;tier<=3;tier++) {
        const marker = structures.find(s => s.team === team && s.lane === lane && s.tier === tier)!;
        const anchor = geometry.towers[team][lane][tier-1];
        assert.ok(Math.hypot(marker.x-anchor[0],marker.y-anchor[1]) < 1, `${patch.id} ${team}/${lane}/${tier}`);
        assert.equal(!!marker.unit,tier<=2,"existing combat scope stays two towers per lane");
      }
    }
    assert.deepEqual([frame.roshan!.x,frame.roshan!.y],era.roshan.day);
  }
});

test("creep waves follow the terrain lane through the exact tower anchors in both directions", () => {
  const config = buildBattleConfig(prepareEvent(createCampaign(DEFAULT_SETTINGS), events[0]), events[0], 9);
  for (const era of mapEras) {
    const battle = new LaneBattle({...config,patchId:era.firstPatch,captureReplay:false});
    while (!battle.units.some(u=>u.kind==="creep")) battle.step();
    const geometry=geometryForEra(era);
    for (const team of [0,1] as const) for (let lane=0;lane<3;lane++) {
      const creep=battle.units.find(u=>u.kind==="creep"&&u.team===team&&u.lane===lane)!;
      const route=team?[...geometry.lanes[lane]].reverse():geometry.lanes[lane];
      assert.deepEqual(creep.route,route,`${era.id} ${team}/${lane}`);
    }
  }
});

test("Roshan stays centred on the actual illustrated pit when terrain changes", () => {
  const pit=(id:string)=>mapEraForPatch({id}).roshan;
  assert.deepEqual(pit("2011.1").day,[536,440]);
  assert.deepEqual(pit("2015.1").day,[592,488],"6.82 moved the lower-river pit");
  assert.deepEqual(pit("2017.1").day,[280,304]);
  assert.deepEqual(pit("2020.1").day,[264,288]);
  assert.deepEqual(pit("2025.1").day,[536,536]);
  assert.deepEqual(pit("2025.1").night,[244,280]);
  assert.ok(pit("2023.1").day[0]>800 && pit("2023.1").night![0]<0,"corner pits belong to the expansion");
  for (const era of mapEras) assert.equal(era.box[2],era.box[3],"square terrain must not be distorted");
});
