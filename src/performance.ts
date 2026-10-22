import type { PlayerScore } from "./battle";
import type { Campaign } from "./game";
import type { TournamentPerformance } from "./tournament-types";
import { tournamentForRun } from "./tournaments";

export interface PerformanceGame {
  key: string;
  eventKey: string;
  event: string;
  year: number;
  at: string;
  stage: string;
  game: number;
  team: string;
  opponent: string;
  won: boolean;
  duration: number;
  score: PlayerScore;
  participation: number;
  rating: number;
}

const ratio = (a: number, b: number) => b ? a / b : 0;
const kda = (p: PlayerScore) => (p.kills + p.assists) / Math.max(1, p.deaths);
const delta = (a: number, b: number) => ratio(a - b, Math.max(1, a + b));
type PerformanceMap = TournamentPerformance["games"][number];
const participation = (p: PlayerScore, g: PerformanceMap) => Math.min(1, ratio(p.kills + p.assists, g.kills[p.team]));

/** An illustrative match assessment against the opposing player in the same
 * position, never a historical player skill or an input to combat. */
export function performanceRating(p: PlayerScore, g: PerformanceMap): number {
  const rival = g.players.find(other => other.team !== p.team && other.role === p.role);
  if (!rival) return 6;
  const impact = (s: PlayerScore) => (s.heroDamage ?? 0) + 2 * (s.healing ?? 0);
  const measuredImpact = p.heroDamage != null && rival.heroDamage != null;
  const value = 6 + 2 * delta(kda(p), kda(rival))
    + (p.role >= 3 ? 0.4 : 0.9) * delta(Math.max(0, p.gold - 600) + p.xp, Math.max(0, rival.gold - 600) + rival.xp)
    + 0.7 * delta(participation(p, g), participation(rival, g))
    + (measuredImpact ? 0.6 * delta(impact(p), impact(rival)) : 0)
    + (g.winner === p.team ? 0.4 : -0.4);
  return Math.round(Math.max(1, Math.min(10, value)) * 100) / 100;
}

/** Read existing compact archives instead of storing a second career ledger.
 * Both sides are indexed by exact player ID, independent of today's roster. */
export function playerPerformance(c: Campaign, playerId: string): PerformanceGame[] {
  const rows: PerformanceGame[] = [];
  const seen = new Set<string>();
  const add = (series: TournamentPerformance, meta: Omit<PerformanceGame, "key" | "game" | "team" | "opponent" | "won" | "duration" | "score" | "participation" | "rating">, matchKey: string) => {
    series.games.forEach((g, index) => {
      const key = `${matchKey}:${index}`;
      if (seen.has(key) || !Number.isFinite(g.duration) || g.duration <= 0) return;
      const score = g.players.find(p => p.id === playerId);
      if (!score) return;
      seen.add(key);
      rows.push({ ...meta, key, game: index + 1, score, duration: g.duration,
        won: g.winner === score.team, team: series.teams[score.team], opponent: series.teams[1 - score.team],
        participation: participation(score, g), rating: performanceRating(score, g) });
    });
  };
  const runs = c.calendar?.runs ?? [];
  for (const r of c.results) {
    if (!r.series || r.skipped) continue;
    // A dated tournament's placement summary must not duplicate its matches.
    if (r.tournamentId && runs.some(run => run.eventId === r.tournamentId && run.matches.some(m => m.series || m.performance))) continue;
    const eventKey = r.tournamentId ? `dated:${r.tournamentId}` : `weekly:${r.year}:${r.eventId}`;
    add(r.series, { eventKey, event: r.event, year: r.year,
      at: `${r.year}-W${String(r.week).padStart(2, "0")}`, stage: `Week ${r.week}` }, eventKey);
  }
  for (const run of runs) {
    const event = tournamentForRun(run);
    for (const match of run.matches) {
      const saved = match.series ?? match.performance;
      if (!saved) continue;
      const eventKey = `dated:${run.eventId}`;
      add(saved, { eventKey, event: event?.name ?? run.eventId, year: event?.year ?? Number(match.at.slice(0, 4)),
        at: match.at, stage: run.fixtures.find(f => f.id === match.id)?.stage ?? "Series" }, `${eventKey}:${match.id}`);
    }
  }
  const order = new Map(rows.map((row, index) => [row, index]));
  // A migrated weekly archive precedes the dated calendar within that year.
  // Same-day series follow their recorded order, with the newest map first.
  return rows.sort((a, b) => b.year - a.year
    || Number(a.at.includes("-W")) - Number(b.at.includes("-W"))
    || b.at.localeCompare(a.at) || order.get(b)! - order.get(a)!);
}

export function summarizePerformance(rows: PerformanceGame[]) {
  const total = (get: (r: PerformanceGame) => number) => rows.reduce((n, r) => n + get(r), 0);
  const optional = (key: "heroDamage" | "buildingDamage" | "healing") => {
    const measured = rows.filter(r => r.score[key] != null && Number.isFinite(r.score[key]));
    const sum = measured.reduce((n, r) => n + r.score[key]!, 0);
    return { games: measured.length, average: measured.length ? sum / measured.length : null,
      perMinute: measured.length ? ratio(sum, measured.reduce((n, r) => n + r.duration / 60, 0)) : null };
  };
  const lanes = rows.filter(r => r.score.laneOutcome != null);
  const kills = total(r => r.score.kills), deaths = total(r => r.score.deaths), assists = total(r => r.score.assists);
  const minutes = total(r => r.duration / 60);
  return {
    games: rows.length, wins: rows.filter(r => r.won).length,
    winRate: ratio(rows.filter(r => r.won).length * 100, rows.length),
    rating: ratio(total(r => r.rating), rows.length),
    kills: ratio(kills, rows.length), deaths: ratio(deaths, rows.length), assists: ratio(assists, rows.length),
    kda: (kills + assists) / Math.max(1, deaths),
    // The lane engine starts every hero with 600 gold; this is earned GPM.
    gpm: ratio(total(r => Math.max(0, r.score.gold - 600)), minutes),
    xpm: ratio(total(r => r.score.xp), minutes),
    lastHits: ratio(total(r => r.score.lastHits), rows.length),
    lastHitsPerMinute: ratio(total(r => r.score.lastHits), minutes),
    participation: ratio(total(r => r.participation) * 100, rows.length),
    heroDamage: optional("heroDamage"), buildingDamage: optional("buildingDamage"), healing: optional("healing"),
    laneGames: lanes.length, laneDraws: lanes.filter(r => r.score.laneOutcome === "draw").length,
    laneWinRate: lanes.length ? lanes.filter(r => r.score.laneOutcome === "win").length / lanes.length * 100 : null,
  };
}

export function performanceGroups(rows: PerformanceGame[], by: "eventKey" | "heroId") {
  const groups = new Map<string, PerformanceGame[]>();
  for (const row of rows) {
    const key = by === "heroId" ? row.score.heroId : row.eventKey;
    const group = groups.get(key) ?? [];
    group.push(row); groups.set(key, group);
  }
  return [...groups].map(([key, games]) => ({ key, games, summary: summarizePerformance(games) }));
}
