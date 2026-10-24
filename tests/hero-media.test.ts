import { test } from "node:test";
import assert from "node:assert/strict";
import { heroMedia } from "../src/hero-media";
import { getHeroPool } from "../src/heroes";

test("hero gallery resolves campaign aliases to Valve assets under a hosted subpath", () => {
  assert.equal(heroMedia("anti_mage", "/manager/")?.video, "/manager/dota-menu/antimage.webm");
  assert.match(heroMedia("natures_prophet")!.video, /\/furion\.webm$/);
  assert.match(heroMedia("wraith_king")!.video, /\/skeleton_king\.webm$/);
  assert.equal(heroMedia("crystal_maiden", "/manager/")?.icon, "/manager/hero-icons/crystal_maiden.png");
  assert.equal(heroMedia("unknown_hero"), undefined);
});

test("every unlocked hero has showcase media without altering campaign availability", () => {
  const early = getHeroPool(2011, 2010), modern = getHeroPool(2026, 2026);
  assert.equal(early.length, 46);
  assert.equal(early.some(h => h.id === "monkey_king"), false);
  assert.equal(modern.length, 127);
  for (const hero of modern) {
    const media = heroMedia(hero.id);
    assert.ok(media, hero.name);
    for (const asset of Object.values(media)) assert.ok(!asset.includes("undefined"), hero.name);
  }
});
