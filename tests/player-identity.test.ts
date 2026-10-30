import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBattleConfig, createCampaign, decodeSave, DEFAULT_SETTINGS, events } from '../src/game';
import { LaneBattle } from '../src/battle';
import type { BattleConfig } from '../src/battle';
import { patchForSeason } from '../src/patches';
import { postTiShuffle } from '../src/history';
import { automaticTalents, choosePlayerTalent, talentBonuses } from '../src/talents';
import { playerInnates, sharedPlayerTalents } from '../src/player-identity-data';
import { battlePlayerIdentity, ensurePlayerIdentities, fallbackPlayerIdentity, identityEffects, innateConditionActive, makePlayerTree, normalizePlayerIdentity, playerIdentityEra, playerIdentitySnapshot, playerTalentDetail, playerTreeBonuses, setPlayerFacet } from '../src/player-identity';
import type { IdentityContext, PlayerIdentity } from '../src/player-identity';
import { heroById } from '../src/heroes';
import { heroAbilities } from '../src/combat-model';
import { enableHistoricalCalendar, enterHistoricalTournament, tournamentTeamTemplate } from '../src/historical-game';
import { historicalTournaments } from '../src/tournaments';
import { botPlayers } from '../src/bot-challenge';

const patch=patchForSeason(2024,2);
const context:IdentityContext={clock:700,health:1,mana:1,allies:0,sinceDamage:20,deaths:0,kills:0,moving:false,defending:false,siege:false,energy:100};
const identity=(innateId:string,facet?:0|1):PlayerIdentity=>({version:1,innateRules:2,innateId,tree:makePlayerTree('test',innateId),...(facet!=null?{facet}:{})});
const basePlayer=createCampaign(DEFAULT_SETTINGS).players[0];
const fakePlayers=(n:number)=>Array.from({length:n},(_,i)=>({...structuredClone(basePlayer),id:`identity-${String(i).padStart(4,'0')}`,identity:undefined}));
function config(patchId='2024.2'):BattleConfig {
  const skills=Object.fromEntries('creativity stability confidence stamina heroPool laning teamfights farming skirmish vision intuition pushing'.split(' ').map(k=>[k,50]));
  return {seed:4412,year:2024,patchId,teams:['A','B'],bonuses:[0,0],captureReplay:false,captureTimeline:false,seriesFormat:{bestOf:1},
    players:[0,1].map(side=>Array.from({length:5},(_,role)=>({id:`${side}-${role}`,name:`Player ${side}-${role}`,role,skills:{...skills},energy:100,happiness:100}))) as BattleConfig['players']};
}
type Unit=LaneBattle['units'][number];
function setup(innateId?:string,facet?:0|1,patchId='2024.2'){
  const b=new LaneBattle(config(patchId)),heroes=b.units.filter(u=>u.player),u=heroes[0],v=heroes[5];
  heroes.forEach((h,i)=>{h.x=-1000-i*100;h.y=-1000;h.spells=[];h.inventory=[];h.tpCharges=0;});
  u.x=400;u.y=400;v.x=420;v.y=400;v.hp=10000;v.max=10000;
  // This fixture checks preservation of frozen v1 preparations. New skill and
  // club rules are exercised in player-innate-skills.test.ts.
  if(innateId)u.player!.identity={...identity(innateId,facet),innateRules:undefined};
  const engine=b as unknown as {
    damage:(a:Unit,b:Unit,n:number,spell?:boolean)=>void;gainXp:(u:Unit,n:number)=>void;addGold:(u:Unit,n:number,farm?:boolean,passive?:boolean)=>void;
    move:(u:Unit,x:number,y:number)=>void;regeneration:(u:Unit)=>{hp:number;mana:number};
    spellState:(u:Unit,s:Unit['spells'][number])=>{manaCost:number};castNamed:(u:Unit,v?:Unit)=>void;
    farm:(u:Unit)=>boolean;facetAction:(u:Unit)=>boolean;tryDeny:(u:Unit)=>boolean;spawn:()=>void;
    talents:(u:Unit)=>ReturnType<typeof talentBonuses>;personal:(u:Unit)=>ReturnType<typeof identityEffects>;
    plays:[{participants:number[]}|undefined,{participants:number[]}|undefined];
  };
  return {b,heroes,u,v,engine};
}

test('100 named innates cover ten areas with player-skill or club rules rather than hero stat multipliers',()=>{
  assert.equal(playerInnates.length,100);assert.equal(new Set(playerInnates.map(i=>i.id)).size,100);
  assert.equal(new Set(playerInnates.map(i=>i.name)).size,100);assert.equal(new Set(playerInnates.map(i=>i.category)).size,10);
  assert.equal(new Set(playerInnates.map(i=>JSON.stringify([i.attributes,i.match,i.weekly]))).size,100);
  const candidates:IdentityContext[]=[context,...[0,300,600,1800].map(clock=>({...context,clock})),
    ...[1,2].map(allies=>({...context,allies})),{...context,health:.3},{...context,mana:.2},{...context,deaths:3},
    {...context,kills:3},{...context,moving:true},{...context,defending:true},{...context,siege:true},{...context,energy:40}];
  for(const innate of playerInnates){
    if(innate.match)assert.ok(candidates.find(c=>innateConditionActive(innate.match!.condition,c)),innate.name);
    assert.ok(innate.attributes||innate.match||innate.weekly);
    const effect=identityEffects(identity(innate.id),0,patch,context);
    assert.ok(Object.entries(effect).every(([key,n])=>n===(['engage','retreat','farmWindow'].includes(key)?0:1)),innate.name);
  }
});

test('fresh assignments use the whole pool before overlapping and remain deterministic with input reorder',()=>{
  const a=fakePlayers(201),b=structuredClone(a).reverse();ensurePlayerIdentities(a);ensurePlayerIdentities(b);
  assert.deepEqual(new Map(a.map(p=>[p.id,p.identity])),new Map(b.map(p=>[p.id,p.identity])));
  const counts=new Map<string,number>();for(const p of a)counts.set(p.identity!.innateId,(counts.get(p.identity!.innateId)??0)+1);
  assert.equal(counts.size,100);assert.equal(Math.min(...counts.values()),2);assert.equal(Math.max(...counts.values()),3);
});

test('new arrivals avoid active duplicates while existing identities survive roles, names and annual imports',()=>{
  const c=createCampaign(DEFAULT_SETTINGS),before=new Map(c.players.map(p=>[p.id,structuredClone(p.identity)]));
  const shuffled=postTiShuffle(c.world!,c.players,2011)!;
  for(const p of shuffled.players.filter(p=>before.has(p.id)))assert.deepEqual(p.identity,before.get(p.id),p.id);
  const active=new Set(shuffled.state.clubs.filter(t=>t.active!==false).flatMap(t=>[...t.roster,...t.bench]));
  ensurePlayerIdentities(shuffled.players,active);
  assert.ok(shuffled.players.every(p=>p.identity));
  const x=fakePlayers(1)[0];x.identity=identity('last-hit-rhythm');x.role='Hard support';x.name='Renamed';
  const old=structuredClone(x.identity);ensurePlayerIdentities([x]);assert.deepEqual(x.identity,old);
});

test('talent trees use shared templates, stable pairs and visibly stronger specialty ranks',()=>{
  const trees=fakePlayers(100);ensurePlayerIdentities(trees);
  assert.equal(sharedPlayerTalents.length,16);assert.ok(new Set(trees.map(p=>JSON.stringify(p.identity!.tree))).size>90);
  assert.ok(trees.some(p=>p.identity!.tree.some(t=>t.choices.some(c=>c.rank===2))));
  const a=identity('duel-instinct');a.tree=[{level:10,choices:[{id:'striking',rank:2},{id:'resilience',rank:1}]},...a.tree.slice(1)];
  assert.equal(playerTreeBonuses(a,{10:0},9).attack,1);assert.equal(playerTreeBonuses(a,{10:0},10).attack,1.0625);
  assert.match(playerTalentDetail(a.tree[0].choices[0]),/6.3% attack/);
  assert.equal(playerTreeBonuses(a,{10:1},10).health,1.08);
  assert.deepEqual(automaticTalents(0,a),automaticTalents(0,a));
});

test('old saves retain selected talent bonuses, recover malformed identities and preserve archived maps',()=>{
  const c=createCampaign({...DEFAULT_SETTINGS,year:2024});
  c.talentPlans={[c.roster[0]]:{10:1,15:0,20:1,25:0}};
  for(const p of c.players)delete p.identity;
  const sentinel={unchanged:['historic result',7]};(c as unknown as {archive:unknown}).archive=sentinel;
  const loaded=decodeSave(JSON.stringify(c))!;assert.ok(loaded);
  const p=loaded.players.find(p=>p.id===c.roster[0])!;
  assert.deepEqual(playerTreeBonuses(p.identity!,loaded.talentPlans![p.id],25),talentBonuses(c.talentPlans[p.id],25));
  assert.deepEqual((loaded as unknown as {archive:unknown}).archive,sentinel);
  const valid=p.identity!.innateId;p.identity={version:1,innateId:valid,tree:[{level:10,choices:null}],facet:9} as unknown as PlayerIdentity;
  const repaired=decodeSave(JSON.stringify(loaded))!;assert.equal(repaired.players.find(x=>x.id===p.id)!.identity!.innateId,valid);
  assert.equal(repaired.players.find(x=>x.id===p.id)!.identity!.facet,undefined);
  const corrupted=structuredClone(repaired);corrupted.players[0].identity={version:1,innateId:'unknown',tree:[]} as PlayerIdentity;
  assert.ok(decodeSave(JSON.stringify(corrupted))!.players[0].identity);
  assert.equal(normalizePlayerIdentity([],p.id),undefined);
  assert.equal(normalizePlayerIdentity({version:1,innateId:'__proto__'},p.id),undefined);
  assert.deepEqual(loaded.players.map(p=>p.stats),c.players.map(p=>p.stats));assert.equal(loaded.cash,c.cash);
});

test('innates start in 2024.2, facets retire in 2026.1 and remain retired in future composites',()=>{
  const p=identity('last-hit-rhythm',0);
  for(const id of [[2024,1],[2024,2],[2025,2],[2026,1],[2030,2]] as const){
    const patch=patchForSeason(id[0],id[1]),era=playerIdentityEra(patch),effects=identityEffects(p,0,patch,{...context,clock:100});
    assert.equal(effects.creeps,1);assert.equal(effects.farmWindow,era.facets?30:0);
  }
  assert.deepEqual(playerIdentityEra(undefined),{innates:false,facets:false});
});

test('facet defaults and talent plans respect ownership, eras, tournament and prepared-scrim locks',()=>{
  let c=createCampaign({...DEFAULT_SETTINGS,year:2024});c.week=9;const id=c.roster[0],before=structuredClone(c);
  c=setPlayerFacet(c,id,1);assert.equal(c.players.find(p=>p.id===id)!.identity!.facet,1);
  assert.equal(c.cash,before.cash);assert.equal(c.week,before.week);assert.deepEqual(c.players.map(p=>p.stats),before.players.map(p=>p.stats));
  assert.equal(setPlayerFacet(c,'unknown',0),c);assert.equal(setPlayerFacet(c,id,4 as 0),c);
  assert.equal(setPlayerFacet({...c,year:2026,week:1},id,0).players.find(p=>p.id===id)!.identity!.facet,1);
  const locked={...c,calendar:{now:'2024-06-01',runs:[{state:'playing',teams:[{roster:[id]}]}]}} as typeof c;
  assert.equal(setPlayerFacet(locked,id,0),locked);assert.equal(choosePlayerTalent(locked,id,10,0),locked);
  const scrim={...c,scrims:{sessions:[{status:'scheduled',config:{players:[[{id}],[]]}}],research:{}}} as typeof c;
  assert.equal(setPlayerFacet(scrim,id,0),scrim);assert.equal(choosePlayerTalent(scrim,id,10,0),scrim);
});

test('match builders pin player identity for both sides, AI tournaments and exhibition bots',()=>{
  const c=createCampaign(DEFAULT_SETTINGS),cfg=buildBattleConfig(c,events[0],14);
  assert.ok(cfg.players.flat().every(p=>p.identity?.tree.length===4&&p.identity.facet!=null));
  const ti=historicalTournaments.find(e=>e.kind==='ti'&&e.year===2011)!;
  const dated=enterHistoricalTournament(enableHistoricalCalendar(c),ti.id,17),run=dated.calendar!.runs[0];
  assert.ok(tournamentTeamTemplate(dated,run,run.managed).players.every(p=>p.identity));
  assert.ok(botPlayers(c.players.slice(0,5)).every(p=>p.identity?.facet!=null));
  assert.equal(battlePlayerIdentity(c.players[0],0).innateId,c.players[0].identity!.innateId);
  assert.deepEqual(fallbackPlayerIdentity('bot'),fallbackPlayerIdentity('bot'));
});

test('conditional innate damage reaches real lane combat and remains inactive in earlier patches',()=>{
  for(const patchId of ['2024.1','2024.2']){
    const {b,u,v,engine}=setup('last-hit-rhythm',undefined,patchId);b.time=10;
    v.kind='creep';v.hp=1000;engine.damage(u,v,100);
    assert.equal(v.hp,patchId==='2024.2'?892:900);
    b.time=110;v.hp=1000;engine.damage(u,v,100);assert.equal(v.hp,900);
  }
});

test('innate resource effects boost earned farm and XP without generating passive gold',()=>{
  const {b,u,engine}=setup('patient-accumulator');b.time=120;u.hp=u.max;
  const opening=u.gold;engine.addGold(u,100,true);assert.equal(u.gold-opening,106);
  const earned=u.gold;engine.addGold(u,100,true,true);assert.equal(u.gold-earned,100);
  const a=setup('solo-student'),other=setup();a.b.time=120;other.b.time=120;
  a.engine.gainXp(a.u,10);other.engine.gainXp(other.u,10);
  assert.ok(Math.abs(a.u.totalXp/other.u.totalXp-1.06)<1e-10);
});

test('movement, regeneration and received damage reflect their innate conditions',()=>{
  const a=setup('night-runner'),b=setup();a.b.time=60;b.b.time=60;
  a.engine.move(a.u,600,400);b.engine.move(b.u,600,400);
  assert.ok(Math.abs(Math.hypot(a.u.x-400,a.u.y-400)/Math.hypot(b.u.x-400,b.u.y-400)-1.065)<1e-8);
  const c=setup('recovery-routine'),d=setup();c.b.time=10;d.b.time=10;
  assert.ok(Math.abs(c.engine.regeneration(c.u).hp/d.engine.regeneration(d.u).hp-1.12)<1e-8);
  const e=setup('trade-discipline');e.b.time=10;e.u.hp=1000;e.engine.damage(e.v,e.u,100);assert.equal(e.u.hp,904);
});

test('mana-cost innate changes real casts and displayed spell costs together',()=>{
  const a=setup('efficient-opening'),b=setup();
  for(const {u,battle,engine,v} of [{...a,battle:a.b},{...b,battle:b.b}]){
    battle.time=10;u.hero=heroById('lion')!;u.level=10;u.mana=2000;u.maxMana=2000;
    u.spells=[{definition:heroAbilities('lion',patch).find(s=>s.id==='lion_impale')!,slot:0,readyAt:0,casts:0}];
    const cost=engine.spellState(u,u.spells[0]).manaCost;engine.castNamed(u,v);assert.ok(u.mana<2000);assert.ok(Math.abs(2000-u.mana-cost)<1e-8);
  }
  assert.ok(Math.abs((2000-a.u.mana)/(2000-b.u.mana)-.94)<1e-8);
});

test('deny specialist raises an actual legal deny threshold while the creep still must be below half health',()=>{
  const a=setup('deny-specialist'),b=setup();
  for(const x of [a,b]){
    x.b.time=10;x.engine.spawn();const creep=x.b.units.find(c=>c.kind==='creep'&&c.team===x.u.team)!;
    creep.x=x.u.x+5;creep.y=x.u.y;creep.max=240;creep.hp=110;creep.wait=0;x.u.damage=100;x.u.cd=0;x.u.range=150;
  }
  assert.equal(a.engine.tryDeny(a.u),true);assert.equal(b.engine.tryDeny(b.u),false);assert.equal(a.u.denies,1);
});

test('farm-window facets and camp-clearing innates alter actual neutral decisions and damage',()=>{
  const a=setup('camp-technician'),b=setup();
  for(const x of [a,b]){
    x.b.time=120;const camp=x.b.camps[0];x.u.x=camp.x;x.u.y=camp.y;x.u.cd=0;x.u.hp=x.u.max;
    x.v.x=-3000;x.v.y=-3000;camp.readyAt=0;camp.hp=1000;
    assert.equal(x.engine.farm(x.u),true);
  }
  assert.ok(Math.abs((1000-a.b.camps[0].hp)/(1000-b.b.camps[0].hp)-1.1)<1e-8);
  const conservative=setup('solo-student',0),active=setup('solo-student',1);
  for(const x of [conservative,active]){x.b.time=140;const camp=x.b.camps[0];x.u.x=camp.x;x.u.y=camp.y;x.v.x=-3000;camp.readyAt=0;}
  assert.equal(conservative.engine.farm(conservative.u),true);assert.equal(active.engine.farm(active.u),false);
});

test('support escort changes idle movement, respects tactical participation and expires after facets',()=>{
  const {b,u,heroes,engine}=setup('solo-student',0);u.player!.role=3;
  heroes[1].player!.role=0;heroes[1].x=650;heroes[1].y=400;u.x=400;u.y=400;
  heroes[5].x=-3000;heroes[5].y=-3000;
  assert.equal(engine.facetAction(u),true);
  engine.plays[0]={participants:[u.id]};assert.equal(engine.facetAction(u),false);
  const retired=setup('solo-student',0,'2026.1');retired.u.player!.role=3;assert.equal(retired.engine.facetAction(retired.u),false);
});

test('player talent effects unlock in the engine at map levels and saved identity labels stay immutable',()=>{
  const {b,u,engine}=setup('duel-instinct',1);u.player!.talents={10:0};
  u.player!.identity!.tree[0]={level:10,choices:[{id:'striking',rank:2},{id:'resilience',rank:1}]};
  assert.equal(engine.talents(u).attack,1);engine.gainXp(u,10000);assert.ok(u.level>=10);assert.equal(engine.talents(u).attack,1.0625);
  const snapshot=playerIdentitySnapshot(u.player!.identity!,0,patch,u.player!.talents,u.level),copy=structuredClone(snapshot);
  u.player!.identity!.innateId='last-hit-rhythm';u.player!.identity!.facet=0;
  assert.deepEqual(snapshot,copy);assert.equal(snapshot.innate!.name,'Duel instinct');assert.equal(snapshot.facet!.name,'Active carry');
  const frame=b.snapshot();assert.ok(frame.players[0].playerIdentity?.talents[0].detail);
  assert.equal(new LaneBattle(config()).snapshot().players[0].playerIdentity,undefined,'old preparations are not given new identities');
});
