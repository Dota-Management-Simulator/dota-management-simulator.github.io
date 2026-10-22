import { useState } from "react";
import type { Campaign, Player } from "./game";
import { ROLES } from "./game";
import { sourceFor, activeClubs } from "./history";
import { rosterBatchFor } from "./roster-data";
import TeamBadge from "./TeamBadge";
import { teamLogoFor } from "./team-logos";
import PlayerAvatar from "./PlayerAvatar";

export default function WorldTeams({ campaign, onPlayer }: { campaign: Campaign; onPlayer: (player: Player) => void }) {
  const [region, setRegion] = useState("All regions");
  if (!campaign.world) return <section className="panel world-panel"><h2>Legacy campaign</h2><p>This save keeps its original players. Start a new campaign to use the historical world.</p></section>;
  const state = campaign.world;
  const active = activeClubs(state);
  const clubs = active.filter((t) => region === "All regions" || t.region === region);
  const through = state.dataThroughYear ?? Math.max(2010, ...state.appliedShuffles);
  const archived = state.clubs.length - active.length;
  return <>
    <section className="panel world-panel">
      <h2>{active.length} active clubs · {campaign.players.length} real players</h2>
      <p>{through < 2011 ? "TI1 opening rosters; regional arrivals follow TI" : `Annual roster batches imported through ${through}`} · Coverage through 2026.</p>
      <p>{rosterBatchFor(through)?.coverage ?? "Includes TI1 squads, reserves and selected regional teams. The 2011 regional coverage is partial and has no verified South American roster."}</p>
      <p>Current club assignments reflect your campaign. References combine dated events within each year; they are not a single-date transfer list. Roles are adapted and ratings, wages and fees are gameplay estimates.</p>
      <p>Active starters and reserves train every elapsed week, focusing on weaker skills and resting when tired. Free agents practice at a lighter workload. Starting attributes range from 15–40; development can take them higher, while insufficient practice causes gradual decay.</p>
      {!!archived && <p>{archived} earlier reference clubs are archived outside the current annual field. This does not imply a historical disbandment or retirement. Their players remain available for recruitment.</p>}
      <label>Region <select aria-label="World team region" value={region} onChange={(e) => setRegion(e.target.value)}>
        {["All regions", ...new Set(active.map((t) => t.region))].map((r) => <option key={r}>{r}</option>)}
      </select></label>
    </section>
    <div className="world-grid">{clubs.map((club) => <section className="panel world-panel" key={club.id}>
      <div className="world-team-heading"><div className="world-team-identity"><TeamBadge teamId={club.id} name={club.name} year={campaign.year} /><h2>{club.name}</h2></div><span className="world-team-tag">{club.id === state.managedTeamId ? "YOUR CLUB" : club.group === "main" ? "TI FIELD" : club.ti1 ? "TI1" : "REGIONAL"}</span></div>
      <p>{club.region} · Reference: {club.reference.date}</p>
      <ol className="world-roster">{club.roster.map((id, slot) => {
        const p = campaign.players.find((p) => p.id === id)!;
        return <li key={id}><span>{ROLES[slot]}</span><div className="world-player-identity"><PlayerAvatar player={p} small /><button className="text-link" onClick={() => onPlayer(p)}>{p.name}</button></div></li>;
      })}</ol>
      {!!club.bench.length && <p>Reserves: {club.bench.map((id) => <button className="text-link world-reserve" key={id} onClick={() => onPlayer(campaign.players.find((p) => p.id === id)!)}>{campaign.players.find((p) => p.id === id)!.name}</button>)}</p>}
      <a className="text-link" href={sourceFor(club.reference.source)?.url} target="_blank" rel="noreferrer">Roster reference ↗</a>
      {club.id === state.managedTeamId && campaign.settings.branding?.logo ? <span className="logo-missing">Custom club logo</span> : teamLogoFor(club.id, campaign.year) ? <a className="text-link logo-reference" href={teamLogoFor(club.id, campaign.year)!.filePage} target="_blank" rel="noreferrer">Logo reference ↗</a> : <span className="logo-missing">{club.id === "managed-custom" ? "Custom club initials" : "Era logo unavailable · initials shown"}</span>}
    </section>)}</div>
  </>;
}
