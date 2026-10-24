import { test } from "node:test";
import assert from "node:assert/strict";
import { campaignHeroPoolThrough, campaignPatch } from "../src/patches";
import { createPatchPreviewCampaign, previewPatch, previewPatches } from "../src/patch-preview";
import { getHeroPool } from "../src/heroes";

test("preview worlds resolve every requested composite at its exact date with the correct hero pool", () => {
  assert.equal(previewPatches.length, 34);
  for (const patch of previewPatches) {
    const campaign = createPatchPreviewCampaign(patch.id);
    assert.equal(campaignPatch(campaign).id, patch.id);
    assert.equal(campaign.calendar?.now.slice(0, 10), patch.startsOn);
    assert.equal(campaignHeroPoolThrough(campaign), Math.min(2026, patch.year - 1));
    const pool = getHeroPool(campaign.year, campaignHeroPoolThrough(campaign));
    assert.equal(pool.some(hero => hero.id === "monkey_king"), patch.year >= 2017);
    assert.equal(campaign.roster.length, 5);
    assert.equal(campaign.cash, 100000);
    assert.equal(campaign.results.length, 0);
    assert.equal(campaign.calendar?.paidWeeks, 0);
    assert.deepEqual(campaign.patchIntroductions?.pending, []);
  }
});

test("preview creation never accesses saved campaign storage and fresh jumps discard sandbox edits", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw new Error("Preview accessed storage"); } });
  try {
    const edited = createPatchPreviewCampaign("2017.1");
    edited.cash = 1;
    edited.training[edited.roster[0]] = "Rest";
    const fresh = createPatchPreviewCampaign("2017.1");
    assert.equal(fresh.cash, 100000);
    assert.equal(fresh.training[fresh.roster[0]], "Balanced");
    assert.equal(previewPatch("9999.2").id, "2011.1");
    assert.equal(previewPatch(null).id, "2011.1");
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
