import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBattleConfig, createCampaign, DEFAULT_SETTINGS, events } from "../src/game";
import { assessOffer, initialOffer, validOffer } from "../src/contracts";
import { clubPrizeShare, guaranteeFloor, MAX_PRIZE_SHARE, payMorale, payProfile, pressurePoints, PRESSURE_POINTS, shareValue } from "../src/pay-structure";
import { askingWage, marketValue } from "../src/player-market";
import type { Campaign } from "../src/game";

const campaign = () => createCampaign({ ...DEFAULT_SETTINGS, year: 2011 });
function contracted(c: Campaign, id: string, wage: number, prizeShare: number): Campaign {
  const next = structuredClone(c);
  next.contracts ??= {};
  next.contracts[id] = { wage, bonus: 0, weeks: 18, prizeShare, practiceHours: 30, restDays: 2, signedAt: 0, expiresAt: 100, marketWage: marketValue(c, c.players.find(p => p.id === id)!).wage };
  next.players.find(p => p.id === id)!.wage = wage;
  return next;
}

test("players spread across security, balance and risk, and across pressure temperaments", () => {
  const c = campaign(), rows = c.players.map(p => payProfile(c, p));
  for (const label of ["Wants security", "Balanced", "Bets on results"]) assert.ok(rows.some(r => r.appetiteLabel === label), label);
  for (const label of ["Thrives under pressure", "Steady", "Tightens under pressure"]) assert.ok(rows.some(r => r.pressureLabel === label), label);
  assert.ok(rows.every(r => r.appetite >= 0.05 && r.appetite <= 0.95 && r.pressure >= -1 && r.pressure <= 1));
  assert.deepEqual(payProfile(c, c.players[0]), payProfile(campaign(), campaign().players[0]));
});

test("contracts allow no guaranteed pay and up to 20% each, so five players can take every prize dollar", () => {
  const c = campaign(), base = initialOffer(c, c.players[0]);
  assert.equal(validOffer({ ...base, wage: 0, prizeShare: MAX_PRIZE_SHARE }), true);
  assert.equal(validOffer({ ...base, prizeShare: MAX_PRIZE_SHARE + 1 }), false);
  let all = c;
  for (const id of c.roster) all = contracted(all, id, 0, 20);
  assert.equal(clubPrizeShare(all), 0);
  assert.equal(clubPrizeShare(c), 100);
});

test("security-minded players insist on a guarantee; gamblers value prize shares more", () => {
  const c = campaign(), rows = c.players.map(p => ({ p, ...payProfile(c, p) })).sort((a, b) => a.appetite - b.appetite);
  const safe = rows[0].p, gambler = rows.at(-1)!.p;
  assert.ok(guaranteeFloor(c, safe) > 0.4);
  assert.equal(guaranteeFloor(c, gambler), Math.max(0, Math.round((0.75 - payProfile(c, gambler).appetite) * 100) / 100));
  assert.ok(shareValue(c, gambler, 10) > shareValue(c, safe, 10) * 2);
  const lowball = assessOffer(c, safe, { ...initialOffer(c, safe), wage: 0, prizeShare: 20 });
  assert.equal(lowball.status, "counter");
  assert.match(lowball.message, /guaranteed/);
  assert.ok(lowball.counter!.wage >= Math.ceil(askingWage(c, safe) * guaranteeFloor(c, safe) / 10) * 10);
});

test("thin guarantees cost security-minded players more happiness than gamblers at the same value", () => {
  const c = campaign(), rows = c.players.map(p => ({ p, ...payProfile(c, p) })).sort((a, b) => a.appetite - b.appetite);
  const safe = rows[0].p, gambler = rows.at(-1)!.p, market = 1000;
  assert.equal(payMorale(c, safe, market, 0, market), 0);
  const safeShare = Math.ceil(market / shareValue(c, safe, 1)), gambleShare = Math.ceil(market / shareValue(c, gambler, 1));
  assert.ok(payMorale(c, safe, 0, safeShare, market) < payMorale(c, gambler, 0, gambleShare, market));
});

test("pay pressure reaches competitive matches only for contracted starters on thin guarantees", () => {
  const c = campaign(), id = c.roster.find(id => Math.abs(payProfile(c, c.players.find(p => p.id === id)!).pressure) >= 0.2)!;
  const p = c.players.find(p => p.id === id)!;
  assert.equal(pressurePoints(c, p), 0);
  const full = contracted(c, id, marketValue(c, p).wage, 0);
  assert.equal(pressurePoints(full, p), 0);
  const none = contracted(c, id, 0, 20);
  const points = pressurePoints(none, none.players.find(p => p.id === id)!);
  assert.equal(points, Math.round(payProfile(c, p).pressure * PRESSURE_POINTS * 10) / 10);
  const event = events.find(e => e.kind !== "ti")!;
  assert.equal(buildBattleConfig(none, event, 7).players[0].find(row => row.id === id)?.pressure, points);
  assert.equal(buildBattleConfig(c, event, 7).players[0].find(row => row.id === id)?.pressure, undefined);
});
