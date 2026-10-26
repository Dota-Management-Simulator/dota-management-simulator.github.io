import { patchLabel } from "./patch-label";
import { useMemo, useState } from "react";
import { ArrowRight, ClipboardList, Search, Users } from "lucide-react";
import type { Campaign, Player } from "./game";
import { ROLES } from "./game";
import type { BattleConfig } from "./battle";
import type { DraftPreparation } from "./draft";
import { normalizeDraftPreparation } from "./draft";
import { HeroName } from "./DraftRecord";
import TeamBadge from "./TeamBadge";
import PlayerAvatar from "./PlayerAvatar";
import { sourceFor } from "./history";
import { formatDate } from "./tournaments";
import { playerPerformance } from "./performance";
import { teamLogoFor } from "./team-logos";
import { frequentHeroes, nextScoutSeries, ownScoutConfig, scoutPlayer, staffDraftAdvice, teamScoutSeries } from "./team-scouting";
import type { ScoutTeam } from "./team-scouting";
import "./team-scouting.css";

export function StaffDraftPreparation({ campaign, config, team = null, onApply }: {
  campaign: Campaign; config: BattleConfig; team?: ScoutTeam | null; onApply: (plan: DraftPreparation) => void;
}) {
  const advice = useMemo(() => staffDraftAdvice(campaign, config, team), [campaign, config, team]);
  const [saved, setSaved] = useState(false);
  return <section className="scout-staff" aria-label="Staff draft preparation">
    <div className="scout-section-heading"><div><span className="eyebrow">SUPPORT STAFF · PATCH {patchLabel(advice.patchId)}</span><h3>Prepare with your staff</h3></div><ClipboardList size={22} /></div>
    {advice.notes.length ? <>
      <div className="scout-notes">{advice.notes.map(n => <article key={n.id}><strong>{n.name} <small>· {n.role}</small></strong><p>{n.detail}</p></article>)}</div>
      {campaign.staffIds.some(id => ["c2", "c5", "c6"].includes(id)) && advice.threats.length > 0 && <div className="scout-common"><h3>Observed threats · current lineup</h3>{advice.threats.slice(0, 6).map(h => <span key={h.id}><HeroName id={h.id} /><small>{h.games} appearances · {h.wins} wins</small></span>)}</div>}
      {campaign.staffIds.includes("c5") && advice.observedBans.length > 0 && <div className="scout-common"><h3>Their recorded bans</h3>{advice.observedBans.map(([id, n]) => <span key={id}><HeroName id={id} /><small>×{n}</small></span>)}</div>}
      <div className="scout-plan"><strong>Suggested approach · {advice.plan.approach}</strong><div className="scout-plan-heroes">{advice.plan.preferred.map((ids, i) => <div key={i}><small>{ROLES[i]}</small>{ids[0] ? <HeroName id={ids[0]} /> : "No suggestion"}</div>)}</div>
        <p>Priority bans · {advice.plan.bans.length ? advice.plan.bans.map(id => <HeroName key={id} id={id} />) : "No eligible observed threats outside this suggested lineup. Choose bans manually."}</p>
        <button className="button secondary" disabled={!advice.canApply} onClick={() => { onApply(advice.plan); setSaved(true); }}>Use staff draft plan</button>
        {saved && <p role="status">Staff plan saved. You can adjust your preferences before each map.</p>}
      </div>
    </> : <p>Your basic scouting report is available. Hire a head coach, analyst, economy coach, strategy scout or hero specialist to receive a suggested draft plan and their specialist insights.</p>}
    <p className="field-note">Advice uses your uncertain patch research and completed campaign matches. Hero preferences and bans guide drafting; they cannot guarantee a pick or a win. Applying replaces your saved approach, preferred heroes and priority bans.</p>
  </section>;
}

function HeroPools({ campaign, team }: { campaign: Campaign; team: ScoutTeam }) {
  const rows = useMemo(() => team.roster.map(id => {
    const games = playerPerformance(campaign, id).filter(g => {
      if (g.at.includes("-W")) return g.year < campaign.year || (g.year === campaign.year && Number(g.at.split("-W")[1]) <= campaign.week);
      return !campaign.calendar || Date.parse(g.at) <= Date.parse(campaign.calendar.now);
    });
    const counts = new Map<string, number>(); for (const g of games) counts.set(g.score.heroId, (counts.get(g.score.heroId) ?? 0) + 1);
    return { id, maps: games.length, heroes: [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3) };
  }), [campaign, team]);
  return <div className="scout-player-pools"><h3>Hero specialist · current players’ public hero pools</h3><p className="field-note">All recorded campaign clubs, matched by player ID. These are appearances, not a combat proficiency rating.</p>{rows.map(r => <div key={r.id}><strong>{scoutPlayer(campaign, r.id)?.name ?? "Unavailable player"}<small>{r.maps} recorded maps</small></strong><span>{r.heroes.length ? r.heroes.map(([id, n]) => <span key={id}><HeroName id={id} /> <small>×{n}</small></span>) : "No recorded hero appearances"}</span></div>)}</div>;
}

export function TeamScoutProfile({ campaign, team, onPlayer, onPreparation, config, onStaff }: {
  campaign: Campaign; team: ScoutTeam; onPlayer: (p: Player) => void; onPreparation: (prep: DraftPreparation) => void;
  config?: BattleConfig; onStaff: () => void;
}) {
  const series = useMemo(() => teamScoutSeries(campaign, team), [campaign, team]);
  const maps = series.flatMap(s => s.maps), common = frequentHeroes(maps).slice(0, 3);
  const preview = useMemo(() => config ?? ownScoutConfig(campaign, team), [campaign, team, config]);
  const ref = team.reference && sourceFor(team.reference.source);
  const logo = teamLogoFor(team.clubId, campaign.year);
  return <section className="panel scout-profile" aria-label={`${team.name} team profile`}>
    <div className="scout-team-heading"><TeamBadge teamId={team.clubId} name={team.name} year={campaign.year} size="large" /><div><span className="eyebrow">{team.managed ? "YOUR CLUB" : team.active ? "ACTIVE CLUB" : "REGISTERED / ARCHIVED TEAM"}</span><h2>{team.name}</h2><p>{team.region} · {team.roster.length} starters · {team.bench.length} reserves</p></div></div>
    <div className="scout-summary"><div><small>Recorded series</small><strong>{series.length}</strong></div><div><small>Series W / D / L</small><strong>{series.filter(s => s.outcome === "W").length} / {series.filter(s => s.outcome === "D").length} / {series.filter(s => s.outcome === "L").length}</strong></div><div><small>Maps with scoreboards</small><strong>{maps.length}</strong></div><div><small>Map record</small><strong>{maps.filter(m => m.won).length}W / {maps.filter(m => !m.won).length}L</strong></div></div>
    <div className="scout-profile-columns"><section><h3>Starting lineup</h3><ol className="scout-lineup">{team.roster.map((id, role) => {
      const p = scoutPlayer(campaign, id);
      return <li key={id}><small>{ROLES[role] ?? "Starter"}</small>{p ? <button className="text-link" onClick={() => onPlayer(p)}><PlayerAvatar player={p} small />{p.name}</button> : <span>Player record unavailable</span>}</li>;
    })}</ol>{!team.roster.length && <p>The roster has not been recorded in this save.</p>}
      {!!team.bench.length && <p className="scout-reserves">Reserves: {team.bench.map(id => { const p = scoutPlayer(campaign, id); return p ? <button className="text-link" key={id} onClick={() => onPlayer(p)}>{p.name}</button> : null; })}</p>}
    </section><section><h3>Recent series</h3>{series.length ? <ol className="scout-results">{series.slice(0, 5).map(s => <li key={s.key}><span className={`scout-outcome outcome-${s.outcome}`}>{s.outcome}</span><div><strong>{s.score} · {s.opponent}</strong><small>{s.event} · {s.at.includes("Week") ? s.at : formatDate(s.at)}</small></div></li>)}</ol> : <p>No completed campaign series recorded. Historical roster references do not create match results.</p>}</section></div>
    <div className="scout-common"><h3>Most played heroes</h3>{common.length ? common.map(h => <span key={h.id}><HeroName id={h.id} /><small>{h.games} maps · {h.wins} wins</small></span>) : <p>No public picks recorded yet.</p>}</div>
    <p className="field-note">Records above follow this club across campaign rosters. Staff advice examines up to 20 recent maps; hero threats count only players in this lineup. Small samples are uncertain.</p>
    {!team.managed && preview && <StaffDraftPreparation campaign={campaign} config={preview} team={team} onApply={onPreparation} />}
    {campaign.staffIds.includes("c6") && <HeroPools campaign={campaign} team={team} />}
    <button className="text-link" onClick={onStaff}>Review scouting staff <ArrowRight size={14} /></button>
    {team.reference && <p className="field-note">Roster reference: {team.reference.date}{ref && <> · <a href={ref.url} target="_blank" rel="noreferrer">Source ↗</a></>}. Current assignments reflect your campaign; historical coverage is partial.</p>}
    {logo && <a className="text-link" href={logo.filePage} target="_blank" rel="noreferrer">Logo reference ↗</a>}
  </section>;
}

export default function NextSeriesScouting({ campaign, onPlayer, onPreparation, onTeams, onStaff, onCalendar }: {
  campaign: Campaign; onPlayer: (p: Player) => void; onPreparation: (prep: DraftPreparation) => void;
  onTeams: () => void; onStaff: () => void; onCalendar: () => void;
}) {
  const next = useMemo(() => nextScoutSeries(campaign), [campaign]);
  const prep = normalizeDraftPreparation(campaign.draftPreparation);
  return <div className="team-scouting">
    <section className="panel scout-next"><div className="scout-section-heading"><div><span className="eyebrow">NEXT SERIES</span><h2>{next?.team ? `${campaign.settings.team} vs ${next.team.name}` : next ? "Waiting for your next opponent" : "No series scheduled"}</h2><p>{next ? `${next.event} · ${next.at.includes("Week") ? next.at : formatDate(next.at)}${next.estimated ? " · estimated date" : ""} · ${next.stage}` : "Register for a tournament to confirm your next opponent. You can scout other teams while you plan."}</p></div><Search size={26} /></div>
      {next && !next.team && <p>Your opponent will appear once the required bracket or group results are settled.</p>}
      {next?.team && <p className="field-note">Registered series use their pinned lineup and patch. Staff preparation remains editable before every map.</p>}
      <div className="scout-actions"><button className="button secondary" onClick={onCalendar}>Open season calendar <ArrowRight size={15} /></button><button className="text-link" onClick={onTeams}><Users size={16} /> Browse team profiles</button><button className="text-link" onClick={onStaff}>Support staff</button></div>
    </section>
    {next?.team && <TeamScoutProfile campaign={campaign} team={next.team} config={next.config} onPlayer={onPlayer} onPreparation={onPreparation} onStaff={onStaff} />}
    <section className="panel scout-saved"><h3>Saved draft preparation</h3><p>Approach · <strong>{prep.approach}</strong></p><div className="scout-plan-heroes">{prep.preferred.map((ids, r) => <div key={r}><small>{ROLES[r]}</small>{ids[0] ? <HeroName id={ids[0]} /> : "Coach’s choice"}</div>)}</div><p>Priority bans · {prep.bans.length ? prep.bans.map(id => <HeroName key={id} id={id} />) : "None saved"}</p><p className="field-note">Your plan persists across reloads. Unavailable heroes are skipped during drafting.</p></section>
  </div>;
}
