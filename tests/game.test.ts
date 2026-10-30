import { test } from "node:test";
import assert from "node:assert/strict";
import type { Campaign } from "../src/game";
import { askingWage, signingFee } from "../src/player-market";
import type { SeriesSummary, Side } from "../src/battle";
// Settlement fixtures isolate qualification/economy from the lane engine, tested separately.
function fixture(c: Campaign, winner: Side): SeriesSummary {
  const game = {
    winner,
    duration: 1800,
    kills: [10, 10] as [number, number],
    towers: [6, 6] as [number, number],
    players: [],
    timeline: [],
    overtime: false,
    ancientHealth: (winner === 0 ? [1500, 0] : [0, 1500]) as [number, number],
  };
  return {
    engine: "lane-siege-v1",
    seed: 1,
    teams: [c.settings.team, "Fixture opposition"],
    winner,
    score: winner === 0 ? [2, 0] : [0, 2],
    games: [structuredClone(game), structuredClone(game)],
  };
}

import {
  advanceWeek,
  createCampaign,
  DEFAULT_SETTINGS,
  events,
  hireStaff,
  signPlayer,
  signSponsor,
  simulateEvent,
  weeklyIncome,
  weeklyWages,
  buildBattleConfig,
  settleEvent,
} from "../src/game";

test("difficulty changes starting funds and opponent advantage", () => {
  const easy = createCampaign({ ...DEFAULT_SETTINGS, difficulty: "Club" });
  const normal = createCampaign(DEFAULT_SETTINGS);
  const hard = createCampaign({ ...DEFAULT_SETTINGS, difficulty: "Legend" });
  assert.equal(easy.cash, 150000);
  assert.equal(normal.cash, 100000);
  assert.equal(hard.cash, 65000);
  assert.ok(
    buildBattleConfig(easy, events[1], 42).bonuses[0] >
      buildBattleConfig(normal, events[1], 42).bonuses[0],
  );
  assert.ok(
    buildBattleConfig(normal, events[1], 42).bonuses[0] >
      buildBattleConfig(hard, events[1], 42).bonuses[0],
  );
});

test("weekly payroll, sponsor income, focused practice, rest and staff resolve together", () => {
  let c = createCampaign(DEFAULT_SETTINGS);
  c = signSponsor(c, "s1");
  c = hireStaff(c, "c1");
  c = hireStaff(c, "c3");
  c.training[c.roster[0]] = "Laning";
  c.training[c.roster[1]] = "Rest";
  c.players[1].energy = 60;
  const cash = c.cash;
  const wages = weeklyWages(c);
  const income = weeklyIncome(c);
  const next = advanceWeek(c);
  assert.equal(next.cash, cash - wages + income);
  assert.equal(next.players[0].stats.laning, c.players[0].stats.laning + 2);
  assert.equal(next.players[0].energy, 97); // 94 - 5 + therapist 8
  assert.equal(next.players[1].energy, 92); // 60 + rest 24 + therapist 8
  assert.equal(c.week, 1);
  assert.equal(next.week, 2); // immutable transition
});

test("sponsor reputation gates and repeated signings cannot award money twice", () => {
  const c = createCampaign(DEFAULT_SETTINGS);
  assert.equal(signSponsor(c, "s2"), c);
  const signed = signSponsor(c, "s1");
  assert.equal(signed.cash, c.cash + 5000);
  assert.equal(signSponsor(signed, "s1"), signed);
});

test("recruitment replaces only the same position and charges once", () => {
  const c = createCampaign(DEFAULT_SETTINGS);
  const recruit = c.players.find((p) => p.name === "God")!;
  const signed = signPlayer(c, recruit.id);
  assert.equal(signed.roster.length, 5);
  assert.equal(signed.roster[1], recruit.id);
  assert.equal(signed.roster[0], c.roster[0]);
  assert.ok(!signed.roster.includes(c.roster[1]));
  assert.equal(signed.cash, c.cash - signingFee(c, recruit), "fee follows market value, including the buyout from M5");
  assert.equal(signed.players.find((p) => p.id === recruit.id)!.wage, askingWage(c, recruit));
  assert.equal(signPlayer(signed, recruit.id), signed);
  const poor = { ...c, cash: 0 };
  assert.equal(signPlayer(poor, recruit.id), poor);
  assert.deepEqual(c.world?.clubs.find((t) => t.id === "m5")?.roster[1], recruit.id);
  assert.equal(signed.world?.clubs.find((t) => t.id === "m5")?.roster[1], c.roster[1]);
});

test("TI is locked until qualification, and losing all circuit events does not qualify", () => {
  let c = createCampaign(DEFAULT_SETTINGS);
  assert.equal(simulateEvent(c, events[4], 0), c);
  for (const e of events.slice(0, 4)) c = settleEvent(c, e, fixture(c, 1));
  assert.equal(c.qualified, false);
  assert.ok(c.points < 80);
  assert.equal(simulateEvent(c, events[4], 0), c);
});

test("winning the qualifier unlocks TI and later event entry records skipped events", () => {
  const c = createCampaign(DEFAULT_SETTINGS);
  // This qualification fixture skips twelve weeks of management; use recovery
  // rather than neglecting new player expectations during that interval.
  for (const id of c.roster) c.training[id] = "Rest";
  const qualified = settleEvent(c, events[3], fixture(c, 0));
  assert.equal(qualified.qualified, true);
  assert.equal(qualified.week, 13);
  assert.equal(qualified.results.filter((r) => r.skipped).length, 3);
  assert.equal(
    qualified.transactions.filter((t) => t.label === "Weekly payroll").length,
    12,
  );
  const champion = settleEvent(qualified, events[4], fixture(qualified, 0));
  assert.equal(champion.week, 17);
  assert.equal(champion.results.at(-1)?.eventId, "ti");
  assert.equal(champion.results.at(-1)?.won, true);
  assert.equal(simulateEvent(champion, events[4], 0), champion);
});

test("circuit points independently unlock qualification", () => {
  let c = createCampaign(DEFAULT_SETTINGS);
  for (const e of events.slice(0, 3)) c = settleEvent(c, e, fixture(c, 0));
  assert.equal(c.points, 110);
  assert.equal(c.qualified, true);
});

test("bankruptcy reduces happiness; a new season resets qualification but keeps history", () => {
  let c = createCampaign(DEFAULT_SETTINGS);
  c.cash = 0;
  const low = advanceWeek(c);
  assert.equal(low.players[0].happiness, c.players[0].happiness - 10);
  c = createCampaign(DEFAULT_SETTINGS);
  c = settleEvent(c, events[3], fixture(c, 0));
  c.players[0].age = 20;
  const records = c.results.length;
  const age = c.players[0].age;
  while (c.year === 2011) c = advanceWeek(c);
  assert.equal(c.year, 2012);
  assert.equal(c.week, 1);
  assert.equal(c.points, 0);
  assert.equal(c.qualified, false);
  assert.ok(c.results.length >= records);
  assert.equal(c.players[0].age, age! + 1);
});
