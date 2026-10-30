import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBattleConfig, createCampaign, DEFAULT_SETTINGS, events } from "../src/game";
import { postTiShuffle } from "../src/history";
import { driftPlaystyles, META_FIT_POINTS, metaFit, metaFitPoints, stylePull, STYLE_AXIS } from "../src/meta-style";
import { campaignPatch, historicalPatches, patchForSeason } from "../src/patches";
import { developmentProfile } from "../src/player-career";

const campaign = () => createCampaign({ ...DEFAULT_SETTINGS, year: 2011 });

test("patch pull is relative to the patch's own axes, so styles don't all climb together", () => {
  for (const patch of historicalPatches) {
    const pulls = Object.keys(STYLE_AXIS).map(key => stylePull(patch, key));
    assert.ok(pulls.some(n => n > 0) && pulls.some(n => n < 0), patch.id);
    assert.ok(pulls.every(n => n >= -1 && n <= 1));
  }
  const ps = structuredClone(campaign().players);
  const mean = () => { const v = ps.flatMap(p => Object.values(p.playstyles).filter((n): n is number => n != null)); return v.reduce((a, b) => a + b, 0) / v.length; };
  const before = mean();
  for (let year = 2011; year <= 2026; year++) for (const p of ps) driftPlaystyles(p, year);
  assert.ok(Math.abs(mean() - before) < 0.3, `${before} → ${mean()}`);
});

test("adaptable players follow the meta further than rigid ones, in the patch's direction", () => {
  const ps = campaign().players;
  const flex = structuredClone(ps.find(p => developmentProfile(p).adaptability === 10)!);
  const rigid = structuredClone(ps.find(p => developmentProfile(p).adaptability === 1)!);
  const moved = (p: typeof flex) => { const before = structuredClone(p.playstyles); driftPlaystyles(p, 2015);
    return Object.entries(p.playstyles).map(([k, n]) => [k, n! - (before as Record<string, number>)[k]] as const); };
  const total = (rows: (readonly [string, number])[]) => rows.reduce((n, [, d]) => n + Math.abs(d), 0);
  const flexRows = moved(flex), rigidRows = moved(rigid);
  assert.ok(total(flexRows) > total(rigidRows) * 2, `${total(flexRows)} vs ${total(rigidRows)}`);
  const pull = (k: string) => (stylePull(patchForSeason(2015, 1), k) + stylePull(patchForSeason(2015, 2), k)) / 2;
  for (const [k, d] of flexRows) if (Math.abs(pull(k)) > 0.1 && d !== 0) assert.equal(Math.sign(d), Math.sign(pull(k)), k);
});

test("the post-TI shuffle applies one season of drift, once", () => {
  const c = campaign(), shuffled = postTiShuffle(c.world!, c.players, 2011)!;
  const id = c.players.find(p => developmentProfile(p).adaptability >= 8)!.id;
  const expected = structuredClone(c.players.find(p => p.id === id)!);
  driftPlaystyles(expected, 2011);
  assert.deepEqual(shuffled.players.find(p => p.id === id)!.playstyles, expected.playstyles);
  assert.equal(postTiShuffle(shuffled.state, shuffled.players, 2011), null);
});

test("meta fit reaches both sides of a competitive match, capped", () => {
  const c = campaign(), patch = campaignPatch(c);
  for (const p of c.players) assert.ok(Math.abs(metaFitPoints(p, patch)) <= META_FIT_POINTS);
  assert.ok(c.players.some(p => metaFit(p, patch) > 0.2) && c.players.some(p => metaFit(p, patch) < -0.2));
  const config = buildBattleConfig(c, events.find(e => e.kind !== "ti")!, 7);
  for (const side of config.players) for (const row of side) {
    const p = c.players.find(p => p.id === row.id);
    if (p) assert.equal(row.metaFit, metaFitPoints(p, patch) || undefined, p.name);
  }
});
