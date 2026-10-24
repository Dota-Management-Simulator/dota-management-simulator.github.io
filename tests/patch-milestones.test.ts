import { test } from "node:test";
import assert from "node:assert/strict";
import { LaneBattle, simulateSeries } from "../src/battle";
import type { BattleConfig } from "../src/battle";
import { createCampaign, DEFAULT_SETTINGS, buildBattleConfig, events, readSave, SAVE_KEY } from "../src/game";
import { patchForSeason } from "../src/patches";
import { arrivingMilestones, frontiersEnabled, patchHeroArrivals, talentsEnabled } from "../src/patch-milestones";
import { automaticTalents, choosePlayerTalent, normalizeTalentPlan, talentBonuses } from "../src/talents";
import { frontierSize } from "../src/battle-map";
import { heroById } from "../src/heroes";
import { simplifiedHeroNote } from "../src/patch-notes";
import { heroBalanceSignature } from "../src/hero-balance";
import { enableHistoricalCalendar, enterHistoricalTournament, tournamentBattleConfig, tournamentTeamTemplate } from "../src/historical-game";
import { historicalTournaments, nextTournamentFixture } from "../src/tournaments";
import { simulateOtherTournamentMatches } from "../src/tournament.worker";

const base = (): BattleConfig => ({ ...buildBattleConfig(createCampaign(DEFAULT_SETTINGS), events[0], 7102), year: 2023, heroPoolThroughYear: 2022, patchId: "2023.1", seriesFormat: { bestOf: 1 }, captureReplay: false });

test("opening patch notes account for all annual arrivals and pinned earlier drafts exclude later batches", () => {
  assert.ok(patchHeroArrivals(patchForSeason(2017,1)).some(h => h.id === "monkey_king"));
  assert.equal(patchHeroArrivals(patchForSeason(2017,2)).length,0);
  for (const year of [2011,2012,2017,2023,2026]) {
    const b = new LaneBattle({ ...base(), patchId: `${year}.2` });
    for (const u of b.units.filter(u => u.hero)) assert.ok((heroById(u.hero!.id)?.releasedYear ?? 2010) < year);
  }
  assert.equal(talentsEnabled(patchForSeason(2016,2)),false);
  assert.equal(talentsEnabled(patchForSeason(2017,1)),true);
  assert.equal(frontiersEnabled(patchForSeason(2022,2)),false);
  assert.equal(frontiersEnabled(patchForSeason(2023,1)),true);
  const legacySignature=(year:number)=>{
    const p=patchForSeason(year,1);
    let hash=2166136261;
    for(const char of JSON.stringify([p.id,p.axes,p.heroBalance?.map(h=>[h.id,h.targetWinRate,h.priority])])) hash=Math.imul(hash^char.charCodeAt(0),16777619);
    return (hash>>>0).toString(16);
  };
  assert.notEqual(heroBalanceSignature(patchForSeason(2016,1)),legacySignature(2016)); // Historical roles now change every era's benchmark.
  assert.notEqual(heroBalanceSignature(patchForSeason(2017,1)),legacySignature(2017));
  assert.notEqual(heroBalanceSignature(patchForSeason(2023,1)),legacySignature(2023));
});

test("milestone introductions handle crossings, later starts and saved dismissals", () => {
  assert.deepEqual(arrivingMilestones("2017.1",undefined).map(m=>m.id),["journey"]);
  assert.deepEqual(arrivingMilestones("2023.2","2022.2").map(m=>m.id),["frontiers"]);
  assert.deepEqual(arrivingMilestones("2026.1",undefined),[]);
  assert.deepEqual(arrivingMilestones("2023.1","2022.2",["frontiers"]),[]);
  assert.equal(simplifiedHeroNote("Cooldown increased from 5s to 10s"),"An ability takes longer to become available again.");
  assert.equal(simplifiedHeroNote("Damage decreased from 100 to 80"),"A damage value was lowered.");
});

test("talent selection respects era, ownership, event locks and normalizes optional saved fields", () => {
  let c = createCampaign({ ...DEFAULT_SETTINGS, year:2017 });
  const id = c.roster[0], before = structuredClone(c);
  c = choosePlayerTalent(c,id,10,0);
  assert.equal(c.talentPlans?.[id][10],0);
  assert.deepEqual(c.players,before.players); assert.equal(c.cash,before.cash); assert.equal(c.week,before.week);
  assert.equal(choosePlayerTalent({...c,year:2016},id,15,0).talentPlans?.[id][15],undefined);
  assert.equal(choosePlayerTalent(c,"unknown",15,0),c);
  // A pinned roster in an ongoing run locks changes, independently of dates.
  const locked={...c,calendar:{now:"2017-01-01",runs:[{state:"playing",teams:[{roster:c.roster}]}]}} as unknown as typeof c;
  assert.equal(choosePlayerTalent(locked,id,15,0),locked);
  assert.deepEqual(normalizeTalentPlan({10:0,15:7,20:1,25:"0",30:0}),{10:0,20:1});
  const storage = globalThis.localStorage;
  try {
    const stored={...c,seenPatchMilestones:["journey","bad"],talentPlans:{[id]:{10:0,15:7},bad:null}};
    globalThis.localStorage={getItem:(key:string)=>key===SAVE_KEY?JSON.stringify(stored):null} as Storage;
    const loaded=readSave()!;
    assert.equal(loaded.talentPlans?.[id][10],0); assert.deepEqual(loaded.talentPlans?.bad,{});
    assert.deepEqual(loaded.seenPatchMilestones,["journey"]); assert.deepEqual(loaded.roster,c.roster);
  } finally {globalThis.localStorage=storage;}
});

test("talents change actual combat only at their unlocked levels and stay inactive before 7.00", () => {
  const cfg=base();
  const plan={10:1,15:1,20:1,25:1} as const;
  const players=cfg.players.map(side=>side.map(p=>({...p,talents:plan}))) as BattleConfig["players"];
  const normal=new LaneBattle({...cfg,players,patchId:"2017.1"});
  const noTalents=new LaneBattle({...cfg,players:players.map(side=>side.map(p=>({...p,talents:{}}))) as BattleConfig["players"],patchId:"2017.1"});
  const a=normal.units.find(u=>u.player)!,b=noTalents.units.find(u=>u.player)!;
  assert.equal(a.max,b.max);
  const internals=(battle:LaneBattle)=>battle as unknown as {gainXp:(u:typeof a,n:number)=>void;damage:(a:typeof a,b:typeof a,n:number)=>void;cast:(a:typeof a,b:typeof a)=>void};
  internals(normal).gainXp(a,50000);internals(noTalents).gainXp(b,50000);
  assert.equal(a.level,25); assert.ok(Math.abs(a.max/b.max-1.08*1.12)<1e-8);
  const t1=normal.units.find(u=>u.kind==="tower"&&u.team!==a.team)!,t2=noTalents.units.find(u=>u.kind==="tower"&&u.team!==b.team)!;
  internals(normal).damage(a,t1,100);internals(noTalents).damage(b,t2,100);
  assert.ok(1800-t1.hp>1800-t2.hp);
  a.hero=heroById("sven")!;b.hero=heroById("sven")!;
  const e1=normal.units.find(u=>u.player&&u.team!==a.team)!,e2=noTalents.units.find(u=>u.player&&u.team!==b.team)!;
  e1.hp=100000;e2.hp=100000;
  internals(normal).cast(a,e1);internals(noTalents).cast(b,e2);
  assert.ok(Math.abs((100000-e1.hp)/(100000-e2.hp)-1.08)<1e-8,"spell talent raises actual damage");
  assert.equal(e1.stun,e2.stun,"spell damage talent does not change control duration");
  const pre=new LaneBattle({...cfg,players,patchId:"2016.2"});
  const old=pre.units.find(u=>u.player)!;
  assert.equal((pre as unknown as {talents:(u:typeof old)=>{health:number}}).talents(old).health,1);
  assert.equal(talentBonuses({15:0},14).resources,1); assert.equal(talentBonuses({15:0},15).resources,1.1);
  assert.equal(talentBonuses({20:0},20).speed,1.06);
  assert.equal(talentBonuses({15:1},15).spells,1.08);
});

test("New Frontiers increases real area, provides finite camp resources and captures outer-map travel", () => {
  assert.ok(Math.abs(frontierSize**2 / 800**2-1.4)<1e-10);
  const classic=new LaneBattle({...base(),patchId:"2022.2"});assert.equal(classic.camps.length,0);
  const cfg={...base(),captureReplay:true};
  const battle=new LaneBattle(cfg);assert.equal(battle.camps.length,12);
  const result=battle.run();
  assert.ok(result.players.reduce((s,p)=>s+(p.neutralLastHits??0),0)>0,"real neutral last hits");
  assert.ok(battle.frames.some(f=>f.units.some(u=>u.kind==="hero"&&(u.x<0||u.x>800||u.y<0||u.y>800))),"heroes travel into the extra map area");
  assert.ok(battle.frames.some(f=>f.camps?.some(c=>c.readyAt>f.time && c.readyAt>60)),"camps go on respawn cooldown after clearing");
  assert.equal(result.ancientHealth[1-result.winner],0);
  const simulated=simulateSeries({...base(),captureReplay:false});
  assert.equal(simulated.summary.mapLayout,"frontiers");
  assert.deepEqual(simulated.summary,simulateSeries({...base(),captureReplay:false}).summary);
});

test("managed and AI tournament workers share talents, hero gates and milestone map rules", () => {
  // Use the established TI1 entry path with a pinned modern composite to check
  // both worker contracts without depending on later invitation forecasts.
  const ti1=historicalTournaments.find(e=>e.kind==="ti" && e.year===2011)!;
  let c=enterHistoricalTournament(enableHistoricalCalendar(createCampaign(DEFAULT_SETTINGS)),ti1.id,512);
  const run={...c.calendar!.runs[0],patchId:"2023.1"};
  c={...c,talentPlans:{[c.roster[0]]:automaticTalents(0)}};
  const fixture=nextTournamentFixture(run)!;
  const cfg=tournamentBattleConfig(c,run,fixture,false);
  const templates=Object.fromEntries(run.teams.map(team=>[team.id,tournamentTeamTemplate(c,run,team.id)]));
  const batch=simulateOtherTournamentMatches({run,templates,year:2011,heroPoolThroughYear:2010,through:fixture.at});
  const direct=simulateSeries({...cfg,captureReplay:false});
  assert.deepEqual(batch.matches[0].performance?.games,direct.summary.games.map(({winner,duration,kills,players,draft})=>({winner,duration,kills,players,...(draft?{draft}:{})})));
  assert.equal(direct.summary.mapLayout,"frontiers");
  assert.ok(templates[run.managed].players[0].talents);
});
