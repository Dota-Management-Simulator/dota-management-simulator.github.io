import { test } from 'node:test';
import assert from 'node:assert/strict';
import { earnedTacticalCalls, normalizeTacticalProgress, refreshTacticalProgress, tacticalProgressForCampaign } from '../src/tactical-progress';
import { strategyById, strategyUnlocked, unlockDescription } from '../src/tactics';
import type { Campaign, Result } from '../src/game';
import type { TournamentRun } from '../src/tournament-types';

function campaign():Campaign {
  return {results:[],calendar:{runs:[]},world:{clubs:[{id:'alliance',name:'Alliance'},{id:'navi',name:'Natus Vincere'}]}} as unknown as Campaign;
}
function win(opponent:string,id=opponent):Result {return {eventId:id,event:id,year:2013,week:1,won:true,prize:0,points:0,score:'2–0',opponent};}
test('competitive victories teach calls permanently; duplicate results never count twice',()=>{
  const c=campaign();c.results=[win('Natus Vincere')];
  assert.ok(earnedTacticalCalls(c).includes('follow-up'));
  assert.ok(!earnedTacticalCalls(c).includes('countergank-top'));
  assert.deepEqual(refreshTacticalProgress(c),['follow-up']);
  assert.deepEqual(refreshTacticalProgress(c),[]);
  c.results.push(win('Natus Vincere','second-win'));
  assert.ok(!earnedTacticalCalls(c).includes('countergank-top'),'distinct clubs rather than repeated wins');
  c.results.push(win('Alliance'));
  assert.ok(earnedTacticalCalls(c).includes('split-support'));
  assert.ok(earnedTacticalCalls(c).includes('countergank-top'));
  refreshTacticalProgress(c);c.results=[];
  assert.ok(earnedTacticalCalls(c).includes('split-support'),'earned ledger survives archival changes');
});
test('draws, losses, skipped events, tournament placements, practice and exhibitions cannot unlock calls',()=>{
  const c=campaign();c.results=[{...win('A'),won:false},{...win('B'),skipped:true},{...win('Full tournament'),tournamentId:'ti'}];
  c.scrims={sessions:[{status:'complete',series:{winner:0}}]} as Campaign['scrims'];
  c.botChallenges={results:[{won:true}]} as unknown as Campaign['botChallenges'];
  assert.deepEqual(earnedTacticalCalls(c),[]);
});
test('tournament victories credit the managed side even when it is Dire and preserve club identity',()=>{
  const c=campaign();c.calendar!.runs=[{eventId:'ti',managed:'managed',teams:[{id:'other',name:'Alliance',clubId:'alliance'},{id:'managed',name:'My club'}],matches:[{id:'match1',teams:['other','managed'],winner:1},{id:'draw',teams:['managed','other'],winner:null},{id:'loss',teams:['managed','other'],winner:1}]} as TournamentRun];
  assert.deepEqual(tacticalProgressForCampaign(c).victories,[{id:'tournament:ti:match1',opponent:'Alliance',opponentId:'alliance'}]);
  assert.ok(earnedTacticalCalls(c).includes('split-support'));
  c.results=[win('Alliance')];
  assert.ok(!earnedTacticalCalls(c).includes('countergank-top'),'same named club in another competition counts once');
});
test('coach access is independent of permanent victory access and catalogue states real alternatives',()=>{
  const call=strategyById('split-support')!;
  assert.equal(strategyUnlocked(call,[],[]),false);
  assert.equal(strategyUnlocked(call,[],['c5']),true);
  assert.equal(strategyUnlocked(call,[],[],['split-support']),true);
  assert.equal(strategyUnlocked(call,[],[],['unknown']),false);
  assert.match(unlockDescription(call),/Alliance/);assert.match(unlockDescription(call),/Strategy scout/);
  assert.equal(strategyUnlocked(strategyById('disengage')!,[],[]),true);
});
test('malformed optional progress recovers without granting unknown or basic calls',()=>{
  assert.deepEqual(normalizeTacticalProgress(null),{victories:[],unlocked:[]});
  assert.deepEqual(normalizeTacticalProgress({victories:[null,{}, {id:'ok',opponent:'Valid'}, {id:'ok',opponent:'Valid'}],unlocked:['unknown','disengage','split-support','split-support']}),{victories:[{id:'ok',opponent:'Valid'}],unlocked:['split-support']});
});
