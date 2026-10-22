import type { Campaign } from "./game";

/** Contract expiry never dissolves a lineup in the middle of its event. */
export function playerTournamentLock(campaign: Campaign, playerId: string): string | null {
  const run = campaign.calendar?.runs.find(run => run.state === "playing" && run.teams.some(team => team.roster.includes(playerId)));
  return run ? "This player must finish the current tournament with their registered team." : null;
}
