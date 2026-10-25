import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { battlePassRewards, rewardsForPass, selectPassRewards } from "../src/battle-pass-rewards";
import { tournamentPasses } from "../src/tournament-pass";
import manifest from "../docs/battle-pass-reward-assets.json";

test("every advertised pass has its own cosmetic collection and headline rewards", () => {
  assert.equal(new Set(battlePassRewards.map(reward => reward.id)).size, battlePassRewards.length);
  for (const pass of tournamentPasses) {
    const rewards = rewardsForPass(pass.id);
    assert.ok(rewards.length >= 3, pass.id);
    assert.ok(selectPassRewards(pass.id, "highlights").length >= 2, pass.id);
    assert.ok(rewards.every(reward => reward.source.startsWith("https://")));
  }
  for (const id of ["fall-2015", "winter-2016", "ti-2016", "fall-2016", "ti-2018"])
    assert.ok(!rewardsForPass(id).some(reward => reward.kind === "Arcana"), id);
});

test("headline Arcanas and Personas retain their original pass and milestone", () => {
  const expected: [string, string, number][] = [
    ["ti-2017", "Benevolent Companion", 245], ["ti-2019", "Planetfall", 365],
    ["ti10-2020", "The One True King", 375], ["ti10-2020", "The Toy Butcher", 255],
    ["ti10-2020", "Compass of the Rising Gale", 575], ["nemestice", "Phantom Advent", 330],
    ["continuum", "Dread Retribution", 333], ["ti-2022", "Claszian Apostasy", 495],
    ["ti-2022", "Conduit of the Blueheart", 148], ["ti-2022", "The Exile Unveiled", 296],
  ];
  for (const [pass, title, level] of expected) {
    const reward = rewardsForPass(pass).find(reward => reward.title === title);
    assert.ok(reward, title);
    assert.equal(reward.level, level, title);
    assert.ok(reward.spotlight, title);
  }
});

test("gallery filters keep treasure contents distinct from guaranteed level rewards", () => {
  const before = JSON.stringify(battlePassRewards);
  assert.equal(selectPassRewards("ti-2022", "rewards", "", "all", "Arcana").length, 2);
  assert.equal(selectPassRewards("ti-2022", "rewards", "  FACELESS VOID ")[0].title, "Claszian Apostasy");
  const gold = selectPassRewards("ti-2022", "treasures", "golden");
  assert.ok(gold.length >= 4);
  assert.ok(gold.every(reward => reward.level === null && reward.collection.startsWith("Immortal Treasure")));
  assert.ok(selectPassRewards("ti-2017", "rewards", "", "Immortal Treasure II").every(reward => reward.collection === "Immortal Treasure II"));
  assert.deepEqual(selectPassRewards("ti-2022", "rewards", "no such cosmetic reward"), []);
  assert.equal(JSON.stringify(battlePassRewards), before);
});

test("every local preview and alternate view matches its recorded source hash", () => {
  const assets = new Map(manifest.assets.map(asset => [asset.path, asset]));
  const files = new Set(battlePassRewards.flatMap(reward => [reward.image, ...reward.variants, reward.logo].filter((file): file is string => !!file)));
  for (const file of files) {
    assert.match(file, /^rewards\/[a-f0-9]+\.webp$/);
    const path = `public/dota-menu/${file}`;
    const asset = assets.get(path);
    assert.ok(asset, path);
    const bytes = readFileSync(path);
    assert.equal(bytes.length, asset.bytes);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256);
  }
});
