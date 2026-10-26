import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LaneBattle, type BattleConfig } from '../src/battle';
import { LiveBattleSession } from '../src/live-battle';
import { matchRules, terrainHeight, terrainSight, buybackCost } from '../src/match-rules';
import { artPoint } from '../src/map-geometry';
import { mapEraForPatch } from '../src/map-eras';
import { patchById } from '../src/patches';
import { normalizeTactics, defaultTactics } from '../src/tactics';

const config=(patchId='2023.2'):BattleConfig=>({seed:731,year:+patchId.slice(0,4),patchId,teams:['A','B'],bonuses:[0,0],
  players:[0,1].map(side=>Array.from({length:5},(_,role)=>({id:`${side}:${role}`,name:`Player ${side}:${role}`,role,
    skills:{laning:70,farming:50,teamfights:50,skirmish:50,stability:50,intuition:50,vision:50,creativity:50},energy:100,happiness:100}))) as BattleConfig['players'],
  captureReplay:false,captureTimeline:false,tacticalPreparations:[{...defaultTactics(),autoGlyph:false},{...defaultTactics(),autoGlyph:false}]});
type Unit=LaneBattle['units'][number];
const engine=(b:LaneBattle)=>b as unknown as {damage:(a:Unit,b:Unit,n:number,spell?:boolean)=>void;attack:(a:Unit,b:Unit)=>void;updateBackdoor:()=>void;defendObjectives:()=>void;tryDeny:(a:Unit,b?:Unit)=>boolean;canTarget:(a:Unit,b:Unit)=>boolean;spawn:()=>void;nextSpawnClock:number;random:()=>number};
const heroes=(b:LaneBattle)=>b.units.filter(u=>u.kind==='hero');
function quiet(b:LaneBattle){for(const u of heroes(b)){u.dead=true;u.respawn=99999;}for(const u of b.units)u.cd=99999;}
function creep(b:LaneBattle,team:0|1,x:number,y:number){
  engine(b).spawn();const u=b.units.filter(u=>u.kind==='creep'&&u.team===team).at(-1)!;
  u.x=x;u.y=y;u.wait=0;return u;
}

test('backdoor protects tier 2 and Ancient, not tier 1; enemy live waves disable it with a 15s grace',()=>{
  const b=new LaneBattle(config()),e=engine(b),hero=heroes(b)[0],towers=b.units.filter(u=>u.kind==='tower'&&u.team===1),t1=towers.find(u=>u.tier===1)!,t2=towers.find(u=>u.tier===2)!;
  t2.lane=1; towers.find(u=>u.tier===1&&u.lane===1)!.dead=true;
  e.updateBackdoor();const hp=t2.hp;e.damage(hero,t2,100);const protectedLoss=hp-t2.hp;
  assert.ok(protectedLoss>0&&protectedLoss<100);assert.equal(b.snapshot().units.find(u=>u.id===t2.id)!.backdoor,true);
  const t1hp=t1.hp;e.damage(hero,t1,100);assert.ok(t1hp-t1.hp>protectedLoss);
  const wave=creep(b,0,t2.x,t2.y);e.updateBackdoor();assert.equal(b.snapshot().units.find(u=>u.id===t2.id)!.backdoor,false);
  wave.dead=true;b.time+=14/6;e.updateBackdoor();assert.equal(b.snapshot().units.find(u=>u.id===t2.id)!.backdoor,false);
  b.time+=2/6;e.updateBackdoor();assert.equal(b.snapshot().units.find(u=>u.id===t2.id)!.backdoor,true);
  assert.equal(b.snapshot().units.find(u=>u.kind==='base'&&u.team===1)!.backdoor,true);
  assert.equal(b.snapshot().units.find(u=>u.id===t1.id)!.backdoor,false);
});
test('backdoor heals only protected damage; waiting, dead and defending creeps cannot disable it',()=>{
  const b=new LaneBattle(config()),e=engine(b),hero=heroes(b)[0],tower=b.units.find(u=>u.kind==='tower'&&u.team===1&&u.tier===2)!;
  b.units.find(u=>u.kind==='tower'&&u.team===1&&u.tier===1&&u.lane===tower.lane)!.dead=true;
  tower.hp=900;const enemy=creep(b,0,tower.x,tower.y);enemy.wait=10;
  const friendly=creep(b,1,tower.x,tower.y);friendly.wait=0;
  e.updateBackdoor();assert.equal(b.snapshot().units.find(u=>u.id===tower.id)!.backdoor,true);
  e.damage(hero,tower,100);assert.ok(tower.hp<900);
  for(let i=0;i<30;i++){b.time+=.2;e.updateBackdoor();}
  assert.ok(Math.abs(tower.hp-900)<1e-8,'legal previous damage is never healed');
  enemy.wait=0;enemy.dead=true;e.updateBackdoor();assert.equal(b.snapshot().units.find(u=>u.id===tower.id)!.backdoor,true);
});
test('tier 2 cannot be targeted before the same-lane tier 1 is destroyed',()=>{
  const b=new LaneBattle(config()),hero=heroes(b)[0],tower=b.units.find(u=>u.kind==='tower'&&u.team===1&&u.tier===2)!;
  assert.equal(engine(b).canTarget(hero,tower),false);
  b.units.find(u=>u.kind==='tower'&&u.team===1&&u.tier===1&&u.lane===tower.lane)!.dead=true;
  assert.equal(engine(b).canTarget(hero,tower),true);
});
test('manual Glyph blocks all building damage, shares cooldown and protects creeps for its separate duration',()=>{
  const b=new LaneBattle(config()),e=engine(b),hero=heroes(b)[5],tower=b.units.find(u=>u.kind==='tower'&&u.team===0&&u.tier===1)!,wave=creep(b,0,400,400);
  b.time=180/6;assert.equal(b.useGlyph(0),null);assert.match(b.useGlyph(0)!,/already active/);
  const hp=tower.hp,creepHp=wave.hp;e.damage(hero,tower,10000);e.damage(hero,wave,10000,true);
  assert.equal(tower.hp,hp);assert.equal(wave.hp,creepHp);assert.equal(b.snapshot().glyphs![0].uses,1);
  b.time=185/6;e.damage(hero,wave,10);assert.ok(wave.hp<creepHp);e.damage(hero,tower,10);assert.equal(tower.hp,hp);
  b.time=188/6;assert.match(b.useGlyph(0)!,/ready in/);e.damage(hero,tower,10);assert.ok(tower.hp<hp);
  assert.equal(b.snapshot().glyphs![0].readyAt,480);
});
test('Auto Glyph can be disabled and re-enabled without changing the manual shared cooldown',()=>{
  const b=new LaneBattle(config()),tower=b.units.find(u=>u.kind==='tower'&&u.team===0)!;
  b.time=180/6;tower.hp=100;tower.lastDamagedAt=b.clock;engine(b).defendObjectives();assert.equal(b.snapshot().glyphs![0].uses,0);
  b.setAutoGlyph(0,true);b.time=181/6;engine(b).defendObjectives();assert.equal(b.snapshot().glyphs![0].uses,1);
  assert.equal(b.siegeEvents[0].automatic,true);const ready=b.snapshot().glyphs![0].readyAt;
  b.setAutoGlyph(0,false);assert.equal(b.snapshot().glyphs![0].readyAt,ready);assert.match(b.useGlyph(0)!,/already active/);
  assert.equal(normalizeTactics({autoGlyph:false}).autoGlyph,false);
  assert.equal(normalizeTactics({autoGlyph:'false'}).autoGlyph,undefined);
});
test('Glyph refreshes once per tower tier in modern eras, and on each tier 1 in older eras',()=>{
  for(const id of ['2016.1','2023.2']){
    const b=new LaneBattle(config(id)),hero=heroes(b)[5];b.time=180/6;b.useGlyph(0);b.time=190/6;
    const towers=b.units.filter(u=>u.kind==='tower'&&u.team===0&&u.tier===1);
    engine(b).damage(hero,towers[0],100000);assert.equal(b.snapshot().glyphs![0].readyAt,191);
    b.time=192/6;assert.equal(b.useGlyph(0),null);b.time=200/6;engine(b).damage(hero,towers[1],100000);
    assert.equal(b.snapshot().glyphs![0].readyAt,id==='2016.1'?201:492);
  }
});
test('new lane waves use 30-second cadence; catapults arrive on era-specific siege waves',()=>{
  for(const [id,at] of [['2011.1',210],['2023.2',300]] as const){
    const b=new LaneBattle(config(id));quiet(b);const e=engine(b);
    e.nextSpawnClock=at-30;e.spawn();assert.equal(b.units.filter(u=>u.creepType==='siege').length,0);
    e.spawn();assert.equal(b.units.filter(u=>u.creepType==='siege').length,6);
    e.nextSpawnClock=2400;e.spawn();if(id==='2023.2')assert.equal(b.units.filter(u=>u.creepType==='siege').length,18);
  }
  const b=new LaneBattle(config());quiet(b);b.step();const first=b.units.filter(u=>u.kind==='creep').length;
  for(let i=0;i<25;i++)b.step();assert.equal(b.units.filter(u=>u.kind==='creep').length,first*2);
});
test('siege attacks deal extra building damage and their magical resistance is enforced',()=>{
  const b=new LaneBattle(config()),e=engine(b);e.nextSpawnClock=300;e.spawn();const siege=b.units.find(u=>u.creepType==='siege')!;
  const tower=b.units.find(u=>u.kind==='tower'&&u.team!==siege.team&&u.tier===1)!,hp=tower.hp;
  siege.x=tower.x;siege.y=tower.y;siege.cd=0;e.attack(siege,tower);
  assert.equal(hp-tower.hp,siege.damage*2.5);
  const before=siege.hp;e.damage(heroes(b)[5],siege,100,true);assert.equal(before-siege.hp,20);
});
test('uphill ranged attacks can miss; melee attacks still hit; shared high-ground sight enables targeting',()=>{
  const b=new LaneBattle(config()),e=engine(b),era=mapEraForPatch({id:'2023.2'}),a=heroes(b)[0],t=heroes(b)[5];quiet(b);
  a.dead=t.dead=false;a.spells=[];t.spells=[];
  for(const u of b.units)if(u.team===0&&u.kind!=='hero')u.dead=true;
  [a.x,a.y]=artPoint(era,[30,80]);[t.x,t.y]=artPoint(era,[20,85]);
  assert.ok(terrainHeight(era,t.x,t.y)>terrainHeight(era,a.x,a.y));assert.equal(terrainSight(era,a,t),false);
  assert.equal(e.canTarget(a,t),false);
  const ally=heroes(b)[1];ally.dead=false;ally.x=t.x;ally.y=t.y;b.time+=.2;b.step();assert.equal(e.canTarget(a,t),true);
  e.random=()=>.1;a.hero={...a.hero!,ranged:true};a.cd=0;const hp=t.hp;e.attack(a,t);assert.equal(t.hp,hp);
  a.hero={...a.hero!,ranged:false};a.cd=0;e.attack(a,t);assert.ok(t.hp<hp);
});
test('denies consume an attack, grant no ordinary last-hit gold and distribute era-specific XP',()=>{
  for(const id of ['2017.2','2018.1','2019.2','2023.2']){
    const b=new LaneBattle(config(id)),e=engine(b),a=heroes(b)[0],opponent=heroes(b)[5];quiet(b);a.dead=opponent.dead=false;
    a.cd=0;a.x=opponent.x=400;a.y=opponent.y=400;const c=creep(b,0,400,400);c.hp=1;
    const gold=a.gold,xp=opponent.totalXp;assert.equal(e.tryDeny(a),true);assert.equal(a.denies,1);assert.ok(a.cd>0);assert.equal(c.dead,true);assert.equal(a.lastHits,0);
    assert.ok(opponent.totalXp>xp);assert.ok(opponent.totalXp<200);assert.equal(a.gold>gold,id==='2019.2');
    assert.equal(a.totalXp>0,id==='2017.2'||id==='2018.1');
    const again=creep(b,0,400,400);again.hp=1;assert.equal(e.tryDeny(a),false);
  }
});
test('buyback spends only the owning dead hero’s gold, keeps spell cooldowns, and revives at the fountain',()=>{
  const b=new LaneBattle(config()),u=heroes(b)[0];u.dead=true;u.respawn=30;u.gold=5000;u.spent=1000;u.buybackReadyAt=0;
  const gold=u.gold,spent=u.spent,cost=b.snapshot().players.find(p=>p.id===u.player!.id)!.buyback!.cost;
  if(u.spells[0])u.spells[0].readyAt=100;
  assert.match(b.buyback(0,'1:0')!,/your team/);assert.equal(b.buyback(0,u.player!.id),null);
  assert.equal(u.gold,gold);assert.equal(u.spent,spent+cost);assert.equal(u.dead,false);assert.equal(u.hp,u.max);assert.equal(u.buybacks,1);
  const base=b.units.find(u=>u.kind==='base'&&u.team===0)!;assert.deepEqual([u.x,u.y],[base.x,base.y]);
  if(u.spells[0])assert.equal(u.spells[0].readyAt,100);
  engine(b).damage(heroes(b)[5],u,100000);assert.ok(u.dead);assert.equal(u.respawn,6+u.level*2+25/6);assert.match(b.buyback(0,u.player!.id)!,/ready in/);
});
test('buyback rejects living, poor and Aegis-reviving heroes; modern costs depend on net worth',()=>{
  const b=new LaneBattle(config()),u=heroes(b)[0];assert.match(b.buyback(0,u.player!.id)!,/alive/);
  u.dead=true;u.respawn=30;u.gold=0;assert.match(b.buyback(0,u.player!.id)!,/gold/);
  u.gold=5000;u.reviveAt=[400,400];assert.match(b.buyback(0,u.player!.id)!,/Aegis/);
  const r=matchRules(patchById('2023.2'));assert.equal(buybackCost(r,25,13000,1000),1200);
});
test('automatic buyback requires an actual base siege and enough gold, and is recorded as a real expense',()=>{
  const b=new LaneBattle(config()),base=b.units.find(u=>u.kind==='base'&&u.team===0)!;quiet(b);
  const u=heroes(b)[0];u.gold=10000;u.respawn=20;base.hp=1000;base.lastDamagedAt=b.clock;
  engine(b).defendObjectives();assert.equal(u.dead,false);assert.ok(u.spent>0);assert.equal(b.siegeEvents.at(-1)?.kind,'buyback');
  assert.equal(b.siegeEvents.at(-1)?.automatic,true);
});
test('live worker commands validate clocks, own-team buybacks, manual Glyph and Auto Glyph state',()=>{
  const session=new LiveBattleSession(config());assert.equal(session.command({type:'auto-glyph',enabled:false}).frame.glyphs![0].auto,false);
  assert.match(session.command({type:'glyph',at:100}).message!,/advanced/);assert.equal(session.battle.siegeEvents.length,0);
  assert.match(session.command({type:'glyph',at:0}).message!,/ready in/);
  session.battle.time=30;assert.match(session.command({type:'glyph',at:180}).message!,/activated/);assert.equal(session.battle.snapshot().glyphs![0].uses,1);
  assert.equal(session.battle.snapshot().glyphs![1].uses,0);assert.match(session.command({type:'buyback',playerId:'1:0',at:180}).message!,/your team/);
});
test('new matches never drain Ancients simply because the overtime threshold was crossed',()=>{
  const b=new LaneBattle(config());quiet(b);for(const u of b.units)if(u.kind==='creep'){u.dead=true;u.hp=0;}
  b.time=541;const bases=b.units.filter(u=>u.kind==='base'),before=bases.map(u=>u.hp);b.step();assert.deepEqual(bases.map(u=>u.hp),before);
});
test('historical composites use documented Glyph, protection, siege and buyback transitions',()=>{
  const r=(id:string)=>matchRules(patchById(id));
  assert.equal(r('2011.1').glyphDuration,4);assert.equal(r('2013.1').glyphDuration,5);assert.equal(r('2018.1').glyphDuration,6);assert.equal(r('2020.1').glyphDuration,7);
  assert.equal(r('2018.2').glyphStartsAt,0);assert.equal(r('2019.1').glyphStartsAt,180);
  assert.equal(r('2017.2').glyphCreepDuration,0);assert.equal(r('2018.1').glyphCreepDuration,6);assert.equal(r('2020.1').glyphCreepDuration,4);assert.equal(r('2025.1').glyphCreepDuration,3);
  assert.equal(r('2013.1').backdoorReduction,0);assert.equal(r('2013.2').backdoorReduction,.25);assert.equal(r('2018.1').backdoorReduction,.4);assert.equal(r('2021.1').backdoorReduction,.5);
  assert.equal(r('2022.2').backdoorHeal,90);assert.equal(r('2022.2').ancientBackdoorHeal,180);
  assert.equal(buybackCost(r('2018.1'),25,13000,1000),1100);assert.equal(buybackCost(r('2020.1'),25,12000,1000),1200);
  assert.equal(r('2011.1').buybackCooldown,300);assert.equal(r('2013.2').buybackCooldown,360);assert.equal(r('2015.1').buybackCooldown,420);assert.equal(r('2017.2').buybackCooldown,480);
});
test('fortified tier 2 attacks multiple real targets with one attack cooldown',()=>{
  const b=new LaneBattle(config());quiet(b);b.time=30;
  const tower=b.units.find(u=>u.team===0&&u.kind==='tower'&&u.tier===2&&u.lane===1)!;
  engine(b).spawn();const creeps=b.units.filter(u=>u.kind==='creep'&&u.team===1).slice(0,6);
  for(const [i,c]of creeps.entries()){c.x=tower.x+20+i;c.y=tower.y;c.wait=0;c.hp=1000;c.max=1000;}
  tower.cd=0;assert.equal(b.useGlyph(0),null);b.step();
  assert.equal(creeps.filter(c=>c.hp<1000).length,6);assert.ok(tower.cd>0);assert.equal(tower.hp,tower.max);
});
test('Auto Glyph ignores old damage and never spends a ready glyph just because a building is low',()=>{
  const b=new LaneBattle(config()),tower=b.units.find(u=>u.kind==='tower'&&u.team===0)!;
  b.time=30;b.setAutoGlyph(0,true);tower.hp=100;tower.lastDamagedAt=0;
  engine(b).defendObjectives();assert.equal(b.snapshot().glyphs![0].uses,0);
  b.time+=1/6;tower.lastDamagedAt=b.clock;engine(b).defendObjectives();assert.equal(b.snapshot().glyphs![0].uses,1);
});
test('buyback gold penalties affect new earnings only and expire at the original respawn time',()=>{
  const b=new LaneBattle(config('2016.1')),u=heroes(b)[0],e=b as unknown as {addGold:(u:Unit,n:number,farm?:boolean)=>void};
  u.dead=true;u.respawn=30;u.gold=5000;const gold=u.gold;assert.equal(b.buyback(0,u.player!.id),null);
  e.addGold(u,100);assert.equal(u.gold,gold+40);b.time=31;e.addGold(u,100);assert.equal(u.gold,gold+140);
  const old=new LaneBattle(config('2014.1')),v=heroes(old)[0],early=old as unknown as {addGold:(u:Unit,n:number,farm?:boolean)=>void};
  v.dead=true;v.respawn=30;v.gold=5000;old.buyback(0,v.player!.id);early.addGold(v,100,true);assert.equal(v.gold,5000);early.addGold(v,100);assert.equal(v.gold,5100);
});
test('Glyph and buyback snapshots are read-only and replay captures short fortification windows',()=>{
  const c=config('2017.1');c.captureReplay=true;const b=new LaneBattle(c);
  b.useGlyph(0);const frame=b.snapshot(),last=b.frames.at(-1)!;assert.equal(last.glyphs![0].activeUntil,5);
  frame.glyphs![0].uses=99;assert.equal(b.snapshot().glyphs![0].uses,1);
  for(let i=0;i<5;i++)b.step();
  assert.ok(b.frames.some(f=>f.time>0&&f.time<5&&f.glyphs![0].activeUntil>f.time));
  assert.ok(b.frames.some(f=>f.time>=5&&f.glyphs![0].activeUntil<=f.time));
});
test('committed pushes contest visible defenders instead of farming replacement creeps forever',()=>{
  const b=new LaneBattle(config('2017.1')),all=heroes(b),a=all[0],defender=all[5];b.time=400;
  for(const u of all){u.spells=[];u.cd=99999;u.abilityCd=99999;if(u.team===0){u.x=400;u.y=400;}else{u.dead=true;u.respawn=99999;}}
  defender.dead=false;defender.hp=defender.max=10000;defender.x=450;defender.y=400;
  for(const u of b.units)if(u.kind==='tower'){u.dead=true;u.hp=0;}
  a.cd=0;a.hero={...a.hero!,ranged:false};a.range=150;
  const blocker=creep(b,1,405,400);blocker.hp=blocker.max=10000;blocker.cd=99999;
  assert.equal(b.issueOrder(0,{strategyId:'high-ground'}).accepted,true);
  const internals=b as unknown as {plays:[{stage:string},{stage:string}]};internals.plays[0].stage='engaging';
  const hp=defender.hp;b.step();assert.ok(defender.hp<hp,'push participants attack the defender despite a closer healthy creep');
});
test('pushers commit when another lane has opened backdoor protection instead of waiting forever for their selected wave',()=>{
  const b=new LaneBattle(config('2023.1'));b.time=400;
  const base=b.units.find(u=>u.kind==='base'&&u.team===1)!;
  for(const t of b.units.filter(u=>u.kind==='tower'&&u.team===1)){t.dead=true;t.hp=0;}
  for(const u of heroes(b)){if(u.team===1){u.dead=true;u.respawn=9999;}else{u.x=580;u.y=128;u.hp=u.max;}}
  const selected=creep(b,0,300,120);selected.lane=0;
  const opening=creep(b,0,base.x-20,base.y+20);opening.lane=2;
  engine(b).updateBackdoor();assert.equal(b.snapshot().units.find(u=>u.id===base.id)!.backdoor,false);
  assert.equal(b.issueOrder(0,{strategyId:'high-ground'}).accepted,true);
  const internals=b as unknown as {plays:[{stage:string},{stage:string}];tacticalAction:(u:Unit)=>boolean};internals.plays[0].stage='engaging';
  const u=heroes(b)[0];u.range=26;const distance=Math.hypot(u.x-base.x,u.y-base.y);internals.tacticalAction(u);
  assert.ok(Math.hypot(u.x-base.x,u.y-base.y)<distance);
});
test('a committed siege uses an open building window instead of repeatedly farming replacement creeps',()=>{
  const b=new LaneBattle(config('2017.1'));b.time=400;
  const base=b.units.find(u=>u.kind==='base'&&u.team===1)!;
  for(const t of b.units.filter(u=>u.kind==='tower'&&u.team===1)){t.dead=true;t.hp=0;}
  for(const u of heroes(b)){u.spells=[];u.cd=u.abilityCd=99999;if(u.team===1){u.dead=true;u.respawn=9999;}else{u.x=base.x-20;u.y=base.y+10;u.hp=u.max;}}
  creep(b,0,base.x-20,base.y).cd=99999;
  const blocker=creep(b,1,base.x-15,base.y+10);blocker.hp=blocker.max=10000;blocker.cd=99999;
  engine(b).updateBackdoor();assert.equal(b.issueOrder(0,{strategyId:'high-ground'}).accepted,true);
  (b as unknown as {plays:[{stage:string},{stage:string}]}).plays[0].stage='engaging';
  const a=heroes(b)[0];a.cd=0;a.range=150;a.hero={...a.hero!,ranged:false};const hp=base.hp;
  b.step();assert.ok(base.hp<hp,'the available siege attack hits the Ancient above its finishing threshold');
});
