import { test } from "node:test";
import assert from "node:assert/strict";
import { LaneBattle, simulateSeries } from "../src/battle";
import type { BattleConfig } from "../src/battle";
import { LiveBattleSession } from "../src/live-battle";
import { defaultTactics, normalizeTactics, phaseAt, strategyById, strategyUnlocked } from "../src/tactics";
import { automaticBuild, bkbProtection, itemForPatch } from "../src/items";
import { patchById } from "../src/patches";
import { heroById } from "../src/heroes";
import { buildBattleConfig, createCampaign, DEFAULT_SETTINGS, events, readSave, SAVE_KEY } from "../src/game";
import { heroBalanceSignature, calibrationForPatch } from "../src/hero-balance";

function config(year=2011):BattleConfig {
  const skills=Object.fromEntries("creativity stability confidence stamina heroPool laning teamfights farming skirmish vision intuition pushing".split(" ").map(k=>[k,50]));
  return {seed:4182,year,patchId:`${year}.1`,teams:["Equal A","Equal B"],bonuses:[0,0],
    patchObservers:[{teamKey:"same",staffIds:["c1","c4","c5","c6"]},{teamKey:"same",staffIds:["c1","c4","c5","c6"]}],
    players:[0,1].map(side=>Array.from({length:5},(_,role)=>({id:`${side}:${role}`,name:`${side} Player ${role}`,role,skills:{...skills},energy:100,happiness:100}))) as BattleConfig["players"],
    tacticalPreparations:[defaultTactics(),defaultTactics()],captureReplay:false,captureTimeline:false,seriesFormat:{bestOf:1}};
}
const heroes=(battle:LaneBattle)=>battle.units.filter(u=>u.kind==="hero");
function ticks(battle:LaneBattle,count:number){for(let i=0;i<count&&battle.winner===null;i++)battle.step();}

test("phase quick slots validate malformed saves, deduplicate and switch exactly at 15:00 and 40:00",()=>{
  assert.deepEqual([phaseAt(899),phaseAt(900),phaseAt(2399),phaseAt(2400)],["early","mid","mid","late"]);
  const prep=normalizeTactics({slots:{early:["supports-mid","supports-mid","buy-rapier","unknown"],mid:"bad",late:null},builds:["survival","unknown"]});
  assert.equal(prep.slots.early[0],"supports-mid");
  for(const slots of Object.values(prep.slots)){assert.equal(slots.length,3);assert.equal(new Set(slots).size,3);}
  assert.deepEqual(prep.builds,["survival","automatic","automatic","automatic","automatic"]);
  assert.deepEqual(normalizeTactics(null),defaultTactics());
});

test("staff and actual player attributes unlock advanced plays; basic calls remain available",()=>{
  const players=config().players[0];for(const p of players)p.skills.intuition=20;
  assert.equal(strategyUnlocked(strategyById("roshan")!,players,[]),false);
  assert.equal(strategyUnlocked(strategyById("roshan")!,players,["c4"]),true);
  players[1].skills.intuition=50;
  assert.equal(strategyUnlocked(strategyById("roshan")!,players,[]),true);
  assert.equal(strategyUnlocked(strategyById("supports-mid")!,players,[]),true);
});

test("gank calls move real participants, cost time and can be cancelled and reused only after recovery",()=>{
  const c=config(),battle=new LaneBattle(c),control=new LaneBattle(c);
  const mid=heroes(battle).find(u=>u.team===0&&u.player!.role===1)!;
  const before={power:mid.power,damage:mid.damage,hp:mid.max};
  assert.equal(battle.issueOrder(0,{strategyId:"mid-bottom"}).accepted,true);
  assert.deepEqual({power:mid.power,damage:mid.damage,hp:mid.max},before);
  assert.match(battle.strategyReason(0,{strategyId:"supports-mid"})!,/current team movement/);
  ticks(battle,70);ticks(control,70);
  assert.ok(battle.tacticalEvents.some(e=>e.status==="moving"&&e.strategyId==="mid-bottom"));
  const normal=heroes(control).find(u=>u.team===0&&u.player!.role===1)!;
  assert.ok(Math.hypot(mid.x-normal.x,mid.y-normal.y)>10,"rotation changes actual position");
  battle.cancelOrder(0);
  assert.match(battle.strategyReason(0,{strategyId:"mid-bottom"})!,/Ready in/);
  battle.time+=8;mid.hp=mid.max;mid.retreat=false;
  assert.equal(battle.issueOrder(0,{strategyId:"mid-bottom"}).accepted,true);
  assert.equal(battle.tacticalEvents.filter(e=>e.status==="called"&&e.source==="manager").length,2);
});

test("orders reject wrong phases, unequipped calls, dead participants and opponent purchase targets",()=>{
  const battle=new LaneBattle(config());
  assert.equal(battle.issueOrder(0,{strategyId:"roshan"}).accepted,false);
  const support=heroes(battle).find(u=>u.team===0&&u.player!.role===3)!;support.dead=true;
  assert.match(battle.strategyReason(0,{strategyId:"supports-mid"})!,/alive/);
  battle.time=150;
  assert.match(battle.strategyReason(0,{strategyId:"buy-bkb",targetPlayerId:"1:0"})!,/your team/);
  assert.match(battle.strategyReason(0,{strategyId:"push-0"})!,/Not equipped/);
  assert.equal(battle.issueOrder(0,{strategyId:"buy-bkb",targetPlayerId:"0:1"}).accepted,true);
  assert.equal(battle.tacticalSnapshot(0).itemTargets[0].playerId,"0:1");
  battle.cancelItemPriority(0,"0:1");assert.equal(battle.tacticalSnapshot(0).itemTargets.length,0);
});

test("item builds spend match gold, use real inventory effects and never scale stats from unspent wealth",()=>{
  const c=config(),battle=new LaneBattle(c),u=heroes(battle)[0];
  const baseDamage=u.damage;u.gold=16000;
  assert.equal(u.damage,baseDamage,"unspent wealth has no combat effect");
  ticks(battle,40);
  const p=battle.snapshot().players.find(p=>p.id===u.player!.id)!;
  assert.ok(p.inventory!.length>=3&&p.inventory!.length<=6);
  assert.ok(p.spendableGold!<p.gold);assert.ok(u.damage>baseDamage);
  const purchases=battle.itemEvents.filter(e=>e.playerId===p.id&&e.kind==="purchase");
  const sales=battle.itemEvents.filter(e=>e.playerId===p.id&&e.kind==="sale");
  assert.equal(p.spendableGold,Math.floor(u.gold-purchases.reduce((n,e)=>n+e.gold,0)+sales.reduce((n,e)=>n+e.gold,0)));
  assert.ok(automaticBuild(heroById(p.heroId)!,0,"utility").includes("mek"));
  assert.notEqual(itemForPatch("bkb",patchById("2011.1")).cost,itemForPatch("bkb",patchById("2026.2")).cost);
  assert.ok(bkbProtection(patchById("2023.1"))>bkbProtection(patchById("2011.1")));
});

test("purchase calls prioritize the selected player, wait for affordability, and do not grant free items",()=>{
  const battle=new LaneBattle(config());battle.time=150;
  const u=heroes(battle).find(u=>u.player!.id==="0:1")!;
  assert.equal(battle.issueOrder(0,{strategyId:"buy-bkb",targetPlayerId:u.player!.id}).accepted,true);
  ticks(battle,2);assert.ok(!u.inventory.includes("bkb"));assert.equal(u.itemPriority,"bkb");
  u.gold=6000;ticks(battle,4);
  assert.ok(u.inventory.includes("bkb"));assert.equal(u.itemPriority,undefined);
  assert.ok(battle.tacticalEvents.some(e=>e.status==="completed"&&e.source==="manager"&&e.message.includes(u.player!.name)));
});

test("autonomous purchase calls preserve support builds while managers can explicitly prioritize any player",()=>{
  const battle=new LaneBattle(config());battle.time=150;
  for(const u of heroes(battle)){
    u.hp=u.max*.4;u.retreat=true;u.lastDamagedAt=battle.clock;u.deaths=3;
    if(u.player!.role<=1)u.inventory=["bkb"];
  }
  ticks(battle,1);
  assert.ok(!battle.tacticalEvents.some(e=>e.strategyId==="buy-bkb"&&e.status==="called"&&e.source==="bot"));
  assert.equal(battle.issueOrder(0,{strategyId:"buy-bkb",targetPlayerId:"0:4"}).accepted,true);
  assert.equal(heroes(battle).find(u=>u.player!.id==="0:4")!.itemPriority,"bkb");
});

test("active BKB reduces actual spell damage and stuns rather than adding a hidden win bonus",()=>{
  const encounter=(protectedByBkb:boolean)=>{
    const battle=new LaneBattle(config()),all=heroes(battle),caster=all[0],target=all[5];
    for(const u of all)if(u!==caster&&u!==target){u.dead=true;u.respawn=999;}
    for(const u of battle.units){if(u.kind==="tower")u.cd=999;if(u.kind==="hero")u.gold=0;}
    caster.hero={...caster.hero!,ability:"stun"};caster.x=390;caster.y=400;caster.abilityCd=0;caster.cd=999;
    target.x=400;target.y=400;target.bkbUntil=protectedByBkb?100:0;target.cd=999;target.abilityCd=999;
    const hp=target.hp;battle.step();return {damage:hp-target.hp,stun:target.stun};
  };
  const plain=encounter(false),protectedResult=encounter(true);
  assert.ok(plain.damage>0&&protectedResult.damage<plain.damage*.3, JSON.stringify({plain,protectedResult}));
  assert.ok(protectedResult.stun<plain.stun*.3);
});

test("Rapier drops at the death position and can become an opponent's real inventory item",()=>{
  const battle=new LaneBattle(config()),all=heroes(battle),victim=all[0],enemy=all[5];
  for(const u of all)if(u!==victim&&u!==enemy){u.dead=true;u.respawn=999;}
  victim.inventory=["rapier"];victim.hp=1;victim.x=400;victim.y=400;victim.cd=999;victim.abilityCd=999;
  enemy.x=405;enemy.y=400;enemy.damage=10000;enemy.range=300;enemy.cd=0;enemy.abilityCd=999;
  ticks(battle,2);
  assert.ok(victim.dead);assert.ok(!victim.inventory.includes("rapier"));
  assert.ok(battle.itemEvents.some(e=>e.kind==="drop"));
  assert.ok(enemy.inventory.includes("rapier"));assert.ok(battle.itemEvents.some(e=>e.kind==="pickup"&&e.playerId===enemy.player!.id));
});

test("Roshan requires travel and attacks, grants a single expiring Aegis and cannot be repeated while absent",()=>{
  const c=config();c.tacticalPreparations![0]!.slots.mid=["roshan","protect-carry","buy-bkb"];
  const battle=new LaneBattle(c);battle.time=150;battle.roshan.hp=10;
  for(const u of heroes(battle).filter(u=>u.team===0)){u.x=battle.roshan.x;u.y=battle.roshan.y;}
  assert.equal(battle.issueOrder(0,{strategyId:"roshan"}).accepted,true);
  assert.equal(battle.roshan.kills[0],0);ticks(battle,25);
  assert.equal(battle.roshan.kills[0],1);assert.ok(battle.roshan.respawnAt>battle.clock);
  assert.equal(heroes(battle).filter(u=>u.aegisUntil>battle.clock).length,1);
  battle.time+=20;assert.match(battle.strategyReason(0,{strategyId:"roshan"})!,/Roshan returns/);
});

test("Aegis revival consumes the reward without awarding a hero kill or dropping Rapier",()=>{
  const battle=new LaneBattle(config()),all=heroes(battle),victim=all[0],enemy=all[5];
  for(const u of all)if(u!==victim&&u!==enemy){u.dead=true;u.respawn=999;}
  victim.inventory=["rapier"];victim.aegisUntil=300;victim.hp=1;victim.x=400;victim.y=400;victim.cd=999;victim.abilityCd=999;
  enemy.x=405;enemy.y=400;enemy.damage=10000;enemy.range=300;enemy.cd=0;enemy.abilityCd=999;
  battle.step();assert.equal(victim.aegisUntil,0);assert.equal(victim.deaths,0);assert.deepEqual(battle.kills,[0,0]);assert.ok(victim.inventory.includes("rapier"));
  enemy.cd=999;ticks(battle,5);assert.ok(!victim.dead);assert.ok(Math.abs(victim.x-400)<100);
});

test("live stepping, speed chunks, inspection and skip continue the identical seeded simulation",()=>{
  const c={...config(),captureTimeline:true,captureReplay:true};
  const a=new LiveBattleSession(c),b=new LiveBattleSession(c);
  const first=a.update();assert.equal(a.battle.time,0);a.update();assert.equal(a.battle.time,0);
  assert.equal(a.command({type:"order",at:first.frame.time,order:{strategyId:"supports-mid"}}).message,"Order accepted.");
  b.command({type:"order",at:0,order:{strategyId:"supports-mid"}});
  for(let i=0;i<20;i++){a.advance(6);a.command({type:"inspect",playerId:"0:1"});}b.advance(120);
  assert.deepEqual(a.battle.snapshot(),b.battle.snapshot());
  assert.match(a.command({type:"order",at:0,order:{strategyId:"mid-bottom"}}).message!,/advanced/);
  const skipped=a.command({type:"finish-live"}).simulation!;
  while(b.battle.winner===null)b.advance(24);
  assert.deepEqual(skipped,b.result());
  const automatic=simulateSeries(c);const stepped=new LiveBattleSession(c);while(stepped.battle.winner===null)stepped.advance(60);
  assert.deepEqual(automatic.summary,stepped.result().summary);
});

test("tactical preparation survives reload without changing dates, finances, ratings or old results",()=>{
  const c=createCampaign(DEFAULT_SETTINGS),prep=defaultTactics();prep.builds[2]="survival";prep.slots.mid[0]="push-0";c.tacticalPreparation=prep;
  const previous=globalThis.localStorage;
  Object.defineProperty(globalThis,"localStorage",{configurable:true,value:{getItem:(key:string)=>key===SAVE_KEY?JSON.stringify(c):null}});
  try{const loaded=readSave()!;assert.deepEqual(loaded.tacticalPreparation,prep);assert.equal(loaded.cash,c.cash);assert.equal(loaded.week,c.week);assert.deepEqual(loaded.results,c.results);assert.deepEqual(loaded.players.map(p=>p.stats),c.players.map(p=>p.stats));
    assert.deepEqual(buildBattleConfig(loaded,events[0],5).tacticalPreparations?.[0],prep);
  }finally{Object.defineProperty(globalThis,"localStorage",{configurable:true,value:previous});}
  const patch=patchById("2011.1")!;assert.equal(calibrationForPatch({...patch,axes:{...patch.axes,tempo:patch.axes.tempo+1}}),undefined);assert.ok(heroBalanceSignature(patch));
});
