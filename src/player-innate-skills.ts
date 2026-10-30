import type { Campaign, Player, Training } from './game';
import type { SeasonPatch } from './patches';
import { campaignPatch } from './patches';
import type { PlayerIdentity, IdentityContext } from './player-identity';
import { innateConditionActive, normalizePlayerIdentity, playerIdentityEra } from './player-identity';
import { innateById, playerSkillLabels } from './player-innates';
import type { PlayerSkill, SkillBonus, InnateWeeklyRule } from './player-innates';
import { conditionLabels } from './legacy-player-innates';
import { roundTraining, trainingPlan, trainingSchedule } from './training';

const bound=(n:number)=>Math.max(0,Math.min(99,n));
const statText=(stats:SkillBonus,percent=false)=>Object.entries(stats).map(([key,n])=>`+${percent?Math.round(n*100):n}${percent?'% focused growth':' points'} ${playerSkillLabels[key as PlayerSkill]}`).join(' · ');
const whenText={always:'each paid week',rest:'during a Rest week',training:'during a training week',tired:'when campaign energy is below 60', 'low-morale':'when happiness is below 60'};
export function skillInnateDescription(id:string):string {
  const innate=innateById.get(id);if(!innate)return 'Unknown innate';
  if(innate.attributes)return `Player attribute bonus: ${statText(innate.attributes)}. Included in effective attributes; base ratings stay unchanged.`;
  if(innate.match){const rule=innate.match,target=rule.target==='self'?'This player':rule.target==='lane-partners'?'Living lane partners within 240 map units, before 10:00':'Other living teammates within 240 map units';
    return `${target}: ${statText(rule.stats)}. ${conditionLabels[rule.condition]}. Bonuses from all innates cap at +10 per skill; effective ratings cap at 99.`;}
  const rule=innate.weekly!;
  if(rule.kind==='training')return `${rule.target==='self'?'This player':'Other players in the same active club'}: ${statText(rule.stats!,true)} in the listed attributes. Requires actual practice on that focus; mentors must also practice at least 10h. Combined innate training bonuses cap at +25%.`;
  return `${rule.target==='self'?'This player':'Other players in the same active club'}: +${rule.amount} ${rule.kind==='morale'?'happiness':'campaign energy'} ${whenText[rule.when??'always']}. Applied once per paid week; combined innate bonuses cap at +3 happiness / +4 energy.`;
}
export function innateAttributeStats(identity:PlayerIdentity|undefined,patch:Pick<SeasonPatch,'year'|'phase'>|undefined,stats:Record<string,number>) {
  if(identity?.innateRules!==2||!playerIdentityEra(patch).innates)return stats;
  const bonuses=innateById.get(identity.innateId)?.attributes;if(!bonuses)return stats;
  const result={...stats};for(const [key,n] of Object.entries(bonuses))result[key]=bound((stats[key]??50)+n);return result;
}
export function effectivePlayerAttributes(c:Campaign,p:Player):Player['stats'] {
  return innateAttributeStats(normalizePlayerIdentity(p.identity,p.id),campaignPatch(c),p.stats) as Player['stats'];
}

export interface SkillParticipant {id:string;name:string;team:number;lane:number;x:number;y:number;alive:boolean;identity?:PlayerIdentity;stats:Record<string,number>;context:IdentityContext}
export interface SkillContribution {skill:PlayerSkill;points:number;source:string;sourceId:string}
export function matchSkillContributions(receiver:SkillParticipant,players:SkillParticipant[],patch?:Pick<SeasonPatch,'year'|'phase'>):SkillContribution[] {
  if(!playerIdentityEra(patch).innates||!receiver.alive)return [];
  const result:SkillContribution[]=[],total:SkillBonus={};
  for(const source of players){
    if(!source.alive||source.team!==receiver.team||source.identity?.innateRules!==2)continue;
    const innate=innateById.get(source.identity.innateId);if(!innate)continue;
    let stats=source.id===receiver.id?innate.attributes:undefined;
    const rule=innate.match;
    if(rule&&innateConditionActive(rule.condition,source.context)){
      const near=Math.hypot(source.x-receiver.x,source.y-receiver.y)<=240;
      if(rule.target==='self'?source.id===receiver.id:source.id!==receiver.id&&near&&(rule.target!=='lane-partners'||receiver.context.clock<600&&source.lane===receiver.lane))stats=rule.stats;
    }
    if(!stats)continue;
    for(const [key,n] of Object.entries(stats) as [PlayerSkill,number][]){
      const applied=Math.max(0,Math.min(n,10-(total[key]??0),99-(receiver.stats[key]??50)-(total[key]??0)));
      if(applied){total[key]=(total[key]??0)+applied;result.push({skill:key,points:applied,source:`${source.name} · ${innate.name}`,sourceId:source.id});}
    }
  }
  return result;
}

function clubMembers(c:Campaign,p:Player):Player[] {
  const club=c.world?.clubs.find(t=>t.active!==false&&(t.roster.includes(p.id)||t.bench.includes(p.id)));
  const ids=c.roster.includes(p.id)?[...c.roster,...club?.bench??[]]:club?[...club.roster,...club.bench]:[p.id];
  const membership=new Set(ids);return c.players.filter(member=>membership.has(member.id));
}
function weeklyCondition(rule:InnateWeeklyRule,p:Player,focus:Training) {
  switch(rule.when??'always'){
    case 'always':return true;case 'rest':return focus==='Rest';case 'training':return focus!=='Rest';case 'tired':return p.energy<60;case 'low-morale':return p.happiness<60;
  }
}
export interface InnatePracticeBonus {attributeBonus:SkillBonus;innateHappiness:number;innateEnergy:number;innateSources:string[]}
export function weeklyInnateBonuses(c:Campaign,p:Player,focus:Training,growth:number):InnatePracticeBonus {
  const result:InnatePracticeBonus={attributeBonus:{},innateHappiness:0,innateEnergy:0,innateSources:[]};
  if(!playerIdentityEra(campaignPatch(c)).innates)return result;
  const rates:SkillBonus={};const focused=trainingPlan(focus).stats;
  for(const source of clubMembers(c,p)){
    // Campaign traits adopt the current rules even before the next save/load;
    // only frozen match configurations retain the old rule marker.
    if(!source.identity)continue;
    const innate=innateById.get(source.identity.innateId),rule=innate?.weekly;if(!rule)continue;
    if(rule.target==='self'?source.id!==p.id:source.id===p.id)continue;
    if(!weeklyCondition(rule,p,focus))continue;
    let applied=false;
    if(rule.kind==='training'){
      const sourceFocus=source.id===p.id?focus:c.training[source.id]??'Balanced';
      const schedule=trainingSchedule(c,source),hours=schedule.hoursPerDay*schedule.daysPerWeek;
      if(focus==='Rest'||growth<=0||sourceFocus==='Rest'||source.id!==p.id&&hours<10)continue;
      for(const [key,rate] of Object.entries(rule.stats!) as [PlayerSkill,number][]){
        if(!focused.includes(key))continue;
        const increment=Math.max(0,Math.min(rate,.25-(rates[key]??0)));
        if(increment){rates[key]=(rates[key]??0)+increment;applied=true;}
      }
    }else if(rule.kind==='morale'){
      const increment=Math.max(0,Math.min(rule.amount??0,3-result.innateHappiness));
      if(increment&&c.cash>=0){result.innateHappiness+=increment;applied=true;}
    }else{
      const increment=Math.max(0,Math.min(rule.amount??0,4-result.innateEnergy));
      if(increment){result.innateEnergy+=increment;applied=true;}
    }
    if(applied)result.innateSources.push(`${source.name} · ${innate!.name}`);
  }
  for(const [key,rate] of Object.entries(rates) as [PlayerSkill,number][])result.attributeBonus[key]=roundTraining(growth/(focus==='Balanced'?6:1)*rate);
  return result;
}
