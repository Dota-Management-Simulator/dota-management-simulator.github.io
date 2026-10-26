import { useMemo, useState } from 'react';
import raw from './data/patch-changelog.json';
import type { SeasonPatch } from './patches';
import { patchAxes, patchForSeason } from './patches';
import { getHeroPool, heroById } from './heroes';
import { heroIconFor } from './hero-icons';
import { combatCatalogue, heroAbilities } from './combat-model';
import { simplifiedHeroNote } from './patch-notes';
import { patchMechanics, patchMechanicsChanges } from './patch-mechanics';

export interface PublicChange { kind: 'general'|'hero'|'item'; id?: string; subject: string; text: string; category: string; version: string; url: string; abilityId?: string }
const log=raw as unknown as Record<string,PublicChange[]>;
function generalTopic(text:string){
  if(/gold|bounty|experience|\bxp\b|buyback|income|last.hit|creep.*reward|farm/i.test(text))return 'Farming economy';
  if(/movement|cooldown|respawn|cast point|attack speed|channel/i.test(text))return 'Game tempo';
  if(/roshan|tower|ancient|barrack|tormentor|glyph|building/i.test(text))return 'Objectives';
  if(/vision|ward|watcher|fog|invisib|true sight/i.test(text))return 'Vision and information';
  if(/map|rune|outpost|gate|camp|jungle|lotus|tree|river/i.test(text))return 'Map and resources';
  return 'Hero and combat rules';
}
export function publicPatchChanges(patch: SeasonPatch): PublicChange[] {
  if(patch.generated)return [];
  const pool=new Set(getHeroPool(patch.year,patch.year-1,patch).map(h=>h.id));
  return (log[patch.id]??[]).filter(c=>c.kind!=='hero'||pool.has(c.id!));
}
const ruleText: Record<string,[string,string,string]>={
  tempo:['Movement speed increased.','Movement speed reduced.','Movement speed follows the opening rules.'],
  economy:['Gold and experience collection modifiers increased.','Gold and experience collection modifiers reduced.','Gold and experience use the opening collection modifiers.'],
  laning:['Lane skill contributes more to early attack damage.','Lane skill contributes less to early attack damage.','Lane skill contributes to early hero and creep attacks.'],
  teamfight:['Nearby allies add more to spell execution.','Nearby allies add less to spell execution.','Nearby allies influence spell execution.'],
  objectives:['Hero damage against buildings increased.','Hero damage against buildings reduced.','Pushing skill affects damage against buildings.'],
  vision:['Target acquisition range from vision and intuition increased.','Target acquisition range from vision and intuition reduced.','Vision and intuition affect target acquisition range.'],
  splitpush:['Isolated heroes gain more building damage.','Isolated heroes gain less building damage.','Isolated heroes have a separate building-damage modifier.'],
};
export default function PublicPatchLog({patch}:{patch:SeasonPatch}){
  const [tab,setTab]=useState<'general'|'hero'|'item'>('general'),[query,setQuery]=useState(''),[category,setCategory]=useState('All changes');
  const changes=useMemo(()=>publicPatchChanges(patch),[patch]);
  const previous=patch.id==='2011.1'?undefined:patchForSeason(patch.phase===1?patch.year-1:patch.year,patch.phase===1?2:1);
  const catalogue=combatCatalogue(patch);
  const mechanics=patchMechanicsChanges(patch,previous);
  const previousRules=combatCatalogue(previous)?.rules,rules=catalogue?.rules;
  const economyNotes: string[]=[];
  if(rules&&previousRules){
    if(rules.passiveGoldPerMinute!==previousRules.passiveGoldPerMinute)economyNotes.push(`Base passive gold income ${rules.passiveGoldPerMinute>previousRules.passiveGoldPerMinute?'increased':'reduced'}.`);
    if(rules.bountyMultiplier!==previousRules.bountyMultiplier)economyNotes.push(`Gold bounties from kills, lane creeps, neutrals and buildings ${rules.bountyMultiplier>previousRules.bountyMultiplier?'increased':'reduced'}.`);
    if(rules.creepBase!==previousRules.creepBase)economyNotes.push(`Base lane-creep gold bounties ${rules.creepBase>previousRules.creepBase?'increased':'reduced'}.`);
    if(rules.meleeGrowth+rules.rangedGrowth!==previousRules.meleeGrowth+previousRules.rangedGrowth)economyNotes.push(`Lane-creep gold grows ${rules.meleeGrowth+rules.rangedGrowth>previousRules.meleeGrowth+previousRules.rangedGrowth?'faster':'more slowly'} as the match progresses.`);
    if(rules.neutralGrowth!==previousRules.neutralGrowth)economyNotes.push('Neutral camps gain gold bounty as the match progresses.');
    if(rules.assistNetWorth!==previousRules.assistNetWorth)economyNotes.push('Assist gold now depends on the victim’s net worth and the number of involved heroes.');
  }
  const matching=changes.filter(c=>c.kind===tab&&(category==='All changes'||c.category===category)&&`${c.id?heroById(c.id)?.name??'':''} ${c.subject} ${c.text} ${c.version}`.toLowerCase().includes(query.toLowerCase()));
  const groupKey=(c:PublicChange)=>tab==='hero'?c.id!:tab==='item'?c.subject:generalTopic(c.text);
  const groups=[...new Set(matching.map(groupKey))].sort((a,b)=>(heroById(a)?.name??a).localeCompare(heroById(b)?.name??b));
  const count=(kind:PublicChange['kind'])=>kind==='hero'?new Set(changes.filter(c=>c.kind===kind).map(c=>c.id)).size:kind==='item'?new Set(changes.filter(c=>c.kind===kind).map(c=>c.subject)).size:changes.filter(c=>c.kind===kind).length;
  return <section className="public-patch-log" aria-label="Public patch changelog"><div className="eyebrow">PUBLIC NOTES · AVAILABLE TO EVERY CLUB</div><h3>What changed</h3>
    <p>Rule changes are public. Their effect on winning drafts and strategies must be worked out through play or staff research. Historical notes are grouped into this season’s composite.</p>
    <div className="patch-log-tabs" role="group" aria-label="Changelog category">{(['general','hero','item'] as const).map(kind=><button className="button secondary" key={kind} aria-pressed={tab===kind} onClick={()=>setTab(kind)}>{kind==='general'?'General rules':kind==='hero'?'Heroes':'Items'} <small>{count(kind)}</small></button>)}</div>
    {tab==='general'&&<div className="patch-public-rules"><h4>Changes applied by the simulator</h4><ul>{patchAxes.filter(a=>!previous||previous.axes[a.key]!==patch.axes[a.key]).map(axis=><li key={axis.key}><strong>{axis.name}: </strong>{ruleText[axis.key][previous?(patch.axes[axis.key]>previous.axes[axis.key]?0:1):2]}{axis.key==='tempo'&&' Named spell cooldowns come from the spell catalogue.'}</li>)}</ul><p>These seven rules are authored for the simplified simulation. Historical changes below are a separate record; individual rules beyond the supported combat model remain source notes.</p></div>}
    {tab==='general'&&<div className="patch-public-rules"><h4>Combat and siege rules applied</h4>{mechanics.length?<ul>{mechanics.map(row=><li key={row.id}><strong>{row.name}: </strong>{row.value}</li>)}</ul>:<p>Backdoor, Glyph, siege, denies, buyback and resource formulas carry forward from the previous composite.</p>}<details><summary>All current match rules</summary><ul>{patchMechanics(patch).map(row=><li key={row.id}><strong>{row.name}: </strong>{row.value}</li>)}</ul></details><p>Values describe the simulator’s scaled rules. Historical updates within a season arrive together; future seasons inherit the last verified mechanics. Hero and item values follow their recovered catalogue.</p></div>}
    {tab==='general'&&economyNotes.length>0&&<div className="patch-public-rules"><h4>Specific economy rules applied</h4><ul>{economyNotes.map(note=><li key={note}>{note}</li>)}</ul><p>{rules?.sources.filter(s=>!previousRules?.sources.some(old=>old.url===s.url)).map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer">Valve {s.version} ↗ </a>)}</p></div>}
    <div className="patch-log-filters"><label>Search changes<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Hero, spell, item or rule…"/></label><label>Change type<select value={category} onChange={e=>setCategory(e.target.value)}>{['All changes','Balance','Cooldown','Rework / rules','Scepter','Shard','Talent'].map(c=><option key={c}>{c}</option>)}</select></label></div>
    <p className="patch-log-count">{matching.length} notes · {tab==='hero'?`${groups.length} changed ${groups.length===1?'hero':'heroes'}`:tab==='item'?`${groups.length} changed ${groups.length===1?'item':'items'}`:'historical general rules'}</p>
    {!matching.length&&<p>{query||category!=='All changes'?'No changes match these filters.':'No source changes recovered for this category in this composite. This is an evidence gap, not a claim that nothing changed.'}</p>}
    <div className="patch-log-entries">{groups.map(key=>{
      const rows=matching.filter(c=>groupKey(c)===key),hero=tab==='hero'?heroById(key):undefined,icon=hero&&heroIconFor(hero.id);
      return <details key={key} open={query.length>1||undefined}><summary>{icon&&<img src={`${import.meta.env.BASE_URL}${icon.path}`} alt="" loading="lazy"/>}<strong>{hero?.name??key}</strong><small>{rows.length} changes</small></summary><ul>{rows.map((row,i)=><li key={i}><span className="patch-log-kind">{row.category}</span><strong>{row.subject} · </strong>{simplifiedHeroNote(row.text)} <a href={row.url} target="_blank" rel="noreferrer" aria-label={`${hero?.name??row.subject} ${row.version} source`}>{row.version} ↗</a></li>)}</ul>
        {hero&&<p className="patch-kit-line">Current kit: {heroAbilities(hero.id,patch).filter(a=>!a.hidden||a.granted).map(a=>a.name+(a.granted?` (${a.granted})`:'')).join(' · ')}</p>}
      </details>;
    })}</div>
    {catalogue&&<details className="patch-log-coverage"><summary>Simulation coverage and historical precision</summary><p>Spell catalogue: <a href={catalogue.source.url} target="_blank" rel="noreferrer">Valve game files · {catalogue.source.date} ↗</a>. {catalogue.source.provisional?'This is a later reference for this early era; its cooldowns and kit are provisional.':'These files supply the composite’s ability set, rank cooldowns, mana costs, hero attributes and shop stats.'}</p><p>Damage, healing, disables, slows, shields, mobility and controlled-unit pressure use simplified effects. Exact summons, illusions, channels, steals, transformations, talent interactions and individual upgrade reworks are not fully reproduced. The log records those historical changes without claiming full engine parity.</p></details>}
    {patch.id==='2011.1'&&<details><summary>Opening hero kits · {getHeroPool(patch.year).length} heroes</summary><ul>{getHeroPool(patch.year).map(h=><li key={h.id}><strong>{h.name}: </strong>{heroAbilities(h.id,patch).filter(a=>!a.hidden).map(a=>a.name).join(' · ')}</li>)}</ul></details>}
  </section>;
}
