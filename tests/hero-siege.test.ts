import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LaneBattle,type BattleConfig} from '../src/battle';
import {heroById} from '../src/heroes';
import {heroAbilities,combatCatalogue} from '../src/combat-model';
import {patchById} from '../src/patches';
import {defaultTactics} from '../src/tactics';
import {nearestWalkablePoint} from '../src/map-vision';
import {mapEraForPatch} from '../src/map-eras';
const config=(id='2023.1'):BattleConfig=>({seed:941,year:+id.slice(0,4),patchId:id,teams:['A','B'],bonuses:[0,0],captureReplay:false,captureTimeline:false,
 players:[0,1].map(side=>Array.from({length:5},(_,role)=>({id:`${side}:${role}`,name:`P${side}:${role}`,role,energy:100,happiness:100,skills:{laning:50,teamfights:50,farming:50,stability:50,intuition:50}}))) as BattleConfig['players'],
 tacticalPreparations:[{...defaultTactics(),autoGlyph:false},{...defaultTactics(),autoGlyph:false}]});
type Unit=LaneBattle['units'][number];
function prepare(id:string,ability?:string,level=18,patch='2023.1'){
 const b=new LaneBattle(config(patch)),p=patchById(patch)!,u=b.units.find(u=>u.player&&u.team===0)!;
 for(const h of b.units.filter(u=>u.player)){h.dead=true;h.respawn=99999;h.cd=99999;}
 u.dead=false;u.hero=heroById(id)!;u.level=level;let slot=0;
 u.spells=heroAbilities(id,p).map(definition=>({definition,slot:definition.ultimate||definition.granted?0:slot++,readyAt:0,casts:0})).filter(s=>!ability||s.definition.id===ability);
 const e=b as unknown as {recalculate:(u:Unit)=>void;castNamed:(u:Unit,t?:Unit)=>void;updateDots:()=>void;updateBackdoor:()=>void;damage:(a:Unit,t:Unit,n:number)=>void};
 e.recalculate(u);u.hp=u.max;u.mana=u.maxMana=10000;return{b,u,e};
}
test('historical source arrays retain damage and individual attack ranges rather than becoming zero',()=>{
 const p=patchById('2023.1')!,data=combatCatalogue(p)!;
 assert.ok(data.abilities.pugna_nether_blast.damage[0]>0);assert.ok(data.abilities.jakiro_liquid_fire.damage[0]>0);
 assert.equal(data.heroes.sniper.stats.AttackRange,550);assert.ok(data.heroes.lina.stats.AttackRange>550);
 assert.deepEqual(data.abilities.sniper_take_aim.siege!.rangeBonus,[100,200,300,400]);
});
test('Sniper gains learned Take Aim reach while melee and other ranged heroes keep their source ranges',()=>{
 const {u:sniper}=prepare('sniper'),{u:lina}=prepare('lina'),{u:axe}=prepare('axe'),{u:unlearned}=prepare('sniper',undefined,1);
 assert.ok(sniper.range>lina.range);assert.ok(lina.range>axe.range);assert.ok(sniper.range>unlearned.range);
});
test('Nether Blast can damage a legal building, spends mana and respects Glyph',()=>{
 const {b,u,e}=prepare('pugna','pugna_nether_blast',7,'2017.1'),tower=b.units.find(v=>v.kind==='tower'&&v.team===1&&v.tier===1&&v.lane===1)!;
 u.x=tower.x-60;u.y=tower.y;const hp=tower.hp,mana=u.mana;e.castNamed(u);
 assert.ok(tower.hp<hp);assert.ok(u.mana<mana);assert.equal(u.spells[0].casts,1);assert.ok(u.buildingDamage>0);
 u.spells[0].readyAt=0;assert.equal(b.useGlyph(1),null);const protectedHp=tower.hp;e.castNamed(u);
 assert.equal(tower.hp,protectedHp);assert.equal(u.spells[0].casts,1);
});
test('Liquid Fire burns buildings over time and slows their attacks without inventing instant burst',()=>{
 const {b,u,e}=prepare('jakiro','jakiro_liquid_fire',18),tower=b.units.find(v=>v.kind==='tower'&&v.team===1&&v.tier===1&&v.lane===1)!;
 // Place on reachable ground beside the tower rather than across a cliff.
 Object.assign(u,nearestWalkablePoint(mapEraForPatch({id:'2023.1'}),tower.x,tower.y)!);const hp=tower.hp;e.castNamed(u);assert.equal(tower.hp,hp);assert.ok(tower.attackSlow>0);
 b.time+=.2;e.updateDots();assert.ok(tower.hp<hp);assert.ok(u.buildingDamage>0);
 const before=tower.hp; b.time+=30/6;e.updateDots();assert.ok(tower.hp<before);const ended=tower.hp;b.time+=5;e.updateDots();assert.equal(tower.hp,ended);
});
test('Dragon Form consumes its real cooldown and mana, gives temporary reach and corrosive attacks',()=>{
 const {b,u,e}=prepare('dragon_knight','dragon_knight_elder_dragon_form',6),enemy=b.units.find(v=>v.player&&v.team===1)!;
 enemy.dead=false;enemy.x=u.x+40;enemy.y=u.y;const range=u.range,mana=u.mana;e.castNamed(u,enemy);
 assert.ok(u.range>range);assert.ok(u.formUntil>b.clock);assert.ok(u.corrosionDps>0);assert.ok(u.mana<mana);assert.equal(u.spells[0].casts,1);
 b.time=11;b.step();assert.equal(u.range,range);assert.equal(u.spells[0].casts,1);
});
test('Serpent Wards are bounded, destructible, expiring units and never disable backdoor protection',()=>{
 const {b,u,e}=prepare('shadow_shaman','shadow_shaman_mass_serpent_ward',6,'2017.1'),tower=b.units.find(v=>v.kind==='tower'&&v.team===1&&v.tier===2&&v.lane===1)!;
 b.units.find(v=>v.kind==='tower'&&v.team===1&&v.tier===1&&v.lane===1)!.dead=true;
 u.x=tower.x-80;u.y=tower.y;e.castNamed(u,tower);
 const wards=b.units.filter(v=>v.summonOwner===u.id);assert.equal(wards.length,3);assert.ok(wards.every(v=>v.summonExpires!>b.clock));
  assert.equal(b.useGlyph(0),null);const wardHp=wards[0].hp;e.damage(b.units.find(v=>v.player&&v.team===1)!,wards[0],10);assert.ok(wards[0].hp<wardHp,'Glyph does not make summons invulnerable');
 e.updateBackdoor();assert.equal(b.snapshot().units.find(v=>v.id===tower.id)!.backdoor,true);
 e.damage(b.units.find(v=>v.player&&v.team===1)!,wards[0],10000);assert.equal(wards[0].dead,true);
  b.time=46/6;b.step();assert.equal(b.units.filter(v=>v.summonOwner===u.id&&!v.dead).length,0);
});
test('wave-clear spells hit actual clustered lane creeps, giving defenders an advantage against a push',()=>{
 const {b,u,e}=prepare('lina','lina_dragon_slave',7),spawn=b as unknown as {spawn:()=>void};spawn.spawn();
 u.x=400;u.y=400;const creeps=b.units.filter(v=>v.kind==='creep'&&v.team===1).slice(0,3);
 for(const [i,c]of creeps.entries()){c.wait=0;c.x=450+i*5;c.y=400;c.hp=c.max=1000;}
 e.castNamed(u,creeps[0]);assert.ok(creeps.every(c=>c.hp<1000));assert.equal(u.spells[0].casts,1);
});
