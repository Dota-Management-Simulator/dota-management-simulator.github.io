import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LaneBattle,type BattleConfig,type WardOrder} from '../src/battle';
import {defaultTactics} from '../src/tactics';
import {mapStructures} from '../src/map-objectives';
import {mapEraForPatch,mapEras} from '../src/map-eras';

const config=(patchId='2023.2'):BattleConfig=>({seed:731,year:+patchId.slice(0,4),patchId,teams:['A','B'],bonuses:[0,0],
 players:[0,1].map(side=>Array.from({length:5},(_,role)=>({id:`${side}:${role}`,name:`Player ${side}:${role}`,role,
 skills:{laning:70,farming:50,teamfights:50,skirmish:50,stability:50,intuition:50,vision:50,creativity:50},energy:100,happiness:100}))) as BattleConfig['players'],
 captureReplay:false,captureTimeline:false,tacticalPreparations:[{...defaultTactics(),autoGlyph:false},{...defaultTactics(),autoGlyph:false}]});
type Unit=LaneBattle['units'][number];
const internal=(b:LaneBattle)=>b as unknown as {canTarget:(a:Unit,b:Unit)=>boolean;damage:(a:Unit,b:Unit,n:number,spell?:boolean,execution?:boolean)=>void;spawn:()=>void;nextSpawnClock:number;updateWards:()=>void;wardAction:(u:Unit)=>boolean;castNamed:(u:Unit,e?:Unit)=>void;visibleEnemies:(side:0|1)=>Unit[];sightCache:unknown[];tacticalAction:(u:Unit)=>boolean;plays:unknown[]};
const heroes=(b:LaneBattle,side=0)=>b.units.filter(u=>u.kind==='hero'&&u.team===side);

test('complete base entities retain map anchors and enforce all building dependencies',()=>{
 const b=new LaneBattle(config()),e=internal(b),a=heroes(b)[0],enemy=b.units.filter(u=>u.team===1);
 assert.equal(enemy.filter(u=>u.kind==='tower').length,11);assert.equal(enemy.filter(u=>u.kind==='barracks').length,6);
 const markers=mapStructures(b.snapshot(),mapEraForPatch({id:'2023.2'}));
 assert.equal(markers.length,36);assert.ok(markers.every(m=>m.unit),'new base structures have real HP');
 const t1=enemy.find(u=>u.tier===1&&u.lane===1)!,t2=enemy.find(u=>u.tier===2&&u.lane===1)!,t3=enemy.find(u=>u.tier===3&&u.lane===1)!,t4=enemy.find(u=>u.tier===4)!,rax=enemy.find(u=>u.kind==='barracks'&&u.lane===1)!,base=enemy.find(u=>u.kind==='base')!;
 assert.equal(e.canTarget(a,t2),false);assert.equal(e.canTarget(a,t3),false);assert.equal(e.canTarget(a,t4),false);assert.equal(e.canTarget(a,rax),false);assert.equal(e.canTarget(a,base),false);
 t1.dead=true;assert.equal(e.canTarget(a,t2),true);assert.equal(e.canTarget(a,t3),false);
 t2.dead=true;assert.equal(e.canTarget(a,t3),true);t3.dead=true;assert.equal(e.canTarget(a,rax),true);assert.equal(e.canTarget(a,t4),true);
 for(const u of enemy.filter(u=>u.tier===4))u.dead=true;assert.equal(e.canTarget(a,base),true);
});

test('each destroyed barracks empowers only its corresponding lane/type; six unlock megas',()=>{
 const b=new LaneBattle(config()),e=internal(b);e.nextSpawnClock=300;
 b.units.find(u=>u.team===1&&u.kind==='barracks'&&u.lane===0&&u.barracksType==='melee')!.dead=true;e.spawn();
 const wave=b.units.filter(u=>u.kind==='creep'&&u.team===0);
 assert.ok(wave.filter(u=>u.lane===0&&u.creepType==='melee').every(u=>u.creepStrength==='super'));
 assert.ok(wave.filter(u=>u.lane!==0||u.creepType!=='melee').every(u=>u.creepStrength==='normal'));
 for(const u of b.units.filter(u=>u.team===1&&u.kind==='barracks'))u.dead=true;
 b.units=b.units.filter(u=>u.kind!=='creep');e.spawn();assert.ok(b.units.filter(u=>u.kind==='creep'&&u.team===0).every(u=>u.creepStrength==='mega'));
});

test('ward orders use finite stock, real travel and exact placement, expire, and do not charge until placed',()=>{
 const b=new LaneBattle(config()),e=internal(b),support=heroes(b)[4];support.gold=1000;
 const order:WardOrder={kind:'observer',x:support.x+15,y:support.y,playerId:support.player!.id},stock=b.snapshot().wardStocks![0].observer;
 assert.equal(b.issueWard(0,order),null);assert.equal(b.wards.length,0);assert.equal(b.snapshot().wardStocks![0].observer,stock);
 assert.equal(e.wardAction(support),true);assert.equal(b.wards.length,1);assert.equal(b.wards[0].x,order.x);assert.equal(b.wards[0].y,order.y);assert.equal(b.snapshot().wardStocks![0].observer,stock-1);
 b.time=b.wards[0].expiresAt/6+1;e.updateWards();assert.equal(b.wards.length,0);
 assert.match(b.issueWard(0,{...order,x:NaN})!,/valid/);assert.match(b.issueWard(0,{...order,x:-100})!,/inside/);
});

test('live team snapshots redact hidden enemy units, inventory, spell telemetry and neutral state',()=>{
 const b=new LaneBattle(config()),e=internal(b);const enemy=heroes(b,1)[0];enemy.x=700;enemy.y=90;enemy.gold=99999;enemy.itemPriority='rapier';
 const f=b.snapshotForTeam(0);assert.ok(f.vision);assert.equal(f.units.some(u=>u.id===enemy.id),false);assert.equal(f.players.some(p=>p.id===enemy.player!.id),false);assert.equal(f.roshan,undefined);assert.equal(f.units.filter(u=>u.kind==='hero').length,5);
 const own=heroes(b)[0];enemy.x=own.x+2;enemy.y=own.y+2;e.sightCache=[undefined,undefined];
 const visible=b.snapshotForTeam(0).players.find(p=>p.id===enemy.player!.id)!;assert.ok(visible);assert.equal(visible.gold,0);assert.equal(visible.nextItem,undefined);assert.equal(visible.spendableGold,undefined);assert.equal(visible.netWorth,undefined);assert.equal(visible.spells,undefined);assert.equal(visible.buyback,undefined);
 assert.deepEqual(b.snapshot(),b.snapshot(),'observation never advances state');
});

test('observer vision reveals enemies, while sentry detection alone grants no distant vision',()=>{
 const b=new LaneBattle(config()),e=internal(b),enemy=heroes(b,1)[0],own=heroes(b)[4];enemy.x=400;enemy.y=400;own.x=90;own.y=700;
 for(const a of b.units.filter(u=>u.team===0)){a.x=90;a.y=700;}
 b.wards.push({id:1,team:0,kind:'sentry',x:400,y:400,placedAt:0,expiresAt:420,playerId:own.player!.id,hp:3});
 assert.equal(b.snapshotForTeam(0).units.some(u=>u.id===enemy.id),false);
 b.wards.push({id:2,team:0,kind:'observer',x:400,y:400,placedAt:0,expiresAt:360,playerId:own.player!.id,hp:3});e.sightCache=[undefined,undefined];
 assert.equal(b.snapshotForTeam(0).units.some(u=>u.id===enemy.id),true);
});

test('Shallow Grave prevents ordinary lethal damage but permits execution; strong dispel clears disable and shield',()=>{
 const b=new LaneBattle(config()),e=internal(b),u=heroes(b)[0],enemy=heroes(b,1)[0];u.hp=100;u.saveUntil=10;
 e.damage(enemy,u,1000,true);assert.equal(u.hp,1);assert.equal(u.dead,false);e.damage(enemy,u,1000,true,true);assert.equal(u.dead,true);
 const ally=heroes(b)[1],caster=heroes(b)[4];caster.x=ally.x;caster.y=ally.y;caster.mana=999;caster.maxMana=999;caster.level=10;ally.hp=ally.max*.6;ally.stun=2;ally.rootUntil=20;ally.silenceUntil=20;
 const shield={id:'abaddon_aphotic_shield',name:'Aphotic Shield',passive:false,ultimate:false,hidden:false,cooldown:[6],mana:[10],damage:[],heal:[],stun:[],slow:[],shield:[100],duration:[6],range:[600],area:false,ally:true,summon:false,mobility:false,scepter:false,shard:false,upgrades:{}};
 caster.spells=[{definition:shield,slot:0,readyAt:0,casts:0}];e.castNamed(caster);assert.equal(ally.stun,0);assert.equal(ally.rootUntil,0);assert.equal(ally.silenceUntil,0);assert.ok(ally.shield>0);
});

test('disengage interrupts a prior movement and includes hurt retreating heroes',()=>{
 const c=config();c.tacticalPreparations![0]!.slots.early=['mid-top','disengage','defend-0'];const b=new LaneBattle(c),u=heroes(b)[0];
 assert.equal(b.issueOrder(0,{strategyId:'mid-top'}).accepted,true);u.hp=u.max*.1;u.retreat=true;
 assert.equal(b.issueOrder(0,{strategyId:'disengage'}).accepted,true);assert.equal(b.tacticalSnapshot(0).active?.strategyId,'disengage');
 assert.ok(b.tacticalSnapshot(0).active?.participants.includes(u.id));
});

test('unpatched legacy preparations retain their original six-tower layout',()=>{
 const b=new LaneBattle({...config(),patchId:undefined});assert.equal(b.units.filter(u=>u.kind==='tower').length,12);assert.equal(b.units.filter(u=>u.kind==='barracks').length,0);assert.equal(b.snapshot().structureLoop,undefined);
});

test('support bots establish actual wards for both teams on all eleven map eras',()=>{
 for(const era of mapEras){
  const b=new LaneBattle(config(era.firstPatch)),placed=[false,false];
  for(let tick=0;tick<500&&b.winner===null&&!placed.every(Boolean);tick++){
   b.step();for(const ward of b.wards)placed[ward.team]=true;
  }
  assert.deepEqual(placed,[true,true],`${era.id}: both teams create wards rather than gaining decorative vision`);
 }
});

test('lane push calls continue to barracks after all three lane towers have fallen',()=>{
 const c=config();c.tacticalPreparations![0]!.slots.mid=['push-0','protect-carry','buy-bkb'];
 const b=new LaneBattle(c);b.time=150;
 for(const tower of b.units.filter(u=>u.team===1&&u.kind==='tower'&&u.lane===0)){tower.dead=true;tower.hp=0;}
 assert.equal(b.issueOrder(0,{strategyId:'push-0'}).accepted,true);
 const target=b.units.find(u=>u.id===b.tacticalSnapshot(0).active?.targetUnit);
 assert.equal(target?.kind,'barracks');assert.equal(target?.lane,0);
});
