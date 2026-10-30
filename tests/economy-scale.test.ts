import { test } from "node:test";
import assert from "node:assert/strict";
import { createCampaign, DEFAULT_SETTINGS, weeklyWages } from "../src/game";
import { enableHistoricalCalendar, enterHistoricalTournament, travelCost } from "../src/historical-game";
import { historicalTournaments } from "../src/tournaments";
import { economyScale, scaledCost, SPONSOR_WEEKLY_SHARE, TRAVEL_PER_PLAYER } from "../src/economy-scale";
import { initialSponsorOffer, negotiateSponsor, sponsorResultBonuses, sponsors, sponsorTerms } from "../src/sponsors";
import { bookCamp, campFee, cancelCamp } from "../src/bootcamp";
import { marketValue } from "../src/player-market";

test("the era scale follows the dated prize data, square-root dampened and capped", () => {
  const pools: Record<number, number[]> = {};
  // Tier-1-only years would inflate the median, so only mixed-tier years count.
  const mixed = new Set(historicalTournaments.filter(e => e.tier !== 1).map(e => e.year));
  for (const e of historicalTournaments) if (e.pool > 0 && mixed.has(e.year)) (pools[e.year] ??= []).push(e.pool);
  const median = (values: number[]) => [...values].sort((a, b) => a - b)[values.length >> 1];
  const base = median([...pools[2011], ...pools[2012]]);
  let last = 1;
  for (let year = 2011; year <= 2026; year++) {
    const window = [year - 1, year, year + 1].flatMap(y => pools[y] ?? []);
    const derived = last = window.length ? Math.min(6, Math.max(1, Math.sqrt(median(window) / base))) : last;
    assert.ok(Math.abs(economyScale(year) - derived) <= 0.1, `${year}: ${economyScale(year)} vs ${derived.toFixed(2)}`);
  }
  assert.ok(!mixed.has(2025), "2025 lists tier 1 only");
  assert.equal(economyScale(2025), economyScale(2023));
  assert.equal(economyScale(2010), 1);
  assert.equal(economyScale(2030), 4.1);
});

test("wages, starting cash and staff follow the era while 2011 keeps its original prices", () => {
  const early = createCampaign({ ...DEFAULT_SETTINGS, year: 2011 }), later = createCampaign({ ...DEFAULT_SETTINGS, year: 2016 });
  assert.equal(early.cash, 100000);
  assert.equal(later.cash, 320000);
  const p = later.players[0];
  assert.ok(Math.abs(marketValue(later, p).wage - marketValue({ ...later, year: 2011 }, p).wage * 3.2) <= 40);
  const staffed = { ...later, staffIds: ["c1"] };
  assert.equal(weeklyWages(staffed) - weeklyWages(later), scaledCost(2016, 650));
});

test("sponsors pay part of their value weekly and the rest for top-eight results", () => {
  const c = createCampaign({ ...DEFAULT_SETTINGS, year: 2011 });
  c.sponsorships = { deals: [], releasedAt: {} };
  c.reputation = 100;
  const razer = sponsors.find(s => s.id === "razer")!;
  assert.equal(sponsorTerms(2011, razer).weekly, Math.round(razer.weekly * SPONSOR_WEEKLY_SHARE / 10) * 10);
  assert.ok(sponsorTerms(2016, razer).weekly > sponsorTerms(2011, razer).weekly * 3);
  const signed = negotiateSponsor(c, razer.id, initialSponsorOffer(c, razer));
  assert.equal(signed.status, "accepted", signed.message);
  const weekly = initialSponsorOffer(c, razer).weekly;
  assert.deepEqual(sponsorResultBonuses(signed.campaign, 1).map(b => b.amount), [weekly * 4]);
  assert.deepEqual(sponsorResultBonuses(signed.campaign, 2).map(b => b.amount), [Math.round(weekly * 2.5 / 10) * 10]);
  assert.deepEqual(sponsorResultBonuses(signed.campaign, 8).map(b => b.amount), [Math.round(weekly * 0.5 / 10) * 10]);
  assert.deepEqual(sponsorResultBonuses(signed.campaign, 9), []);
});

test("LAN entry charges travel once; online events are free", () => {
  const lan = historicalTournaments.find(e => e.year === 2011 && e.kind === "ti")!;
  assert.equal(lan.online, false);
  assert.equal(travelCost(lan), 5 * TRAVEL_PER_PLAYER);
  assert.equal(travelCost({ online: true, year: 2019 }), 0);
  const c = enableHistoricalCalendar(createCampaign({ ...DEFAULT_SETTINGS }));
  c.calendar!.now = c.calendar!.origin = "2011-08-17T00:00:00Z";
  const entered = enterHistoricalTournament(c, lan.id, 997);
  assert.equal(entered.cash, c.cash - travelCost(lan));
  assert.equal(entered.transactions[0].label, `${lan.name} travel`);
});

test("bootcamp refunds return the fee that was prepaid, even after the era changes", () => {
  const c = createCampaign({ ...DEFAULT_SETTINGS, year: 2011 });
  const booked = bookCamp(c, 2);
  assert.equal(booked.cash, c.cash - c.roster.length * campFee(c) * 2);
  const cancelled = cancelCamp({ ...booked, year: 2016 });
  assert.equal(cancelled.cash, c.cash);
  const old = cancelCamp({ ...c, bootcamp: { remaining: 1, playerIds: [...c.roster] } });
  assert.equal(old.cash, c.cash + c.roster.length * 500);
});
