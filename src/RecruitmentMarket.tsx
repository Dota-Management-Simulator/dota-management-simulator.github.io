import { useEffect, useMemo, useRef, useState } from 'react';
import type { Campaign, Player } from './game';
import { money, playerTeam, rating, ROLES, statNames } from './game';
import { askingWage, candidateFit, marketValue } from './player-market';
import { recruitmentComparison, toggleShortlist } from './recruitment';
import Avatar from './PlayerAvatar';
import PlayerCareerPanel from './PlayerCareerPanel';
import PlayerScoutingSummary, { PlayerScoutingLine } from './PlayerScoutingSummary';
import './recruitment.css';

export default function RecruitmentMarket({ campaign: c, onPlayer, onChange }: { campaign: Campaign; onPlayer: (p: Player) => void; onChange: (c: Campaign) => void }) {
  const [search, setSearch] = useState(''), [role, setRole] = useState('All roles'), [sort, setSort] = useState('rating');
  const [shortlisted, setShortlisted] = useState(false), [freeOnly, setFreeOnly] = useState(false), [budget, setBudget] = useState(0), [limit, setLimit] = useState(30), [selected, setSelected] = useState<string>();
  const comparisonRef = useRef<HTMLElement>(null);
  useEffect(() => { if (selected) { comparisonRef.current?.focus({preventScroll:true}); comparisonRef.current?.scrollIntoView({block:'start'}); } }, [selected]);
  const rows = useMemo(() => {
    const filtered = c.players.filter(p => !c.roster.includes(p.id) && (role === 'All roles' || p.role === role)
      && (!shortlisted || c.shortlist?.includes(p.id)) && (!freeOnly || playerTeam(c, p.id) === 'Free agent')
      && `${p.name} ${p.region} ${playerTeam(c, p.id)} ${p.historical?.aliases.join(' ') ?? ''}`.toLowerCase().includes(search.toLowerCase()));
    const scores = filtered.map(p => ({ p, wage: budget || sort === 'wage' ? askingWage(c, p) : 0,
      score: sort === 'fit' ? candidateFit(c, p).teamRating : sort === 'fee' ? -marketValue(c, p).fee : rating(p) }));
    return scores.filter(row => !budget || row.wage <= budget).sort((a, b) => sort === 'name' ? a.p.name.localeCompare(b.p.name) : sort === 'wage' ? a.wage - b.wage || a.p.name.localeCompare(b.p.name) : b.score - a.score || a.p.name.localeCompare(b.p.name)).map(row => row.p);
  }, [c, search, role, sort, shortlisted, freeOnly, budget]);
  const candidate = c.players.find(p => p.id === selected), comparison = candidate && recruitmentComparison(c, candidate);
  const resetLimit = () => setLimit(30);
  return <section className="recruitment-market" aria-label="Player recruitment">
    <div className="panel recruitment-controls"><h2>The transfer market</h2><p>Compare improvements, team fit and eight-week affordability before negotiating.</p>
      <div className="recruitment-filters"><label>Find player<input type="search" aria-label="Search players" placeholder="Player, team or alias" value={search} onChange={e => { setSearch(e.target.value); resetLimit(); }} /></label>
      <label>Role<select aria-label="Filter by role" value={role} onChange={e => { setRole(e.target.value); resetLimit(); }}>{['All roles', ...ROLES].map(r => <option key={r}>{r}</option>)}</select></label>
      <label>Sort by<select value={sort} onChange={e => setSort(e.target.value)}><option value="rating">Overall rating</option><option value="fit">Team rating improvement</option><option value="wage">Lowest asking wage</option><option value="fee">Lowest fee</option><option value="name">Name</option></select></label>
      <label>Maximum weekly ask ($)<input type="number" min="0" max="100000" value={budget} onChange={e => { setBudget(Math.max(0, Math.min(100000, Number(e.target.value) || 0))); resetLimit(); }} /><small>0 = any wage</small></label>
      <label><input type="checkbox" checked={shortlisted} onChange={e => { setShortlisted(e.target.checked); resetLimit(); }} />Shortlist ({c.shortlist?.length ?? 0})</label><label><input type="checkbox" checked={freeOnly} onChange={e => { setFreeOnly(e.target.checked); resetLimit(); }} />Free agents</label></div>
      <p role="status">{rows.length} matching players · showing {Math.min(limit, rows.length)}</p></div>
    {candidate && comparison && <section className="panel recruitment-comparison" aria-label="Recruit comparison" tabIndex={-1} ref={comparisonRef}><div className="recruitment-heading"><h2>{candidate.name} vs {comparison.outgoing?.name ?? 'vacant position'}</h2><button className="button secondary" onClick={() => setSelected(undefined)}>Close comparison</button></div>
      <div className="recruitment-costs"><span>Team rating<strong>{comparison.fit.teamRating > 0 ? '+' : ''}{comparison.fit.teamRating}</strong></span><span>Synergy<strong>{comparison.fit.synergy > 0 ? '+' : ''}{comparison.fit.synergy}</strong></span><span>Signing + release<strong>{money(comparison.upfront)}</strong></span><span>Weekly payroll change<strong>{comparison.wageDelta > 0 ? '+' : ''}{money(comparison.wageDelta)}</strong></span><span>Additional cost over 8 weeks<strong>{money(comparison.additionalEightWeekCost)}</strong></span><span>Cash after 8 weeks<strong>{money(comparison.closingCash)}</strong></span></div>
      <p>{money(comparison.fee)} fee + {money(comparison.release)} release. Eight-week recruit cost: {money(comparison.eightWeekCost)}. Assumes the displayed asking wage; bonuses and negotiated terms can change the cost. Forecast excludes uncertain prizes and new deals.</p>
      {comparison.firstDebt && <p className="planning-warning">First projected debt: {comparison.firstDebt}. Review sponsors or a cheaper signing.</p>}
      <div className="scouting-comparison">{comparison.outgoing && <PlayerScoutingSummary campaign={c} player={comparison.outgoing} compact />}<PlayerScoutingSummary campaign={c} player={candidate} compact /></div>
      <div className="recruitment-table-scroll"><table><thead><tr><th>Attribute</th><th>{comparison.outgoing?.name ?? 'Vacancy'}</th><th>{candidate.name}</th><th>Change</th></tr></thead><tbody>{Object.entries(candidate.stats).map(([key, value]) => { const old = comparison.outgoing?.stats[key as keyof Player['stats']] ?? 0, delta = Math.round((value - old) * 100) / 100; return <tr key={key}><th>{statNames[key]}</th><td>{old}</td><td>{value}</td><td>{delta > 0 ? '+' : ''}{delta}</td></tr>; })}</tbody></table></div>
      <PlayerCareerPanel campaign={c} player={candidate} compact /><button className="button primary" onClick={() => onPlayer(candidate)}>Open profile &amp; negotiate</button></section>}
    <div className="panel recruitment-results">{rows.slice(0, limit).map(p => { const value = marketValue(c, p), fit = candidateFit(c, p), ask = askingWage(c, p); return <article className="recruitment-row" key={p.id}>
      <button className="player-cell plain-button" onClick={() => onPlayer(p)}><Avatar player={p} small /><span><strong>{p.name}</strong><small>{playerTeam(c, p.id)} · {p.role}</small><PlayerScoutingLine player={p} /></span></button>
      <span><strong>{rating(p)}</strong><small>OVR</small></span><span><strong>{fit.teamRating > 0 ? '+' : ''}{fit.teamRating}</strong><small>TEAM RATING</small></span><span><strong>{money(value.fee)}</strong><small>{money(ask)} / wk ask</small></span>
      <button className="button secondary small-button" onClick={() => setSelected(p.id)}>Compare</button><button className="button secondary small-button" aria-label={`Shortlist ${p.name}`} aria-pressed={!!c.shortlist?.includes(p.id)} onClick={() => onChange(toggleShortlist(c, p.id))}>{c.shortlist?.includes(p.id) ? 'Shortlisted' : '+ Shortlist'}</button>
    </article>; })}{!rows.length && <p>No players match these filters.</p>}{rows.length > limit && <button className="button secondary" onClick={() => setLimit(n => n + 30)}>Show 30 more players</button>}</div>
  </section>;
}
