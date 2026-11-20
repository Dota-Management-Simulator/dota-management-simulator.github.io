import { test } from "node:test";
import assert from "node:assert/strict";
import { LaneBattle } from "../src/battle";
import type { BattleConfig } from "../src/battle";
import { defaultTactics } from "../src/tactics";

function config(year=2016):BattleConfig {
  const skills=Object.fromEntries("creativity stability confidence stamina heroPool laning teamfights farming skirmish vision intuition pushing".split(" ").map(k=>[k,50]));
  return {seed:4182,year,patchId:`${year}.1`,teams:["A","B"],bonuses:[0,0],playerControl:1,
    patchObservers:[{teamKey:"same",staffIds:["c1","c4","c5","c6"]},{teamKey:"same",staffIds:["c1","c4","c5","c6"]}],
    players:[0,1].map(side=>Array.from({length:5},(_,role)=>({id:`${side}:${role}`,name:`${side} Player ${role}`,role,skills:{...skills},energy:100,happiness:100}))) as BattleConfig["players"],
    tacticalPreparations:[defaultTactics(),defaultTactics()],captureReplay:false,captureTimeline:false,seriesFormat:{bestOf:1}};
}

// Spell values are scaled ×.42 for the small map, but hero health is full
// Dota scale, so spells hitting enemy heroes are restored to full value.
test("spells hit enemy heroes at full Dota damage; attacks, creeps and allies are unchanged", () => {
  const battle=new LaneBattle(config()) as any;
  const [caster,victim]=[battle.units.find((u:any)=>u.kind==="hero"&&u.team===0),battle.units.find((u:any)=>u.kind==="hero"&&u.team===1)];
  const ally=battle.units.find((u:any)=>u.kind==="hero"&&u.team===0&&u!==caster);
  const hit=(target:any,spell:boolean)=>{target.max=target.hp=1e6;target.shield=0;target.reductionUntil=0;target.bkbUntil=0;battle.damage(caster,target,100,spell);return 1e6-target.hp;};
  const attack=hit(victim,false),spell=hit(victim,true);
  assert.ok(Math.abs(spell/attack-1/.42)<1e-9,`spell/attack ratio ${spell/attack}`);
  assert.ok(Math.abs(hit(ally,true)/hit(ally,false)-1)<1e-9,"friendly spell damage is not boosted");
  for(let i=0;i<400&&!battle.units.some((u:any)=>u.kind==="creep"&&u.team===1&&!u.dead&&u.wait<=0);i++)battle.step();
  const creep=battle.units.find((u:any)=>u.kind==="creep"&&u.team===1&&!u.dead&&u.wait<=0);
  assert.ok(creep,"a lane creep spawned");
  creep.max=creep.hp=1e6;battle.damage(caster,creep,100,true);const creepSpell=1e6-creep.hp;
  creep.hp=1e6;battle.damage(caster,creep,100,false);
  assert.ok(Math.abs(creepSpell/(1e6-creep.hp)-1)<1e-9,"spells against creeps keep the small-map scale");
});

test("fight reads count ready spells and nearby towers, not just attacks", () => {
  const battle=new LaneBattle(config()) as any;
  for(let i=0;i<300;i++)battle.step(); // levels so spells are learned
  const side=battle.units.filter((u:any)=>u.kind==="hero"&&u.team===0);
  for(const u of side){u.mana=u.maxMana=1e4;u.silenceUntil=0;u.stun=0;u.threat=undefined;for(const s of u.spells)s.readyAt=0;}
  const ready=battle.fightPower(side);
  for(const u of side){u.threat=undefined;for(const s of u.spells)s.readyAt=1e9;}
  const cooling=battle.fightPower(side);
  assert.ok(ready>cooling*1.05,`ready spells ${ready} should outweigh spells on cooldown ${cooling}`);
  const tower=battle.units.find((u:any)=>u.kind==="tower"&&u.team===0&&!u.dead);
  assert.ok(battle.fightPower(side,[tower])>cooling,"a tower in reach adds to the read");
});

test("a high-ground push carries on to the next building instead of going home", () => {
  const battle=new LaneBattle(config()) as any;
  for(let i=0;i<5;i++)battle.step();
  const rax=battle.units.filter((u:any)=>u.kind==="barracks"&&u.team===1&&u.lane===1);
  assert.equal(rax.length,2);
  for(const t of battle.units.filter((u:any)=>u.kind==="tower"&&u.team===1&&u.lane===1&&(u.tier??1)<=3)){t.dead=true;t.hp=0;}
  const heroes=battle.units.filter((u:any)=>u.kind==="hero"&&u.team===0);
  battle.plays[0]={id:99,strategyId:"high-ground",side:0,source:"bot",participants:heroes.map((u:any)=>u.id),targetLane:1,targetUnit:rax[0].id,
    stage:"engaging",startedAt:battle.clock,expiresAt:battle.clock+300,baselineInvolvement:0,rally:{x:heroes[0].x,y:heroes[0].y}};
  rax[0].dead=true;rax[0].hp=0;
  battle.updatePlans();
  assert.equal(battle.plays[0]?.targetUnit,rax[1].id,"the push moves on to the second barracks");
});

test("named stun, sleep and lift durations count as disables", async () => {
  const { combatCatalogue, spellEffects } = await import("../src/combat-model");
  const { patchForSeason } = await import("../src/patches");
  const abilities = combatCatalogue(patchForSeason(2016, 1))!.abilities;
  const control = (id: string, rank: number) => spellEffects(abilities[id], rank).control;
  assert.equal(control("sven_storm_bolt", 1), 2);
  assert.equal(control("magnataur_reverse_polarity", 3), 3.75);
  assert.equal(control("lion_impale", 4), 2.6);
  assert.equal(control("chaos_knight_chaos_bolt", 4), 3, "random stuns count at their midpoint");
  assert.ok(control("elder_titan_echo_stomp", 2) > 0 && control("invoker_tornado", 1) > 0);
  assert.equal(control("rattletrap_hookshot", 1), 0, "a stun radius is not a duration");
});

test("a hero that attacks stays visible to its enemies until its next attack", () => {
  const battle=new LaneBattle(config()) as any;
  battle.step();
  const attacker=battle.units.find((u:any)=>u.kind==="hero"&&u.team===0);
  attacker.revealedUntil=0;
  const far=battle.units.find((u:any)=>u.kind==="hero"&&u.team===1);
  attacker.x=far.x+3000;attacker.y=far.y+3000;battle.unitSightTime=-1;battle.sightCache=[undefined,undefined];
  assert.equal(battle.canSeeUnit(1,attacker),false,"out of sight before attacking");
  attacker.revealedUntil=battle.clock+5;battle.unitSightTime=-1;
  assert.equal(battle.canSeeUnit(1,attacker),true,"revealed while attacking");
});
