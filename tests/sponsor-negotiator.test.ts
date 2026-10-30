import { test } from "node:test";
import assert from "node:assert/strict";
import { advanceWeek, buildBattleConfig, createCampaign, DEFAULT_SETTINGS, dismissStaff, events, hireStaff, readSave, SAVE_KEY, weeklyIncome, weeklyWages } from "../src/game";
import { assessSponsorOffer, initialSponsorOffer, negotiateSponsor, recommendedSponsorOffer, sponsorBenefits, sponsorBlocker, sponsorNegotiator, sponsorRecommendations, sponsors, teamSponsorDeals } from "../src/sponsors";
import { SPONSOR_NEGOTIATOR_ID } from "../src/staff";
import { managedPatchObserver, patchReport } from "../src/patch-knowledge";
import { campaignPatch } from "../src/patches";
import { staffDraftAdvice } from "../src/team-scouting";

function market(year = 2011) {
  const c = createCampaign({ ...DEFAULT_SETTINGS, year });
  c.sponsorships = { deals: [], releasedAt: {} };
  c.reputation = 100;
  return c;
}
const staffed = (year = 2011) => hireStaff(market(year), SPONSOR_NEGOTIATOR_ID);

test("negotiator hiring, duplicate prevention, reserve and weekly wages use the staff economy", () => {
  const c = market(), before = structuredClone(c), hired = hireStaff(c, SPONSOR_NEGOTIATOR_ID);
  assert.deepEqual(c, before);
  assert.equal(hired.cash, c.cash);
  assert.equal(hired.week, c.week);
  assert.equal(weeklyWages(hired), weeklyWages(c) + 400);
  assert.equal(hireStaff(hired, SPONSOR_NEGOTIATOR_ID), hired);
  const poor = { ...c, cash: 1599 };
  assert.equal(hireStaff(poor, SPONSOR_NEGOTIATOR_ID), poor);
  assert.ok(sponsorNegotiator(hireStaff({ ...c, cash: 1600 }, SPONSOR_NEGOTIATOR_ID)));
  assert.equal(advanceWeek(hired).cash, hired.cash - weeklyWages(hired));
  assert.equal(weeklyWages(dismissStaff(hired, SPONSOR_NEGOTIATOR_ID)), weeklyWages(c));
});

test("negotiator raises the real total package budget by 15% and does not stack", () => {
  const c = market(), hired = hireStaff(c, SPONSOR_NEGOTIATOR_ID), s = sponsors.find(s => s.id === "razer")!;
  for (const weeks of [6, 18, 36]) for (const mediaHours of [0, 1, 2]) {
    const ask = { weekly: 100000, bonus: 0, weeks, mediaHours };
    const base = assessSponsorOffer(c, s, ask).counter!;
    const improved = assessSponsorOffer(hired, s, ask).counter!;
    assert.ok(Math.abs(improved.weekly - base.weekly * 1.15) < 2);
    assert.equal(assessSponsorOffer(c, s, improved).status, "counter");
    assert.equal(assessSponsorOffer(hired, s, improved).status, "accepted");
    assert.deepEqual(assessSponsorOffer({ ...hired, staffIds: [SPONSOR_NEGOTIATOR_ID, SPONSOR_NEGOTIATOR_ID, "c2"] }, s, ask).counter, improved);
    assert.deepEqual(assessSponsorOffer(dismissStaff(hired, SPONSOR_NEGOTIATOR_ID), s, ask).counter, base);
  }
});

test("recommendations rank comparable accepted packages, respect all gates and never mutate campaigns", () => {
  for (const year of [2011, 2016, 2026]) {
    const c = staffed(year), before = JSON.stringify(c);
    for (const weeks of [6, 18, 36]) for (const mediaHours of [0, 1, 2]) {
      const advice = sponsorRecommendations(c, weeks, mediaHours);
      assert.equal(advice.length, sponsors.filter(s => !sponsorBlocker(c, s)).length);
      advice.forEach((r, i) => {
        assert.equal(r.offer.weeks, weeks); assert.equal(r.offer.mediaHours, mediaHours);
        assert.equal(assessSponsorOffer(c, r.sponsor, r.offer).status, "accepted");
        assert.equal(r.total, r.offer.weekly * weeks + r.offer.bonus);
        assert.equal(r.weeklyValue, r.total / weeks);
        assert.ok(r.extraTotal > 0);
        if (i) assert.ok(advice[i - 1].total >= r.total);
      });
    }
    assert.equal(JSON.stringify(c), before);
    assert.deepEqual(sponsorRecommendations({ ...c, staffIds: [] }), []);
  }
  let c = staffed(); c.reputation = 0;
  assert.ok(sponsorRecommendations(c).every(r => r.sponsor.requirement === 0 && r.sponsor.from <= c.year));
  c = staffed();
  const rival = c.world!.clubs.find(t => t.id !== c.world!.managedTeamId)!;
  const signed = negotiateSponsor(c, "razer", recommendedSponsorOffer(c, sponsors.find(s => s.id === "razer")!)!).campaign;
  assert.ok(!sponsorRecommendations(signed).some(r => r.sponsor.id === "razer"));
  const rivals = structuredClone(signed); rivals.sponsorships!.deals[0].teamId = rival.id;
  assert.ok(!sponsorRecommendations(rivals).some(r => r.sponsor.id === "razer"));
  for (let i = 0; i < 5; i++) {
    const r = sponsorRecommendations(c)[0];
    c = negotiateSponsor(c, r.sponsor.id, r.offer).campaign;
  }
  assert.equal(teamSponsorDeals(c).length, 5);
  assert.deepEqual(sponsorRecommendations(c), []);
  assert.deepEqual(sponsorRecommendations(staffed(), 7, 1), []);
});

test("advice handles bonus tradeoffs and invalid offers without weakening signing validation", () => {
  const c = staffed(), s = sponsors.find(s => s.id === "razer")!;
  for (const bonus of [0, 500, 1000000]) {
    const o = recommendedSponsorOffer(c, s, 6, 0, bonus)!;
    assert.ok(o.bonus <= bonus);
    assert.equal(assessSponsorOffer(c, s, o).status, "accepted");
  }
  for (const bonus of [NaN, -1, 1.5, 1000001]) {
    assert.equal(recommendedSponsorOffer(c, s, 18, 1, bonus), null);
    assert.equal(negotiateSponsor(c, s.id, { ...initialSponsorOffer(c, s), bonus }).campaign, c);
  }
  assert.equal(recommendedSponsorOffer(c, s, 18, 3), null);
});

test("negotiated terms survive release and saves, bonuses pay once and weekly income ends at expiry", () => {
  const c = staffed(), s = sponsors.find(s => s.id === "razer")!, offer = recommendedSponsorOffer(c, s, 6, 0)!;
  const signed = negotiateSponsor(c, s.id, offer).campaign;
  assert.equal(signed.cash, c.cash + offer.bonus);
  assert.equal(negotiateSponsor(signed, s.id, offer).campaign, signed);
  let released = dismissStaff(signed, SPONSOR_NEGOTIATOR_ID);
  assert.deepEqual(released.sponsorships, signed.sponsorships);
  assert.deepEqual(sponsorBenefits(released), sponsorBenefits(signed));
  assert.equal(weeklyIncome(released), offer.weekly);
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  try {
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => key === SAVE_KEY ? JSON.stringify(signed) : null } });
    const loaded = readSave()!;
    assert.ok(sponsorNegotiator(loaded));
    assert.deepEqual(loaded.sponsorships, signed.sponsorships);
    assert.equal(weeklyIncome(loaded), offer.weekly);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous); else Reflect.deleteProperty(globalThis, "localStorage");
  }
  const cash = released.cash, wages = weeklyWages(released);
  for (let n = 0; n < 6; n++) released = advanceWeek(released);
  assert.equal(released.cash, cash + 6 * (offer.weekly - wages));
  assert.equal(weeklyIncome(released), 0);
});

test("commercial staff provide no patch research or draft advice", () => {
  const c = market(), hired = hireStaff(c, SPONSOR_NEGOTIATOR_ID);
  assert.deepEqual(patchReport(campaignPatch(c), managedPatchObserver(c)), patchReport(campaignPatch(hired), managedPatchObserver(hired)));
  const config = buildBattleConfig(hired, events[0], 42);
  const advice = staffDraftAdvice(hired, config, null);
  assert.equal(advice.notes.length, 0); assert.equal(advice.canApply, false);
  assert.deepEqual(config.bonuses, buildBattleConfig(c, events[0], 42).bonuses);
});
