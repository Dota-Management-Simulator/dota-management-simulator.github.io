import type { Campaign } from "./game";
import type { TournamentRun } from "./tournament-types";
import { withTournamentStrength } from "./historical-game";
import { historicalPower, tournamentForm } from "./tournament-form";

export default function TournamentOutlook({ campaign, run: original, at }: { campaign: Campaign; run: TournamentRun; at: string }) {
  const run = withTournamentStrength(original);
  const runs = [...(campaign.calendar?.runs.filter(other => other.eventId !== run.eventId) ?? []), run];
  return <details className="tournament-facts"><summary>Historical outlook & campaign form</summary>
    <p>Historical finishes give the players and their lineup a starting advantage. Transfers, training, fatigue and campaign results can change it. The same rules apply to your team; every map is decided by the match simulation.</p>
    <div className="tournament-outlook">{[...run.teams].sort((a, b) => historicalPower(b.strength) - historicalPower(a.strength)).map(team => {
      const strength = team.strength!;
      const ref = strength.reference;
      const form = tournamentForm(runs, team.roster, at);
      return <p key={team.id}><strong>{team.name}{team.id === run.managed ? " · Your team" : ""}</strong><br />
        {ref ? <><a href={ref.source} target="_blank" rel="noreferrer">{ref.event} · Historical finish: {ref.from === ref.to ? ref.from : `${ref.from}–${ref.to}`}</a><br />
          {strength.retained}/5 reference players retained · Roster observation: {ref.rosterDate}</> : strength.covered ? "Mixed lineup: historical evidence follows individual players." : "No matched historical evidence; strength comes from current players."}
        <br />{strength.covered}/5 players with historical evidence · {form > 0.01 ? "Rising" : form < -0.01 ? "Falling" : "Steady"} campaign form
      </p>;
    })}</div>
    <p className="field-note">Roster references include annual snapshots, so they may differ from an exact event lineup. Historical strength is a gameplay estimate, not a player attribute or a promised finishing place. Evidence gaps receive no historical adjustment.</p>
  </details>;
}
