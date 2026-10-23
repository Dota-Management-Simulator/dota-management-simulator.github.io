import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LaneBattle } from "../src/battle";
import { buildBattleConfig, createCampaign, DEFAULT_SETTINGS, events } from "../src/game";
import { historicalPatches, patchForSeason, patchById, heroPatchBonus } from "../src/patches";
import { getHeroPool } from "../src/heroes";
import { calibrationForPatch, heroBalanceSignature, heroTargetWinRate } from "../src/hero-balance";
import { patchReport, perceivedPatch } from "../src/patch-knowledge";
import { buildHeroBalance, parseHeroSnapshot } from "../scripts/hero-history.mjs";
import { pairedWilson, correctPairedIntervals } from "../scripts/calibration-stats.mjs";

const source = JSON.parse(readFileSync(new URL("../scripts/data/hero-history-sources.json", import.meta.url), "utf8"));
const config = () => ({ ...buildBattleConfig(createCampaign(DEFAULT_SETTINGS), events[0], 447), captureReplay: false });

test("large hero corrections preserve player development rather than flattening it at power limits", () => {
  const cfg = config(), patch = patchById(cfg.patchId)!;
  const auto = new LaneBattle(cfg);
  const draft = [0, 1].map(team => auto.units.filter(u => u.player && u.team === team).map(u => u.hero!.id)) as [string[], string[]];
  const previous = patch.heroBalance!.map(h => h.power);
  try {
    for (const correction of [-55, 82]) {
      for (const h of patch.heroBalance!) h.power = correction;
      const units = (skill: number) => {
        const c = structuredClone(cfg);
        c.draft = draft; c.bonuses = [0, 0];
        for (const side of c.players) for (const p of side) {
          p.energy = p.happiness = 100;
          for (const key of Object.keys(p.skills)) p.skills[key] = skill;
        }
        return new LaneBattle(c).units.filter(u => u.player);
      };
      const low = units(15), high = units(40), veteran = units(75), elite = units(99);
      for (let i = 0; i < low.length; i++) {
        assert.ok(low[i].power < high[i].power);
        assert.ok(high[i].power < veteran[i].power);
        assert.ok(veteran[i].power < elite[i].power);
        assert.ok(low[i].damage < high[i].damage && low[i].max < high[i].max);
      }
    }
  } finally {
    patch.heroBalance!.forEach((h, i) => { if (previous[i] == null) delete h.power; else h.power = previous[i]; });
  }
});

test("benchmark uncertainty accounts for side-swapped pairs and never rewrites measured rates", () => {
  const interval = pairedWilson(500, 1000);
  assert.ok(interval.low < 46 && interval.high > 54);
  assert.ok(Math.abs(interval.low + interval.high - 100) < 0.001);
  assert.ok(pairedWilson(50, 100).high > interval.high);
  assert.throws(() => pairedWilson(5, 4), /Invalid calibration/);
  const fixed = correctPairedIntervals({ rows: [{ id: "chen", played: 1000, wins: 700, winRate: 70 }] });
  assert.equal(fixed.rows[0].winRate, 70);
  assert.deepEqual(fixed.statisticallyAboveCeiling, ["chen"]);
});

test("every era has internal strength targets for every eligible hero, with a 58% ceiling and no future hero leakage", () => {
  for (const patch of [...historicalPatches, patchForSeason(2036, 1), patchForSeason(2036, 2)]) {
    const pool = getHeroPool(patch.year, Math.min(2026, patch.year - 1));
    assert.deepEqual(new Set(patch.heroBalance!.map(h => h.id)), new Set(pool.map(h => h.id)));
    assert.ok(patch.heroBalance!.every(h => h.targetWinRate >= 42 && h.targetWinRate <= 58 && Number.isFinite(h.priority)));
    assert.ok(patch.heroes.every(h => patch.heroBalance!.some(row => row.id === h.id) || !pool.some(eligible => eligible.id === h.id)), "Locked annual additions keep their separate preview metadata");
    if (patch.generated) assert.ok(patch.heroBalance!.every(h => h.basis === "generated" && !h.observed));
  }
  assert.ok(heroTargetWinRate(patchForSeason(2015, 1), "sniper") > heroTargetWinRate(patchForSeason(2015, 2), "sniper"));
});

test("historical snapshots retain actual counts separately from capped, sample-shrunk game targets and stay phase-scoped", () => {
  const ti = patchForSeason(2015, 2), shanghai = patchForSeason(2016, 1);
  const bounty = ti.heroBalance!.find(h => h.id === "bounty_hunter")!;
  assert.deepEqual([bounty.observed!.played, bounty.observed!.wins, bounty.observed!.losses, bounty.observed!.rawWinRate], [48, 33, 15, 68.75]);
  assert.ok(bounty.targetWinRate > 53 && bounty.targetWinRate <= 58);
  assert.equal(ti.heroBalance!.find(h => h.id === "techies")!.observed!.rawWinRate, 87.5);
  assert.ok(ti.heroBalance!.find(h => h.id === "techies")!.targetWinRate < 58, "7–1 cannot outweigh sample shrinkage");
  assert.ok(ti.heroes.some(h => h.id === "bounty_hunter"));
  assert.ok(shanghai.heroBalance!.some(h => h.observed?.sourceUrl.includes("shanghai.txt")));
  assert.ok(patchForSeason(2015, 1).heroBalance!.every(h => !h.observed));
  assert.ok(patchForSeason(2016, 2).heroBalance!.every(h => !h.observed));
  assert.equal(historicalPatches.filter(p => p.heroStatistics).length, 15);
});

test("offline historical compiler validates aliases/counts, reproduces source observations and rejects malformed rows", () => {
  const catalog = getHeroPool(2026, 2026);
  for (const snapshot of source.sources) {
    const rows = parseHeroSnapshot(snapshot, catalog);
    assert.ok(rows.length > 80);
    assert.equal(new Set(rows.map(h => h.id)).size, rows.length);
    const built = buildHeroBalance(patchForSeason(Number(snapshot.patchId.slice(0,4)), Number(snapshot.patchId.at(-1)) as 1|2), catalog, source);
    assert.ok(built.rows.every(h => h.targetWinRate <= 58));
  }
  assert.throws(() => parseHeroSnapshot({ body: "Lina Matches 4 3 3" }, catalog), /Invalid hero counts/);
  assert.throws(() => parseHeroSnapshot({ body: "Unknown Hero Matches 4 2 2" }, catalog), /Invalid hero counts/);
});

test("fixed drafts use real lane combat, enforce era/role/uniqueness and headless observation never changes outcomes", () => {
  const cfg = config();
  const auto = new LaneBattle(cfg);
  const draft = [0,1].map(team => auto.units.filter(u => u.player && u.team === team).map(u => u.hero!.id)) as [string[],string[]];
  const a = new LaneBattle({ ...cfg, draft }).run();
  const b = new LaneBattle({ ...cfg, draft, captureTimeline: false }).run();
  assert.deepEqual({ ...a, timeline: [] }, b);
  assert.ok(a.timeline.length); assert.equal(b.timeline.length, 0);
  assert.equal(a.ancientHealth[1-a.winner], 0);
  const duplicate = structuredClone(draft); duplicate[1][0] = draft[0][0];
  assert.throws(() => new LaneBattle({ ...cfg, draft: duplicate }), /unique/);
  const future = structuredClone(draft); future[0][0] = "kez";
  assert.throws(() => new LaneBattle({ ...cfg, draft: future }), /unlocked/);
  const wrongRole = structuredClone(draft); wrongRole[0][0] = "chen";
  assert.throws(() => new LaneBattle({ ...cfg, draft: wrongRole }), /position-eligible/);
});

test("research exposes uncertain benchmark win rates while unknown heroes' true profiles stay out of draft estimates", () => {
  const patch = patchForSeason(2015, 2), observer = { teamKey: "navi", staffIds: [] };
  const report = patchReport(patch, observer), perceived = perceivedPatch(patch, observer);
  assert.equal(report.heroes.length, 2); assert.equal(perceived.heroBalance!.length, 2);
  for (const h of report.heroes) {
    const target = heroTargetWinRate(patch, h.id);
    assert.ok(h.winRate.low <= target && h.winRate.high >= target);
    assert.equal(h.winRate.width, 4);
  }
  assert.ok(perceived.heroBalance!.every(h => !h.observed && h.power == null));
  assert.equal(heroBalanceSignature(patch), heroBalanceSignature(structuredClone(patch)));
  const changed = structuredClone(patch); changed.heroBalance![0].targetWinRate += 0.1;
  assert.notEqual(heroBalanceSignature(patch), heroBalanceSignature(changed));
  assert.equal(calibrationForPatch(changed), undefined);
  assert.ok(Number.isFinite(heroPatchBonus(patch, "chen")));
});
