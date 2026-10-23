import type { GameSummary, SeriesSummary, Side } from "./battle";
import type { Result } from "./game";
import type { HistoricalTournament, TournamentMatchResult, TournamentRun } from "./tournament-types";

/** Older AI archives have player rows but no resource timelines or map objectives. */
export type ScoreboardGame = Pick<GameSummary, "winner" | "duration" | "kills" | "players"> & Partial<GameSummary>;
export type ScoreboardSeries = Pick<SeriesSummary, "teams" | "winner" | "score" | "bestOf" | "advantage" | "patch"> & { games: ScoreboardGame[] };
export type ScoreboardResult = Omit<Result, "series"> & { series?: ScoreboardSeries };

export function tournamentScoreboard(event: HistoricalTournament, run: TournamentRun, match: TournamentMatchResult) {
  const fixture = run.fixtures.find(f => f.id === match.id);
  const saved = match.series ?? match.performance;
  if (!saved?.games.length) return null;
  const reversed = saved.teams[0] !== run.teams.find(t => t.id === match.teams[0])?.name;
  const teams = reversed ? [match.teams[1], match.teams[0]] : match.teams;
  const managedSide = teams.indexOf(run.managed);
  const perspective: Side | null = managedSide < 0 ? null : managedSide as Side;
  const series: ScoreboardSeries = match.series ?? {
    ...saved,
    score: reversed ? [match.score[1], match.score[0]] : match.score,
    winner: match.winner === null ? null : reversed ? 1 - match.winner as Side : match.winner,
    bestOf: fixture?.bestOf,
    advantage: fixture?.advantage && (reversed ? [fixture.advantage[1], fixture.advantage[0]] : fixture.advantage),
  };
  const result: ScoreboardResult = {
    eventId: match.id, event: `${event.name} · ${fixture?.label ?? fixture?.stage ?? "Series"}`,
    year: event.year, week: 0, won: perspective !== null && series.winner === perspective,
    prize: 0, points: 0, opponent: series.teams[perspective === 1 ? 0 : 1], score: series.score.join(" – "), series,
  };
  const teamIds = teams.map(id => run.teams.find(t => t.id === id)?.clubId) as [string | undefined, string | undefined];
  return { result, perspective, teamIds };
}
