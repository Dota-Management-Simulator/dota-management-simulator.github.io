import { test } from "node:test";
import assert from "node:assert/strict";
import { LaneBattle, simulateSeries } from "../src/battle";
import { advanceWeek, buildBattleConfig, createCampaign, DEFAULT_SETTINGS, dismissStaff, events, hireStaff, readSave, SAVE_KEY, weeklyWages } from "../src/game";
import { enableHistoricalCalendar, enterHistoricalTournament, tournamentBattleConfig, tournamentTeamTemplate } from "../src/historical-game";
import { historicalPatches, patchAxes, patchForSeason } from "../src/patches";
import { managedPatchObserver, patchReport, perceivedPatch } from "../src/patch-knowledge";
import { staffCatalog, oppositionStaff } from "../src/staff";
import { heroTargetWinRate } from "../src/hero-balance";
import { heroPatchBonus } from "../src/patches";
import { historicalTournaments, nextTournamentFixture } from "../src/tournaments";
import { simulateOtherTournamentMatches } from "../src/tournament.worker";

const observer = { teamKey: "navi", staffIds: [] as string[] };
const allStaff = staffCatalog.map(s => s.id);
const campaign = () => createCampaign(DEFAULT_SETTINGS);

test("reports always contain truth in bounded 35-point ranges, and specialists only narrow their fields to 4–5", () => {
  const profiles = [...historicalPatches, patchForSeason(2036, 1), patchForSeason(2036, 2)];
  for (const patch of profiles) for (const teamKey of ["navi", "ehome", "managed-custom"]) {
    const base = patchReport(patch, { teamKey, staffIds: [] });
    for (const s of staffCatalog) {
      const improved = patchReport(patch, { teamKey, staffIds: [s.id] });
      for (const { key } of patchAxes) {
        const a = base.axes[key], b = improved.axes[key];
        assert.equal(a.width, 35);
        assert.equal(b.width, s.coverage[key] ?? 35);
        assert.ok(b.low >= a.low && b.high <= a.high);
        assert.ok(0 <= b.low && b.low <= patch.axes[key] && patch.axes[key] <= b.high && b.high <= 100);
      }
    }
  }
  const extreme = { ...patchForSeason(2011, 1), axes: { tempo: 0, economy: 100, laning: 0, teamfight: 100, objectives: 0, vision: 100, splitpush: 0 } };
  const full = patchReport(extreme, { ...observer, staffIds: allStaff });
  for (const { key } of patchAxes) assert.ok(full.axes[key].low <= extreme.axes[key] && full.axes[key].high >= extreme.axes[key] && full.axes[key].width >= 4);
});

test("baseline ranges spread truth across all 36 positions, including both endpoints, without a center bias", () => {
  const patch = structuredClone(patchForSeason(2011, 1));
  for (const { key } of patchAxes) patch.axes[key] = 50;
  const positions = Array.from({ length: 36 }, () => 0);
  for (let team = 0; team < 2048; team++) {
    const report = patchReport(patch, { teamKey: `range-team-${team}`, staffIds: [] });
    const read = report.axes.economy;
    positions[50 - read.low]++;
    assert.equal(read.high - read.low, 35);
    assert.deepEqual(report, patchReport(structuredClone(patch), { teamKey: `range-team-${team}`, staffIds: [] }));
  }
  // Equal-likelihood positions average ~57 reports each. Broad limits guard
  // against fixed/centered offsets without requiring a particular random draw.
  assert.ok(positions.every(count => count >= 20 && count <= 105), JSON.stringify(positions));

  // Fractional truths and values near the scale edges still get a full range;
  // every specialist's narrower read must remain inside it and contain truth.
  for (const truth of [0, 0.5, 1, 12, 34.5, 50.5, 65.5, 88, 99.5, 100]) {
    patch.axes.economy = truth;
    for (let team = 0; team < 64; team++) {
      const observer = { teamKey: `edge-team-${team}`, staffIds: [] as string[] };
      const base = patchReport(patch, observer).axes.economy;
      const narrow = patchReport(patch, { ...observer, staffIds: allStaff }).axes.economy;
      assert.equal(base.width, 35);
      assert.ok(0 <= base.low && base.low <= truth && truth <= base.high && base.high <= 100);
      assert.ok(base.low <= narrow.low && narrow.low <= truth && truth <= narrow.high && narrow.high <= base.high);
    }
  }
});

test("research is stable per team and patch, overlaps never stack, and hiring cannot reroll intervals or expose midpoints as truth", () => {
  const patch = patchForSeason(2015, 2), base = patchReport(patch, observer);
  const improved = patchReport(patch, { ...observer, staffIds: ["c2", "c5"] });
  assert.equal(improved.axes.vision.width, 4);
  assert.deepEqual(improved.axes.vision, patchReport(patch, { ...observer, staffIds: ["c2"] }).axes.vision);
  assert.deepEqual(base, patchReport(structuredClone(patch), structuredClone(observer)));
  assert.deepEqual(improved, patchReport(patch, { ...observer, staffIds: ["c5", "c2", "c2", "invalid"] }));
  assert.notDeepEqual(base.axes, patchReport(patch, { ...observer, teamKey: "ehome" }).axes);
  assert.notDeepEqual(base.axes, patchReport(patchForSeason(2015, 1), observer).axes);
  const estimate = perceivedPatch(patch, observer);
  assert.ok(patchAxes.some(({ key }) => estimate.axes[key] !== patch.axes[key]));
  assert.equal(patchReport(patch, { ...observer, staffIds: allStaff }).axes.vision.width, 4);
});

test("hero discovery expands a stable shortlist from two to six and keeps power estimates uncertain", () => {
  const patch = patchForSeason(2011, 2);
  let previous: string[] = [];
  for (const [staffIds, count] of [[[], 2], [["c2"], 3], [["c2", "c5"], 4], [["c2", "c5", "c6"], 6]] as [string[], number][]) {
    const report = patchReport(patch, { ...observer, staffIds });
    assert.equal(report.heroes.length, count);
    assert.deepEqual(report.heroes.slice(0, previous.length).map(h => h.id), previous);
    for (const h of report.heroes) {
      const truth = heroTargetWinRate(patch, h.id);
      assert.ok(h.winRate.low <= truth && h.winRate.high >= truth);
      assert.equal(h.winRate.width, 4);
    }
    previous = report.heroes.map(h => h.id);
  }
  assert.equal(patchReport(patch, { ...observer, staffIds: ["c1", "c3", "c4"] }).heroes.length, 2);
  assert.deepEqual(perceivedPatch(patch, observer).heroes.map(h => h.id), previous.slice(0, 2));
});

test("staff hire/release is immutable and payroll-safe, preserves saves and removes the analyst's former flat combat bonus", () => {
  const c = campaign(), before = structuredClone(c), wages = weeklyWages(c);
  let staffed = hireStaff(c, "c2");
  assert.deepEqual(c, before);
  assert.equal(staffed.cash, c.cash);
  assert.equal(weeklyWages(staffed), wages + 450);
  assert.equal(hireStaff(staffed, "c2"), staffed);
  assert.equal(hireStaff({ ...c, cash: 100 }, "c2").staffIds.length, 0);
  assert.deepEqual(buildBattleConfig(c, events[0], 42).bonuses, buildBattleConfig(staffed, events[0], 42).bonuses);
  const next = advanceWeek(staffed);
  assert.equal(next.cash, staffed.cash - weeklyWages(staffed));
  staffed = allStaff.reduce((state, id) => hireStaff(state, id), staffed);
  const report = patchReport(patchForSeason(2011, 1), managedPatchObserver(staffed));
  const storage = globalThis.localStorage;
  try {
    globalThis.localStorage = { getItem: (key: string) => key === SAVE_KEY ? JSON.stringify(staffed) : null } as Storage;
    const loaded = readSave()!;
    assert.deepEqual(patchReport(patchForSeason(2011, 1), managedPatchObserver(loaded)), report);
    assert.equal(loaded.cash, c.cash); assert.equal(loaded.week, c.week); assert.deepEqual(loaded.roster, c.roster);
  } finally { globalThis.localStorage = storage; }
  const dismissed = dismissStaff(staffed, "c2");
  assert.equal(weeklyWages(dismissed), weeklyWages(staffed) - 450);
  assert.equal(patchReport(patchForSeason(2011, 1), managedPatchObserver(dismissed)).axes.teamfight.width, 35);
  assert.equal(dismissed.cash, staffed.cash); assert.deepEqual(dismissed.results, staffed.results);
  assert.equal(dismissStaff(dismissed, "c2"), dismissed);
  assert.equal(dismissStaff(dismissed, "invalid"), dismissed);
});

test("auto-drafts use only known hero strength, but undiscovered favorites still receive their true combat power", () => {
  const patch = structuredClone(patchForSeason(2011, 2));
  patch.id = "2097.1"; patch.year = 2097; patch.phase = 1;
  historicalPatches.push(patch);
  try {
    const known = patchReport(patch, observer).heroes.map(h => h.id);
    const hidden = patch.heroes.find(h => !known.includes(h.id))!;
    let checked = false;
    for (let seed = 1; seed <= 100; seed++) {
      const cfg = { ...buildBattleConfig(campaign(), events[0], seed), patchId: patch.id, patchObservers: [observer, observer] as [typeof observer, typeof observer] };
      const a = new LaneBattle(cfg).units.filter(u => u.player);
      const found = a.find(u => u.hero!.id === hidden.id);
      if (!found) continue;
      const balance = patch.heroBalance!.find(h => h.id === hidden.id)!;
      const original = heroPatchBonus(patch, hidden.id);
      balance.power = 30;
      const b = new LaneBattle(cfg).units.filter(u => u.player);
      assert.deepEqual(a.map(u => u.hero!.id), b.map(u => u.hero!.id), "No hidden strength enters draft decisions");
      const stronger = b.find(u => u.hero!.id === hidden.id)!;
      assert.ok(Math.abs(stronger.power / found.power - 1.3 / (1 + original / 100)) < 1e-10);
      checked = true; break;
    }
    assert.ok(checked, "An undiscovered hero can still be drafted");
  } finally { historicalPatches.pop(); }
});

test("research changes actual draft selections while neither side receives a direct staff power bonus", () => {
  const c = campaign(), staffed = allStaff.reduce((state, id) => hireStaff(state, id), c);
  let changed = 0;
  for (let seed = 1; seed <= 50; seed++) {
    const a = new LaneBattle(buildBattleConfig(c, events[0], seed)).units.filter(u => u.player && u.team === 0).map(u => u.hero!.id);
    const b = new LaneBattle(buildBattleConfig(staffed, events[0], seed)).units.filter(u => u.player && u.team === 0).map(u => u.hero!.id);
    if (a.join() !== b.join()) changed++;
  }
  assert.ok(changed > 0);
  assert.deepEqual(buildBattleConfig(staffed, events[0], 1).bonuses, buildBattleConfig(c, events[0], 1).bonuses);
  for (const key of ["navi", "ehome", "scythe"]) assert.deepEqual(oppositionStaff(key), oppositionStaff(key));
});

test("both tournament workers share each team's scoped research on the event's pinned patch", () => {
  const ti = historicalTournaments.find(e => e.kind === "ti" && e.year === 2011)!;
  const c = enterHistoricalTournament(enableHistoricalCalendar(hireStaff(campaign(), "c2")), ti.id, 512);
  const run = c.calendar!.runs[0], fixture = nextTournamentFixture(run)!;
  const templates = Object.fromEntries(run.teams.map(team => [team.id, tournamentTeamTemplate(c, run, team.id)]));
  assert.deepEqual(templates[run.managed].patchObserver, managedPatchObserver(c));
  const cfg = tournamentBattleConfig(c, run, fixture, false);
  const batch = simulateOtherTournamentMatches({ run, templates, year: 2011, heroPoolThroughYear: 2010, through: fixture.at });
  const direct = simulateSeries({ ...cfg, captureReplay: false });
  assert.deepEqual(batch.matches[0].performance!.games, direct.summary.games.map(({ winner, duration, kills, players }) => ({ winner, duration, kills, players })));
  const later = { ...c, calendar: { ...c.calendar!, now: "2012-06-01T00:00:00Z" } };
  assert.deepEqual(tournamentBattleConfig(later, run, fixture).patchObservers, cfg.patchObservers);
  assert.equal(tournamentBattleConfig(later, run, fixture).patchId, run.patchId);
});
