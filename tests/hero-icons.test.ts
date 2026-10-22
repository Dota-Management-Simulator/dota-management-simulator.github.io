import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getHeroPool } from "../src/heroes";
import { heroIconFor, heroIcons } from "../src/hero-icons";

test("all draftable heroes have bundled Valve PNG icons with exact ID lookup", () => {
  const pool = getHeroPool(2027);
  assert.deepEqual(new Set(Object.keys(heroIcons)), new Set(pool.map((hero) => hero.id)));
  for (const hero of pool) {
    const icon = heroIconFor(hero.id)!;
    assert.match(icon.path, /^hero-icons\/[a-z0-9_]+\.png$/);
    assert.match(icon.source, /^https:\/\/cdn\.steamstatic\.com\/apps\/dota2\/images\/dota_react\/heroes\/icons\//);
    const bytes = readFileSync(`public/${icon.path}`);
    assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", hero.name);
    // Valve's Muerta icon is 32×31; preserve native artwork dimensions.
    assert.ok(bytes.readUInt32BE(16) >= 24 && bytes.readUInt32BE(20) >= 24, hero.name);
  }
  assert.equal(heroIconFor("anti_mage")?.valveName, "npc_dota_hero_antimage");
  assert.equal(heroIconFor("windranger")?.valveName, "npc_dota_hero_windrunner");
  for (const missing of [undefined, "", "Anti-Mage", "unknown", "toString", "__proto__"])
    assert.equal(heroIconFor(missing), undefined);
});
