import { simulateSeries } from "./battle";
import type { BattleConfig } from "./battle";
import { fixtureTeams, nextTournamentFixture, recordTournamentSeries, tournamentOpponentCondition } from "./tournament-rules";
import { hashSeed, utcTime } from "./tournament-utils";
import type { TournamentRun } from "./tournament-types";

export interface TournamentWorkerInput {
  run: TournamentRun;
  templates: Record<string, { name: string; players: BattleConfig["players"][0]; bonus: number }>;
  year: number;
  heroPoolThroughYear: number;
  /** Another registered tournament's earlier commitment stops this batch. */
  through?: string;
}
export function simulateOtherTournamentMatches(input: TournamentWorkerInput, progress: (played: number) => void = () => {}) {
    const { templates, year, heroPoolThroughYear } = input;
    let run = input.run;
    let played = 0;
    while (run.state === "playing") {
      const fixture = nextTournamentFixture(run);
      if (!fixture) throw new Error("The next tournament stage could not be resolved.");
      if (input.through && utcTime(fixture.at) > utcTime(input.through)) break;
      const teams = fixtureTeams(run, fixture)!;
      if (teams.includes(run.managed)) break;
      const [a, b] = teams.map(id => templates[id]);
      const prepared = (side: 0 | 1) => templates[teams[side]].players.map(p => ({ ...p, ...tournamentOpponentCondition(run, teams[side], { energy: p.energy, happiness: p.happiness, stamina: p.skills.stamina }, fixture.at) }));
      const result = simulateSeries({ seed: run.seed ^ hashSeed(fixture.id), year, heroPoolThroughYear,
        teams: [a.name, b.name], players: [prepared(0), prepared(1)], bonuses: [a.bonus, b.bonus],
        seriesFormat: { bestOf: fixture.bestOf, advantage: fixture.advantage }, captureReplay: false });
      run = recordTournamentSeries(run, fixture.id, result.summary);
      progress(++played);
    }
    return run;
}
if (typeof self !== "undefined") self.onmessage = (message: MessageEvent<TournamentWorkerInput>) => {
  try {
    const run = simulateOtherTournamentMatches(message.data, played => self.postMessage({ type: "progress", played }));
    self.postMessage({ type: "complete", run });
  } catch (error) {
    self.postMessage({ type: "error", message: error instanceof Error ? error.message : "Tournament simulation failed." });
  }
};
