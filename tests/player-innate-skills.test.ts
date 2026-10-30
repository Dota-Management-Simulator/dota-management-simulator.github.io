import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advanceCalendarTo,advanceWeek,buildBattleConfig,createCampaign,decodeSave,DEFAULT_SETTINGS,events} from '../src/game';
import {enableHistoricalCalendar} from '../src/historical-game';
import {weeklyPractice,contractPreferences} from '../src/contracts';
import {applyPlayerPractice,developWorldPlayers} from '../src/development';
import {skillDeltas} from '../src/training';
import {campAttendance,campPractice} from '../src/bootcamp';
import {patchForSeason} from '../src/patches';
import {LaneBattle} from '../src/battle';
import type {BattleConfig} from '../src/battle';
import {makePlayerTree,identityEffects,normalizePlayerIdentity,playerIdentitySnapshot} from '../src/player-identity';
import type {IdentityContext,PlayerIdentity} from '../src/player-identity';
import {effectivePlayerAttributes,matchSkillContributions,skillInnateDescription} from '../src/player-innate-skills';
import type {SkillParticipant} from '../src/player-innate-skills';
import {playerInnates} from '../src/player-innates';

const patch=patchForSeason(2024,2);
const id=(innateId:string):PlayerIdentity=>({version:1,innateRules:2,innateId,tree:makePlayerTree('skills-test',innateId)});
const context:IdentityContext={clock:100,health:1,mana:1,allies:1,sinceDamage:20,deaths:0,kills:0,moving:false,defending:false,siege:false,energy:80};
const stats=()=>Object.fromEntries('creativity stability confidence stamina heroPool laning teamfights farming skirmish vision intuition pushing'.split(' ').map(k=>[k,50]));
function person(name:string,innate?:string):SkillParticipant{return {id:name,name,team:0,lane:2,x:400,y:400,alive:true,identity:innate?id(innate):undefined,stats:stats(),context:{...context}};}
function campaign(){
  const c=createCampaign({...DEFAULT_SETTINGS,year:2024});c.week=9;c.cash=150000;
  for(const p of c.players)p.identity=id('last-hit-rhythm');
  const own=c.roster.map(pid=>c.players.find(p=>p.id===pid)!);for(const p of own){p.energy=80;p.happiness=50;}
  return {c,p:own[0],mentor:own[4],own};
}
function battle(innate?:string){
  const config:BattleConfig={seed:51241,year:2024,patchId:patch.id,captureReplay:false,captureTimeline:false,teams:['A','B'],bonuses:[0,0],
    players:[0,1].map(side=>Array.from({length:5},(_,role)=>({id:`${side}:${role}`,name:`${side}:${role}`,role,skills:stats(),energy:80,happiness:80,...(side===0&&role===0&&innate?{identity:id(innate)}:{})}))) as BattleConfig['players']};
  const b=new LaneBattle(config),heroes=b.units.filter(u=>u.player),u=heroes[0],v=heroes[5];
  heroes.forEach((h,i)=>{h.x=-1500-i*100;h.y=-1500;h.spells=[];h.inventory=[];h.tpCharges=0;});
  u.x=400;u.y=400;v.x=401;v.y=400;v.hp=10000;v.max=10000;v.agility=0;
  type Unit=typeof u;
  const engine=b as unknown as {skill:(u:Unit,key:string)=>number;attack:(u:Unit,v:Unit)=>void;damage:(u:Unit,v:Unit,n:number)=>void;regeneration:(u:Unit)=>{hp:number;mana:number};skillCache:Map<number,unknown>};
  return {b,u,v,heroes,engine};
}

test('v2 innates have no direct hero-stat effects and describe skill, training or welfare rules',()=>{
  assert.equal(playerInnates.length,100);
  assert.ok(playerInnates.filter(i=>i.weekly).length>=25);
  assert.ok(playerInnates.filter(i=>i.match&&i.match.target!=='self').length>=20);
  for(const innate of playerInnates){
    const effects=identityEffects(id(innate.id),0,patch,context);
    assert.equal(effects.hpRegen,1);assert.equal(effects.manaRegen,1);assert.equal(effects.heroes,1);assert.equal(effects.spells,1);
    assert.equal(effects.speed,1);assert.equal(effects.xp,1);assert.equal(effects.farmGold,1);
    assert.doesNotMatch(skillInnateDescription(innate.id),/HP regeneration|mana regeneration|spell mana cost|maximum health/);
  }
});

test('lane-partner skill bonuses require a living nearby same-lane teammate and expire at 10:00',()=>{
  const source=person('Mentor','wave-reader'),target=person('Carry');
  assert.equal(matchSkillContributions(target,[source,target],patch)[0].points,4);
  assert.equal(matchSkillContributions(source,[source,target],patch).length,0,'does not buff its owner');
  target.lane=1;assert.equal(matchSkillContributions(target,[source,target],patch).length,0);target.lane=2;
  target.x=641;assert.equal(matchSkillContributions(target,[source,target],patch).length,0);target.x=400;
  source.alive=false;assert.equal(matchSkillContributions(target,[source,target],patch).length,0);source.alive=true;
  target.team=1;assert.equal(matchSkillContributions(target,[source,target],patch).length,0);target.team=0;
  source.context.clock=600;target.context.clock=600;assert.equal(matchSkillContributions(target,[source,target],patch).length,0);
  source.context.clock=599;target.context.clock=599;assert.equal(matchSkillContributions(target,[source,target],patchForSeason(2024,1)).length,0);
});

test('nearby team skill buffs are bounded per skill and never raise effective attributes past 99',()=>{
  const target=person('Target'),sources=Array.from({length:4},(_,i)=>person(`Captain ${i}`,'formation-player'));
  for(const source of sources)source.context.allies=3;
  const points=matchSkillContributions(target,[target,...sources],patch);assert.equal(points.reduce((n,c)=>n+c.points,0),10);
  target.stats.teamfights=97;assert.equal(matchSkillContributions(target,[target,...sources],patch).reduce((n,c)=>n+c.points,0),2);
  for(const source of sources)source.context.allies=1;assert.equal(matchSkillContributions(target,[target,...sources],patch).length,0);
});

test('actual lane execution uses the skill bonus without changing the hero damage stat or regeneration',()=>{
  const a=battle('last-hit-rhythm'),b=battle();a.b.time=10;b.b.time=10;
  assert.equal(a.engine.skill(a.u,'laning'),55);assert.equal(b.engine.skill(b.u,'laning'),50);
  assert.equal(a.u.damage,b.u.damage);assert.equal(a.u.max,b.u.max);
  assert.deepEqual(a.engine.regeneration(a.u),b.engine.regeneration(b.u));
  a.v.kind='creep';b.v.kind='creep';a.u.cd=0;b.u.cd=0;a.engine.attack(a.u,a.v);b.engine.attack(b.u,b.v);
  assert.ok(a.v.hp<b.v.hp,'laning execution improves the real attack against a creep');
  a.b.time=101;assert.equal(a.engine.skill(a.u,'laning'),50);
  a.v.hp=10000;a.engine.damage(a.u,a.v,100);assert.equal(a.v.hp,9900,'raw damage is not given a superficial innate multiplier');
});

test('lane support reaches another player in the engine and records the source of the skill points',()=>{
  const x=battle('wave-reader'),carry=x.heroes[4];carry.x=420;carry.y=400;carry.homeLane=x.u.homeLane;
  x.b.time=10;assert.equal(x.engine.skill(carry,'laning'),54);assert.equal(x.engine.skill(x.u,'laning'),50);
  const row=x.b.snapshot().players.find(p=>p.id===carry.player!.id)!;
  assert.equal(row.playerSkillModifiers![0].sourceId,x.u.player!.id);
  x.u.dead=true;x.b.time+=1;assert.equal(x.engine.skill(carry,'laning'),50);
});

test('persistent attribute bonuses have effective profile values, respect eras and never stack on load',()=>{
  const {c,p}=campaign();p.identity=id('patient-accumulator');const before=p.stats.farming;
  assert.equal(effectivePlayerAttributes(c,p).farming,before+3);assert.equal(p.stats.farming,before);
  const loaded=decodeSave(JSON.stringify(c))!,q=loaded.players.find(q=>q.id===p.id)!;
  assert.equal(q.stats.farming,before);assert.equal(effectivePlayerAttributes(loaded,q).farming,before+3);
  assert.equal(effectivePlayerAttributes({...c,week:1},p).farming,before);
  p.stats.farming=98;assert.equal(effectivePlayerAttributes(c,p).farming,99);
  p.identity=id('long-map-endurance');p.stats.stamina=68;assert.equal(contractPreferences(p,c).restDays,2);assert.equal(contractPreferences(p).restDays,3);
});

test('self-study improves only focused weekly development, with no free training during Rest',()=>{
  const {c,p}=campaign();p.identity=id('economical-clearing');c.training[p.id]='Farming';
  const practice=weeklyPractice(c,p,'Farming'),control=weeklyPractice({...c,players:c.players.map(q=>q.id===p.id?{...q,identity:id('last-hit-rhythm')}:q)},{...p,identity:id('last-hit-rhythm')},'Farming');
  assert.equal(practice.attributeBonus!.farming,.18);assert.ok(Math.abs(skillDeltas('Farming',practice).farming-skillDeltas('Farming',control).farming-.18)<1e-8);
  const before=p.stats.farming;applyPlayerPractice(p,'Farming',practice);assert.ok(Math.abs(p.stats.farming-before-1.18)<1e-8);
  assert.deepEqual(weeklyPractice(c,p,'Rest').attributeBonus,{});assert.deepEqual(weeklyPractice(c,p,'Laning').attributeBonus,{});
  // Invalid zero-hour schedules normalize to the existing one-hour minimum;
  // that real practice earns only its tiny proportional bonus.
  c.trainingSchedules={[p.id]:{intensity:'Normal',hoursPerDay:0,daysPerWeek:0}};assert.equal(weeklyPractice(c,p,'Farming').attributeBonus!.farming,.01);
});

test('mentoring requires a practising clubmate and caps combined training benefits',()=>{
  const {c,p,mentor,own}=campaign();p.identity=id('economical-clearing');mentor.identity=id('daylight-harvest');c.training[p.id]='Farming';
  assert.equal(weeklyPractice(c,p,'Farming').attributeBonus!.farming,.25,'18% self + 12% mentor caps at 25%');
  c.training[mentor.id]='Rest';assert.equal(weeklyPractice(c,p,'Farming').attributeBonus!.farming,.18);
  c.training[mentor.id]='Balanced';c.trainingSchedules={[mentor.id]:{intensity:'Normal',hoursPerDay:1,daysPerWeek:5}};
  assert.equal(weeklyPractice(c,p,'Farming').attributeBonus!.farming,.18,'five-hour mentor is unavailable');
  delete c.trainingSchedules;p.identity=id('last-hit-rhythm');c.roster=own.filter(q=>q.id!==mentor.id).map(q=>q.id);
  c.world!.clubs.find(t=>t.id===c.world!.managedTeamId)!.roster=[...c.roster];
  assert.equal(weeklyPractice(c,p,'Farming').attributeBonus!.farming,undefined,'former clubmate cannot mentor');
});

test('morale and campaign-energy bonuses settle in weekly practice with caps and debt penalties intact',()=>{
  const {c,p,mentor,own}=campaign();mentor.identity=id('measured-retreat');p.happiness=40;
  assert.equal(weeklyPractice(c,p,'Balanced').innateHappiness,2);own[1].identity=id('measured-retreat');assert.equal(weeklyPractice(c,p,'Balanced').innateHappiness,3);
  p.happiness=70;assert.equal(weeklyPractice(c,p,'Balanced').innateHappiness,0);p.happiness=40;
  const debt=weeklyPractice({...c,cash:-1},p,'Balanced');assert.equal(debt.innateHappiness,0);applyPlayerPractice(p,'Balanced',debt,true);assert.equal(p.happiness,30);
  p.identity=id('recovery-routine');const rest=weeklyPractice(c,p,'Rest');assert.equal(rest.innateEnergy,3);
  const energy=p.energy;applyPlayerPractice(p,'Rest',rest);assert.equal(p.energy,Math.min(100,energy+rest.energy));
  p.identity=id('lane-controller');assert.equal(weeklyPractice(c,p,'Balanced').innateEnergy??0,0,'unknown test identity has no effect');
});

test('bootcamp previews scale the same innate growth that actual training receives',()=>{
  const {c,p}=campaign();p.identity=id('economical-clearing');c.training[p.id]='Farming';c.bootcamp={remaining:1,playerIds:[p.id]};
  const base=weeklyPractice({...c,bootcamp:undefined},p,'Farming');
  const preview=campPractice(c,p,'Farming',base),actual=weeklyPractice(c,p,'Farming');
  assert.deepEqual(preview.attributeBonus,actual.attributeBonus);assert.equal(preview.growth,actual.growth);
  const normal=skillDeltas('Farming',base),boosted=skillDeltas('Farming',actual);
  const bonus=Math.round((boosted.farming-normal.farming)*100)/100;
  assert.match(campAttendance(c)[0].preview!,new RegExp(`\\+${bonus} total attribute points`));
});

test('the weekly clock applies benefits once, while loading and previewing never settle another week',()=>{
  const {c,p}=campaign();p.identity=id('economical-clearing');c.training[p.id]='Farming';
  const before=p.stats.farming,next=advanceWeek(c),after=next.players.find(q=>q.id===p.id)!;
  assert.ok(Math.abs(after.stats.farming-before-1.18)<1e-8);
  const copy=structuredClone(after.stats);weeklyPractice(next,after,'Farming');decodeSave(JSON.stringify(next));assert.deepEqual(after.stats,copy);
});

test('the dated clock grants no innate training for partial weeks and applies one bonus at the paid boundary',()=>{
  const {c,p}=campaign();p.identity=id('economical-clearing');c.training[p.id]='Farming';
  const dated=enableHistoricalCalendar(c);dated.calendar={...dated.calendar!,now:'2024-06-01T00:00:00Z',origin:'2024-06-01T00:00:00Z',paidWeeks:0};
  const before=p.stats.farming,partial=advanceCalendarTo(dated,'2024-06-04T00:00:00Z');
  assert.equal(partial.players.find(q=>q.id===p.id)!.stats.farming,before);
  const paid=advanceCalendarTo(partial,'2024-06-08T00:00:00Z');assert.equal(paid.calendar!.paidWeeks,1);
  assert.ok(Math.abs(paid.players.find(q=>q.id===p.id)!.stats.farming-before-1.18)<1e-8);
  assert.equal(advanceCalendarTo(paid,'2024-06-08T00:00:00Z'),paid);
});

test('AI development resolves mentorship and Rest before applying changes, independently of player order',()=>{
  const {c}=campaign();const ai=c.world!.clubs.find(t=>t.id!==c.world!.managedTeamId&&t.active!==false)!;
  const mentor=c.players.find(p=>p.id===ai.roster[0])!;mentor.identity=id('daylight-harvest');mentor.energy=30;
  const a=structuredClone(c),b=structuredClone(c);b.players.reverse();developWorldPlayers(a);developWorldPlayers(b);
  const byId=new Map(b.players.map(p=>[p.id,p]));
  for(const p of a.players){const other=byId.get(p.id)!;assert.deepEqual([p.stats,p.energy,p.happiness],[other.stats,other.energy,other.happiness],p.id);}
});

test('campaign migration retains innate IDs and talent trees while frozen v1 maps retain their original rules',()=>{
  const {c,p}=campaign();p.identity={...id('solo-sustain'),innateRules:undefined};
  const tree=structuredClone(p.identity.tree),old=playerIdentitySnapshot(p.identity,0,patch,{},1);
  assert.match(old.innate!.detail,/HP regeneration/);const raw=JSON.stringify(old);
  const normalized=normalizePlayerIdentity(p.identity,p.id)!;assert.equal(normalized.innateRules,2);assert.equal(normalized.innateId,p.identity.innateId);assert.deepEqual(normalized.tree,tree);
  assert.equal(JSON.stringify(old),raw);assert.doesNotMatch(playerIdentitySnapshot(normalized,0,patch,{},1).innate!.detail,/HP regeneration/);
  const cfg=buildBattleConfig(c,events[0],4);assert.ok(cfg.players.flat().every(p=>p.identity?.innateRules===2));
});
