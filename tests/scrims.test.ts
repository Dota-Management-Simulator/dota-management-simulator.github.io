import { test } from "node:test";
import assert from "node:assert/strict";
import { createCampaign, DEFAULT_SETTINGS, readSave, SAVE_KEY } from "../src/game";
import type { Campaign } from "../src/game";
import { enableHistoricalCalendar } from "../src/historical-game";
import { advanceManagerWeek, syncOffice } from "../src/office";
import { managerContinue } from "../src/manager-view";
import { simulateSeries } from "../src/battle";
import { campaignPatch } from "../src/patches";
import { heroKnowledgeEstimate, managedPatchObserver, patchReport } from "../src/patch-knowledge";
import { cancelScrim, prepareScrim, respondToScrim, scheduleScrim, scrimOpponents, scrimSlotBlocker, settleScrim } from "../src/scrims";
import { normalizeScrims } from "../src/scrim-state";

const DAY = 86400000;
const dated = () => syncOffice(enableHistoricalCalendar(createCampaign(DEFAULT_SETTINGS)));
const at = (c: Campaign, days: number) => new Date(Date.parse(c.calendar!.now) + days * DAY).toISOString();

/** Schedule, Continue to the start, play, settle. */
function playScrim(c: Campaign, bestOf: 1 | 2 | 3, days = 1) {
  const opponent = scrimOpponents(c)[0].id;
  c = scheduleScrim(c, opponent, at(c, days), bestOf, "lanes");
  const id = c.scrims!.sessions.at(-1)!.id;
  c = advanceManagerWeek(c);
  const prepared = prepareScrim(c, id);
  const config = prepared.scrims!.sessions.find(s => s.id === id)!.config!;
  const series = simulateSeries(config).summary;
  return { before: prepared, after: settleScrim(prepared, id, series), id, series };
}

test("scrims need a dated calendar, a real opponent, BO1-3 and a 28-day window", () => {
  const legacy = createCampaign(DEFAULT_SETTINGS);
  assert.match(scrimSlotBlocker(legacy, "x", "2011-01-01T00:00:00Z", 1)!, /dated calendar/);
  const c = dated();
  const opponent = scrimOpponents(c)[0];
  assert.ok(opponent && !opponent.roster.some(id => c.roster.includes(id)));
  assert.equal(scrimSlotBlocker(c, opponent.id, at(c, 1), 2), null);
  assert.match(scrimSlotBlocker(c, opponent.id, at(c, 1), 4)!, /BO1, BO2 or BO3/);
  assert.match(scrimSlotBlocker(c, opponent.id, at(c, -1), 1)!, /28 days/);
  assert.match(scrimSlotBlocker(c, opponent.id, at(c, 29), 1)!, /28 days/);
  assert.match(scrimSlotBlocker(c, "no-such-team", at(c, 1), 1)!, /starting five/);
});

test("bookings leave the clock and ratings alone, keep 24h spacing and survive reload", () => {
  const c = dated();
  const opponent = scrimOpponents(c)[0].id;
  const booked = scheduleScrim(c, opponent, at(c, 2), 3, "teamfight");
  assert.equal(booked.calendar!.now, c.calendar!.now);
  assert.deepEqual(booked.players, c.players);
  assert.match(scrimSlotBlocker(booked, opponent, at(c, 2.5), 1)!, /24 hours/);
  assert.equal(scrimSlotBlocker(booked, opponent, at(c, 3), 1), null);
  const saved = JSON.stringify(booked);
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => key === SAVE_KEY ? saved : null } });
  let loaded: Campaign;
  try { loaded = readSave()!; }
  finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
  const mine = (x: Campaign) => x.scrims!.sessions.filter(s => s.source === "manager");
  assert.deepEqual(mine(loaded).map(s => [s.opponentId, s.bestOf, s.focus, s.status]), [[opponent, 3, "teamfight", "scheduled"]]);
  const cancelled = cancelScrim(booked, mine(booked)[0].id);
  assert.equal(mine(cancelled)[0].status, "cancelled");
  assert.equal(scrimSlotBlocker(cancelled, opponent, at(c, 2.5), 1), null);
});

test("malformed saved scrims are dropped without invalidating the campaign", () => {
  const state = normalizeScrims({ sessions: [{ id: "a" }, { id: "b", opponentId: "t", opponent: "T", at: "2011-08-01T12:00:00Z", bestOf: 2, focus: "lanes", source: "manager", status: "scheduled", seed: 1 }], research: { "6.70": { axe: 3, bad: -1, worse: "x" } } })!;
  assert.deepEqual(state.sessions.map(s => s.id), ["b"]);
  assert.deepEqual(state.research, { "6.70": { axe: 3 } });
  assert.equal(normalizeScrims([]), undefined);
});

test("one weekly request arrives in the inbox and can be accepted or declined", () => {
  const c = dated();
  const requests = c.scrims!.sessions.filter(s => s.status === "requested");
  assert.equal(requests.length, 1);
  assert.ok([1, 2, 3].includes(requests[0].bestOf));
  assert.ok(c.office!.messages.some(m => m.id === `scrim-request:${requests[0].id}` && m.category === "scrims"));
  assert.equal(syncOffice(c).scrims!.sessions.length, 1, "reloading does not reroll requests");
  const accepted = syncOffice(respondToScrim(c, requests[0].id, true, "objectives"));
  assert.equal(accepted.scrims!.sessions[0].status, "scheduled");
  assert.equal(accepted.scrims!.sessions[0].focus, "objectives");
  assert.ok(accepted.office!.messages.some(m => m.id === `scrim-due:${requests[0].id}`));
  assert.equal(respondToScrim(c, requests[0].id, false).scrims!.sessions[0].status, "declined");
});

test("Continue stops at an accepted scrim and the clock cannot skip it", () => {
  let c = dated();
  const opponent = scrimOpponents(c)[0].id;
  const start = at(c, 3);
  c = scheduleScrim(c, opponent, start, 1, "balanced");
  c = advanceManagerWeek(c);
  assert.equal(Date.parse(c.calendar!.now), Date.parse(start));
  assert.equal(managerContinue(c).kind, "scrim");
  assert.equal(advanceManagerWeek(c).calendar!.now, c.calendar!.now, "the week does not pass an unplayed scrim");
  const cancelled = cancelScrim(c, c.scrims!.sessions.find(s => s.status === "scheduled")!.id);
  assert.notEqual(managerContinue(cancelled).kind, "scrim");
  assert.ok(Date.parse(advanceManagerWeek(cancelled).calendar!.now) > Date.parse(start));
});

for (const bestOf of [1, 2, 3] as const) test(`a BO${bestOf} scrim settles with small training, energy cost and patch hero research`, () => {
  const { before, after, id, series } = playScrim(dated(), bestOf);
  const maps = series.games.length;
  assert.ok(bestOf === 2 ? maps === 2 : maps <= bestOf);
  const s = after.scrims!.sessions.find(s => s.id === id)!;
  assert.equal(s.status, "complete");
  assert.equal(s.config, undefined);
  assert.equal(after.cash, before.cash, "no prize money");
  assert.equal(after.results.length, before.results.length, "private results stay out of career results");
  assert.equal(Date.parse(after.calendar!.now), Date.parse(s.at) + (bestOf * 1.5 + 0.5) * 3600000);
  for (const row of s.review!.players) {
    const was = before.players.find(p => p.id === row.id)!, now = after.players.find(p => p.id === row.id)!;
    assert.ok(now.stats.laning >= was.stats.laning && now.stats.farming >= was.stats.farming);
    assert.ok(row.training > 0 && row.training < 0.1 * maps);
    assert.ok(now.energy < was.energy);
  }
  const research = after.scrims!.research[campaignPatch(after).id];
  for (const hero of s.review!.heroes) assert.ok(research[hero] >= 1);
  assert.throws(() => settleScrim(before, id, { ...series, seed: series.seed + 1 }), /does not match/);
});

test("hero reads narrow gradually with practice maps and stay inside the staff read", () => {
  const c = dated();
  const patch = campaignPatch(c);
  const hero = patch.heroes[0].id;
  const observer = managedPatchObserver(c);
  const broad = heroKnowledgeEstimate(patch, observer, hero);
  const narrow = heroKnowledgeEstimate(patch, observer, hero, true);
  const widths = [0, 2, 8, 24, 200].map(n => heroKnowledgeEstimate(patch, { ...observer, heroSamples: { [hero]: n } }, hero));
  assert.equal(widths[0].width, broad.width);
  for (let i = 1; i < widths.length; i++) {
    assert.ok(widths[i].width <= widths[i - 1].width);
    assert.ok(widths[i].low >= broad.low && widths[i].high <= broad.high);
  }
  assert.deepEqual(widths[3], narrow);
  assert.deepEqual(heroKnowledgeEstimate(patch, { ...observer, heroSamples: { [hero]: 24 }, researchPatchId: "other" }, hero), broad, "research is patch-specific");
  const seenOnce = patchReport(patch, { ...observer, heroSamples: { [hero]: 1 } }).heroes.length;
  const seenTwice = patchReport(patch, { ...observer, heroSamples: { [hero]: 2 } }).heroes.length;
  assert.ok(seenTwice >= seenOnce);
});
