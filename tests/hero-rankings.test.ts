import { test } from "node:test";
import assert from "node:assert/strict";
import { historicalPatches, patchForSeason } from "../src/patches";
import { getHeroPool } from "../src/heroes";
import { heroBalanceSignature } from "../src/hero-balance";
import { rankHeroesForRole, strongestHeroesForRole } from "../src/hero-rankings";
import type { RoleCalibration } from "../src/hero-rankings";
import { patchReport } from "../src/patch-knowledge";

test("all 32 phases and future patches highlight ten unique unlocked heroes per legal role", () => {
  for (const patch of [...historicalPatches, patchForSeason(2036, 1)]) for (let role = 0; role < 5; role++) {
    const full = rankHeroesForRole(patch, role);
    const top = strongestHeroesForRole(patch, role);
    const pool = getHeroPool(patch.year, Math.min(2026, patch.year - 1));
    assert.equal(top.length, 10);
    assert.equal(new Set(top.map(h => h.id)).size, 10);
    assert.equal(full.filter(h => h.highlighted).length, 10);
    assert.ok(full.every((h, i) => h.rank === i + 1 && h.role === role && pool.some(p => p.id === h.id && p.roles.includes(role))));
    assert.ok(full.every((h, i) => !i || full[i - 1].strengthScore >= h.strengthScore));
    assert.deepEqual(full, rankHeroesForRole(structuredClone(patch), role));
  }
  assert.deepEqual(rankHeroesForRole(historicalPatches[0], -1), []);
  assert.deepEqual(rankHeroesForRole(historicalPatches[0], 5), []);
});

test("role observations change internal ranks without ranking correction power or leaking scouting truth", () => {
  const patch = patchForSeason(2011, 2);
  const observer = { teamKey: "navi", staffIds: [] };
  const before = patchReport(patch, observer);
  const candidate: RoleCalibration = { signature: heroBalanceSignature(patch), trainMaps: 1024, validationMaps: 2048,
    rows: [{ id: "anti_mage", power: -40, played: 1000, wins: 700, winRate: 70, low: 64, high: 76, targetWinRate: 53.5,
      roles: [{ role: 0, played: 1000, wins: 700, winRate: 70, low: 64, high: 76 }] }] };
  const ranks = rankHeroesForRole(patch, 0, candidate);
  assert.equal(ranks[0].id, "anti_mage");
  assert.equal(ranks[0].basis, "role-benchmark");
  assert.equal(ranks[0].benchmark!.winRate, 70);
  assert.ok(ranks[0].strengthScore < 70);
  candidate.rows[0].power = 80;
  assert.deepEqual(rankHeroesForRole(patch, 0, candidate), ranks);
  assert.ok(rankHeroesForRole(patch, 1, candidate).every(h => h.id !== "anti_mage"));
  candidate.signature = "stale";
  assert.ok(rankHeroesForRole(patch, 0, candidate).every(h => h.basis === "design-target"));
  assert.deepEqual(patchReport(patch, observer), before);
});
