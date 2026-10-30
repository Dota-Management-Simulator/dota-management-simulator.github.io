import { useMemo, useState } from "react";
import type { Campaign, Player } from "./game";
import type { DraftPreparation } from "./draft";
import { scoutingTeams } from "./team-scouting";
import TeamBadge from "./TeamBadge";
import { TeamScoutProfile } from "./TeamScouting";
import { money } from './game';

export default function WorldTeams({ campaign, onPlayer, onPreparation, onStaff }: {
  campaign: Campaign; onPlayer: (player: Player) => void; onPreparation: (prep: DraftPreparation) => void; onStaff: () => void;
}) {
  const teams = useMemo(() => scoutingTeams(campaign), [campaign]);
  const [region, setRegion] = useState("All regions"), [query, setQuery] = useState("");
  const [scope, setScope] = useState("active"), [selected, setSelected] = useState<string | null>(null);
  const team = teams.find(t => t.id === selected);
  if (team) return <div className="team-scouting"><button className="text-link" onClick={() => setSelected(null)}>← Back to teams</button><TeamScoutProfile key={team.id} campaign={campaign} team={team} onPlayer={onPlayer} onPreparation={onPreparation} onStaff={onStaff} /></div>;
  const filtered = teams.filter(t => (scope === "all" || t.active) && (region === "All regions" || t.region === region) && t.name.toLowerCase().includes(query.toLowerCase()));
  return <div className="team-scouting">
    <details className="panel" style={{padding:16,marginBottom:16}}><summary>Club finances &amp; recent transfers</summary><p>Simulated AI budgets pay weekly wages, receive club support, prizes and buyouts, and retain four weeks of payroll before recruiting. Moves wait for registered events and prepared scrims.</p>{campaign.aiEconomy ? <><div style={{overflowX:'auto'}}><table><thead><tr><th>Club</th><th>Cash</th><th>Support / wk</th><th>Payroll / wk</th></tr></thead><tbody>{Object.entries(campaign.aiEconomy.clubs).filter(([id])=>campaign.world?.clubs.some(t=>t.id===id&&t.active!==false)).map(([id,b])=><tr key={id}><td>{campaign.world?.clubs.find(t=>t.id===id)?.name}</td><td>{money(b.cash)}</td><td>{money(b.weeklyIncome)}</td><td>{money(b.payroll)}</td></tr>)}</tbody></table></div>{campaign.aiEconomy.transfers.slice().reverse().map((t,i)=><p key={`${t.week}:${i}`}>{campaign.world?.clubs.find(c=>c.id===t.clubId)?.name}: {campaign.players.find(p=>p.id===t.playerId)?.name} replaces {campaign.players.find(p=>p.id===t.outgoingId)?.name} · {money(t.fee)} fee · {money(t.wage)}/week.</p>)}</> : <p>Budgets initialize at the next paid week. No past finances are invented.</p>}</details>
    <section className="panel scout-directory"><div><span className="eyebrow">TEAM DIRECTORY</span><h2>Scout the competition</h2><p>Open a team profile for its current lineup, recorded results, hero picks and your staff’s scouting insights.</p></div>
      <div className="scout-filters"><label>Find a team<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search team names…" /></label><label>Region<select aria-label="Team region" value={region} onChange={e => setRegion(e.target.value)}>{["All regions", ...new Set(teams.map(t => t.region))].map(r => <option key={r}>{r}</option>)}</select></label><label>Show<select value={scope} onChange={e => setScope(e.target.value)}><option value="active">Active clubs</option><option value="all">All recorded teams</option></select></label></div>
      <p className="field-note">{filtered.length} teams · Campaign assignments and completed results. Annual historical roster references are partial; no results are invented for unplayed events.</p>
    </section>
    <div className="scout-team-grid">{filtered.map(t => <button key={t.id} className="panel scout-team-card" onClick={() => setSelected(t.id)}><TeamBadge teamId={t.clubId} name={t.name} year={campaign.year} size="large" /><span><small>{t.managed ? "YOUR CLUB" : t.region}</small><strong>{t.name}</strong><small>{t.roster.length} starters · {t.active ? "Active club" : "Registered / archived"}</small><span className="text-link">Scout team →</span></span></button>)}</div>
    {!filtered.length && <section className="panel scout-empty"><h3>No teams match these filters</h3><button className="button secondary" onClick={() => { setRegion("All regions"); setQuery(""); setScope("all"); }}>Clear filters</button></section>}
  </div>;
}
