import type { HistoricalStrength, TournamentRun, TournamentTeam } from "./tournament-types";

const WEEK = 604800000;
const bound = (value: number, max: number) => Math.max(-max, Math.min(max, value));
export const historicalPower = (strength?: HistoricalStrength) => (strength?.players ?? 0) + (strength?.continuity ?? 0);

/** Result-driven form follows the actual players, so roster changes and upsets
 * propagate into opponents and later events. Only played maps supply evidence. */
export interface FormResult { at: string; change: number }
export function lineupFormResults(runs: TournamentRun[], roster: string[]): FormResult[] {
  const results: FormResult[] = [];
  const seen = new Set<string>();
  for (const run of runs) for (const match of run.matches) {
    const key = `${run.eventId}:${match.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const teams = match.teams.map(id => run.teams.find(team => team.id === id));
    if (!teams[0] || !teams[1]) continue;
    const fixture = run.fixtures.find(f => f.id === match.id);
    const recorded = match.performance?.games ?? match.series?.games;
    const score = recorded ? [recorded.filter(g => g.winner === 0).length, recorded.filter(g => g.winner === 1).length] :
      match.score.map((wins, side) => Math.max(0, wins - (fixture?.advantage?.[side] ?? 0)));
    const maps = score[0] + score[1];
    if (!maps) continue;
    const expected = 1 / (1 + Math.exp(-(historicalPower(teams[0].strength) - historicalPower(teams[1].strength)) * 5));
    const surprise = (score[0] - maps * expected) * 0.018;
    const overlap = (team: TournamentTeam) => roster.filter(id => team.roster.includes(id)).length / Math.max(5, roster.length);
    const change = surprise * (overlap(teams[0]) - overlap(teams[1]));
    if (change) results.push({ at: match.at, change });
  }
  return results;
}
export function formFromResults(results: FormResult[], at: string): number {
  return bound(results.reduce((sum, result) => {
    const age = Date.parse(at) - Date.parse(result.at);
    return sum + (age >= 0 && age <= 26 * WEEK ? result.change * 2 ** (-age / (8 * WEEK)) : 0);
  }, 0), 0.08);
}
export function tournamentForm(runs: TournamentRun[], roster: string[], at: string): number {
  return formFromResults(lineupFormResults(runs, roster), at);
}

/** Prior tournaments and this run share one cap; workers recompute after each
 * series and on reload, without persisting a second mutable rating ledger. */
export function tournamentCombatBonus(run: TournamentRun, team: TournamentTeam, at: string, priorResults: FormResult[] = []): number {
  return historicalPower(team.strength) + formFromResults([...priorResults, ...lineupFormResults([run], team.roster)], at);
}
