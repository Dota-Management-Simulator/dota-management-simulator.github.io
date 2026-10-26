import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { LaneBattle } from "../src/battle";
import { buildBattleConfig, createCampaign, DEFAULT_SETTINGS, events, prepareEvent } from "../src/game";
import { mapEraForPatch, mapEras } from "../src/map-eras";
import { mapStructures, structureIcon, tormentorSites } from "../src/map-objectives";

const config = buildBattleConfig(prepareEvent(createCampaign(DEFAULT_SETTINGS), events[0]), events[0], 9);

test("full minimap layout keeps each real building and its damage at its actual match position", () => {
  const battle = new LaneBattle({ ...config, patchId: "2023.1", captureReplay: false });
  const frame = battle.snapshot();
  const structures = mapStructures(frame, mapEraForPatch({ id: "2023.1" }));
  assert.equal(structures.length, 36);
  assert.equal(new Set(structures.map(s => s.id)).size, 36);
  for (const team of [0, 1]) {
    const own = structures.filter(s => s.team === team);
    assert.equal(own.filter(s => s.kind === "tower").length, 11);
    assert.equal(own.filter(s => s.kind.endsWith("barracks")).length, 6);
    assert.equal(own.filter(s => s.kind === "ancient").length, 1);
    for (let lane = 0; lane < 3; lane++)
      assert.deepEqual(own.filter(s => s.kind === "tower" && s.lane === lane).map(s => s.tier).sort(), [1, 2, 3]);
  }
  for (const unit of frame.units.filter(u => u.kind === "tower" || u.kind === "base")) {
    const matches = structures.filter(s => s.unit?.id === unit.id);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].x, unit.x);
    assert.equal(matches[0].y, unit.y);
  }
  const tower = frame.units.find(u => u.kind === "tower")!;
  const marker = structures.find(s => s.unit?.id === tower.id)!;
  assert.equal(marker.lane, 0);
  assert.equal(marker.tier, 2, "nearer tower is Tier 2, not the first spawned tower");
  tower.hp = 0;
  assert.equal(mapStructures(frame).find(s => s.unit?.id === tower.id)?.unit?.hp, 0);
  const ancient = frame.units.find(u => u.kind === "base")!;
  ancient.hp = 1250;
  assert.equal(mapStructures(frame).find(s => s.unit?.id === ancient.id)?.unit?.hp, 1250);
  assert.ok(structures.filter(s => !s.unit).every(s => !("hp" in s)), "reference buildings never invent HP");
});

test("every map's structure layout is contained, has local Valve art and does not mutate snapshots", () => {
  const frame = new LaneBattle(config).snapshot();
  const original = JSON.stringify(frame);
  for (const era of [undefined, ...mapEras]) {
    const structures = mapStructures(frame, era);
    for (const structure of structures) {
      assert.ok(structure.x >= 0 && structure.x <= 800 && structure.y >= 0 && structure.y <= 800, `${era?.id}: ${structure.name}`);
      assert.ok(existsSync(`public/${structureIcon(structure)}`), structureIcon(structure));
    }
  }
  assert.equal(JSON.stringify(frame), original);
  const legacy = new LaneBattle({ ...config, patchId: undefined }).snapshot();
  legacy.units.forEach(u => { delete u.lane; delete u.tier; });
  const legacyStructures = mapStructures(legacy);
  for (const team of [0, 1]) for (let lane = 0; lane < 3; lane++)
    assert.deepEqual(legacyStructures.filter(s => s.team === team && s.lane === lane && s.unit && s.kind === "tower").map(s => s.tier), [1, 2]);
});

test("Tormentor signals are absent before New Frontiers and use both offlane sites at 20:00", () => {
  for (const id of [undefined, "2011.1", "2022.2"]) assert.deepEqual(tormentorSites(id, 3600), []);
  const before = tormentorSites("2023.1", 1199);
  assert.equal(before.length, 2);
  assert.ok(before.every(s => !s.current && s.spawnAt === 1200));
  const after = tormentorSites("2024.2", 1200);
  assert.ok(after.every(s => s.current));
  assert.deepEqual(after.map(s => s.side), [0, 1]);
  assert.notEqual(after[0].x, after[1].x);
});

test("7.38 and 7.39 use one rotating Tormentor with their distinct initial spawn times", () => {
  const before = tormentorSites("2025.1", 899);
  assert.equal(before.length, 1);
  assert.equal(before[0].current, false);
  assert.equal(before[0].side, 0, "pending marker points to the first spawn at night");
  assert.equal(tormentorSites("2025.1", 900)[0].current, true);
  assert.equal(tormentorSites("2025.1", 900)[0].side, 0);
  assert.equal(tormentorSites("2025.1", 1200)[0].side, 1);
  assert.equal(tormentorSites("2025.2", 900)[0].current, false);
  assert.equal(tormentorSites("2025.2", 1200)[0].current, true);
  assert.equal(tormentorSites("2025.2", 1200)[0].side, 1);
  assert.equal(tormentorSites("2025.2", 1500)[0].side, 0);
});

test("the 2026 overlay retains the displayed 7.40 map's Tormentor sites and side preference", () => {
  const day = tormentorSites("2026.1", 1200)[0];
  const night = tormentorSites("2026.1", 1500)[0];
  assert.equal(day.side, 1);
  assert.equal(night.side, 0);
  assert.equal(day.y, 800 - night.y);
  assert.equal(day.y, tormentorSites("2025.2", 1200)[0].y);
  assert.deepEqual(tormentorSites("2030.2", 1200), tormentorSites("2026.1", 1200));
});
