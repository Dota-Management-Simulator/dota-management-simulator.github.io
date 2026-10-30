import { test } from "node:test";
import assert from "node:assert/strict";
import { advanceWeek, createCampaign, DEFAULT_SETTINGS, events, prepareEvent, readSave, SAVE_KEY, signSponsor, teamPlayers, weeklyIncome, weeklyWages } from "../src/game";
import type { Campaign } from "../src/game";
import { campaignWeek, weeklyPractice } from "../src/contracts";
import { activeSponsorDeals, advanceSponsorMarket, assessSponsorOffer, initialSponsorOffer, managedSponsorTeam, negotiateSponsor, sponsorBenefits, sponsorBlocker, sponsors, sponsorSlotsUsed, teamSponsorDeals } from "../src/sponsors";
import type { SponsorOffer } from "../src/sponsors";
import { allRosterReferences } from "../src/history";

function market(year = 2011) {
  const c = createCampaign({ ...DEFAULT_SETTINGS, year });
  c.sponsorships = { deals: [], releasedAt: {} };
  c.reputation = 100;
  return c;
}
function sign(c: Campaign, id: string, change: Partial<SponsorOffer> = {}) {
  const response = negotiateSponsor(c, id, { weekly: 1000, bonus: 0, weeks: 6, mediaHours: 0, ...change });
  assert.equal(response.status, "accepted", response.message);
  return response.campaign;
}

test("sponsor catalog has unique brands, linked era evidence, and no modern brands in TI1", () => {
  assert.ok(sponsors.length >= 40);
  assert.equal(new Set(sponsors.map((s) => s.id)).size, sponsors.length);
  for (const s of sponsors) {
    assert.ok(s.source.startsWith("https://") && s.evidence && s.association && s.sourceTitle);
    assert.ok(s.from >= 2011 && s.from <= 2026);
    if (s.preferredClub) assert.ok(allRosterReferences.some((t) => t.id === s.preferredClub), `Unmapped club: ${s.preferredClub}`);
  }
  const c = market();
  assert.match(sponsorBlocker(c, sponsors.find((s) => s.id === "backforce")!)!, /2022/);
  const blocked = negotiateSponsor(c, "napster", { weekly: 100, bonus: 0, weeks: 6, mediaHours: 0 });
  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.campaign, c);
});

test("negotiation counters are deterministic and trade bonus, term, media and reputation", () => {
  const c = market();
  c.reputation = 10;
  const s = sponsors.find((s) => s.id === "razer")!;
  const ask = { ...initialSponsorOffer(c, s), weekly: 10000, bonus: 20000 };
  const counter = assessSponsorOffer(c, s, ask);
  assert.equal(counter.status, "counter");
  assert.deepEqual(counter, assessSponsorOffer(c, s, ask));
  assert.equal(assessSponsorOffer(c, s, counter.counter!).status, "accepted");
  const ceiling = (o: SponsorOffer, reputation = 10) => assessSponsorOffer({ ...c, reputation }, s, o).counter!.weekly;
  const base = { weekly: 100000, bonus: 0, weeks: 18, mediaHours: 0 };
  assert.ok(ceiling({ ...base, mediaHours: 2 }) > ceiling(base));
  assert.ok(ceiling({ ...base, weeks: 36 }) > ceiling({ ...base, weeks: 6 }));
  assert.ok(ceiling(base, 50) > ceiling(base));
  const excessiveBonus = assessSponsorOffer(c, s, { ...base, bonus: 1000000 });
  assert.equal(assessSponsorOffer(c, s, excessiveBonus.counter!).status, "accepted");
  for (const change of [{ weekly: NaN }, { bonus: -1 }, { weeks: 7 }, { mediaHours: 3 }, { weekly: 1000.5 }]) {
    assert.equal(negotiateSponsor(c, s.id, { ...base, ...change }).campaign, c);
  }
  assert.equal(negotiateSponsor({ ...c, reputation: 0 }, "alienware", base).status, "blocked");
});

test("exclusive ownership blocks poaching, duplicate bonuses and early renewal atomically", () => {
  const c = market();
  const signed = sign(c, "razer", { bonus: 500 });
  assert.equal(signed.cash, c.cash + 500);
  assert.equal(c.sponsorships?.deals.length, 0);
  const repeated = negotiateSponsor(signed, "razer", initialSponsorOffer(signed, sponsors.find((s) => s.id === "razer")!));
  assert.equal(repeated.campaign, signed);
  const rival = structuredClone(signed);
  rival.sponsorships!.deals[0].teamId = "ehome";
  rival.sponsorships!.deals[0].teamName = "EHOME";
  assert.equal(negotiateSponsor(rival, "razer", { weekly: 100, bonus: 0, weeks: 6, mediaHours: 0 }).campaign, rival);
  assert.equal(rival.cash, signed.cash);
});

test("the five-sponsor cap counts legacy rolling deals and permits independent categories", () => {
  let c = market();
  // Asks stay under every 2011 brand's budget; this test is about slots, not money.
  for (const s of sponsors.filter((s) => s.from === 2011)) c = sign(c, s.id, { weekly: 500 });
  assert.equal(sponsorSlotsUsed(c), 5);
  const future = { ...c, year: 2012, sponsorships: structuredClone(c.sponsorships) };
  // Preserve the active time window when moving this fixture into a later era.
  future.sponsorships!.deals.forEach((d) => { d.signedAt += 18; d.expiresAt += 18; });
  assert.equal(negotiateSponsor(future, "amd", { weekly: 100, bonus: 0, weeks: 6, mediaHours: 0 }).campaign, future);
  assert.equal(signSponsor(c, "s1"), c);
  let old = signSponsor(market(), "s1");
  for (const id of ["razer", "eizo", "msi", "steelseries"]) old = sign(old, id, { weekly: 500 });
  assert.equal(sponsorSlotsUsed(old), 5);
  assert.equal(negotiateSponsor(old, "alienware", { weekly: 100, bonus: 0, weeks: 6, mediaHours: 0 }).campaign, old);
});

test("expiry pays exactly the agreed weeks, frees a slot and allows a new exclusive deal", () => {
  let c = sign(market(), "razer", { bonus: 500, mediaHours: 1 });
  const start = c.cash;
  const wages = weeklyWages(c);
  for (let n = 0; n < 6; n++) c = advanceWeek(c);
  assert.equal(c.cash, start + 6 * (1000 - wages));
  assert.equal(c.week, 7);
  assert.equal(weeklyIncome(c), 0);
  assert.equal(sponsorSlotsUsed(c), 0);
  assert.equal(activeSponsorDeals(c).some((d) => d.sponsorId === "razer"), false);
  assert.equal(sponsorBenefits(c).mediaHours, 0);
  c = sign(c, "razer", { bonus: 500 });
  assert.equal(c.cash, start + 6 * (1000 - wages) + 500);
  assert.equal(teamSponsorDeals(c).length, 1);
});

test("AI clubs respect global uniqueness and five slots through shuffles and new eras", () => {
  let c = createCampaign({ ...DEFAULT_SETTINGS, year: 2025 });
  for (let n = 0; n < 45; n++) {
    const deals = activeSponsorDeals(c);
    assert.equal(new Set(deals.map((d) => d.sponsorId)).size, deals.length);
    assert.equal(deals.some((d) => sponsors.find((s) => s.id === d.sponsorId)!.from > c.year), false);
    for (const team of new Set(deals.map((d) => d.teamId))) assert.ok(deals.filter((d) => d.teamId === team).length <= 5);
    const before = structuredClone(c);
    c = advanceWeek(c);
    assert.equal(campaignWeek(c), campaignWeek(before) + 1);
    for (const [id, released] of Object.entries(c.sponsorships!.releasedAt)) {
      if (released === campaignWeek(c)) assert.equal(activeSponsorDeals(c).some((d) => d.sponsorId === id), false);
    }
  }
  const held = activeSponsorDeals(c).find((d) => d.teamId !== managedSponsorTeam(c))!;
  c.world!.clubs.find((t) => t.id === held.teamId)!.active = false;
  advanceSponsorMarket(c);
  assert.equal(activeSponsorDeals(c).some((d) => d.sponsorId === held.sponsorId), false);
});

test("sponsor benefits and media have actual weekly effects matching practice previews", () => {
  const c = market(2026);
  const p = teamPlayers(c)[0];
  const base = weeklyPractice(c, p, "Vision");
  let s = sign(c, "razer");
  s = sign(s, "secretlab");
  s = sign(s, "monster");
  s = sign(s, "sap");
  s = sign(s, "huya", { mediaHours: 2 });
  const expected = weeklyPractice(s, p, "Vision");
  assert.equal(expected.growth, 1.08); // (1 + .1 equipment + .1 analytics) * .9 media
  assert.equal(expected.energy, base.energy); // +2 furniture -2 media
  assert.equal(expected.happiness, base.happiness + 1);
  s.training[p.id] = "Vision";
  s.players.find((v) => v.id === p.id)!.energy = 50;
  const next = advanceWeek(s);
  const after = next.players.find((v) => v.id === p.id)!;
  assert.equal(after.stats.vision, Math.round((p.stats.vision + expected.growth) * 100) / 100);
  assert.equal(after.energy, 50 + expected.energy);
  assert.equal(after.happiness, p.happiness + expected.happiness);
  assert.equal(next.reputation, 100.25);
  assert.equal(weeklyPractice(s, p, "Rest").growth, 0);
  assert.equal(weeklyPractice(s, p, "Farming").growth, 0.99); // no analytics bonus
  const capped = ["secretlab", "backforce", "blacklyte", "thorne", "zenni"].reduce((v, id) => sign(v, id), c);
  assert.equal(sponsorBenefits(capped).energy, 6);
});

test("event time jumps and season boundaries expire fixed terms without losing legacy income", () => {
  let c = sign(market(), "razer");
  c = signSponsor(c, "s1");
  const prepared = prepareEvent(c, events[2]);
  assert.equal(teamSponsorDeals(prepared).length, 0);
  assert.equal(weeklyIncome(prepared), 2200);
  c.week = 17;
  c.sponsorships = { deals: [], releasedAt: {} };
  c = sign(c, "razer");
  for (let i = 0; i < 6; i++) c = advanceWeek(c);
  assert.equal(c.year, 2012);
  assert.equal(c.week, 5);
  assert.equal(teamSponsorDeals(c).length, 0);
  assert.deepEqual(c.sponsorIds, ["s1"]);
});

test("v1 saves preserve negotiated deals and migrate old sponsor income without money or lineup changes", () => {
  const c = sign(market(), "razer", { bonus: 500 });
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  try {
    let value = JSON.stringify(c);
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => key === SAVE_KEY ? value : null } });
    assert.deepEqual(readSave(), JSON.parse(JSON.stringify(c)));
    const old = signSponsor(market(), "s1");
    delete old.sponsorships;
    delete old.world;
    value = JSON.stringify(old);
    const loaded = readSave()!;
    assert.equal(loaded.cash, old.cash);
    assert.deepEqual(loaded.roster, old.roster);
    assert.deepEqual(loaded.transactions, old.transactions);
    assert.equal(weeklyIncome(loaded), 2200);
    assert.equal(loaded.contracts, undefined);
    assert.equal(loaded.trainingSchedules, undefined);
    assert.equal(teamSponsorDeals(loaded).length, 0);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
