import { test } from "node:test";
import assert from "node:assert/strict";
import { advanceWeek, createCampaign, DEFAULT_SETTINGS, events, negotiateContract, readSave, SAVE_KEY, settleEvent, signPlayer, teamPlayers, weeklyWages } from "../src/game";
import type { Campaign } from "../src/game";
import type { SeriesSummary } from "../src/battle";
import { assessOffer, campaignWeek, contractPreferences, initialOffer, releaseCost, weeklyPractice, weeksRemaining } from "../src/contracts";

function agreed(c: Campaign, id = c.roster[0], overrides = {}) {
  const p = c.players.find((v) => v.id === id)!;
  const offer = { ...initialOffer(c, p), wage: p.wage * 2, ...overrides };
  const result = negotiateContract(c, id, offer);
  assert.equal(result.status, "accepted", result.message);
  return result.campaign;
}

test("low offers counter deterministically; rest, practice, security and prize share change the package", () => {
  const c = createCampaign(DEFAULT_SETTINGS);
  const p = teamPlayers(c)[0];
  const low = { ...initialOffer(c, p), wage: 50, practiceHours: 40, restDays: 1, weeks: 6 };
  const counter = negotiateContract(c, p.id, low);
  assert.equal(counter.status, "counter");
  assert.equal(counter.campaign, c);
  assert.deepEqual(negotiateContract(c, p.id, low), counter);
  assert.equal(assessOffer(c, p, counter.counter!).status, "accepted");
  const generous = assessOffer(c, p, { ...low, practiceHours: 20, restDays: 3, weeks: 36, prizeShare: 10 });
  assert.ok(generous.counter!.wage < counter.counter!.wage);
  const security = assessOffer(c, p, { ...low, weeks: contractPreferences(p).weeks });
  assert.ok(security.counter!.wage < counter.counter!.wage);
  assert.equal(negotiateContract(c, p.id, { ...low, wage: NaN }).status, "invalid");
  assert.equal(negotiateContract(c, p.id, { ...low, bonus: -1 }).status, "invalid");
  assert.equal(negotiateContract(c, p.id, { ...low, prizeShare: 11 }).status, "invalid");
  assert.equal(negotiateContract(c, p.id, { ...low, weeks: 0 }).status, "invalid");
  const debt = { ...c, cash: -100 };
  assert.equal(negotiateContract(debt, p.id, counter.counter!).status, "accepted", "a no-cost renewal remains possible in debt");
});

test("signed pay and bonus settle once; agreed practice and protected rest have real weekly effects", () => {
  const original = createCampaign(DEFAULT_SETTINGS);
  const id = original.roster[0];
  const signed = agreed(original, id, { bonus: 500, practiceHours: 40, restDays: 3 });
  const p = signed.players.find((v) => v.id === id)!;
  assert.equal(signed.cash, original.cash - 500);
  assert.equal(weeklyWages(signed), weeklyWages(original) + p.wage / 2);
  const contract = signed.contracts![id];
  assert.equal(negotiateContract(signed, id, contract).campaign, signed);
  signed.training[id] = "Laning";
  p.energy = 60;
  const next = advanceWeek(signed);
  const trained = next.players.find((v) => v.id === id)!;
  assert.equal(trained.stats.laning, p.stats.laning + 3);
  assert.equal(trained.energy, 47); // focused -5, 40h -12, third rest day +4
  assert.equal(next.cash, signed.cash - weeklyWages(signed));
  const lighter = agreed(original, id, { practiceHours: 20, restDays: 1 });
  const light = weeklyPractice(lighter, teamPlayers(lighter)[0], "Laning");
  assert.equal(light.growth, 1);
  assert.equal(light.energy, -9);
  assert.equal(weeklyPractice(signed, p, "Rest").energy, 24);
  assert.equal(weeklyPractice(signed, p, "Rest").growth, 0);
  assert.equal(original.contracts, undefined);
  assert.notEqual(p.wage, teamPlayers(original)[0].wage);
});

test("expiration crosses seasons, keeps all five and weekly terms, and renewal clears the morale penalty", () => {
  let c = createCampaign(DEFAULT_SETTINGS);
  c.week = 17;
  const id = c.roster[0];
  c = agreed(c, id, { weeks: 6 });
  const contract = c.contracts![id];
  for (let i = 0; i < 6; i++) c = advanceWeek(c);
  assert.equal(c.year, 2012);
  assert.equal(c.week, 5);
  assert.equal(campaignWeek(c), contract.expiresAt);
  assert.equal(weeksRemaining(c, contract), 0);
  assert.equal(releaseCost(c, id), 0);
  assert.equal(c.roster.length, 5);
  assert.ok(c.roster.includes(id));
  assert.ok(c.log.some((line) => line.includes("fixed contract has ended")));
  const p = c.players.find((v) => v.id === id)!;
  const expiredMood = weeklyPractice(c, p, "Balanced").happiness;
  const renewed = agreed(c, id, { wage: contract.wage });
  assert.equal(weeklyPractice(renewed, teamPlayers(renewed)[0], "Balanced").happiness, expiredMood + 2);
  assert.equal(renewed.contracts![id].marketWage, contract.marketWage);
});

test("recruitment charges fee, bonus and outgoing severance atomically and preserves club ownership", () => {
  let c = createCampaign(DEFAULT_SETTINGS);
  const recruit = c.players.find((p) => p.name === "God")!;
  const outgoing = teamPlayers(c).find((p) => p.role === recruit.role)!;
  c = agreed(c, outgoing.id);
  const severance = releaseCost(c, outgoing.id);
  const bonus = 400;
  const offer = { ...initialOffer(c, recruit), wage: recruit.wage * 2, bonus };
  const poor = { ...c, cash: recruit.fee + severance + bonus - 1 };
  assert.equal(negotiateContract(poor, recruit.id, offer).campaign, poor);
  assert.equal(signPlayer({ ...c, cash: recruit.fee + severance - 1 }, recruit.id).roster, c.roster);
  const result = negotiateContract(c, recruit.id, offer);
  assert.equal(result.status, "accepted");
  const signed = result.campaign;
  assert.equal(signed.cash, c.cash - recruit.fee - severance - bonus);
  assert.equal(signed.contracts?.[outgoing.id], undefined);
  assert.ok(signed.contracts?.[recruit.id]);
  assert.equal(signed.roster[1], recruit.id);
  const memberships = signed.world!.clubs.flatMap((club) => [...club.roster, ...club.bench]);
  assert.equal(new Set(memberships).size, memberships.length);
  assert.equal(signed.world!.clubs.find((club) => club.id === "m5")!.roster.length, 5);
  const noVacancy = structuredClone(c);
  const opposition = noVacancy.world!.clubs.find((club) => club.id === "m5")!;
  opposition.region = "No available regional players";
  const blocked = negotiateContract(noVacancy, recruit.id, offer);
  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.campaign, noVacancy);
});

function series(c: Campaign, winner: 0 | 1): SeriesSummary {
  const game = { winner, duration: 1800, kills: [10, 10] as [number, number], towers: [6, 6] as [number, number], players: [], timeline: [], overtime: false, ancientHealth: (winner === 0 ? [1500, 0] : [0, 1500]) as [number, number] };
  return { engine: "lane-siege-v1", seed: 1, teams: [c.settings.team, "Fixture"], winner, score: winner === 0 ? [2, 0] : [0, 2], games: [game, game] };
}
test("prize shares use the event-time lineup, apply on wins and losses, and cannot settle twice", () => {
  for (const winner of [0, 1] as const) {
    let c = createCampaign(DEFAULT_SETTINGS);
    c.week = 3;
    c = agreed(c, c.roster[0], { prizeShare: 10 });
    const p = teamPlayers(c)[0];
    const next = settleEvent(c, events[0], series(c, winner));
    const gross = winner === 0 ? 8000 : 960;
    assert.equal(next.cash, c.cash + gross * 0.9 - weeklyWages(c));
    assert.equal(next.transactions.filter((t) => t.label.startsWith(`${p.name} prize share`)).length, 1);
    assert.equal(next.results.at(-1)?.prize, gross);
    assert.equal(settleEvent(next, events[0], series(next, winner)), next);
  }
});

test("old saves retain rolling wages and training; negotiated terms survive save and load", () => {
  const legacy = createCampaign(DEFAULT_SETTINGS);
  delete legacy.world;
  const c = agreed(legacy);
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  try {
    let value = JSON.stringify(c);
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => key === SAVE_KEY ? value : null } });
    assert.deepEqual(readSave(), c);
    value = JSON.stringify(legacy);
    const loaded = readSave()!;
    assert.equal(loaded.contracts, undefined);
    const p = teamPlayers(loaded)[0];
    const { growth, energy, happiness } = weeklyPractice(loaded, p, "Balanced");
    assert.deepEqual({ growth, energy, happiness }, { growth: 1, energy: 7, happiness: 1 });
    assert.equal(loaded.cash, legacy.cash);
    assert.deepEqual(loaded.roster, legacy.roster);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
