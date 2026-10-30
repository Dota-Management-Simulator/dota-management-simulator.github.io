import type { Campaign, Player } from './game';
import { careerHeroPool, developmentProfile, heroMasteries, normalizeCareer } from './player-career';
import { heroById } from './heroes';
import { heroIconFor } from './hero-icons';
import { weeklyPractice } from './contracts';
import { skillDeltas } from './training';
import { statNames } from './game';
import './player-career.css';

export default function PlayerCareerPanel({ campaign: c, player: p, compact = false }: { campaign: Campaign; player: Player; compact?: boolean }) {
  const profile = developmentProfile(p), mastery = heroMasteries(c, p);
  const pool = careerHeroPool(c), best = Object.entries(mastery).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, compact ? 3 : 8);
  const focus = p.career?.focusHeroId;
  if (focus && mastery[focus] != null && !best.some(([id]) => id === focus)) best.push([focus, mastery[focus]]);
  const growth = skillDeltas(c.training[p.id] ?? 'Balanced', weeklyPractice(c, p, c.training[p.id] ?? 'Balanced'), p);
  return <section className="career-panel" aria-label={`${p.name} development and hero mastery`}>
    <h3>Development &amp; hero mastery</h3><p>Individual simulated preferences and potential. These are game estimates, not historical player assessments.</p>
    <div className="career-metrics"><span>Development outlook<strong>{profile.ceiling - 4}–{Math.min(99, profile.ceiling + 4)}</strong><small>Skill ceilings vary; current ratings are preserved.</small></span><span>Learning pace<strong>{Math.round(profile.learning * 100)}%</strong><small>Applies as skills rise above 45.</small></span><span>Leadership<strong>{profile.leadership}/10</strong><small>Helps team coordination.</small></span><span>Adaptability<strong>{profile.adaptability}/10</strong><small>Helps mixed playstyles fit together.</small></span></div>
    <p>{c.roster.includes(p.id) ? 'Planned attribute gains this week' : 'Illustrative gains with your staff and this player’s default plan'}: {Object.entries(growth).filter(([, n]) => n > 0).map(([key, n]) => `${statNames[key]} +${n}`).join(' · ') || 'No positive attribute gains'}. Rest, caps and workload are included.</p>
    <div className="career-heroes">{best.map(([id, rating]) => { const hero = heroById(id), icon = heroIconFor(id); return <div key={id}>{icon && <img src={`${import.meta.env.BASE_URL}${icon.path}`} alt="" loading="lazy" />}<span><strong>{hero?.name ?? id}</strong><small>{rating}/100 hero handling{p.career?.focusHeroId === id ? ` · practicing · ${p.career.heroTraining[id] ?? 0}/40 training credit` : ''}</small></span></div>; })}</div>
    <details><summary>How mastery develops</summary><p>Existing practice can focus on one of {pool.length} available heroes. Completed competitive events and scrims add familiarity. Mastery improves AI timing, target choice and last-hit decisions. It does not increase the hero's damage, health, movement speed, spell strength or rewards. Handling is fixed for a prepared series; old recorded matches retain their original rules.</p><p>Hero practice adds up to two training points per paid week, slowing toward a 40-point cap. It stops during Rest or below ten effective practice hours. Choose the focus in Training.</p></details>
  </section>;
}

export function HeroPracticeFocus({ campaign: c, player: p, onChange }: { campaign: Campaign; player: Player; onChange: (change: (c: Campaign) => Campaign) => void }) {
  const pool = careerHeroPool(c), managed = c.roster.includes(p.id);
  return <label className="hero-practice-focus">Hero practice focus<select aria-label={`Hero practice for ${p.name}`} value={p.career?.focusHeroId ?? ''} disabled={!managed} onChange={e => {
    const focusHeroId = e.target.value;
    onChange(current => ({ ...current, players: current.players.map(row => row.id === p.id ? { ...row, career: { ...normalizeCareer(row.career), focusHeroId: focusHeroId || undefined } } : row) }));
  }}><option value="">General hero practice</option>{pool.map(h => <option value={h.id} key={h.id}>{h.name}</option>)}</select><small>{p.career?.focusHeroId ? `Training credit: ${p.career.heroTraining[p.career.focusHeroId] ?? 0}/40. ` : ''}Uses the current workload. Rest and fewer than 10 effective hours give no hero practice gain.</small></label>;
}
