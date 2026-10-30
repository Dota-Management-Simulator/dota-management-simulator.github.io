import { test } from "node:test";
import assert from "node:assert/strict";
import { advanceCalendarTo, advanceWeek, createCampaign, DEFAULT_SETTINGS, readSave, SAVE_KEY, weeklyWages } from "../src/game";
import { bookCamp, cancelCamp, campAttendance, campBlocker, campFee } from "../src/bootcamp";
import { financeForecast } from "../src/finance-forecast";
import { campaignWeek, weeklyPractice } from "../src/contracts";
import { enableHistoricalCalendar } from "../src/historical-game";
import { managedSponsorTeam } from "../src/sponsors";
import { setTrainingSchedule } from "../src/training";

function fixture() {
  const c = createCampaign(DEFAULT_SETTINGS);
  c.cash = 1e6;
  c.roster.forEach(id => { const p = c.players.find(p => p.id === id)!; p.energy = 80; c.training[id] = "Farming"; });
  return c;
}

test("camp booking is immutable, prepaid once, bounded and cannot be stacked", () => {
  const c = fixture(), before = structuredClone(c), next = bookCamp(c, 2);
  assert.deepEqual(c, before);
  assert.equal(next.cash, c.cash - c.roster.length * campFee(c) * 2);
  assert.equal(bookCamp(next, 1), next);
  for (const weeks of [0, -1, 4, 1.5, NaN, Infinity]) assert.equal(bookCamp(c, weeks), c);
  assert.match(campBlocker({ ...c, cash: 1 }, 1)!, /cash/);
});

test("camp improves actual selected skills and costs exactly six additional energy", () => {
  const c = fixture(), camp = bookCamp(c, 1), id = c.roster[0], p = c.players.find(p => p.id === id)!;
  const ordinary = weeklyPractice(c, p, "Farming"), boosted = weeklyPractice(camp, p, "Farming");
  assert.equal(boosted.growth, Math.round(ordinary.growth * 135) / 100);
  assert.equal(boosted.energy, ordinary.energy - 6);
  const normal = advanceWeek(c), trained = advanceWeek(camp);
  const a = normal.players.find(p => p.id === id)!, b = trained.players.find(p => p.id === id)!;
  assert.ok(Math.abs(b.stats.farming - a.stats.farming - 0.35) < 0.001);
  assert.equal(b.energy, a.energy - 6);
  assert.equal(trained.bootcamp, undefined);
  assert.equal(trained.lastCampReport?.attended, 5);
  assert.match(trained.lastCampReport!.players[0].outcome, /0.35 total attribute/);
  assert.deepEqual(trained.results, normal.results);
});

test("Rest, fatigue, contract-limited hours and missing focuses skip camp and refund places", () => {
  let c = bookCamp(fixture(), 1);
  c.training[c.roster[0]] = "Rest";
  c.players.find(p => p.id === c.roster[1])!.energy = 49;
  c = setTrainingSchedule(c, c.roster[2], { hoursPerDay: 1, daysPerWeek: 5 });
  c.training[c.roster[3]] = "Happiness";
  const rows = campAttendance(c);
  assert.equal(rows.filter(row => !row.reason).length, 1);
  const next = advanceWeek(c);
  assert.equal(next.lastCampReport?.refunded, 4 * campFee(c));
  assert.equal(next.cash, c.cash - weeklyWages(c) + 4 * campFee(c));
  assert.equal(next.players.find(p => p.id === c.roster[0])!.energy, 100);
});

test("fatigue safeguard includes projected workload rather than current energy alone", () => {
  let c = fixture();
  c = setTrainingSchedule(c, c.roster[0], { intensity: "Intense", hoursPerDay: 12, daysPerWeek: 7 });
  assert.match(campAttendance(c)[0].reason!, /Fatigue/);
  c.roster.forEach(id => c.training[id] = "Rest");
  assert.match(campBlocker(c, 1)!, /No players/);
});

test("cancellation refunds only unelapsed places and is idempotent", () => {
  const c = fixture(), booked = bookCamp(c, 3), one = advanceWeek(booked), cancelled = cancelCamp(one);
  assert.equal(cancelled.cash, one.cash + 2 * c.roster.length * campFee(c));
  assert.equal(cancelCamp(cancelled), cancelled);
  assert.equal(cancelCamp(booked).cash, c.cash);
});

test("departed players cannot transfer prepaid development to replacements", () => {
  const c = bookCamp(fixture(), 1), old = c.roster[0];
  const replacement = c.players.find(p => !c.roster.includes(p.id))!;
  c.roster[0] = replacement.id;
  const plain = { ...c, bootcamp: undefined };
  assert.deepEqual(weeklyPractice(c, replacement, "Balanced"), weeklyPractice(plain, replacement, "Balanced"));
  assert.match(campAttendance(c).find(row => row.id === old)!.reason!, /No longer/);
  assert.equal(advanceWeek(c).lastCampReport?.refunded, campFee(c));
});

test("camp saves round trip; malformed optional blocks do not discard campaign", () => {
  const c = advanceWeek(bookCamp(fixture(), 2));
  const previous = globalThis.localStorage;
  try {
    let stored = JSON.stringify(c);
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => key === SAVE_KEY ? stored : null } });
    assert.deepEqual(readSave()?.bootcamp, c.bootcamp);
    assert.deepEqual(readSave()?.lastCampReport, c.lastCampReport);
    for (const bad of [null, [], { remaining: 100, playerIds: [] }, { remaining: 1, playerIds: "bad" }]) {
      stored = JSON.stringify({ ...c, bootcamp: bad, lastCampReport: { players: null } });
      const loaded = readSave(); assert.ok(loaded); assert.equal(loaded.bootcamp, undefined); assert.equal(loaded.lastCampReport, undefined);
    }
  } finally { Object.defineProperty(globalThis, "localStorage", { configurable: true, value: previous }); }
});

test("dated partial weeks do not spend camp weeks; each paid tick settles once", () => {
  let c = enableHistoricalCalendar(bookCamp(fixture(), 3));
  const origin = Date.parse(c.calendar!.now);
  const short = advanceCalendarTo(c, new Date(origin + 3 * 86400000).toISOString());
  assert.equal(short.bootcamp?.remaining, 3);
  assert.equal(short.cash, c.cash);
  const split = advanceCalendarTo(short, new Date(origin + 14 * 86400000).toISOString());
  const jump = advanceCalendarTo(c, new Date(origin + 14 * 86400000).toISOString());
  assert.equal(jump.bootcamp?.remaining, 1);
  assert.equal(jump.cash, split.cash);
  assert.deepEqual(jump.lastCampReport, split.lastCampReport);
});

test("forecast matches real weekly payroll and fixed sponsor expiry without mutating saves", () => {
  let c = fixture();
  c.sponsorships = { releasedAt: {}, deals: [{ sponsorId: "test", teamId: managedSponsorTeam(c), teamName: c.settings.team,
    signedAt: campaignWeek(c), expiresAt: campaignWeek(c) + 2, weekly: 1000, bonus: 0, mediaHours: 0, weeks: 2 }] };
  const before = structuredClone(c), forecast = financeForecast(c, 4);
  assert.deepEqual(c, before);
  for (const row of forecast) { c = advanceWeek(c); assert.equal(row.balance, c.cash); }
  assert.deepEqual(forecast.map(r => r.income), [1000, 1000, 0, 0]);
});

test("dated forecast agrees with settlements after stopping partway through a week", () => {
  let c = enableHistoricalCalendar(fixture());
  c.sponsorships = { releasedAt: {}, deals: [{ sponsorId: "test", teamId: managedSponsorTeam(c), teamName: c.settings.team,
    signedAt: campaignWeek(c), expiresAt: campaignWeek(c) + 1, weekly: 1000, bonus: 0, mediaHours: 0, weeks: 1 }] };
  c = advanceCalendarTo(c, new Date(Date.parse(c.calendar!.now) + 3 * 86400000).toISOString());
  const forecast = financeForecast(c, 3);
  assert.deepEqual(forecast.map(row => row.income), [1000, 0, 0]);
  for (const row of forecast) {
    c = advanceCalendarTo(c, new Date(Date.parse(c.calendar!.origin) + (c.calendar!.paidWeeks + 1) * 604800000).toISOString());
    assert.equal(row.balance, c.cash);
  }
});

test("forecast scenarios isolate upfront and recurring costs and safely bound invalid input", () => {
  const c = fixture(), baseline = financeForecast(c, 4), scenario = financeForecast(c, 4, 5000, 300);
  scenario.forEach((row, i) => assert.equal(row.balance, baseline[i].balance - 5000 - 300 * (i + 1)));
  assert.deepEqual(financeForecast(c, 4, NaN, -1), baseline);
  assert.equal(financeForecast(c, Infinity).length, 8);
  assert.equal(financeForecast(c, 100).length, 18);
  assert.equal(financeForecast(c, 1, c.cash)[0].balance, -weeklyWages(c));
});

test("camp previews and settlement respect skill caps and never boost opponents", () => {
  const c = fixture(), id = c.roster[0], p = c.players.find(p => p.id === id)!;
  p.stats.farming = 99;
  const camp = bookCamp(c, 1);
  assert.match(campAttendance(camp)[0].preview!, /\+0 total/);
  const normal = advanceWeek(c), trained = advanceWeek(camp);
  assert.equal(trained.players.find(p => p.id === id)!.stats.farming, 99);
  for (const player of trained.players.filter(p => !c.roster.includes(p.id))) assert.deepEqual(player, normal.players.find(p => p.id === player.id));
});
