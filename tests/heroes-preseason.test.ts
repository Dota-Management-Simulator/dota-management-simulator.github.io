import { test } from "node:test";
import assert from "node:assert/strict";
import { advanceWeek, createCampaign, DEFAULT_SETTINGS, readSave, SAVE_KEY, weeklyWages } from "../src/game";
import { enableHistoricalCalendar, historicalCampaignStart } from "../src/historical-game";
import { campaignWeek } from "../src/contracts";
import { getHeroPool } from "../src/heroes";
import { heroScoutReport } from "../src/hero-scouting";
import { historicalPatches, patchForSeason } from "../src/patches";
import { heroTargetWinRate } from "../src/hero-balance";
import { patchReport } from "../src/patch-knowledge";
import { staffCatalog } from "../src/staff";
import { historicalTournaments } from "../src/tournaments";
import { advanceManagerWeek, syncOffice } from "../src/office";

test("every catalogued TI starts a new campaign one calendar month before its opening; missing TI years keep January", () => {
  assert.equal(historicalCampaignStart(2011), "2011-07-17T00:00:00Z");
  for (const ti of historicalTournaments.filter(e => e.kind === "ti")) {
    const start = new Date(historicalCampaignStart(ti.year));
    const opening = new Date(ti.start);
    assert.equal(start.getUTCMonth(), (opening.getUTCMonth() + 11) % 12);
    assert.equal(start.getUTCDate(), Math.min(opening.getUTCDate(), new Date(Date.UTC(ti.year, opening.getUTCMonth(), 0)).getUTCDate()));
    assert.ok((opening.getTime() - start.getTime()) / 86400000 >= 28);
  }
  assert.equal(historicalCampaignStart(2020), "2020-01-01T00:00:00Z");
  assert.equal(historicalCampaignStart(2036), "2036-01-01T00:00:00Z");
});

test("the preparation month trains and pays exactly once per week, then Continue stops at TI", () => {
  const legacy = createCampaign(DEFAULT_SETTINGS);
  let c = syncOffice(enableHistoricalCalendar(legacy));
  assert.equal(c.cash, legacy.cash);
  assert.deepEqual(c.players, legacy.players);
  assert.equal(campaignWeek(c), campaignWeek(legacy));
  assert.equal(c.calendar!.paidWeeks, 0);
  const player = c.roster[0];
  const originalSkill = c.players.find(p => p.id === player)!.stats.farming;
  c.training[player] = "Farming";
  for (let i = 0; i < 4; i++) c = advanceManagerWeek(c);
  assert.equal(c.calendar!.now.slice(0, 10), "2011-08-14");
  assert.equal(c.calendar!.paidWeeks, 4);
  assert.equal(c.cash, legacy.cash - 4 * weeklyWages(legacy));
  assert.ok(c.players.find(p => p.id === player)!.stats.farming > originalSkill);
  c = advanceManagerWeek(c);
  assert.equal(c.calendar!.now.slice(0, 10), "2011-08-17");
  assert.equal(c.calendar!.paidWeeks, 4);
  assert.equal(advanceManagerWeek(c).calendar!.now, c.calendar!.now);
  assert.equal(c.results.length, 0);
  assert.equal(advanceWeek(legacy).week, 2, "legacy clock is unchanged");
});

test("enabling a dated save again and reloading never rewinds its existing clock or changes club state", () => {
  const c = enableHistoricalCalendar(createCampaign(DEFAULT_SETTINGS));
  c.calendar!.now = "2011-08-18T00:00:00Z";
  c.calendar!.origin = "2011-08-17T00:00:00Z";
  assert.equal(enableHistoricalCalendar(c), c);
  const before = JSON.stringify(c);
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => key === SAVE_KEY ? before : null } });
  try {
    const loaded = readSave()!;
    assert.equal(loaded.calendar!.now, c.calendar!.now);
    assert.equal(loaded.calendar!.origin, c.calendar!.origin);
    assert.equal(loaded.cash, c.cash);
    assert.deepEqual(loaded.roster, c.roster);
    assert.deepEqual(loaded.results, c.results);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("hero catalog observations cover only the supplied release pool, contain targets and narrow consistently with discovery", () => {
  for (const patch of [...historicalPatches, patchForSeason(2036, 2)]) {
    const pool = getHeroPool(patch.year, patch.year - 1, patch);
    const observer = { teamKey: "catalog-test", staffIds: [] as string[] };
    const before = JSON.stringify(patch);
    const baseline = heroScoutReport(patch, observer, pool);
    const fullObserver = { ...observer, staffIds: staffCatalog.map(s => s.id) };
    const researched = heroScoutReport(patch, fullObserver, pool);
    const favorites = patchReport(patch, fullObserver).heroes;
    assert.equal(baseline.length, pool.length);
    assert.deepEqual(heroScoutReport(patch, observer, pool), baseline);
    for (const [i, row] of baseline.entries()) {
      const truth = heroTargetWinRate(patch, row.hero.id);
      assert.ok(row.winRate.low <= truth && row.winRate.high >= truth);
      assert.equal(row.winRate.width, row.scouted ? 4 : 16);
      assert.ok(row.winRate.low >= 0 && row.winRate.high <= 100);
      assert.ok(researched[i].winRate.low >= row.winRate.low && researched[i].winRate.high <= row.winRate.high);
      const known = favorites.find(h => h.id === row.hero.id);
      if (known) assert.deepEqual(researched[i].winRate, known.winRate);
    }
    assert.equal(JSON.stringify(patch), before);
  }
});
