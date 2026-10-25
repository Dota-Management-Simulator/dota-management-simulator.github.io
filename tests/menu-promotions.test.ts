import { test } from "node:test";
import assert from "node:assert/strict";
import { selectMenuPromotion } from "../src/menu-promotions";
import type { MenuPromotion } from "../src/menu-promotions";

test("dated promotions expire without leaking a future release or changing weekly-save fallback", () => {
  const entries: MenuPromotion[] = [
    ["2016.1", "reborn", "Reborn"],
    ["2016.1", "fall", "Fall Compendium", "2015-10-02", "2015-11-23"],
    ["2016.1", "686", "Balance of Power", "2015-12-16"],
    ["2017.1", "700", "The New Journey", "2016-12-12"],
  ];
  const patch = { year: 2016, phase: 1 };
  const before = JSON.stringify({ entries, patch });
  for (const [day, file] of [["2015-10-01", "reborn"], ["2015-10-02", "fall"], ["2015-11-23", "fall"], ["2015-11-24", "reborn"], ["2015-12-15", "reborn"], ["2015-12-16", "686"], ["2016-12-12", "700"]]) {
    assert.equal(selectMenuPromotion(entries, patch, day)[1], file, day);
  }
  assert.equal(selectMenuPromotion(entries, patch)[1], "686");
  assert.equal(JSON.stringify({ entries, patch }), before);
});
