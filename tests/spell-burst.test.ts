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
