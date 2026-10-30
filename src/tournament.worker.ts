import { simulateSeries } from "./battle";
import type { BattleConfig } from "./battle";
import { fixtureTeams, nextTournamentFixture, recordTournamentSeries, tournamentOpponentCondition } from "./tournament-rules";
import { hashSeed, utcTime } from "./tournament-utils";
import type { TournamentRun } from "./tournament-types";
import { tournamentCombatBonus } from "./tournament-form";
import type { FormResult } from "./tournament-form";
import { patchAtDate } from "./patches";
import type { PatchObserver } from "./patch-knowledge";

export interface TournamentWorkerInput {
  run: TournamentRun;
  templates: Record<string, { name: string; playerControl?: 1; players: BattleConfig["players"][0]; bonus: number; form?: FormResult[]; patchObserver?: PatchObserver }>;
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
      const patchId = run.patchId ?? patchAtDate(run.definition?.start ?? fixture.at).id;
      if (!run.patchId) run = { ...run, patchId };
      const [a, b] = teams.map(id => templates[id]);
      const bonus = (side: 0 | 1) => templates[teams[side]].bonus + tournamentCombatBonus(run, run.teams.find(t => t.id === teams[side])!, fixture.at, templates[teams[side]].form);
      const prepared = (side: 0 | 1) => templates[teams[side]].players.map(p => ({ ...p, ...tournamentOpponentCondition(run, teams[side], { energy: p.energy, happiness: p.happiness, stamina: p.skills.stamina }, fixture.at) }));
      const result = simulateSeries({ seed: run.seed ^ hashSeed(fixture.id), year, heroPoolThroughYear, patchId,
        ...(a.playerControl === 1 && b.playerControl === 1 ? {playerControl:1 as const} : {}),
        teams: [a.name, b.name], players: [prepared(0), prepared(1)], bonuses: [bonus(0), bonus(1)],
        ...(a.patchObserver && b.patchObserver ? { patchObservers: [a.patchObserver, b.patchObserver] as [PatchObserver, PatchObserver] } : {}),
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
