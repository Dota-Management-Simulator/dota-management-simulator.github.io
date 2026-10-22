import archive from "./data/tournaments.json";
import type { SeriesSummary } from "./battle";
import type { HistoricalTournament, TournamentRun } from "./tournament-types";
import { groupStandings as standings, recordTournamentSeries as record } from "./tournament-rules";
export { fixtureTeams, resolveSlot, nextTournamentFixture, managedFixture, validateSeries, seededTournamentFixtures, tournamentOpponentCondition } from "./tournament-rules";
export { utcTime, isoTime, formatDate, hashSeed, formatPrize } from "./tournament-utils";

export const historicalTournaments = archive.events as unknown as HistoricalTournament[];
export const tournamentById = (id: string) => historicalTournaments.find(e => e.id === id);
export const tournamentForRun = (run: TournamentRun): HistoricalTournament | undefined => run.definition
  ? { ...run.definition, fixtures: run.fixtures }
  : tournamentById(run.eventId);
export const tournamentsInYear = (year: number) => historicalTournaments.filter(e => Number(e.start.slice(0, 4)) <= year && Number(e.end.slice(0, 4)) >= year);
/** Preserve earlier in-progress saves while keeping the archive out of workers. */
export function pinTournamentRun(run: TournamentRun): TournamentRun {
  if (run.definition) return run;
  const event = tournamentById(run.eventId);
  if (!event) throw new Error("The historical rules for this tournament are unavailable.");
  const { fixtures: _fixtures, ...definition } = event;
  return { ...run, definition: structuredClone(definition) };
}
export const groupStandings = (run: TournamentRun, groupId: string) => standings(pinTournamentRun(run), groupId);
export function recordTournamentSeries(run: TournamentRun, fixtureId: string, series: SeriesSummary): TournamentRun {
  if (run.matches.some(m => m.id === fixtureId)) return run;
  return record(pinTournamentRun(run), fixtureId, series);
}
