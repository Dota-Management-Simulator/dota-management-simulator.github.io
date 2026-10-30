import { useId, useState } from 'react';
import type { Campaign, Player } from './game';
import type { BattleConfig, PlayerScore } from './battle';
import { campaignPatch, patchById } from './patches';
import { automaticPlayerFacet, innateDescription, playerFacetsForRole, playerIdentityEra, playerIdentityLock, setPlayerFacet } from './player-identity';
import { effectDescription, innateById, playerInnates } from './player-identity-data';
import './player-identity.css';
import { weeklyPractice } from './contracts';
import { skillDeltas } from './training';
import { effectivePlayerAttributes } from './player-innate-skills';
import { playerSkillLabels } from './player-innates';
import type { PlayerSkill } from './player-innates';

const roleIndex=(p:Player)=>['Carry','Mid','Offlane','Soft support','Hard support'].indexOf(p.role);
export default function PlayerIdentityPanel({campaign,player,onChange,compact=false}:{campaign:Campaign;player:Player;onChange:(c:Campaign)=>void;compact?:boolean}){
  const [query,setQuery]=useState(''),[category,setCategory]=useState('All');
  const searchId=useId(),categoryId=useId();
  const era=playerIdentityEra(campaignPatch(campaign)),identity=player.identity,innate=identity&&innateById.get(identity.innateId);
  const role=roleIndex(player),managed=campaign.roster.includes(player.id),lock=playerIdentityLock(campaign,player.id);
  const selected=identity?.facet??automaticPlayerFacet(role,player.playstyles,player.id);
  const focus=campaign.training[player.id]??'Balanced',practice=weeklyPractice(campaign,player,focus);
  const baseDeltas=skillDeltas(focus,{growth:practice.growth,maintenance:practice.maintenance},player),allDeltas=skillDeltas(focus,practice,player);
  const bound=(n:number)=>Math.max(0,Math.min(100,n));
  const weeklySkills=Object.entries(practice.attributeBonus??{}).map(([key])=>{const k=key as PlayerSkill;return {key:k,bonus:Math.round((Math.min(99,player.stats[k]+allDeltas[k])-Math.min(99,player.stats[k]+baseDeltas[k]))*100)/100};}).filter(e=>e.bonus>0);
  const extraHappiness=Math.round((bound(player.happiness+practice.happiness)-bound(player.happiness+practice.happiness-(practice.innateHappiness??0)))*100)/100;
  const extraEnergy=Math.round((bound(player.energy+practice.energy)-bound(player.energy+practice.energy-(practice.innateEnergy??0)))*100)/100;
  const effective=effectivePlayerAttributes(campaign,player);
  const matches=playerInnates.filter(i=>(category==='All'||i.category===category)&&`${i.name} ${i.category} ${innateDescription(i.id)}`.toLowerCase().includes(query.toLowerCase().trim()));
  const active=new Set(campaign.world?.clubs.filter(t=>t.active!==false).flatMap(t=>[...t.roster,...t.bench])??campaign.roster);
  const counts=new Map<string,number>();
  if(!compact)for(const p of campaign.players)if(active.has(p.id)&&p.identity)counts.set(p.identity.innateId,(counts.get(p.identity.innateId)??0)+1);
  return <section className={`player-identity ${compact?'identity-compact':''}`} aria-label={`${player.name} innate and facets`}>
    <div className="identity-heading"><span className="eyebrow">PLAYER IDENTITY</span><span className="identity-era">{era.innates?'7.36 onward':'Unlocks with 7.36'}</span></div>
    {era.innates&&innate?<><div className="innate-card"><span className="innate-emblem" aria-hidden="true">{innate.category.slice(0,1)}</span><div><small>PERMANENT INNATE · {innate.category}</small><h3>{innate.name}</h3><p>{innateDescription(innate.id)}</p></div></div>
      <p className="identity-note">Assigned once from 100 shared innates. Stays with this player across heroes, transfers and future patches. Simulated gameplay identity.</p>
      {innate.attributes&&<div className="innate-outlook"><strong>Effective player attributes</strong>{Object.keys(innate.attributes).map(key=>{const k=key as PlayerSkill;return <p key={key}>{playerSkillLabels[k]}: {player.stats[k]} base → <b>{effective[k]}</b> with innate</p>;})}<small>Base ratings are retained. Temporary lane and teammate bonuses appear during matches.</small></div>}
      {(weeklySkills.length>0||extraHappiness>0||extraEnergy>0)&&<div className="innate-outlook"><strong>Additional effects this week · {focus}</strong>{weeklySkills.map(e=><p key={e.key}>+{e.bonus} {playerSkillLabels[e.key]} from practice</p>)}{extraHappiness>0&&<p>+{extraHappiness} happiness</p>}{extraEnergy>0&&<p>+{extraEnergy} campaign energy</p>}<small>{practice.innateSources?.join(' · ')}. Settles once when the week is paid; caps are included.</small></div>}
      <h4>Player facets {era.facets?'· choose an approach':'· retired with 7.41'}</h4>
      {era.facets?<><p className="identity-note">Default for future maps. You can override it during each map’s tactics preparation. {identity?.facet==null?'Current default follows the player’s aggression preference.':''}</p>
        {lock&&<p className="patch-lock">Default locked: {lock}</p>}
        <div className="player-facet-choices">{playerFacetsForRole(role).map((facet,index)=><button type="button" key={facet.name} disabled={!managed||!!lock} aria-pressed={selected===index} onClick={()=>onChange(setPlayerFacet(campaign,player.id,index as 0|1))}><strong>{facet.name}</strong><span>{facet.description}</span><small>{effectDescription(facet.effects)}</small>{selected===index&&<b>SELECTED</b>}</button>)}</div>
        {!managed&&<p className="identity-note">Recruit this player to manage their default.</p>}
      </>:<p className="identity-note">Facet choices apply only to the 2024.2–2025.2 composites. The 2026.1 composite ends at 7.41c, so innates continue and facet effects are inactive. Earlier match records retain their selections.</p>}
      {!compact&&<details className="innate-library"><summary>Explore the shared innate pool · 100 innates</summary>
        <div className="innate-filters"><label htmlFor={searchId}>Search innates<input id={searchId} type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, effect or condition"/></label><label htmlFor={categoryId}>Category<select id={categoryId} value={category} onChange={e=>setCategory(e.target.value)}>{['All',...new Set(playerInnates.map(i=>i.category))].map(c=><option key={c}>{c}</option>)}</select></label></div>
        <p className="identity-note" role="status">{matches.length} innates · counts cover active clubs and reserves</p><div className="innate-library-list">{matches.map(i=><article key={i.id} className={i.id===innate.id?'assigned-innate':''}><div><strong>{i.name}</strong><small>{i.category} · {counts.get(i.id)??0} active players{i.id===innate.id?' · THIS PLAYER':''}</small></div><p>{innateDescription(i.id)}</p></article>)}</div>{!matches.length&&<p>No innates match this search.</p>}
      </details>}
    </>:<p className="identity-note">Permanent player innates and temporary player facets arrive with the 2024.2 composite (7.36). Earlier matches use the existing attributes and unlocked talent trees.</p>}
  </section>;
}

export function MatchPlayerFacets({config,onChange}:{config:BattleConfig;onChange:(id:string,choice:0|1)=>void}){
  if(!playerIdentityEra(patchById(config.patchId)).facets)return null;
  return <section className="match-player-facets player-identity" aria-label="Player facets for this map"><h3>Player facets · this map</h3><p className="identity-note">Choose each player’s approach before starting. These choices last for this map and keep their campaign defaults. Manager calls take priority over autonomous movement.</p>
    {config.players[0].map(p=>p.identity?<fieldset key={p.id}><legend>{p.name}</legend><p className="identity-note"><strong>{innateById.get(p.identity.innateId)?.name}</strong> · {innateDescription(p.identity.innateId)}</p><div className="player-facet-choices">{playerFacetsForRole(p.role).map((f,index)=><button type="button" key={f.name} aria-pressed={(p.identity!.facet??0)===index} onClick={()=>onChange(p.id,index as 0|1)}><strong>{f.name}</strong><span>{f.description}</span><small>{effectDescription(f.effects)}</small></button>)}</div></fieldset>:null)}
  </section>;
}

/** Always read the saved match snapshot, including when a player later transfers. */
export function RecordedPlayerIdentity({player,talents=true}:{player:PlayerScore;talents?:boolean}){
  const identity=player.playerIdentity;if(!identity&&!player.heroMastery)return null;
  return <div className="recorded-player-identity">
    {player.heroMastery&&<p className="post-note"><strong>Hero mastery · {player.heroMastery.rating}/100</strong>{player.heroMastery.decisionOnly ? <span>Hero handling: AI timing and decisions. The hero's kit and action outputs are unchanged.</span> : <span>{player.heroMastery.skillBonus > 0 ? '+' : ''}{player.heroMastery.skillBonus} Laning, Teamfights, Skirmish and Farming points under this older map's execution rules.</span>}</p>}
    {identity?.innate&&<p className="post-note"><strong>Player innate · {identity.innate.name}</strong><span>{identity.innate.detail}</span></p>}
    {identity?.facet&&<p className="post-note"><strong>Player facet · {identity.facet.name}</strong><span>{identity.facet.detail}</span></p>}
    {talents&&identity&&<p className="post-note">Player talents: {identity.talents.map(t=>`Lv ${t.level}: ${t.name} (Rank ${t.rank}) · ${t.detail}`).join(' / ')||'None learned'}</p>}
    {!!player.playerSkillModifiers?.length&&<p className="post-note"><strong>Effective skill modifiers at this recorded moment</strong>{player.playerSkillModifiers.map((s,i)=><span key={`${s.sourceId}:${s.skill}:${i}`}>+{s.points} {playerSkillLabels[s.skill]} · {s.source}</span>)}</p>}
  </div>;
}
