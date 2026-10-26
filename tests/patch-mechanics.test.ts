import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LaneBattle, type BattleConfig } from '../src/battle';
import { historicalPatches, patchForSeason } from '../src/patches';
import { matchRules } from '../src/match-rules';
import { patchMechanics, patchMechanicsChanges } from '../src/patch-mechanics';
import { heroBalanceSignature } from '../src/hero-balance';
import { combatCatalogue, special } from '../src/combat-model';
import { balanceProblems } from '../scripts/balance-quality.mjs';

function resources(id:string){
  const c:BattleConfig={seed:9871,year:+id.slice(0,4),patchId:id,teams:['A','B'],bonuses:[0,0],captureReplay:false,captureTimeline:false,
    players:[0,1].map(side=>Array.from({length:5},(_,role)=>({id:`${side}:${role}`,name:'Benchmark',role,skills:{laning:50,teamfights:50,skirmish:50,stability:50},energy:100,happiness:100}))) as BattleConfig['players']};
  const b=new LaneBattle(c),u=b.units.find(u=>u.player)!;
  for(const h of b.units.filter(u=>u.player))h.spells=[];
  u.inventory=[];u.x=400;u.y=400;u.strength=40;u.intelligence=40;
  const regen=()=> (b as unknown as {regeneration:(u:typeof b.units[number])=>{hp:number;mana:number}}).regeneration(u);
  return {b,u,regen};
}
test('old percentage mana items and 7.07/7.20 regeneration formulas change actual recovery',()=>{
  for(const id of ['2011.2','2017.2','2018.1','2019.1','2026.2']){
    const p=patchForSeason(+id.slice(0,4),+id.at(-1)! as 1|2),{u,regen}=resources(id),r=matchRules(p),base=regen();
    u.inventory=['sobi_mask'];const withItem=regen(),a=combatCatalogue(p)!.items.item_sobi_mask;
    const amount=special(a,1,'bonus_mana_regen','mana_regen');
    const expected=r.regenFormula==='legacy-percent'?base.mana*amount/100:r.regenFormula==='attribute-amplified'?amount*(1+u.intelligence*.02):amount;
    assert.ok(Math.abs(withItem.mana-base.mana-expected)<1e-8,id);
    assert.ok(withItem.mana<10,`${id} must not turn 50% into 50 mana/s`);
  }
});
test('tower recovery uses living allied towers, era gates and nonstacking tiers',()=>{
  for(const id of ['2019.2','2020.1']){
    const {b,u,regen}=resources(id);
    const towers=b.units.filter(v=>v.kind==='tower'&&v.team===u.team);
    for(const tower of towers){tower.x=0;tower.y=0;}
    const before=regen().hp;
    for(const tower of towers){tower.x=u.x;tower.y=u.y;}
    assert.ok(Math.abs(regen().hp-before-(id==='2020.1'?1.2:0))<1e-8);
    for(const tower of towers)tower.dead=true;
    assert.equal(regen().hp,before);
  }
});
test('7.06 flat Urn and nearby item mana auras are not treated as percentage item regen',()=>{
  const {b,u,regen}=resources('2017.2'),base=regen().mana;
  u.inventory=['urn_of_shadows'];assert.ok(Math.abs(regen().mana-base-1)<1e-8);
  u.inventory=[];
  const ally=b.units.filter(v=>v.player&&v.team===u.team)[1];ally.inventory=['ring_of_basilius'];ally.x=u.x;ally.y=u.y;
  assert.ok(Math.abs(regen().mana-base-.65)<1e-8);
  u.inventory=['ring_of_basilius'];assert.ok(Math.abs(regen().mana-base-.65)<1e-8);
  u.inventory=[];ally.dead=true;assert.equal(regen().mana,base);
});
test('public mechanic deltas reflect live backdoor, Glyph, siege, regen and source TP values across all phases',()=>{
  for(const [i,p] of historicalPatches.entries()){
    const rows=patchMechanics(p),r=matchRules(p),tp=combatCatalogue(p)!.items.item_tpscroll;
    assert.equal(new Set(rows.map(r=>r.id)).size,9);
    assert.ok(rows.find(r=>r.id==='backdoor')!.value.includes(`${r.backdoorReduction*100}%`));
    assert.ok(rows.find(r=>r.id==='teleport')!.value.includes(`${tp.cost} gold`));
    const changed=patchMechanicsChanges(p,historicalPatches[i-1]);
    const before=new Map(i?patchMechanics(historicalPatches[i-1]).map(r=>[r.id,r.value]):[]);
    assert.deepEqual(changed.map(r=>r.id),rows.filter(r=>before.get(r.id)!==r.value).map(r=>r.id));
    assert.ok(heroBalanceSignature(p));
  }
  assert.ok(patchMechanicsChanges(patchForSeason(2021,1),patchForSeason(2020,2)).some(r=>r.id==='backdoor'));
  assert.ok(patchMechanicsChanges(patchForSeason(2018,1),patchForSeason(2017,2)).some(r=>r.id==='regeneration'));
  assert.deepEqual(patchMechanics(patchForSeason(2036,2)),patchMechanics(patchForSeason(2026,2)));
});
test('balance activation rejects weak/strong outliers, sparse evidence, stalls, side bias and implausible durations',()=>{
  const valid={rows:[{id:'a',power:0,winRate:50,played:400,low:44,high:56}],validationMaps:4096,
    meanAbsoluteError:3,baselineMeanAbsoluteError:6,
    matchMetrics:{failedMaps:0,completedMaps:4096,sideInterval:{low:47,high:53},duration:{p50:2400,p90:4000},shortGameFraction:.01}};
  assert.deepEqual(balanceProblems(valid),[]);
  const check=(edit:(r:typeof valid)=>void,key:string)=>{const r=structuredClone(valid);edit(r);assert.ok(balanceProblems(r).includes(key));};
  check(r=>r.rows[0].played=4,'insufficient-hero-samples');
  check(r=>r.rows[0].low=59,'heroes-above-58');
  check(r=>r.rows[0].high=41,'heroes-below-42');
  check(r=>r.matchMetrics.failedMaps=1,'unfinished-matches');
  check(r=>r.matchMetrics.sideInterval.low=56,'side-bias');
  check(r=>r.matchMetrics.duration.p50=400,'match-duration');
  check(r=>r.meanAbsoluteError=8,'target-error-above-6pp');
  check(r=>r.meanAbsoluteError=6,'no-measured-improvement');
  assert.ok(balanceProblems({...valid,matchMetrics:undefined}).includes('unfinished-matches'));
});
