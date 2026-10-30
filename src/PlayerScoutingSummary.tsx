import type { Campaign, Player } from './game';
import { ROLES, statNames } from './game';
import { careerHeroPool, heroMasteries } from './player-career';
import { heroById } from './heroes';
import { heroIconFor } from './hero-icons';
import { campaignPatch } from './patches';
import { innateDescription, playerIdentityEra } from './player-identity';
import { innateById } from './player-identity-data';
import './player-scouting.css';

const skillNotes = {
  laning: 'Last-hit patience, deny opportunities and lane target choices.',
  teamfights: 'Spell timing, ally saves and coordinating disables.',
  farming: 'Choosing last hits and available neutral camps.',
  skirmish: 'Recognizing vulnerable targets and reacting in small fights.',
  vision: 'Reading opportunities among enemies the team can see.',
  intuition: 'Retreat decisions and responding to tactical calls.',
  pushing: 'Recognizing safe openings to attack buildings.',
} as const;

/** A read-only interpretation of existing ratings, never additional traits. */
function scoutingNotes(p: Player) {
  const skills = (Object.keys(skillNotes) as (keyof typeof skillNotes)[])
    .map(key => ({ key, value: p.stats[key], label: statNames[key], note: skillNotes[key] }))
    .sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
  const even = skills[0].value - skills.at(-1)!.value < 1;
  const styles = Object.entries(p.playstyles).filter((row): row is [string, number] => row[1] != null && Number.isFinite(row[1]))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const evenStyles = !styles.length || styles[0][1] - styles.at(-1)![1] < .5;
  return { strengths: skills.slice(0, 2), lower: skills.at(-1)!, even, styles: styles.slice(0, 2), evenStyles };
}

export function PlayerScoutingLine({ player }: { player: Player }) {
  const notes = scoutingNotes(player);
  return <small className="player-signature-line">{notes.even ? 'Even match skills' : `Strength: ${notes.strengths[0].label}`}{!notes.evenStyles && ` · Prefers ${notes.styles[0][0]}`}</small>;
}

export default function PlayerScoutingSummary({ campaign, player, compact = false }: { campaign: Campaign; player: Player; compact?: boolean }) {
  const notes = scoutingNotes(player);
  const role = ROLES.indexOf(player.role as typeof ROLES[number]);
  const eligible = new Set(careerHeroPool(campaign).filter(hero => hero.roles.includes(role)).map(hero => hero.id));
  const heroes = Object.entries(heroMasteries(campaign, player)).filter(([id]) => eligible.has(id)).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3);
  const innate = playerIdentityEra(campaignPatch(campaign)).innates && player.identity ? innateById.get(player.identity.innateId) : undefined;
  return <section className={`player-scouting-summary ${compact ? 'scouting-compact' : ''}`} aria-label={`${player.name} playing identity`}>
    <div className="scouting-heading"><span className="eyebrow">PLAYER SIGNATURE</span><h3>How {player.name} plays</h3></div>
    <p className="scouting-rule">Skills shape AI decisions. Every player uses the same hero kit.</p>
    <div className="scouting-strengths">
      {notes.even ? <div><span>Match skills</span><strong>Even profile · {notes.strengths[0].value}/99</strong><p>No pronounced strength among the seven match skills.</p></div>
        : notes.strengths.map(skill => <div key={skill.key}><span>Relative strength</span><strong>{skill.label} <b>{skill.value}/99</b></strong><p>{skill.note}</p></div>)}
    </div>
    {!notes.even && <p className="scouting-development"><strong>Room to develop: {notes.lower.label} · {notes.lower.value}/99.</strong> {notes.lower.note}</p>}
    <div className="scouting-preferences"><strong>Preferred approach</strong><p>{notes.evenStyles ? 'Even playstyle preferences.' : notes.styles.map(([name, value]) => `${name} ${value}/10`).join(' · ')}</p><small>Preferences describe team fit; skill ratings describe execution.</small></div>
    {innate && <div className="scouting-trait"><strong>Player innate · {innate.name}</strong><p>{innateDescription(innate.id)}</p></div>}
    <div className="scouting-heroes"><strong>Best-handled heroes · {player.role}</strong><div>{heroes.map(([id, value]) => { const icon = heroIconFor(id); return <span key={id}>{icon && <img src={`${import.meta.env.BASE_URL}${icon.path}`} alt="" loading="lazy" />}<span>{heroById(id)?.name ?? id}<small>{value}/100 handling</small></span></span>; })}</div><p>Current role and era eligibility. Comfort improves timing and decisions while the hero’s stats stay the same.</p></div>
    <p className="scouting-footnote">Simulated scouting estimates. Strengths are relative to this player’s own base ratings, not the whole league.</p>
  </section>;
}
