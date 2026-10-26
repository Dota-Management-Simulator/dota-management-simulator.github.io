import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LaneBattle } from '../src/battle';
import { LiveBattleSession } from '../src/live-battle';
import { buildBattleConfig, createCampaign, DEFAULT_SETTINGS, events } from '../src/game';
import { abilitySummary, combatCatalogue, heroAbilities, spellEffects } from '../src/combat-model';
import { itemForPatch, itemsAvailableForPatch } from '../src/items';
import { historicalPatches, patchForSeason } from '../src/patches';
const patch=patchForSeason(2023,2);
const config=()=>({...buildBattleConfig(createCampaign(DEFAULT_SETTINGS),events[0],951),year:2023,heroPoolThroughYear:2022,patchId:patch.id,captureReplay:false});
type Unit=LaneBattle['units'][number];
function setup(){
  const b=new LaneBattle(config()),heroes=b.units.filter(u=>u.player),u=heroes[0],v=heroes[5];
  heroes.forEach((h,i)=>{h.x=100+i*5;h.y=100;h.spells=[];h.inventory=[];h.tpCharges=0;});
  u.x=400;u.y=400;v.x=410;v.y=400;
  const engine=b as unknown as {recover:(u:Unit)=>void;regeneration:(u:Unit)=>{hp:number;mana:number};shop:()=>void;useItems:(u:Unit)=>void;useTeleport:(u:Unit)=>boolean;castNamed:(u:Unit,v?:Unit)=>void;attack:(u:Unit,v:Unit)=>void;damage:(u:Unit,v:Unit,n:number)=>void;updateDots:()=>void;channelDrain:(u:Unit)=>boolean};
  return {b,u,v,heroes,engine};
}
function learn(u:Unit,id:string,hero:string,level=18){u.spells=[{definition:heroAbilities(hero,patch).find(a=>a.id===id)!,slot:0,readyAt:0,casts:0}];u.level=level;u.maxMana=2000;u.mana=2000;}

test('all historical spells/items have an honest short guide and every phase includes source TP costs',()=>{
  for(const p of historicalPatches){
    const c=combatCatalogue(p)!;
    assert.ok(c.items.item_tpscroll.cost>0,p.id);
    for(const a of Object.values(c.abilities))assert.ok(abilitySummary(a).length>15,a.id);
    for(const i of itemsAvailableForPatch(p))assert.ok(i.description.length>8,i.id);
    assert.ok(itemsAvailableForPatch(p).some(i=>i.id==='tpscroll'));
  }
  assert.match(itemForPatch('arcane_boots',patch).description,/Restores mana/);
});
test('HP/mana regeneration scales with attributes, items and fountain; stunned living heroes still regenerate',()=>{
  const {b,u,engine}=setup();u.hp=100;u.mana=0;
  const base=engine.regeneration(u);u.strength+=20;u.intelligence+=20;
  assert.ok(engine.regeneration(u).hp>base.hp);assert.ok(engine.regeneration(u).mana>base.mana);
  u.inventory=['ring_of_regen','sobi_mask'];
  const geared=engine.regeneration(u);assert.ok(geared.hp>base.hp);assert.ok(geared.mana>base.mana);
  u.stun=10;u.cd=100;b.step();assert.ok(u.hp>100);assert.ok(u.mana>0);
  const home=b.units.find(h=>h.team===u.team&&h.kind==='base')!;u.x=home.x;u.y=home.y;
  assert.ok(engine.regeneration(u).hp>geared.hp*2);
  u.hp=u.max-.01;u.mana=u.maxMana-.01;engine.recover(u);assert.equal(u.hp,u.max);assert.equal(u.mana,u.maxMana);
});
test('dead heroes do not regenerate and natural recovery never inflates healing statistics',()=>{
  const {b,u}=setup();u.hp=0;u.mana=0;u.dead=true;u.respawn=100;b.step();assert.equal(u.hp,0);assert.equal(u.mana,0);assert.equal(u.healing,0);
});
test('Crystal Maiden aura helps living allies globally with a stronger nearby effect and stops on death',()=>{
  const {u,heroes,engine}=setup(),cm=heroes[1];learn(cm,'crystal_maiden_brilliance_aura','crystal_maiden');cm.x=20;cm.y=20;
  const far=engine.regeneration(u).mana;cm.x=u.x;cm.y=u.y;const near=engine.regeneration(u).mana;
  assert.ok(near>far);cm.dead=true;assert.ok(far>engine.regeneration(u).mana);
});
test('Mana Break burns actual mana and Mana Void rewards targeting a depleted mana pool',()=>{
  const {u,v,engine}=setup();learn(u,'antimage_mana_break','anti_mage');v.maxMana=v.mana=1000;v.hp=v.max=100000;
  engine.attack(u,v);assert.ok(v.mana<1000);assert.equal(u.spells[0].casts,0);
  learn(u,'antimage_mana_void','anti_mage');engine.castNamed(u,v);assert.equal(u.spells[0].casts,0);
  v.mana=0;const hp=v.hp;engine.castNamed(u,v);assert.ok(v.hp<hp);assert.equal(u.spells[0].casts,1);
});
test('Hook pulls enemies, Frostbite roots and ticks instead of delivering its full damage instantly',()=>{
  const {b,u,v,engine}=setup();learn(u,'pudge_meat_hook','pudge');v.x=600;v.hp=v.max=100000;
  const gap=Math.abs(v.x-u.x);engine.castNamed(u,v);assert.ok(Math.abs(v.x-u.x)<gap);
  learn(u,'crystal_maiden_frostbite','crystal_maiden');v.x=410;const before=v.hp;engine.castNamed(u,v);
  assert.equal(v.hp,before);assert.ok(v.rootUntil>0);b.time+=.2;engine.updateDots();assert.ok(v.hp<before);
});
test('Culling Blade waits for a kill threshold and resets only after a successful execution',()=>{
  const {u,v,engine}=setup();learn(u,'axe_culling_blade','axe');v.hp=v.max=100000;engine.castNamed(u,v);assert.equal(u.spells[0].casts,0);
  v.hp=10;v.bkbUntil=100;v.shield=1000;v.shieldUntil=100;v.reduction=.8;v.reductionUntil=100;
  engine.castNamed(u,v);assert.ok(v.dead);assert.equal(u.spells[0].readyAt,0);
});
test('Ursa stacks damage per target, Overpower spends a limited attack burst, and Enrage reduces damage',()=>{
  const {b,u,v,engine}=setup();learn(u,'ursa_fury_swipes','ursa');v.hp=v.max=100000;b.random=()=>.99;
  engine.attack(u,v);const first=100000-v.hp;u.cd=0;const hp=v.hp;engine.attack(u,v);assert.ok(hp-v.hp>first);
  b.time=20;u.cd=0;const expired=v.hp;engine.attack(u,v);assert.ok(Math.abs(expired-v.hp-first)<.001);
  learn(u,'ursa_overpower','ursa');engine.castNamed(u,v);u.cd=0;engine.attack(u,v);assert.ok(u.attackBoostHits>0);assert.ok(u.cd<u.rate);
  learn(u,'ursa_enrage','ursa');u.hp=u.max;engine.castNamed(u,v);const before=u.hp;engine.damage(v,u,100);assert.ok(before-u.hp<30);
});
test('Kraken Shell blocks physical attacks and Huskar gains recovery and speed as health falls',()=>{
  const {u,v,engine}=setup();learn(u,'tidehunter_kraken_shell','tidehunter');u.hp=u.max;const hp=u.hp;engine.damage(v,u,100);assert.ok(hp-u.hp<100);
  learn(u,'huskar_berserkers_blood','huskar');u.hp=u.max;const healthy=engine.regeneration(u).hp;u.cd=0;engine.attack(u,v);const slow=u.cd;
  u.hp=u.max*.2;assert.ok(engine.regeneration(u).hp>healthy);u.cd=0;engine.attack(u,v);assert.ok(u.cd<slow);
});
test('Mana Drain transfers actual mana during a channel and a disable interrupts further transfer',()=>{
  const {b,u,v,engine}=setup();learn(u,'lion_mana_drain','lion');u.mana=0;v.mana=500;engine.castNamed(u,v);assert.ok(u.drain);
  b.time+=.2;engine.channelDrain(u);assert.ok(u.mana>0);assert.ok(v.mana<500);
  u.silenceUntil=100;const mana=v.mana;assert.equal(engine.channelDrain(u),false);assert.equal(v.mana,mana);
});
test('lifesteal restores HP on attacks; Orchid and Hex consume mana and stop spell casts',()=>{
  const {u,v,engine}=setup();u.inventory=['lifesteal'];u.hp=10;v.hp=v.max=100000;engine.attack(u,v);assert.ok(u.hp>10);
  u.inventory=['orchid'];u.mana=1000;engine.useItems(u);assert.ok(v.silenceUntil>0);assert.ok(u.mana<1000);
  learn(v,'lina_dragon_slave','lina');engine.castNamed(v,u);assert.equal(v.spells[0].casts,0);
  u.inventory=['sheepstick'];engine.useItems(u);assert.ok(v.stun>0);
});
test('consumable regen starts on use, consumes the item and Salve/Clarity break on hero damage',()=>{
  const {b,u,v,engine}=setup();u.inventory=['flask','clarity'];u.hp=20;u.mana=0;
  const base=engine.regeneration(u);assert.ok(base.hp<5);engine.useItems(u);assert.deepEqual(u.inventory,[]);assert.equal(u.recovery.length,2);
  b.time+=.2;engine.recover(u);assert.ok(u.hp>20+base.hp*1.2);assert.ok(u.mana>base.mana*1.2);
  engine.damage(v,u,1);assert.equal(u.recovery.length,0);
});
test('TP scroll purchase uses individual gold and a utility slot even with six occupied item slots',()=>{
  const {b,u,engine}=setup();u.inventory=['heart','bkb','butterfly','rapier','scepter','desolator'];u.gold=10000;
  assert.equal(b.prioritizeItem(u.team,u.player!.id,'tpscroll'),undefined);const before=u.spent;engine.shop();
  assert.equal(u.inventory.length,6);assert.equal(u.tpCharges,1);assert.equal(u.spent-before,itemForPatch('tpscroll',patch).cost);assert.equal(u.itemPriority,undefined);
});
test('TP channels consume mana/charge, cannot move before completion and fail on disable or destroyed destination',()=>{
  const {b,u,engine}=setup();u.retreat=true;u.tpCharges=1;u.mana=500;const start=[u.x,u.y];assert.equal(engine.useTeleport(u),true);
  assert.deepEqual([u.x,u.y],start);assert.equal(u.tpCharges,0);assert.ok(u.mana<500);assert.ok(u.tpReadyAt>0);
  b.time=1;engine.useTeleport(u);const home=b.units.find(v=>v.team===u.team&&v.kind==='base')!;assert.deepEqual([u.x,u.y],[home.x,home.y]);
  u.x=400;u.y=400;u.tpCharges=1;u.tpReadyAt=0;engine.useTeleport(u);u.stun=1;assert.equal(engine.useTeleport(u),false);assert.equal(u.teleport,undefined);assert.equal(u.tpCharges,0);
  u.stun=0;u.tpCharges=1;u.tpReadyAt=0;engine.useTeleport(u);home.dead=true;assert.equal(engine.useTeleport(u),false);assert.deepEqual([u.x,u.y],[400,400]);
});
test('resource/TP mechanics remain deterministic across live chunk sizes and snapshots do not mutate state',()=>{
  const a=new LiveBattleSession(config()),b=new LiveBattleSession(config());
  a.advance(120);for(let i=0;i<10;i++)b.advance(12);
  assert.deepEqual(a.battle.snapshot(),b.battle.snapshot());assert.deepEqual(a.battle.snapshot(),a.battle.snapshot());
  assert.ok(a.battle.snapshot().players.every(p=>p.hpRegen!=null&&p.teleport));
});
