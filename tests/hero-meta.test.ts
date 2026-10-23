import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { buildHeroBalance, selectMetaSource } from "../scripts/hero-history.mjs";
import { historicalPatches, patchForSeason } from "../src/patches";
import { heroBalanceSignature } from "../src/hero-balance";
import { rankHeroesForRole } from "../src/hero-rankings";
import { autoDraftMap } from "../src/draft";
import { buildBattleConfig, createCampaign, DEFAULT_SETTINGS, events } from "../src/game";

const evidence = JSON.parse(gunzipSync(readFileSync(new URL('../scripts/data/hero-meta-sources.json.gz', import.meta.url))).toString());

test('phase-scoped historical meta replaces authored Anti-Mage boosts in both 2026 phases', () => {
  for (const phase of [1, 2] as const) {
    const patch = patchForSeason(2026, phase), anti = patch.heroBalance!.find(h => h.id === 'anti_mage')!;
    assert.ok(anti.targetWinRate < 50);
    assert.equal(anti.priority, 0);
    assert.equal(anti.basis, 'observed-pro-meta');
    assert.ok(!patch.heroes.some(h => h.id === 'anti_mage'));
    assert.ok(!rankHeroesForRole(patch, 0).slice(0, 5).some(h => h.id === 'anti_mage'));
  }
  const ti = patchForSeason(2026, 2).heroBalance!.find(h => h.id === 'anti_mage')!;
  assert.deepEqual([ti.meta!.picks, ti.meta!.bans, ti.meta!.matches, ti.meta!.rawWinRate], [0, 0, 147, null]);
  assert.equal(ti.meta!.sourceKey, 'ti2026-drafts');
  assert.equal(selectMetaSource('2026.1', evidence.sources).matches, 139);
  assert.equal(selectMetaSource('2024.1', evidence.sources), undefined, 'one cached game cannot certify a phase meta');
  assert.equal(patchForSeason(2025, 1).heroStatistics, null, 'no strength carry from an adjacent TI or modern patch');
  assert.ok(patchForSeason(2036, 2).heroBalance!.every(h => !h.meta && h.basis === 'generated'));
});

test('raw event counts, missing bans, classified wins and game targets remain distinct', () => {
  assert.equal(historicalPatches.filter(p => p.heroBalance!.some(h => h.meta)).length, 14);
  for (const source of evidence.sources) {
    assert.equal(source.rows.reduce((n, h) => n + h.picks, 0), source.matches * 10);
    assert.ok(source.rows.every(h => h.wins <= h.winSample && h.winSample <= h.picks));
    if (source.completeBans) {
      assert.equal(new Set(source.matchIds).size, source.matches);
      assert.equal(source.rows.reduce((n, h) => n + h.wins, 0), source.matches * 5);
      assert.equal(source.rows.reduce((n, h) => n + h.bans, 0), source.matches * 14);
    } else assert.ok(source.rows.every(h => h.bans === null));
  }
  const old = patchForSeason(2015, 2).heroBalance!.find(h => h.id === 'techies')!;
  assert.equal(old.observed!.rawWinRate, 87.5, 'earlier factual snapshot is retained unchanged');
  assert.ok(old.targetWinRate < 58);
  for (const patch of historicalPatches) for (const h of patch.heroBalance!) {
    assert.ok(h.targetWinRate >= 42 && h.targetWinRate <= 58);
    if (h.meta && h.meta.bans === null) assert.equal(h.meta.contestRate, null);
  }
});

test('ban demand matters and a tiny perfect record cannot dominate a common contested hero', () => {
  const catalog = Array.from({length:20}, (_, i) => ({id:`h${i}`,name:`h${i}`,roles:[0],ability:'burst'}));
  const sample = {patchId:'2026.2',key:'test',matches:100,completeBans:true,
    rows:[{id:'h0',picks:0,bans:80,wins:0,winSample:0},
      {id:'h1',picks:50,bans:40,wins:23,winSample:50},
      {id:'h2',picks:3,bans:0,wins:3,winSample:3}]};
  const patch = {id:'2026.2',year:2026,heroes:[],axes:{}};
  const result = buildHeroBalance(patch,catalog,{sources:[]},{sources:[sample]});
  assert.ok(result.rows[0].targetWinRate > result.rows[2].targetWinRate);
  assert.ok(result.rows[1].targetWinRate > result.rows[2].targetWinRate);
  assert.equal(result.rows[2].meta.rawWinRate,100);
  assert.ok(result.rows[2].targetWinRate < 52);
  assert.equal(selectMetaSource('2026.1',[sample]),undefined);
});

test('historical ranking remains canonical while measured engine drift stays visible and private counts do not leak to drafting', () => {
  const patch=patchForSeason(2026,2), anti=patch.heroBalance!.find(h=>h.id==='anti_mage')!;
  const record={signature:heroBalanceSignature(patch),trainMaps:0,validationMaps:100,
    rows:[{id:'anti_mage',power:0,targetWinRate:anti.targetWinRate,played:100,wins:90,winRate:90,low:80,high:95,
      roles:[{role:0,played:100,wins:90,winRate:90,low:80,high:95}]}]};
  const ranked=rankHeroesForRole(patch,0,record).find(h=>h.id==='anti_mage')!;
  assert.equal(ranked.strengthScore,anti.targetWinRate);
  assert.equal(ranked.benchmark!.winRate,90,'engine outlier remains visible, not disguised as historical truth');
  assert.equal(ranked.basis,'historical-meta-target');
  const base=buildBattleConfig(createCampaign(DEFAULT_SETTINGS),events[0],44);
  const cfg={...base,year:2026,patchId:patch.id,heroPoolThroughYear:2025};
  const before=autoDraftMap(cfg),original=structuredClone(anti.meta);
  try { anti.meta!.picks=100000; anti.meta!.bans=100000; assert.deepEqual(autoDraftMap({...cfg}),before); }
  finally { anti.meta=original; }
});
