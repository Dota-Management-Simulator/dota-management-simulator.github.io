import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LaneBattle } from '../src/battle';
import { buildBattleConfig, createCampaign, DEFAULT_SETTINGS, events } from '../src/game';
import { abilityRank, adjustedAbility, combatCatalogue, heroAbilities, rankValue, spellEffects } from '../src/combat-model';
import { historicalPatches, patchForSeason } from '../src/patches';
import { getHeroPool } from '../src/heroes';
import { publicPatchChanges } from '../src/PublicPatchLog';
import { itemForPatch, itemsAvailableForPatch } from '../src/items';
import { LiveBattleSession } from '../src/live-battle';
import { patchReport } from '../src/patch-knowledge';
import { simplifiedHeroNote } from '../src/patch-notes';

const config=()=>({...buildBattleConfig(createCampaign(DEFAULT_SETTINGS),events[0],951),year:2023,heroPoolThroughYear:2022,patchId:'2023.2',captureReplay:true});
test('every draftable hero in every historical composite has a dated named kit; early references are explicitly provisional',()=>{
  for(const patch of historicalPatches){
    const table=combatCatalogue(patch)!;
    assert.ok(table.signature&&table.source.url.startsWith('https://github.com/'));
    for(const hero of getHeroPool(patch.year,patch.year-1,patch)){
      const kit=heroAbilities(hero.id,patch);assert.ok(kit.length,`${patch.id}/${hero.id}`);
      assert.ok(kit.every(a=>a.name&&[...a.cooldown,...a.mana,...a.damage].every(Number.isFinite)));
    }
    if(patch.year<=2013)assert.equal(table.source.provisional,true);
  }
  assert.equal(heroAbilities('lina',patchForSeason(2014,1)).find(a=>a.id==='lina_dragon_slave')!.cooldown[0],8.5);
  assert.deepEqual(heroAbilities('lina',patchForSeason(2023,2)).find(a=>a.id==='lina_dragon_slave')!.cooldown,[11,10,9,8]);
});
test('public log includes the full recovered changed hero set, structural changes and item notes without granting research',()=>{
  const patch=patchForSeason(2023,1),notes=publicPatchChanges(patch);
  assert.ok(new Set(notes.filter(n=>n.kind==='hero').map(n=>n.id)).size>100);
  assert.ok(notes.some(n=>n.kind==='item'&&/Black King Bar/i.test(n.subject)));
  for(const type of ['Scepter','Shard','Talent','Rework / rules','Cooldown'])assert.ok(notes.some(n=>n.category===type),type);
  assert.equal(patchReport(patch,{teamKey:'blind',staffIds:[]}).heroes.length,0);
  assert.equal(patchReport(patch,{teamKey:'blind',staffIds:['c2']}).heroes.length,1);
  assert.match(simplifiedHeroNote('New ability: Flame Cloak replaces the old Scepter upgrade. Grants flying movement.'),/Flame Cloak replaces.*flying movement/);
  assert.equal(simplifiedHeroNote('Damage increased from 100 to 120; healing reduced from 80 to 60'),'Damage increased; healing reduced');
});
test('named spell casts spend mana, damage actual targets and obey source rank cooldowns on the game clock',()=>{
  const battle=new LaneBattle(config()),units=battle.units.filter(u=>u.player),caster=units[0],enemy=units[5];
  const definition=heroAbilities('lina',patchForSeason(2023,2)).find(a=>a.id==='lina_dragon_slave')!;
  caster.level=7;caster.mana=10000;caster.x=400;caster.y=400;
  enemy.x=410;enemy.y=400;enemy.hp=enemy.max=100000;
  caster.spells=[{definition,slot:0,readyAt:0,casts:0}];
  const engine=battle as unknown as {castNamed:(u:typeof caster,e?:typeof enemy)=>void};
  const hp=enemy.hp;engine.castNamed(caster,enemy);
  assert.ok(enemy.hp<hp);assert.equal(caster.spells[0].casts,1);
  const rank=abilityRank(definition,caster.level),cooldown=rankValue(definition.cooldown,rank);
  assert.equal(caster.spells[0].readyAt,cooldown);
  assert.equal(caster.mana,10000-rankValue(definition.mana,rank));
  battle.time=(cooldown-.01)/6;engine.castNamed(caster,enemy);assert.equal(caster.spells[0].casts,1);
  battle.time=cooldown/6;engine.castNamed(caster,enemy);assert.equal(caster.spells[0].casts,2);
  const frame=battle.snapshot();assert.equal(frame.spellCasts!.length,2);
  const state=frame.players.find(p=>p.id===caster.player!.id)!.spells![0];assert.equal(state.cooldown,cooldown);assert.equal(state.readyAt,cooldown*2);
  const randomBefore=battle.random;assert.deepEqual(battle.snapshot(),frame);assert.equal(battle.random,randomBefore);
});
test('passives never fabricate casts, locked ultimates cannot fire, and healing restores measured HP',()=>{
  const battle=new LaneBattle(config()),units=battle.units.filter(u=>u.player),caster=units[0],ally=units[1];
  const passive=heroAbilities('lina',patchForSeason(2023,2)).find(a=>a.passive)!;
  caster.level=1;caster.spells=[{definition:passive,slot:0,readyAt:0,casts:0}];
  const engine=battle as unknown as {castNamed:(u:typeof caster,e?:typeof ally)=>void};
  engine.castNamed(caster,units[5]);assert.equal(caster.spells[0].casts,0);
  const heal=heroAbilities('chen',patchForSeason(2023,2)).find(a=>a.id==='chen_hand_of_god')!;
  caster.spells=[{definition:heal,slot:0,readyAt:0,casts:0}];caster.mana=10000;ally.hp=1;ally.max=10000;
  engine.castNamed(caster);assert.equal(ally.hp,1);
  caster.level=18;engine.castNamed(caster);assert.ok(ally.hp>1);assert.equal(caster.healing,ally.hp-1);
  assert.equal(caster.spells[0].casts,1);
  const effects=spellEffects(heal,3);assert.ok(effects.heal>0);
});
test('historical shop stats change actual purchases, era locks reject future items and opponent priorities cannot be altered',()=>{
  const early=patchForSeason(2014,1),late=patchForSeason(2023,2);
  assert.notEqual(itemForPatch('bkb',early).cost,itemForPatch('bkb',late).cost);
  assert.ok(!itemsAvailableForPatch(early).some(i=>i.id==='shard'));
  assert.ok(itemsAvailableForPatch(late).some(i=>i.id==='shard'));
  const session=new LiveBattleSession(config()),player=session.config.players[0][0],enemy=session.config.players[1][0];
  const unit=session.battle.units.find(u=>u.player?.id===player.id)!;unit.gold=100000;
  assert.match(session.command({type:'purchase-item',playerId:enemy.id,itemId:'scepter'}).message!,/your team/);
  assert.match(session.command({type:'purchase-item',playerId:player.id,itemId:'does-not-exist'}).message!,/unavailable/);
  session.command({type:'purchase-item',playerId:player.id,itemId:'scepter'});session.advance(6);
  assert.ok(unit.inventory.includes('scepter'));assert.ok(session.battle.itemEvents.some(e=>e.playerId===player.id&&e.item==='scepter'&&e.gold===4200));
  const occupied=unit.inventory.length;
  session.command({type:'purchase-item',playerId:player.id,itemId:'shard'});session.advance(2.4);
  assert.ok(unit.purchasedItems.includes('shard'));assert.ok(!unit.inventory.includes('shard'));assert.equal(unit.inventory.length,occupied);
  assert.match(session.command({type:'purchase-item',playerId:player.id,itemId:'shard'}).message!,/already owns/);
});
test('later source notes correct stale snapshots and hero-specific talent cooldowns require the chosen unlocked branch',()=>{
  const patch=patchForSeason(2023,2),a=heroAbilities('lina',patch).find(a=>a.id==='lina_dragon_slave')!;
  const before=adjustedAbility(a,'lina',9,{10:1},[],patch),after=adjustedAbility(a,'lina',10,{10:1},[],patch);
  assert.deepEqual(before.cooldown,a.cooldown);assert.ok(after.cooldown[0]<a.cooldown[0]);
  assert.deepEqual(adjustedAbility(a,'lina',10,{10:0},[],patch).cooldown,a.cooldown);
  const stale=combatCatalogue(patchForSeason(2023,1))!;
  assert.ok(stale.overlays!.some(s=>s.version==='7.33d'));
  assert.deepEqual(stale.abilities.lina_dragon_slave.cooldown,[11,10,9,8]);
});
test('source economy changes separate passive income, bounties, creep growth and net-worth assist rewards',()=>{
  const p26=combatCatalogue(patchForSeason(2020,1))!,p27=combatCatalogue(patchForSeason(2020,2))!;
  assert.equal(p26.rules.bountyMultiplier,.9);assert.equal(p27.rules.passiveGoldPerMinute,95);
  const before=combatCatalogue(patchForSeason(2022,2))!,after=combatCatalogue(patchForSeason(2023,1))!;
  assert.equal(before.rules.passiveGoldPerMinute,95*.85);assert.equal(before.rules.assistNetWorth,false);
  assert.equal(after.rules.assistNetWorth,true);assert.ok(after.rules.meleeGrowth<before.rules.meleeGrowth);
  const encounter=(patchId:string)=>{
    const b=new LaneBattle({...config(),patchId}),units=b.units.filter(u=>u.player),killer=units[0],helper=units[1],victim=units[5];
    victim.gold=20000;victim.inventory=[];victim.spent=0;victim.hp=1;victim.contributions.set(killer.id,b.time);victim.contributions.set(helper.id,b.time);
    const gold=helper.gold;(b as unknown as {damage:(a:typeof killer,t:typeof victim,value:number)=>void}).damage(killer,victim,10000);
    return helper.gold-gold;
  };
  assert.ok(encounter('2023.1')>encounter('2022.2'));
});
