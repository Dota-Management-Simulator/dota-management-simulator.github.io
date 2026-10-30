import type { Campaign, Player } from './game';
import type { SeasonPatch } from './patches';
import { campaignPatch } from './patches';
import { playerTournamentLock } from './tournament-locks';
import type { TalentLevel, TalentPlan } from './talents';
import { conditionLabels, effectDescription, innateById, playerInnates, sharedPlayerTalents, sharedTalentById } from './player-identity-data';
import type { IdentityCondition, IdentityEffect, TalentEffect } from './player-identity-data';
import { legacyInnateById } from './legacy-player-innates';
import { skillInnateDescription } from './player-innate-skills';

export interface PlayerTalentChoice { id:string; rank:1|2 }
export interface PlayerTalentTier { level:TalentLevel; choices:[PlayerTalentChoice,PlayerTalentChoice] }
export interface PlayerIdentity { version:1; innateRules?:2; innateId:string; tree:PlayerTalentTier[]; facet?:0|1 }
export const identityHash=(text:string)=>{let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
const levels:TalentLevel[]=[10,15,20,25];
const roleNumber=(role:string)=>['Carry','Mid','Offlane','Soft support','Hard support'].indexOf(role);
/** The final representative version governs each composite, also in pinned events.
 * 2026.1 spans removal and resolves to 7.41c: facets are already retired there. */
export function playerIdentityEra(patch?:Pick<SeasonPatch,'year'|'phase'>) {
  const cycle=patch?patch.year*10+patch.phase:0;
  return {innates:cycle>=20242,facets:cycle>=20242&&cycle<20261};
}
const legacyIds=[['striking','resilience'],['resourceful','spellcraft'],['fleet','siege'],['finisher','unbreakable']];
export function makePlayerTree(id:string,innateId:string,legacyPlan?:TalentPlan):PlayerTalentTier[] {
  const category=innateById.get(innateId)?.category;
  const used=new Set<string>();
  return levels.map((level,tier)=>{
    if(legacyPlan?.[level]!=null){legacyIds[tier].forEach(id=>used.add(id));return {level,choices:legacyIds[tier].map(id=>({id,rank:1})) as [PlayerTalentChoice,PlayerTalentChoice]};}
    const options=sharedPlayerTalents.filter(t=>!used.has(t.id)).sort((a,b)=>identityHash(`${id}:${level}:${a.id}`)-identityHash(`${id}:${level}:${b.id}`));
    // One speciality choice, one alternative. Shared talents have the same
    // numerical effect at the same rank for every player.
    const first=options.find(t=>t.category===category)??options[0];used.add(first.id);
    const second=options.find(t=>!used.has(t.id))!;used.add(second.id);
    return {level,choices:[first,second].map(t=>({id:t.id,rank:t.category===category?2:1})) as [PlayerTalentChoice,PlayerTalentChoice]};
  });
}
function validTree(value:unknown):value is PlayerTalentTier[] {
  return Array.isArray(value)&&value.length===4&&value.every((t,i)=>t&&t.level===levels[i]&&Array.isArray(t.choices)&&t.choices.length===2
    &&t.choices[0]?.id!==t.choices[1]?.id&&t.choices.every((c:PlayerTalentChoice)=>c&&sharedTalentById.has(c.id)&&(c.rank===1||c.rank===2)));
}
export function normalizePlayerIdentity(value:unknown,id:string,legacyPlan?:TalentPlan):PlayerIdentity|undefined {
  if(!value||typeof value!=='object'||Array.isArray(value))return;
  const v=value as Partial<PlayerIdentity>;
  if(v.version!==1||typeof v.innateId!=='string'||!innateById.has(v.innateId))return;
  return {version:1,innateRules:2,innateId:v.innateId,tree:validTree(v.tree)?v.tree.map(t=>({level:t.level,choices:t.choices.map(c=>({id:c.id,rank:c.rank})) as [PlayerTalentChoice,PlayerTalentChoice]})):makePlayerTree(id,v.innateId,legacyPlan),
    ...(v.facet===0||v.facet===1?{facet:v.facet}:{})};
}
/** Assign only missing records. Global counts are kept within one when starting
 * fresh; active-club diversity wins over lifetime counts on later imports. */
export function ensurePlayerIdentities(players:Player[],activeIds?:Set<string>,plans?:Record<string,TalentPlan>) {
  const total=new Map<string,number>(),active=new Map<string,number>();
  const increment=(map:Map<string,number>,id:string)=>map.set(id,(map.get(id)??0)+1);
  for(const p of players){
    p.identity=normalizePlayerIdentity(p.identity,p.id,plans?.[p.id]);
    if(p.identity){increment(total,p.identity.innateId);if(!activeIds||activeIds.has(p.id))increment(active,p.identity.innateId);}
  }
  const pending=players.filter(p=>!p.identity).sort((a,b)=>Number(activeIds?.has(b.id)??true)-Number(activeIds?.has(a.id)??true)||a.id.localeCompare(b.id));
  for(const p of pending){
    const role=roleNumber(p.role),isActive=!activeIds||activeIds.has(p.id);
    const innate=[...playerInnates].sort((a,b)=>(isActive?(active.get(a.id)??0)-(active.get(b.id)??0):0)
      ||(total.get(a.id)??0)-(total.get(b.id)??0)||Number(b.roles.includes(role))-Number(a.roles.includes(role))
      ||identityHash(`${p.id}:${a.id}`)-identityHash(`${p.id}:${b.id}`))[0];
    p.identity={version:1,innateRules:2,innateId:innate.id,tree:makePlayerTree(p.id,innate.id,plans?.[p.id])};
    increment(total,innate.id);if(isActive)increment(active,innate.id);
  }
}
/** Synthetic opponents use the same pool without rewriting campaign records. */
export function fallbackPlayerIdentity(id:string):PlayerIdentity {
  const innate=playerInnates[identityHash(id)%playerInnates.length];
  return {version:1,innateRules:2,innateId:innate.id,tree:makePlayerTree(id,innate.id),facet:(identityHash(`${id}:facet`)%2) as 0|1};
}
export function innateDescription(innateId:string,rules:1|2=2) {
  if(rules===2)return skillInnateDescription(innateId);
  const innate=legacyInnateById.get(innateId);
  return innate?`${conditionLabels[innate.condition]}: ${effectDescription(innate.effects)}.`:'Unknown innate';
}
export function playerTalentDetail(choice:PlayerTalentChoice) {
  const talent=sharedTalentById.get(choice.id);
  const labels:Record<TalentEffect,string>={attack:'attack damage',health:'maximum health',resources:'earned gold and experience',spells:'spell damage and healing',speed:'movement speed',buildings:'building damage'};
  return talent?Object.entries(talent.effects).map(([key,n])=>`+${Math.round(n*1000*(choice.rank===2?1.25:1))/10}% ${labels[key as TalentEffect]}`).join(' · '):'Unknown talent';
}
export function playerTreeBonuses(identity:PlayerIdentity,plan:TalentPlan|undefined,level:number) {
  const out={attack:1,health:1,resources:1,spells:1,speed:1,buildings:1};
  for(const tier of identity.tree){
    const branch=plan?.[tier.level];if(level<tier.level||(branch!==0&&branch!==1))continue;
    const choice=tier.choices[branch],talent=sharedTalentById.get(choice.id);if(!talent)continue;
    for(const [key,n] of Object.entries(talent.effects))out[key as TalentEffect]*=1+n*(choice.rank===2?1.25:1);
  }
  return out;
}
export interface PlayerFacet {name:string;description:string;effects:Partial<Record<IdentityEffect,number>>}
const facets:[PlayerFacet,PlayerFacet][]=[
  [{name:'Resource priority',description:'Longer neutral-farm windows and less hero pursuit.',effects:{farmWindow:30,engage:-16}}, {name:'Active carry',description:'Shorter farming windows, earlier nearby hero pursuit.',effects:{farmWindow:-30,engage:16}}],
  [{name:'Lane controller',description:'Secure waves and denies; pursue heroes less far.',effects:{creeps:.06,deny:.05,engage:-12}}, {name:'Map mover',description:'Rotate faster and pursue nearby heroes; clear lane creeps more slowly.',effects:{speed:.04,engage:14,creeps:-.06}}],
  [{name:'Pressure anchor',description:'Commit more damage to structures; pursue heroes less far.',effects:{buildings:.07,engage:-12}}, {name:'Fight starter',description:'Pursue hero openings earlier at a cost to structure damage.',effects:{engage:18,buildings:-.07}}],
  [{name:'Bodyguard',description:'Stay near the carry when idle; give up distant pursuit.',effects:{engage:-14}}, {name:'Playmaker',description:'Move toward visible nearby fights when idle; clear creeps more slowly.',effects:{engage:18,creeps:-.06}}],
  [{name:'Core escort',description:'Stay near the carry when idle; give up distant pursuit.',effects:{engage:-16}}, {name:'Forward support',description:'Move toward visible nearby fights when idle; retreat at lower health.',effects:{engage:16,retreat:-.02}}],
];
export const playerFacetsForRole=(role:number)=>facets[Math.max(0,Math.min(4,role))]??facets[4];
export function automaticPlayerFacet(role:number,styles?:Player['playstyles'],id='') :0|1 {
  const aggression=Object.entries(styles??{}).find(([k])=>k.toLowerCase().includes('aggress'))?.[1];
  return aggression!=null?aggression>=6?1:0:(identityHash(`${id}:${role}:facet`)%2) as 0|1;
}
export function battlePlayerIdentity(p:Pick<Player,'id'|'identity'|'playstyles'>,role:number):PlayerIdentity {
  const identity=normalizePlayerIdentity(p.identity,p.id)??fallbackPlayerIdentity(p.id);
  return {...identity,facet:identity.facet??automaticPlayerFacet(role,p.playstyles,p.id)};
}
export function playerIdentityLock(c:Campaign,id:string) {
  return playerTournamentLock(c,id)??(c.scrims?.sessions.some(s=>s.status==='scheduled'&&s.config?.players.flat().some(p=>p.id===id))?'Finish or cancel the prepared scrim before changing this player.':null);
}
export function setPlayerFacet(c:Campaign,id:string,choice:0|1):Campaign {
  if(!playerIdentityEra(campaignPatch(c)).facets||playerIdentityLock(c,id)||!c.roster.includes(id)||(choice!==0&&choice!==1))return c;
  const player=c.players.find(p=>p.id===id);if(!player?.identity)return c;
  return {...c,players:c.players.map(p=>p.id===id?{...p,identity:{...player.identity!,facet:choice}}:p)};
}
export interface IdentityContext {clock:number;health:number;mana:number;allies:number;sinceDamage:number;deaths:number;kills:number;moving:boolean;defending:boolean;siege:boolean;energy:number}
export function innateConditionActive(condition:IdentityCondition,c:IdentityContext) {
  switch(condition){
    case 'always':return true;case 'lane':return c.clock<600;case 'midgame':return c.clock>=600&&c.clock<1800;case 'late':return c.clock>=1800;
    case 'alone':return c.allies===0;case 'paired':return c.allies===1;case 'grouped':return c.allies>=2;
    case 'hurt':return c.health<.4;case 'healthy':return c.health>.8;case 'low-mana':return c.mana<.35;case 'rested':return c.sinceDamage>=12;
    case 'recovering':return c.deaths>=2;case 'behind':return c.deaths>c.kills;case 'ahead':return c.kills>=c.deaths+2;
    case 'day':return Math.floor(c.clock/300)%2===0;case 'night':return Math.floor(c.clock/300)%2===1;
    case 'moving':return c.moving;case 'defending':return c.defending;case 'siege':return c.siege;case 'tired':return c.energy<60;
  }
}
export const emptyIdentityEffects=()=>({creeps:1,heroes:1,spells:1,buildings:1,speed:1,sight:1,farmGold:1,farmSpeed:1,xp:1,hpRegen:1,manaRegen:1,manaCost:1,incoming:1,deny:1,retreat:0,engage:0,farmWindow:0});
export type IdentityBonuses=ReturnType<typeof emptyIdentityEffects>;
export function identityEffects(identity:PlayerIdentity|undefined,role:number,patch:Pick<SeasonPatch,'year'|'phase'>|undefined,context:IdentityContext):IdentityBonuses {
  const result=emptyIdentityEffects(),era=playerIdentityEra(patch);
  if(!identity||!era.innates)return result;
  const apply=(effects:Partial<Record<IdentityEffect,number>>)=>{
    for(const [key,n] of Object.entries(effects) as [IdentityEffect,number][]){
      if(key==='retreat'||key==='engage'||key==='farmWindow')result[key]+=n;else result[key]*=1+n;
    }
  };
  // Frozen v1 preparations retain their original rules. New campaign maps use
  // v2 skill/club effects; this path supplies only their temporary facets.
  const innate=identity.innateRules===2?undefined:legacyInnateById.get(identity.innateId);
  if(innate&&innateConditionActive(innate.condition,context))apply(innate.effects);
  if(era.facets&&identity.facet!=null)apply(playerFacetsForRole(role)[identity.facet].effects);
  return result;
}
/** Archive the resolved labels/effects at settlement; never infer from a newer player. */
export interface PlayerIdentitySnapshot { innate?:{id:string;name:string;detail:string}; facet?:{name:string;detail:string}; talents:{level:number;name:string;rank:number;detail:string}[] }
export function playerIdentitySnapshot(identity:PlayerIdentity,role:number,patch:Pick<SeasonPatch,'year'|'phase'>|undefined,plan:TalentPlan|undefined,level:number):PlayerIdentitySnapshot {
  const era=playerIdentityEra(patch),innate=(identity.innateRules===2?innateById:legacyInnateById).get(identity.innateId),facet=era.facets&&identity.facet!=null?playerFacetsForRole(role)[identity.facet]:undefined;
  return {...(era.innates&&innate?{innate:{id:innate.id,name:innate.name,detail:innateDescription(innate.id,identity.innateRules??1)}}:{}),
    ...(facet?{facet:{name:facet.name,detail:`${facet.description} ${effectDescription(facet.effects)}`}}:{}),
    talents:!patch||patch.year<2017?[]:identity.tree.flatMap(t=>{
      const branch=plan?.[t.level];if(t.level>level||(branch!==0&&branch!==1))return [];
      const choice=t.choices[branch];return [{level:t.level,name:sharedTalentById.get(choice.id)!.name,rank:choice.rank,detail:playerTalentDetail(choice)}];
    })};
}
