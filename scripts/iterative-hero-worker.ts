import { parentPort, workerData } from "node:worker_threads";
import { LaneBattle, seededRandom } from "../src/battle";
import type { BattleConfig } from "../src/battle";
import { getHeroPool } from "../src/heroes";
import { patchById } from "../src/patches";
import { heroBalanceSignature } from "../src/hero-balance";
import { pairedWilson } from "./calibration-stats.mjs";

const job = workerData as { patchId: string; rounds: number; maps: number; validation: number; seed: number;
  initial: { baselineMeanAbsoluteError?: number; rows: { id: string; power: number }[] } };
const patch = patchById(job.patchId)!;
const pool = getHeroPool(patch.year, patch.year - 1, patch);
const rows = patch.heroBalance!;
for (const row of rows) row.power = job.initial.rows.find(h => h.id === row.id)!.power;
const skills = Object.fromEntries("creativity stability confidence stamina heroPool laning teamfights farming skirmish vision intuition pushing".split(" ").map(k => [k, 50]));
const players = [0, 1].map(t => Array.from({ length: 5 }, (_, role) => ({ id: `${t}:${role}`, name: `Role ${role + 1}`, role, skills, energy: 100, happiness: 100 }))) as BattleConfig["players"];
const base: BattleConfig = { seed: 1, year: patch.year, heroPoolThroughYear: patch.year - 1, patchId: patch.id,
  patchObservers: [{teamKey:"benchmark",staffIds:["c1","c2","c4","c5","c6"]},{teamKey:"benchmark",staffIds:["c1","c2","c4","c5","c6"]}],
  teams: ["Benchmark A", "Benchmark B"], players, bonuses: [0, 0], captureReplay: false, captureTimeline: false };
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round = (n: number) => Math.round(n * 10000) / 10000;
const hash = (s: string) => [...s].reduce((n, c) => Math.imul(n ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
const offset = hash(patch.id) ^ job.seed;
// Targets express relative advantage. Role-pool means cannot all win >50%.
// Center the fitting goals, preserving historical observations and UI targets.
const poolMean = Array.from({ length: 5 }, (_, role) => {
  const ids = pool.filter(h => h.roles.includes(role)).map(h => h.id);
  return ids.reduce((n, id) => n + rows.find(h => h.id === id)!.targetWinRate, 0) / ids.length;
}).reduce((n, v) => n + v, 0) / 5;
const goals = new Map(rows.map(h => [h.id, Math.min(56, h.targetWinRate - poolMean + 50)]));

function batch(maps: number, seed: number) {
  const counts = Object.fromEntries(pool.map(h => [h.id, { played: 0, wins: 0, roles: h.roles.map(role => ({ role, played: 0, wins: 0 })) }]));
  let sideZeroWins = 0;
  for (let pair = 0; pair < maps / 2; pair++) {
    const random = seededRandom((seed + pair * 7919) >>> 0);
    const focus = pool[(pair + (seed >>> 0) % pool.length) % pool.length];
    const role = focus.roles[Math.floor(random() * focus.roles.length)];
    const draft: [string[], string[]] = [Array(5), Array(5)];
    draft[0][role] = focus.id;
    const used = new Set([focus.id]);
    for (const side of [0, 1]) for (let r = 0; r < 5; r++) {
      if (draft[side][r]) continue;
      const choices = pool.filter(h => h.roles.includes(r) && !used.has(h.id));
      const hero = choices[Math.floor(random() * choices.length)];
      if (!hero) throw Error(`No legal draft for ${patch.id} / ${r}`);
      draft[side][r] = hero.id; used.add(hero.id);
    }
    for (const flip of [false, true]) {
      const fixed: [string[], string[]] = flip ? [draft[1], draft[0]] : draft;
      const result = new LaneBattle({ ...base, seed: (seed + pair * 104729) >>> 0, draft: fixed }).run();
      if (result.winner === 0) sideZeroWins++;
      for (const side of [0, 1]) for (let r = 0; r < 5; r++) {
        const count = counts[fixed[side][r]], byRole = count.roles.find(v => v.role === r)!;
        count.played++; byRole.played++;
        if (side === result.winner) { count.wins++; byRole.wins++; }
      }
    }
  }
  return { counts, sideZeroWins };
}
const history: { round: number; meanAbsoluteError: number; ceilingExcess: number }[] = [];
// Old coefficients are only starting values. Establish a fresh comparison on
// the current engine and era roles, separate from fitting and final validation.
let baselineMeanAbsoluteError = job.initial.baselineMeanAbsoluteError;
let baselineMaps = 0;
if (baselineMeanAbsoluteError === undefined) {
  const { counts } = batch(job.validation, (offset + 900000011) >>> 0);
  baselineMaps = job.validation;
  baselineMeanAbsoluteError = round(rows.reduce((n, h) => n + Math.abs(counts[h.id].wins / counts[h.id].played * 100 - h.targetWinRate), 0) / rows.length);
  parentPort!.postMessage({ type: "progress", patchId: patch.id, round: 0, meanAbsoluteError: baselineMeanAbsoluteError });
}
for (let r = 0; r < job.rounds; r++) {
  const { counts } = batch(job.maps, (offset + r * 10000019) >>> 0);
  let error = 0, excess = 0;
  const logs = rows.map(h => {
    const c = counts[h.id], rate = (c.wins + 4) / (c.played + 8) * 100;
    error += Math.abs(rate - goals.get(h.id)!); excess += Math.max(0, rate - 58);
    // Smaller steps and larger warm-start samples reduce noisy overshoot.
    return Math.log(1 + h.power! / 100) + clamp((goals.get(h.id)! - rate) / 100 * 0.9, -0.15, 0.15);
  });
  const mean = logs.reduce((n, v) => n + v, 0) / logs.length;
  rows.forEach((h, i) => { h.power = round((Math.exp(clamp(logs[i] - mean, -0.8, 0.6)) - 1) * 100); });
  const progress = { round: r + 1, meanAbsoluteError: round(error / rows.length), ceilingExcess: round(excess) };
  history.push(progress);
  parentPort!.postMessage({ type: "progress", patchId: patch.id, ...progress });
}
// Fresh seed domain, separate from every fitting round and the first experiment.
const { counts, sideZeroWins } = batch(job.validation, (offset + 1700000021) >>> 0);
const measured = rows.map(h => {
  const c = counts[h.id];
  return { id: h.id, power: h.power!, targetWinRate: h.targetWinRate, fitTargetWinRate: round(goals.get(h.id)!),
    played: c.played, wins: c.wins, winRate: round(c.wins / c.played * 100), ...pairedWilson(c.wins, c.played),
    roles: c.roles.map(v => ({ ...v, winRate: v.played ? round(v.wins / v.played * 100) : null,
      ...(v.played ? pairedWilson(v.wins, v.played) : { low: 0, high: 100 }) })) };
});
parentPort!.postMessage({ type: "complete", patchId: patch.id, result: {
  signature: heroBalanceSignature(patch), seed: job.seed, trainMaps: job.maps * job.rounds, validationMaps: job.validation,
  baselineMeanAbsoluteError, baselineMaps,
  intervalMethod: "95% Wilson; effective sample size = appearances / 2 for side-swapped pairs", training: history,
  sideZeroWinRate: round(sideZeroWins / job.validation * 100),
  meanAbsoluteError: round(measured.reduce((n, h) => n + Math.abs(h.winRate - h.targetWinRate), 0) / rows.length),
  fitMeanAbsoluteError: round(measured.reduce((n, h) => n + Math.abs(h.winRate - h.fitTargetWinRate), 0) / rows.length),
  ceilingExcess: round(measured.reduce((n, h) => n + Math.max(0, h.winRate - 58), 0)),
  statisticallyAboveCeiling: measured.filter(h => h.low > 58).map(h => h.id), rows: measured,
} });
