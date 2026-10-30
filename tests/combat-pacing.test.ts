import {test} from 'node:test';
import assert from 'node:assert/strict';
import {liveCadence} from '../src/match-playback';
import {combatPauseReason,noCombatPauses} from '../src/combat-pauses';
import type {ReplayFrame} from '../src/battle';
import {LiveBattleSession} from '../src/live-battle';
import {buildBattleConfig,createCampaign,DEFAULT_SETTINGS,events} from '../src/game';

test('optional watch speeds have real time rates and preserve whole simulation ticks',()=>{
  for(const speed of [1/30,.1,.25,.5,1,2,4,8,16,32]){
    const cadence=liveCadence(speed);
    assert.ok(Math.abs(cadence.seconds/cadence.intervalMs*1000-30*speed)<1e-10);
    assert.equal(cadence.seconds/1.2,Math.round(cadence.seconds/1.2));
  }
});

test('pause identifies allied victims rather than the killer team and only fresh events',()=>{
  const before={time:0,players:[{id:'ally',team:0,buyback:{reason:null}}],units:[],matchEvents:[]} as unknown as ReplayFrame;
  const after={...before,time:1.2,matchEvents:[{id:1,time:1.2,kind:'kill',team:1,victimId:'ally'}]} as ReplayFrame;
  assert.equal(combatPauseReason(before,after,{...noCombatPauses,allyDeath:true}),'An allied hero has died.');
  assert.equal(combatPauseReason(before,after,{...noCombatPauses,buyback:true}),'An allied player can buy back.');
  assert.equal(combatPauseReason(after,after,{...noCombatPauses,allyDeath:true}),undefined);
  assert.equal(combatPauseReason(before,after,noCombatPauses),undefined);
});

test('fast live advance stops on the exact authoritative death tick and resumes same map',()=>{
  const config={...buildBattleConfig(createCampaign(DEFAULT_SETTINGS),events[0],42),captureReplay:false};
  const session=new LiveBattleSession(config),battle=session.battle;
  const victim=config.players[0][0].id;
  let ticks=0;
  // A controlled event boundary verifies batch termination without depending on
  // a particular combat seed's first death time.
  battle.step=()=>{ticks++;battle.time+=.2;};
  battle.snapshotForTeam=()=>({time:Math.round(ticks*12)/10,kills:[0,0],units:[],players:[{id:victim,team:0}],matchEvents:ticks>=3?[{id:1,time:3.6,kind:'kill',team:1,victimId:victim}]:[]}) as ReplayFrame;
  session.command({type:'pause-settings',settings:{...noCombatPauses,allyDeath:true}});
  const paused=session.advance(192);
  assert.equal(ticks,3);
  assert.equal(paused.frame.time,3.6);
  assert.equal(paused.pauseReason,'An allied hero has died.');
  assert.equal(session.battle,battle);
  const resumed=session.advance(6);
  assert.equal(ticks,8);
  assert.equal(resumed.pauseReason,undefined);
});

test('buyback pause triggers when a dead player becomes eligible after earning gold or cooldown expiry',()=>{
  const before={time:50,kills:[0,0],players:[{id:'ally',team:0,buyback:{reason:'Needs more gold'}}],units:[{playerId:'ally',kind:'hero',hp:0}],matchEvents:[]} as unknown as ReplayFrame;
  const after={...before,time:51,players:[{...before.players[0],buyback:{cost:100,readyAt:0,reason:null}}]};
  assert.equal(combatPauseReason(before,after,{...noCombatPauses,buyback:true}),'An allied player can buy back.');
  assert.equal(combatPauseReason(after,after,{...noCombatPauses,buyback:true}),undefined);
});
