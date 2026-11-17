// Measures win rate against a decision-skill point gap. Under player control,
// difficulty, chemistry, form, historical strength, pay pressure and meta fit
// all reach the engine as these same points (battle.ts `skill`), so one curve
// shows what each modifier's range is worth.
//   npx tsx scripts/audit-skill-gap.ts --years 2012,2017,2024 --gaps 0,2,5,10,17.5,25 --pairs 50 --workers 6
// Add --stats to raise the favourite's player stats by the gap instead, and
// --base N for the shared starting rating (default 50).
import { fork } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LaneBattle, seededRandom } from "../src/battle";
import type { BattleConfig } from "../src/battle";
import { getHeroPool } from "../src/heroes";
import { patchForSeason } from "../src/patches";

const option = (name: string, fallback: string) => { const i = process.argv.indexOf(name); return i < 0 ? fallback : process.argv[i + 1]; };
const statKeys = "creativity stability confidence stamina heroPool laning teamfights farming skirmish vision intuition pushing".split(" ");
const POINT = 0.008; // bonuses[] to skill points, as in battle.ts

interface Job { year: number; gap: number; pairs: number; seed: number; stats: boolean; base: number }
interface Row { year: number; gap: number; maps: number; favouriteWins: number; sideZeroWins: number; failed: number; durations: number[] }

function play(job: Job): Row {
  const patch = patchForSeason(job.year, 1), pool = getHeroPool(patch.year, patch.year - 1, patch);
  // --stats puts the gap on the favourite's real stats instead of bonuses[].
  const team = (up: boolean) => Array.from({ length: 5 }, (_, role) => ({ id: `gap-${up}-${role}`, name: `Position ${role + 1}`, role,
    skills: Object.fromEntries(statKeys.map(k => [k, Math.min(99, job.base + (up && job.stats ? job.gap : 0))])), energy: 100, happiness: 100 }));
  const staff = { teamKey: "audit", staffIds: ["c1", "c2", "c4", "c5", "c6"] };
  const row: Row = { year: job.year, gap: job.gap, maps: 0, favouriteWins: 0, sideZeroWins: 0, failed: 0, durations: [] };
  for (let pair = 0; pair < job.pairs; pair++) {
    // Same draft both ways round, so hero power cancels out of the gap's effect.
    const random = seededRandom((job.seed + pair * 7919) >>> 0), used = new Set<string>();
    const draft: [string[], string[]] = [[], []];
    for (const side of [0, 1]) for (let role = 0; role < 5; role++) {
      const choices = pool.filter(h => h.roles.includes(role) && !used.has(h.id));
      const hero = choices[Math.floor(random() * choices.length)];
      draft[side][role] = hero.id; used.add(hero.id);
    }
    for (const favourite of [0, 1] as const) {
      const edge = job.stats ? 0 : job.gap * POINT;
      const bonuses: [number, number] = favourite === 0 ? [edge, 0] : [0, edge];
      const players = (favourite === 0 ? [team(true), team(false)] : [team(false), team(true)]) as BattleConfig["players"];
      try {
        const result = new LaneBattle({ playerControl: 1, seed: (job.seed + pair * 104729) >>> 0, year: patch.year, heroPoolThroughYear: patch.year - 1, patchId: patch.id,
          patchObservers: [staff, staff], teams: ["A", "B"], players, bonuses, draft, captureReplay: false, captureTimeline: false }).run();
        row.maps++; row.durations.push(result.duration);
        if (result.winner === favourite) row.favouriteWins++;
        if (result.winner === 0) row.sideZeroWins++;
      } catch { row.failed++; }
    }
  }
  return row;
}

if (process.argv.includes("--child")) {
  process.on("message", (job: Job) => { process.send!(play(job)); process.exit(0); });
} else {
  const years = option("--years", "2012,2017,2024").split(",").map(Number);
  const gaps = option("--gaps", "0,2,5,10,17.5,25").split(",").map(Number);
  const pairs = Number(option("--pairs", "50")), workers = Number(option("--workers", "6"));
  const stats = process.argv.includes("--stats"), base = Number(option("--base", "50"));
  const out = resolve(option("--out", ".local/skill-gap-audit")); await mkdir(out, { recursive: true });
  // Pairs for one cell are split into chunks so workers stay busy.
  const chunk = Math.max(1, Math.ceil(pairs / 5));
  const jobs: Job[] = years.flatMap(year => gaps.flatMap(gap => Array.from({ length: Math.ceil(pairs / chunk) }, (_, i) =>
    ({ year, gap, pairs: Math.min(chunk, pairs - i * chunk), seed: (year * 1000003 + i * 15485863 + 912367) >>> 0, stats, base }))));
  const started = Date.now(), results: Row[] = [];
  const script = fileURLToPath(import.meta.url);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(workers, jobs.length) }, async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      results.push(await new Promise<Row>((done, fail) => {
        const child = fork(script, ["--child"], { execArgv: process.execArgv });
        child.once("message", row => done(row as Row)); child.once("error", fail);
        child.once("exit", code => { if (code) fail(Error(`worker exit ${code}`)); });
        child.send(job);
      }));
    }
  }));
  const cells = years.flatMap(year => gaps.map(gap => {
    const rows = results.filter(r => r.year === year && r.gap === gap);
    const maps = rows.reduce((n, r) => n + r.maps, 0), wins = rows.reduce((n, r) => n + r.favouriteWins, 0);
    const p = maps ? wins / maps : 0, half = maps ? 1.96 * Math.sqrt(p * (1 - p) / (maps / 2)) : 0; // pairs share a draft
    const durations = rows.flatMap(r => r.durations).sort((a, b) => a - b);
    return { year, gap, maps, failed: rows.reduce((n, r) => n + r.failed, 0), favouriteWinRate: +(p * 100).toFixed(1), ci95: +(half * 100).toFixed(1),
      sideZeroRate: maps ? +(rows.reduce((n, r) => n + r.sideZeroWins, 0) / maps * 100).toFixed(1) : 0, medianMinutes: durations.length ? +(durations[durations.length >> 1] / 60).toFixed(1) : 0 };
  }));
  const seconds = (Date.now() - started) / 1000, totalMaps = cells.reduce((n, c) => n + c.maps, 0);
  await writeFile(resolve(out, "results.json"), JSON.stringify({ years, gaps, pairs, stats, base, seconds, totalMaps, cells }, null, 2));
  console.table(cells);
  console.log(`${totalMaps} maps in ${seconds.toFixed(0)}s (${(totalMaps / seconds * 3600).toFixed(0)} maps/hour, ${workers} workers)`);
}
