import type { BattleConfig, Side } from "./battle";
import { getHeroPool, heroById } from "./heroes";
import type { Hero } from "./heroes";
import { patchById, draftWeight, heroTags } from "./patches";
import { perceivedPatch } from "./patch-knowledge";
import { oppositionStaff } from "./staff";
import { heroRoleProfile } from "./hero-roles";
import { captainsRulesFor, draftSequence } from "./captains-mode";
import type { Campaign } from "./game";

export interface DraftPreparation {
  approach: "balanced"|"teamfight"|"push"|"pickoff"|"scaling";
  preferred: string[][];
  bans: string[];
}
export const defaultDraftPreparation = ():DraftPreparation => ({approach:"balanced",preferred:[[],[],[],[],[]],bans:[]});
export function normalizeDraftPreparation(value:unknown):DraftPreparation {
  const v=value as Partial<DraftPreparation>|null;
  const ids=(a:unknown)=>Array.isArray(a)?[...new Set(a.filter((id):id is string=>typeof id==="string"&&!!heroById(id)))]:[];
  return {approach:["balanced","teamfight","push","pickoff","scaling"].includes(v?.approach??"")?v!.approach!:"balanced",
    preferred:Array.from({length:5},(_,r)=>ids(v?.preferred?.[r]).slice(0,3)),bans:ids(v?.bans).slice(0,6)};
}
export interface DraftAction { side:Side; kind:"pick"|"ban"; heroId:string; phase:number }
export interface MapDraft {
  version:1; patchId?:string; ruleId:string; firstPick:Side; map:number;
  actions:DraftAction[]; picks:[string[],string[]]; bans:string[];
}
export interface CompletedDraft extends MapDraft { heroes:[string[],string[]] }

function random(seed:number){
  let n=seed>>>0;n=Math.imul(n^(n>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);n=(n^(n>>>16))>>>0;
  return()=>{n=(Math.imul(1664525,n)+1013904223)>>>0;return n/4294967296;};
}
const contexts=new WeakMap<BattleConfig,ReturnType<typeof makeContext>>();
function makeContext(config:BattleConfig){
  const patch=patchById(config.patchId);
  const pool=getHeroPool(config.year,patch?Math.min(config.heroPoolThroughYear??patch.year-1,patch.year-1):config.heroPoolThroughYear,patch);
  const views=([0,1] as Side[]).map(side=>patch?perceivedPatch(patch,config.patchObservers?.[side]??{teamKey:config.teams[side],staffIds:oppositionStaff(config.teams[side])}):undefined);
  const roles=new Map(pool.map(h=>[h.id,heroRoleProfile(h.id,patch??{year:config.year,phase:1},h.roles)]));
  return {patch,pool,views,roles};
}
function context(config:BattleConfig){let c=contexts.get(config);if(!c){c=makeContext(config);contexts.set(config,c);}return c;}
export function createMapDraft(config:BattleConfig,map=0):MapDraft {
  return {version:1,patchId:config.patchId,ruleId:captainsRulesFor(context(config).patch).id,
    firstPick:(((config.seed>>>0)+map)%2) as Side,map,actions:[],picks:[[],[]],bans:[]};
}
export function nextDraftStep(config:BattleConfig,state:MapDraft){return draftSequence(context(config).patch,state.firstPick)[state.actions.length];}

/** Exact bipartite completion. First match all already-picked heroes, then
 * augment empty player slots without ever discarding those mandatory picks.
 * This guards bans AND picks against stranding either side's last role. */
export function draftCanFinish(pool:Hero[],picks:[string[],string[]],bans:string[]):boolean {
  const forbidden=new Set(bans),locked=new Map(picks.flatMap((ids,side)=>ids.map(id=>[id,side] as const)));
  if(locked.size!==picks[0].length+picks[1].length||picks.some(p=>p.length>5))return false;
  const heroes=pool.filter(h=>!forbidden.has(h.id));
  const slots=Array<string>(10).fill("");const assigned=new Map<string,number>();
  const legal=(h:Hero,slot:number)=>h.roles.includes(slot%5)&&(!locked.has(h.id)||locked.get(h.id)===Math.floor(slot/5));
  const insert=(id:string,seen:Set<number>):boolean=>{
    const h=heroes.find(h=>h.id===id);if(!h)return false;
    for(let slot=0;slot<10;slot++){
      if(seen.has(slot)||!legal(h,slot))continue;seen.add(slot);
      if(!slots[slot]||insert(slots[slot],seen)){slots[slot]=id;assigned.set(id,slot);return true;}
    }return false;
  };
  for(const ids of picks)for(const id of ids)if(!insert(id,new Set()))return false;
  const fill=(slot:number,seen:Set<string>):boolean=>{
    for(const h of heroes){
      if(seen.has(h.id)||!legal(h,slot))continue;seen.add(h.id);
      const previous=assigned.get(h.id);
      if(previous===undefined||fill(previous,seen)){slots[slot]=h.id;assigned.set(h.id,slot);return true;}
    }return false;
  };
  for(let slot=0;slot<10;slot++)if(!slots[slot]&&!fill(slot,new Set()))return false;
  return true;
}
function roleScore(config:BattleConfig,side:Side,hero:Hero,role:number,usePreferences=true):number{
  const c=context(config);const player=config.players[side][role];
  const fit=c.roles.get(hero.id)!.weights[role];
  const experience=player.heroExperience?.[hero.id]??0;
  const preferences=usePreferences?config.draftPreparations?.[side]?.preferred[role]??[]:[];
  const preferred=preferences.indexOf(hero.id);
  return Math.log(.04+fit)*2+Math.min(3,Math.log1p(experience))+(preferred<0?0:4-preferred);
}
/** Sybil's key structural idea: enumerate all legal assignments (at most 120),
 * rather than greedily giving a flex hero to the first empty player. */
export function assignDraftRoles(config:BattleConfig,side:Side,picks:string[],usePreferences=true):{heroes:string[];score:number}|null{
  const pool=context(config).pool;let best:{heroes:string[];score:number}|null=null;
  const visit=(i:number,heroes:string[],score:number)=>{
    if(i===picks.length){if(!best||score>best.score)best={heroes:[...heroes],score};return;}
    const h=pool.find(h=>h.id===picks[i]);if(!h)return;
    for(const role of h.roles)if(!heroes[role]){heroes[role]=h.id;visit(i+1,heroes,score+roleScore(config,side,h,role,usePreferences));heroes[role]="";}
  };
  visit(0,["","","","",""],0);return best;
}
export function legalDraftChoices(config:BattleConfig,state:MapDraft):Hero[]{
  const step=nextDraftStep(config,state);if(!step)return[];
  const c=context(config),used=new Set([...state.bans,...state.picks.flat()]);
  return c.pool.filter(h=>{
    if(used.has(h.id))return false;
    const picks:[string[],string[]]=[...state.picks.map(p=>[...p])] as [string[],string[]];
    const bans=[...state.bans];
    if(step.kind==="pick")picks[step.side].push(h.id);else bans.push(h.id);
    return draftCanFinish(c.pool,picks,bans);
  });
}
export function takeDraftAction(config:BattleConfig,state:MapDraft,id:string):MapDraft {
  const step=nextDraftStep(config,state);
  if(!step||!legalDraftChoices(config,state).some(h=>h.id===id))throw Error("That hero would leave an illegal draft or is already unavailable.");
  const next=structuredClone(state);next.actions.push({...step,heroId:id});
  if(step.kind==="pick")next.picks[step.side].push(id);else next.bans.push(id);
  return next;
}
function pickScore(config:BattleConfig,state:MapDraft,side:Side,h:Hero,observer:Side=side):number{
  const c=context(config),view=c.views[observer];
  const assigned=assignDraftRoles(config,side,[...state.picks[side],h.id],side===observer);
  if(!assigned)return -100;
  const current=assignDraftRoles(config,side,state.picks[side],side===observer)!;
  const tags=heroTags(h),own=state.picks[side].map(id=>c.pool.find(h=>h.id===id)!),enemy=state.picks[1-side].map(id=>c.pool.find(h=>h.id===id)!);
  const approach=side===observer?config.draftPreparations?.[side]?.approach??"balanced":"balanced";
  let score=4*Math.log(draftWeight(h,view,config.players[side].reduce((n,p)=>n+(p.skills.creativity??50),0)/5))+(assigned.score-current.score)*.8;
  // Bounded composition/counter proxies. These are authored strategic reads,
  // not modern matchup rates silently backdated to an old patch.
  if(h.ability==="stun"&&!own.some(x=>x.ability==="stun"))score+=1.3;
  if(h.ability==="heal"&&!own.some(x=>x.ability==="heal"))score+=.7;
  if(h.ability==="stun")score+=Math.min(1,enemy.filter(x=>heroTags(x).includes("Mobile")).length*.35);
  if(h.ranged)score+=Math.min(.7,enemy.filter(x=>!x.ranged).length*.15);
  if(approach==="push"&&tags.includes("Pushing"))score+=2;
  if(approach==="teamfight"&&["area","heal","stun"].includes(h.ability))score+=1.5;
  if(approach==="pickoff"&&(tags.includes("Mobile")||h.ability==="stun"))score+=1.5;
  if(approach==="scaling"&&tags.includes("Scaling"))score+=1.5;
  return score;
}
export function draftSuggestions(config:BattleConfig,state:MapDraft):{hero:Hero;score:number}[]{
  const step=nextDraftStep(config,state);if(!step)return[];
  return legalDraftChoices(config,state).map(hero=>{
    let score=pickScore(config,state,step.kind==="ban"?(1-step.side) as Side:step.side,hero,step.side);
    if(step.kind==="ban"){
      if(config.draftPreparations?.[step.side]?.bans.includes(hero.id))score+=5;
      if(config.draftPreparations?.[step.side]?.preferred.some(ids=>ids.includes(hero.id)))score-=2;
    }
    return {hero,score};
  }).sort((a,b)=>b.score-a.score||a.hero.id.localeCompare(b.hero.id));
}
export function automaticDraftAction(config:BattleConfig,state:MapDraft):MapDraft{
  const step=nextDraftStep(config,state);if(!step)return state;
  const choices=draftSuggestions(config,state);if(!choices.length)throw Error("No legal draft completion remains.");
  const skill=config.players[step.side].reduce((n,p)=>n+(p.skills.creativity??50),0)/5;
  const temperature=3.8-Math.min(99,Math.max(0,skill))/99*1.3; // Never perfect, even at 99.
  const weights=choices.map(c=>Math.exp(Math.max(-8,(c.score-choices[0].score)/temperature)));
  const rng=random((config.seed^((state.map+1)*1103515245)^((state.actions.length+1)*2654435761))>>>0);
  let roll=rng()*weights.reduce((n,v)=>n+v,0),index=0;
  for(;index<weights.length-1;index++){roll-=weights[index];if(roll<0)break;}
  return takeDraftAction(config,state,choices[index].hero.id);
}
export function completeMapDraft(config:BattleConfig,state:MapDraft):CompletedDraft{
  if(nextDraftStep(config,state))throw Error("Draft is not complete.");
  const heroes=([0,1] as Side[]).map(side=>assignDraftRoles(config,side,state.picks[side])?.heroes) as [string[],string[]];
  if(heroes.some(h=>!h||h.some(id=>!id)))throw Error("Draft has no legal five-player assignment.");
  return {...state,heroes};
}
export function autoDraftMap(config:BattleConfig,map=0):CompletedDraft{
  let state=createMapDraft(config,map);
  while(nextDraftStep(config,state))state=automaticDraftAction(config,state);
  return completeMapDraft(config,state);
}

/** Only actual campaign maps provide familiarity. No invented pro signature
 * pools, no external live data and no bonus to combat or perfect meta access. */
export function campaignDraftExperience(c:Campaign){
  const experience=new Map<string,Record<string,number>>();
  const games=[...c.results.filter(r=>!r.tournamentId).flatMap(r=>r.series?.games??[]),
    ...(c.calendar?.runs??[]).flatMap(r=>r.matches.flatMap(m=>m.series?.games??m.performance?.games??[]))];
  for(const game of games)for(const row of game.players){const known=experience.get(row.id)??{};known[row.heroId]=(known[row.heroId]??0)+1;experience.set(row.id,known);}
  return experience;
}
export function withDraftKnowledge(c:Campaign,config:BattleConfig,managedSide:Side|null=0):BattleConfig{
  const experience=campaignDraftExperience(c);
  return {...config,players:config.players.map(side=>side.map(p=>({...p,heroExperience:experience.get(p.id)??{}}))) as BattleConfig["players"],
    tacticalPreparations:[managedSide===0?c.tacticalPreparation:undefined,managedSide===1?c.tacticalPreparation:undefined],
    draftPreparations:[managedSide===0?normalizeDraftPreparation(c.draftPreparation):undefined,managedSide===1?normalizeDraftPreparation(c.draftPreparation):undefined]};
}
