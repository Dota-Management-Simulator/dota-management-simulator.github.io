import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mapChangeForPatch, mapEraForPatch, mapEras, roshanPit } from "../src/map-eras";
import { pathsForEra } from "../src/map-paths";
import { historicalPatches, patchForSeason } from "../src/patches";
import { LaneBattle } from "../src/battle";
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
    assert.ok(paths.isWalkable(90, 400) && paths.isWalkable(400, 400) && paths.isWalkable(710, 400), `${era.id} lanes`);
    const trips: [number, number, number, number][] = [[90, 710, ...era.roshan.day], [90, 710, 710, 90], [710, 90, 300, 710], [90, 300, 710, 500]];
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
