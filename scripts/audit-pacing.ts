// Measures match pacing: kills, length, levelling and how long the winner takes
// to finish once the loser's barracks are gone. Equal teams, random drafts,
// fixed seeds, so two runs of the same code give the same numbers.
//   npx tsx scripts/audit-pacing.ts --years 2011,2016,2024 --maps 30 --workers 6
// --src points at another copy of src/ to compare an experiment with the same seeds.
// 12-map medians swing by several minutes from tiny changes; use 30+ maps per era.
import { fork } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const option = (name: string, fallback: string) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : fallback; };
const srcDir = resolve(option("--src", resolve(fileURLToPath(import.meta.url), "../../src")));
interface Job { year: number; map: number; src: string }
interface Row { year: number; map: number; minutes?: number; kills?: number; level10?: number; level30?: number; maxedAt?: number; finishLag?: number; breachLag?: number; failed?: string }

async function play(job: Job): Promise<Row> {
  const imp = (p: string) => import(pathToFileURL(resolve(job.src, p)).href);
  const { LaneBattle, seededRandom } = await imp("battle.ts");
  const { getHeroPool } = await imp("heroes.ts");
  const { patchForSeason } = await imp("patches.ts");
  const keys = "creativity stability confidence stamina heroPool laning teamfights farming skirmish vision intuition pushing".split(" ");
  const team = (s: number) => Array.from({ length: 5 }, (_, role) => ({ id: `${s}-${role}`, name: `P${s}${role}`, role, skills: Object.fromEntries(keys.map(k => [k, 55])), energy: 100, happiness: 100 }));
  const staff = { teamKey: "audit", staffIds: ["c1", "c2", "c4", "c5", "c6"] };
  const patch = patchForSeason(job.year, 1), pool = getHeroPool(patch.year, patch.year - 1, patch);
  const random = seededRandom((job.year * 7919 + job.map * 104729) >>> 0), used = new Set<string>(), draft: [string[], string[]] = [[], []];
  for (const side of [0, 1]) for (let role = 0; role < 5; role++) {
    const choices = pool.filter((h: { roles: number[]; id: string }) => h.roles.includes(role) && !used.has(h.id));
    const hero = choices[Math.floor(random() * choices.length)]; draft[side][role] = hero.id; used.add(hero.id);
  }
  const battle = new LaneBattle({ playerControl: 1, seed: (job.year * 31 + job.map * 977) >>> 0, year: patch.year, heroPoolThroughYear: patch.year - 1, patchId: patch.id,
    patchObservers: [staff, staff], teams: ["A", "B"], players: [team(0), team(1)], bonuses: [0, 0], draft, captureReplay: false, captureTimeline: false });
  const row: Row = { year: job.year, map: job.map };
  type U = { kind: string; team: number; dead: boolean; level: number };
  const units = () => battle.units as U[], avgLevel = () => { const h = units().filter(u => u.kind === "hero"); return h.reduce((n, u) => n + u.level, 0) / h.length; };
  const raxDown: [number | undefined, number | undefined] = [undefined, undefined], firstRax: [number | undefined, number | undefined] = [undefined, undefined];
  const step = battle.step.bind(battle);
  battle.step = () => {
    step(); const clock = battle.clock;
    if (row.level10 == null && clock >= 600) row.level10 = +avgLevel().toFixed(1);
    if (row.level30 == null && clock >= 1800) row.level30 = +avgLevel().toFixed(1);
    if (row.maxedAt == null && units().filter(u => u.kind === "hero").every(u => u.level >= 25)) row.maxedAt = +(clock / 60).toFixed(1);
    for (const side of [0, 1] as const) if (firstRax[side] == null && units().some(u => u.kind === "barracks" && u.team === side && u.dead)) firstRax[side] = clock;
    for (const side of [0, 1] as const) if (raxDown[side] == null && units().some(u => u.kind === "barracks") && !units().some(u => u.kind === "barracks" && u.team === side && !u.dead)) raxDown[side] = clock;
  };
  try {
    const result = battle.run();
    row.minutes = +(result.duration / 60).toFixed(1); row.kills = result.kills[0] + result.kills[1];
    const loser = result.winner === 0 ? 1 : 0, down = raxDown[loser];
    if (down != null) row.finishLag = +((result.duration - down) / 60).toFixed(1);
    if (firstRax[loser] != null) row.breachLag = +((result.duration - firstRax[loser]!) / 60).toFixed(1);
  } catch (error) { row.failed = String(error).slice(0, 120); }
  return row;
}

if (process.argv.includes("--child")) {
  process.on("message", async (job: Job) => { process.send!(await play(job)); process.exit(0); });
} else {
  const years = option("--years", "2011,2016,2024").split(",").map(Number);
  const maps = Number(option("--maps", "30")), workers = Number(option("--workers", "6"));
  const jobs: Job[] = years.flatMap(year => Array.from({ length: maps }, (_, map) => ({ year, map, src: srcDir })));
  const script = fileURLToPath(import.meta.url), rows: Row[] = [], started = Date.now();
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(workers, jobs.length) }, async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      rows.push(await new Promise<Row>((done, fail) => {
        const child = fork(script, ["--child"], { execArgv: process.execArgv });
        child.once("message", row => done(row as Row)); child.once("error", fail);
        child.once("exit", code => { if (code) fail(Error(`worker exit ${code}`)); });
        child.send(job);
      }));
    }
  }));
  const pct = (values: number[], p: number) => { const v = values.filter(Number.isFinite).sort((a, b) => a - b); return v.length ? v[Math.min(v.length - 1, Math.floor(p * v.length))] : NaN; };
  const table = years.map(year => {
    const ok = rows.filter(r => r.year === year && !r.failed), get = (k: keyof Row) => ok.map(r => r[k] as number).filter(v => v != null);
    return { year, maps: ok.length, failed: rows.filter(r => r.year === year && r.failed).length,
      medMin: pct(get("minutes"), .5), p90Min: pct(get("minutes"), .9), maxMin: Math.max(...get("minutes")), over90: get("minutes").filter(m => m > 90).length,
      medKills: pct(get("kills"), .5), p90Kills: pct(get("kills"), .9), level10: pct(get("level10"), .5), level30: pct(get("level30"), .5),
      maxedAt: pct(get("maxedAt"), .5), medBreachLag: pct(get("breachLag"), .5), p90BreachLag: pct(get("breachLag"), .9), medFinishLag: pct(get("finishLag"), .5), maxFinishLag: Math.max(...get("finishLag"), 0) };
  });
  console.table(table);
  if (process.argv.includes("--json")) console.log(JSON.stringify(table));
  console.log(`${rows.length} maps in ${((Date.now() - started) / 1000).toFixed(0)}s from ${srcDir}`);
}
