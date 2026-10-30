import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LaneBattle } from '../src/battle';
import type { BattleConfig } from '../src/battle';
import { reactionSeconds } from '../src/player-control';
import { LiveBattleSession } from '../src/live-battle';
import { makePlayerTree } from '../src/player-identity';
import { buildBattleConfig, createCampaign, DEFAULT_SETTINGS, events } from '../src/game';
import { heroAbilities } from '../src/combat-model';
import { patchForSeason } from '../src/patches';

const statKeys='creativity stability confidence stamina heroPool laning teamfights farming skirmish vision intuition pushing'.split(' ');
function config(skill=50): BattleConfig {
  return { playerControl:1,seed:778192,year:2024,heroPoolThroughYear:2023,patchId:'2024.2',teams:['A','B'],bonuses:[0,0],captureReplay:false,captureTimeline:false,
    draft:[['anti_mage','shadow_fiend','axe','rubick','dazzle'],['spectre','puck','tidehunter','vengeful_spirit','witch_doctor']],
    players:[0,1].map(side=>Array.from({length:5},(_,role)=>({id:`${side}:${role}`,name:`${side}:${role}`,role,skills:Object.fromEntries(statKeys.map(key=>[key,skill])),energy:100,happiness:100,heroMastery:Object.fromEntries(['anti_mage','shadow_fiend','axe','rubick','dazzle','spectre','puck','tidehunter','vengeful_spirit','witch_doctor'].map(id=>[id,skill]))}))) as BattleConfig['players'] };
}
type Unit=LaneBattle['units'][number];
type Internals={attack:(a:Unit,b:Unit)=>void;cast:(a:Unit,b:Unit)=>void;castNamed:(a:Unit,b:Unit)=>void;damage:(a:Unit,b:Unit,n:number)=>void;gainXp:(a:Unit,n:number)=>void;reaction:(a:Unit,key:string,purpose:string)=>number;readySpellDecision:(a:Unit)=>boolean;skill:(a:Unit,key:string)=>number;farm:(a:Unit)=>boolean};
function fixture(skill:number) {
  const b=new LaneBattle(config(skill)), units=b.units.filter(u=>u.player),u=units[0],v=units[5];
  for(const h of units){h.x=-1500-h.id*30;h.y=-1500;h.spells=[];h.inventory=[];h.tpCharges=0;}
  u.x=400;u.y=400;v.x=401;v.y=400;v.hp=10000;v.max=10000;v.agility=0;
  return {b,u,v,engine:b as unknown as Internals};
}
test('the same hero has identical kit stats across zero, novice, expert and mastered controllers',()=>{
  const baseline=fixture(0);
  for(const skill of [15,50,99]){
    const peer=fixture(skill);
    for(const field of ['damage','max','maxMana','speed','range','rate','strength','agility','intelligence','power'] as const)assert.equal(peer.u[field],baseline.u[field],field);
  }
});
test('forced identical attacks and spell casts have the same output regardless of player skills',()=>{
  const low=fixture(0),high=fixture(99);
  low.engine.attack(low.u,low.v);high.engine.attack(high.u,high.v);assert.equal(low.v.hp,high.v.hp);assert.equal(low.u.cd,high.u.cd);
  low.u.abilityCd=0;high.u.abilityCd=0;low.v.hp=10000;high.v.hp=10000;
  low.engine.cast(low.u,low.v);high.engine.cast(high.u,high.v);assert.equal(low.v.hp,high.v.hp);
});

test('the same named spell has equal damage, mana cost and source cooldown for every controller',()=>{
  const low=fixture(0),high=fixture(99),definition=heroAbilities('lina',patchForSeason(2024,2)).find(a=>a.id==='lina_dragon_slave')!;
  for(const x of [low,high]){
    x.u.level=18;x.u.mana=x.u.maxMana=2000;x.u.spells=[{definition,slot:0,readyAt:0,casts:0}];
    x.engine.castNamed(x.u,x.v);assert.equal(x.u.spells[0].casts,1);assert.ok(x.v.hp<10000);
  }
  assert.equal(low.v.hp,high.v.hp);assert.equal(low.u.mana,high.u.mana);assert.equal(low.u.spells[0].readyAt,high.u.spells[0].readyAt);
});
test('the same XP award and real last hit pay identical resources to different controllers',()=>{
  const low=fixture(0),high=fixture(99);
  low.engine.gainXp(low.u,10);high.engine.gainXp(high.u,10);assert.equal(low.u.totalXp,high.u.totalXp);
  for(const x of [low,high]){x.v.kind='creep';x.v.hp=1;x.u.cd=0;x.engine.damage(x.u,x.v,10);}
  assert.equal(low.u.gold,high.u.gold);assert.equal(low.u.lastHits,high.u.lastHits);assert.equal(low.u.totalXp,high.u.totalXp);
});
test('hero handling and skills improve reaction decisions without shortening any ability cooldown',()=>{
  const low=fixture(0),high=fixture(99);
  assert.ok(high.engine.reaction(high.u,'teamfights','test')<low.engine.reaction(low.u,'teamfights','test'));
  assert.equal(high.u.rate,low.u.rate);assert.equal(high.u.abilityCd,low.u.abilityCd);
  assert.equal(low.engine.readySpellDecision(low.u),true);assert.equal(high.engine.readySpellDecision(high.u),true);
  low.b.time=high.b.time=.5;
  assert.equal(low.engine.readySpellDecision(low.u),false);assert.equal(high.engine.readySpellDecision(high.u),true);
  assert.ok(reactionSeconds(70,70,100,100,.5)<reactionSeconds(70,70,20,20,.5));
});
test('a last-hit specialist waits for an actual kill window rather than gaining damage',()=>{
  const x=fixture(99);x.v.kind='creep';x.v.hp=x.u.damage*1.5;
  const ally=x.b.units.find(u=>u.kind==='creep'&&u.team===0);
  // A normal wave is not spawned until the first scheduled spawn.
  x.b.step();const creep=ally??x.b.units.find(u=>u.kind==='creep'&&u.team===0);
  if(!creep)throw Error('No allied creep spawned');
  creep.x=x.v.x;creep.y=x.v.y;creep.range=100;
  let waited=false;
  for(let clock=0;clock<60;clock+=6){x.b.time=clock/6;x.u.cd=0;const hp=x.v.hp;x.engine.attack(x.u,x.v);if(x.v.hp===hp){waited=true;break;}x.v.hp=x.u.damage*1.5;}
  assert.ok(waited);const before=x.v.hp;x.v.hp=1;x.u.cd=0;x.engine.attack(x.u,x.v);assert.ok(x.v.dead||x.v.hp<before);
});
test('conditional innate skill points change controller input without adding damage or health',()=>{
  const cfg=config(50);cfg.players[0][0].identity={version:1,innateRules:2,innateId:'last-hit-rhythm',tree:makePlayerTree('controller','last-hit-rhythm')};
  const b=new LaneBattle(cfg),u=b.units.find(u=>u.player?.id==='0:0')!,v=b.units.find(u=>u.player?.id==='1:0')!;
  const engine=b as unknown as Internals;b.time=10;
  assert.ok(engine.skill(u,'laning')>50);const damage=u.damage,max=u.max;
  b.time=101;assert.equal(u.damage,damage);assert.equal(u.max,max);assert.ok(v.max>0);
});
test('new campaigns opt into decision control while frozen old preparations retain numerical rules',()=>{
  const c=createCampaign(DEFAULT_SETTINGS);assert.equal(buildBattleConfig(c,events[0],1).playerControl,1);
  const low=config(15),high=config(90);delete low.playerControl;delete high.playerControl;
  const a=new LaneBattle(low).units.find(u=>u.player)!,b=new LaneBattle(high).units.find(u=>u.player)!;
  assert.ok(a.power<b.power);assert.ok(a.speed<b.speed);
});
test('new controller state remains deterministic across live stepping, observation and chunk sizes',()=>{
  const cfg=config(50);cfg.captureReplay=true;const a=new LiveBattleSession(cfg),b=new LiveBattleSession(structuredClone(cfg));
  a.advance(120);for(let i=0;i<20;i++){b.update();b.advance(6);}
  assert.deepEqual(a.battle.snapshot(),b.battle.snapshot());
  assert.ok(a.battle.snapshot().players.every(p=>p.heroMastery?.decisionOnly&&p.heroMastery.skillBonus===0));
});
