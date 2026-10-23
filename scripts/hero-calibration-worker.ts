import { parentPort, workerData } from "node:worker_threads";
import { LaneBattle, seededRandom } from "../src/battle";
import type { BattleConfig } from "../src/battle";
import { getHeroPool } from "../src/heroes";
import { patchById, heroPatchBonus } from "../src/patches";
import { heroBalanceSignature } from "../src/hero-balance";

const job = workerData as { patchId: string; rounds: number; maps: number; validation: number; seed: number };
const patch = patchById(job.patchId)!;
const pool = getHeroPool(patch.year, patch.year - 1, patch);
const rows = patch.heroBalance!;
const skills = Object.fromEntries(["creativity", "stability", "confidence", "stamina", "heroPool", "laning", "teamfights", "farming", "skirmish", "vision", "intuition", "pushing"].map(key => [key, 50]));
const players: BattleConfig["players"] = [0, 1].map(side => Array.from({ length: 5 }, (_, role) => ({ id: `benchmark-${side}-${role}`, name: `Position ${role + 1}`, role, skills, energy: 100, happiness: 100 }))) as BattleConfig["players"];
const base: BattleConfig = { seed: 1, year: patch.year, heroPoolThroughYear: patch.year - 1, patchId: patch.id,
  teams: ["Equal benchmark A", "Equal benchmark B"], players, bonuses: [0, 0], captureReplay: false, captureTimeline: false };
const bounded = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const rounded = (n: number) => Math.round(n * 10000) / 10000;
const hash = (text: string) => [...text].reduce((n, c) => Math.imul(n ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
const offset = hash(patch.id) ^ job.seed;
// Each hero is deliberately included in turn; uniform legal teammates/opponents
// prevent draft popularity and manager/AI research from biasing the benchmark.
function batch(maps: number, batchSeed: number) {
  const counts = Object.fromEntries(pool.map(hero => [hero.id, { played: 0, wins: 0 }]));
  let sideZeroWins = 0;
  for (let pair = 0; pair < maps / 2; pair++) {
    const random = seededRandom((batchSeed + pair * 7919) >>> 0);
    const focus = pool[pair % pool.length];
    const focusRole = focus.roles[Math.floor(random() * focus.roles.length)];
    const draft: [string[], string[]] = [Array<string>(5), Array<string>(5)];
    const used = new Set<string>([focus.id]);
    draft[0][focusRole] = focus.id;
    for (const side of [0, 1]) for (let role = 0; role < 5; role++) {
      if (draft[side][role]) continue;
      const choices = pool.filter(hero => hero.roles.includes(role) && !used.has(hero.id));
      if (!choices.length) throw new Error(`No legal calibration hero for ${patch.id} position ${role}`);
      const hero = choices[Math.floor(random() * choices.length)];
      draft[side][role] = hero.id; used.add(hero.id);
    }
    for (const flip of [false, true]) {
      const fixed: [string[], string[]] = flip ? [draft[1], draft[0]] : draft;
      const result = new LaneBattle({ ...base, seed: (batchSeed + pair * 104729) >>> 0, draft: fixed }).run();
      if (result.winner === 0) sideZeroWins++;
      for (const side of [0, 1]) for (const id of fixed[side]) {
        counts[id].played++;
        if (side === result.winner) counts[id].wins++;
      }
    }
  }
  return { counts, sideZeroWins };
}
// Initialize from a prior calibration if one exists, otherwise a modest prior.
for (const row of rows) row.power = heroPatchBonus(patch, row.id);
const training: { round: number; maps: number; meanAbsoluteError: number }[] = [];
for (let round = 0; round < job.rounds; round++) {
  const { counts } = batch(job.maps, (offset + round * 10000019) >>> 0);
  let error = 0;
  const logs = rows.map(row => {
    const { played, wins } = counts[row.id];
    // Slight shrinkage reduces coefficient swings for less-played flex roles.
    const rate = (wins + 5) / (played + 10) * 100;
    error += Math.abs(rate - row.targetWinRate);
    return Math.log(1 + row.power! / 100) + bounded((row.targetWinRate - rate) / 100 * 1.8, -0.25, 0.25);
  });
  const mean = logs.reduce((sum, value) => sum + value, 0) / logs.length;
  rows.forEach((row, i) => { row.power = rounded((Math.exp(bounded(logs[i] - mean, -0.8, 0.6)) - 1) * 100); });
  const progress = { round: round + 1, maps: job.maps, meanAbsoluteError: rounded(error / rows.length) };
  training.push(progress); parentPort!.postMessage({ type: "progress", patchId: patch.id, ...progress });
}
// Strictly separate seeds: these results never feed back into fitting.
const { counts, sideZeroWins } = batch(job.validation, (offset + 2000000033) >>> 0);
const wilson = (wins: number, n: number) => {
  const p = wins / n, z = 1.96, d = 1 + z * z / n;
  const center = (p + z * z / (2 * n)) / d;
  const radius = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
  return { low: rounded((center - radius) * 100), high: rounded((center + radius) * 100) };
};
const measured = rows.map(row => {
  const { played, wins } = counts[row.id];
  return { id: row.id, power: row.power!, played, wins, winRate: rounded(wins / played * 100), ...wilson(wins, played), targetWinRate: row.targetWinRate };
});
parentPort!.postMessage({ type: "complete", patchId: patch.id, result: {
  signature: heroBalanceSignature(patch), trainMaps: job.maps * job.rounds, validationMaps: job.validation,
  training, seed: job.seed, sideZeroWinRate: rounded(sideZeroWins / job.validation * 100),
  meanAbsoluteError: rounded(measured.reduce((sum, row) => sum + Math.abs(row.winRate - row.targetWinRate), 0) / measured.length),
  statisticallyAboveCeiling: measured.filter(row => row.low > 58).map(row => row.id),
  rows: measured,
} });
