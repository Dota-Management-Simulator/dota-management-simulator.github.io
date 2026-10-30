import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advanceWeek, buildBattleConfig, createCampaign, DEFAULT_SETTINGS, decodeSave, events, rating } from '../src/game';
import { careerDeltas, careerHeroPool, developmentProfile, heroMasteries, masterySkillBonus, normalizeCareer } from '../src/player-career';
import { setTrainingSchedule, skillDeltas } from '../src/training';
import { weeklyPractice } from '../src/contracts';
import { LaneBattle } from '../src/battle';
import { competingOffers, advanceAiEconomy } from '../src/ai-club-economy';
import { recruitmentComparison, toggleShortlist } from '../src/recruitment';
import { managerPriorities } from '../src/manager-priorities';
import { exportCampaign, importCampaign, readCampaignLibrary, saveCampaignSlot } from '../src/campaign-library';
import { enableHistoricalCalendar } from '../src/historical-game';

const fresh = () => createCampaign(DEFAULT_SETTINGS);
test('individual playstyles distinguish historical players and remain stable after rename, role changes and reload', () => {
  const c = fresh(), unique = new Set(c.players.map(p => JSON.stringify(p.playstyles)));
  assert.ok(unique.size > c.players.length * .9);
  const p = c.players[0], before = developmentProfile(p);
  p.name = 'Renamed'; p.role = 'Mid';
  assert.deepEqual(developmentProfile(p), before);
  assert.deepEqual(decodeSave(JSON.stringify(c))!.players[0].playstyles, p.playstyles);
  assert.ok(c.players.every(p => Object.values(p.playstyles).every(n => n == null || n >= 1 && n <= 10)));
});
test('development has full early gains, diminishing later gains and preserves ratings above personal ceilings', () => {
  const p = fresh().players[0], deltas = { ...p.stats };
  for (const k of Object.keys(deltas) as (keyof typeof deltas)[]) deltas[k] = 1;
  p.stats.farming = 30; assert.equal(careerDeltas(p, deltas).farming, 1);
  p.stats.farming = 50; const early = careerDeltas(p, deltas).farming;
  p.stats.farming = 60; assert.ok(careerDeltas(p, deltas).farming < early);
  p.stats.farming = 98; assert.equal(careerDeltas(p, deltas).farming, 0);
  deltas.farming = -.2; assert.equal(careerDeltas(p, deltas).farming, -.2);
});
test('hero practice settles once per paid week, respects rest, hours and caps, and previews match actual skill gains', () => {
  let c = fresh(), p = c.players.find(p => p.id === c.roster[0])!;
  const hero = careerHeroPool(c)[0].id; p.career!.focusHeroId = hero;
  p.stats.farming = 60; c.training[p.id] = 'Farming';
  const predicted = skillDeltas('Farming', weeklyPractice(c, p, 'Farming'), p).farming;
  const trained = advanceWeek(c).players.find(row => row.id === p.id)!;
  assert.equal(trained.stats.farming, 60 + predicted); assert.equal(trained.career!.heroTraining[hero], 1);
  assert.equal(trained.career!.paidWeeks, 1); assert.equal(p.career!.paidWeeks, 0);
  c.training[p.id] = 'Rest'; assert.equal(advanceWeek(c).players.find(row => row.id === p.id)!.career!.heroTraining[hero], undefined);
  c.training[p.id] = 'Farming'; c = setTrainingSchedule(c, p.id, { hoursPerDay: 1, daysPerWeek: 1 });
  assert.equal(advanceWeek(c).players.find(row => row.id === p.id)!.career!.heroTraining[hero], undefined);
  p = c.players.find(p => p.id === c.roster[0])!; p.career!.heroTraining[hero] = 40;
  assert.equal(advanceWeek(c).players.find(row => row.id === p.id)!.career!.heroTraining[hero], 40);
});
test('mastery never reveals future heroes, is capped, and reaches real battle snapshots without rewriting base skills', () => {
  const c = fresh(), p = c.players[0], map = heroMasteries(c, p);
  assert.deepEqual(Object.keys(map).sort(), careerHeroPool(c).map(h => h.id).sort());
  assert.equal(masterySkillBonus(0), -2); assert.equal(masterySkillBonus(100), 4); assert.equal(masterySkillBonus(NaN), 0);
  const cfg = buildBattleConfig(c, events[0], 194);
  const before = structuredClone(cfg.players[0][0].skills), battle = new LaneBattle(cfg);
  const score = battle.snapshot().players.find(row => row.id === cfg.players[0][0].id)!;
  assert.ok(score.heroMastery); assert.equal(score.heroMastery.rating, cfg.players[0][0].heroMastery![score.heroId]);
  assert.deepEqual(cfg.players[0][0].skills, before);
});
test('malformed career fields recover independently and loading never trains or rescales existing players', () => {
  assert.deepEqual(normalizeCareer({paidWeeks:-2,heroTraining:{axe:100,unknown:NaN},focusHeroId:7}), {version:1,paidWeeks:0,heroTraining:{axe:40}});
  const c = fresh(); c.players[0].stats.farming = 98; delete c.players[0].career;
  const next = decodeSave(JSON.stringify(c))!; assert.equal(next.players[0].stats.farming,98); assert.equal(next.players[0].career!.paidWeeks,0);
});
test('dated hero practice uses completed post-TI unlocks rather than the calendar week number', () => {
  const c=enableHistoricalCalendar(createCampaign({...DEFAULT_SETTINGS,year:2024}));
  assert.ok(c.week>16);
  assert.ok(!careerHeroPool(c).some(h=>h.id==='kez'||h.id==='ringmaster'));
  c.calendar!.shuffledYears.push(2024);
  assert.ok(careerHeroPool(c).some(h=>h.id==='kez'));
});
test('recruitment compares real outgoing wages, release charges and the resulting eight-week payroll', () => {
  const c=fresh(), p=c.players.find(p=>!c.roster.includes(p.id)&&p.role===c.players[0].role)!;
  const row=recruitmentComparison(c,p); assert.equal(row.wageDelta,row.wage-row.outgoing!.wage);
  assert.equal(row.additionalEightWeekCost,row.upfront+row.wageDelta*8);
  assert.equal(row.eightWeekCost,row.upfront+row.wage*8);
  const listed=toggleShortlist(c,p.id); assert.deepEqual(listed.shortlist,[p.id]); assert.equal(c.shortlist,undefined);
  assert.deepEqual(toggleShortlist(listed,p.id).shortlist,[]);
  assert.deepEqual(decodeSave(JSON.stringify(listed))!.shortlist,[p.id]);
});
test('AI budgets settle once, use their own money, and respect registered-lineup locks', () => {
  const c=fresh(), cash=c.cash, roster=[...c.roster]; advanceAiEconomy(c,4);
  const once=JSON.stringify(c.aiEconomy); advanceAiEconomy(c,4); assert.equal(JSON.stringify(c.aiEconomy),once);
  assert.equal(c.cash,cash); assert.deepEqual(c.roster,roster); assert.ok(Object.keys(c.aiEconomy!.clubs).length>0);
  const dated=enableHistoricalCalendar(fresh()); dated.calendar!.runs.push({state:'playing',matches:[],settled:false} as never);
  advanceAiEconomy(dated,4); assert.equal(dated.aiEconomy!.transfers.length,0);
  assert.ok(competingOffers(c,c.players[0]).length===0,'managed players are never poached');
});
test('Desk priorities rank notices, vacancies and imminent debt above ordinary planning and are read only', () => {
  const c=fresh(); c.welfare!.players[c.roster[0]].noticeAt=0; c.cash=-1; c.roster.pop();
  const before=JSON.stringify(c), priorities=managerPriorities(c);
  assert.deepEqual(priorities.map(p=>p.id),[`notice:${c.roster[0]}`,'vacancy','cash']); assert.equal(JSON.stringify(c),before);
});
function memoryStorage() { const map=new Map<string,string>(); const storage:Storage={get length(){return map.size;},key:i=>[...map.keys()][i]??null,getItem:k=>map.get(k)??null,setItem:(k,v)=>{map.set(k,v);},removeItem:k=>{map.delete(k);},clear:()=>map.clear()}; return {map,storage}; }
test('portable saves round trip, reject bad imports and remain independent from the original', () => {
  const c=fresh(), imported=importCampaign(exportCampaign(c)); assert.equal(imported.cash,c.cash); assert.deepEqual(imported.roster,c.roster);
  imported.cash=1; assert.notEqual(imported.cash,c.cash);
  assert.throws(()=>importCampaign('{bad'),/valid JSON/); assert.throws(()=>importCampaign('{"format":"other"}'),/Unsupported/);
  assert.throws(()=>importCampaign('{"version":1}'),/valid Aegis/);
  const malformed=fresh(); (malformed.players[0].stats as Record<string,number>).heroPool=undefined as never;
  assert.throws(()=>importCampaign(exportCampaign(malformed)),/valid Aegis/);
});
test('compressed late-era saves and backups recover without overwriting stored corrupt data', () => {
  const c=createCampaign({...DEFAULT_SETTINGS,year:2026}), {map,storage}=memoryStorage(); saveCampaignSlot('test',c,storage);
  const key='aegis-manager-slot-v1:test', first=map.get(key)!; assert.ok(first.length<JSON.stringify(c).length/2);
  saveCampaignSlot('test',{...c,cash:123,week:c.week+1},storage);
  const record=JSON.parse(map.get(key)!); assert.ok(record.backup); record.data='invalid'; map.set(key,JSON.stringify(record));
  const before=map.get(key), library=readCampaignLibrary(storage); assert.equal(library.slots[0].recovered,true); assert.equal(library.slots[0].campaign.cash,c.cash); assert.equal(map.get(key),before);
});
test('five years of practice taper below linear growth while preserving roster and finite stats', () => {
  const c=fresh(), p=c.players[0];
  p.stats.farming=60; let total=0;
  for(let i=0;i<260;i++){const gain=careerDeltas(p,{...p.stats,farming:1}).farming;p.stats.farming=Math.round((p.stats.farming+gain)*100)/100;total+=gain;}
  assert.ok(p.stats.farming<95); assert.ok(p.stats.farming>60); assert.ok(total<35); assert.ok(Number.isFinite(rating(p)));
});
