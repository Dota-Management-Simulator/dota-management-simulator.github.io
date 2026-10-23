import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { LaneBattle, simulateSeries } from "../src/battle";
import { advanceWeek, buildBattleConfig, createCampaign, DEFAULT_SETTINGS, events, readSave, SAVE_KEY } from "../src/game";
import { enableHistoricalCalendar, enterHistoricalTournament, tournamentBattleConfig, tournamentTeamTemplate } from "../src/historical-game";
import { historicalTournaments, nextTournamentFixture, recordTournamentSeries } from "../src/tournaments";
import { simulateOtherTournamentMatches } from "../src/tournament.worker";
import { campaignPatch, draftWeight, historicalPatches, patchAtDate, patchAxes, patchById, patchForSeason } from "../src/patches";
import type { PatchAxis, SeasonPatch } from "../src/patches";
import { getHeroPool, heroById } from "../src/heroes";
import { tournamentScoreboard } from "../src/scoreboards";

const campaign = () => createCampaign(DEFAULT_SETTINGS);
const config = () => ({ ...buildBattleConfig(campaign(), events[0], 715), captureReplay: false, seriesFormat: { bestOf: 1 as const } });
const ti1 = historicalTournaments.find(e => e.kind === "ti" && e.year === 2011)!;

test("every imported year has exactly two distinct sourced-or-provisional patch identities with eligible hero IDs", () => {
  assert.equal(historicalPatches.length,32);
  for (let year=2011; year<=2026; year++) {
    const [a,b] = historicalPatches.filter(p=>p.year===year);
    assert.deepEqual([a.phase,b.phase],[1,2]);
    assert.notEqual(a.name,b.name); assert.notDeepEqual(a.axes,b.axes);
    assert.ok(a.startsOn < b.startsOn);
    for (const p of [a,b]) {
      assert.equal(p.heroes.length,6); assert.equal(new Set(p.heroes.map(h=>h.id)).size,6);
      assert.ok(p.heroes.every(h=>heroById(h.id) && h.bonus>=0 && h.bonus<=12));
      assert.ok(patchAxes.every(axis=>Number.isFinite(p.axes[axis.key]) && p.axes[axis.key]>=0 && p.axes[axis.key]<=100));
      assert.ok(p.sources.length || p.evidence === "limited");
      assert.ok(p.limitations.some(note=>note.includes("estimates")));
    }
  }
});

test("compiled modern patch evidence is traceable to actual cached Valve responses and never passes a phase boundary", () => {
  const cache = JSON.parse(gunzipSync(readFileSync(new URL("../scripts/data/patch-sources.json.gz",import.meta.url))).toString());
  for (const p of historicalPatches) for (const hero of p.heroes) if (hero.evidence) {
    const source = cache.sources[hero.evidence.url];
    assert.equal(source.patch_number,hero.evidence.version);
    assert.ok(JSON.stringify(source).includes(hero.evidence.note), `Evidence for ${p.id} is retained in the original response`);
  }
  assert.ok(patchForSeason(2026,2).sources.every(s=>s.date<="2026-08-23"));
  assert.ok(!patchForSeason(2026,2).versions.includes("7.41f"));
});

test("patch drops follow shuffles, second-phase dates and TI seasons on both clocks, including cancelled TI2020", () => {
  assert.equal(campaignPatch({ year:2013,week:1 }).id,"2013.1");
  assert.equal(campaignPatch({ year:2013,week:8 }).id,"2013.1");
  assert.equal(campaignPatch({ year:2013,week:9 }).id,"2013.2");
  assert.equal(campaignPatch({ year:2013,week:17 }).id,"2014.1");
  let c = { ...campaign(), week:16 };
  const next = advanceWeek(c); assert.equal(campaignPatch(next).id,"2012.1");
  assert.equal(patchAtDate("2013-05-29").id,"2013.1");
  assert.equal(patchAtDate("2013-05-30").id,"2013.2");
  assert.equal(patchAtDate("2013-08-11").id,"2013.2");
  assert.equal(patchAtDate("2013-08-12").id,"2014.1");
  assert.equal(patchAtDate("2020-10-01").id,"2020.2");
  assert.equal(patchAtDate("2021-01-01").id,"2021.1");
  for (const ti of historicalTournaments.filter(e=>e.kind==="ti")) assert.equal(patchAtDate(ti.start).id,`${ti.year}.2`);
});

test("future years have two reproducible fictional patches and do not borrow historical source claims", () => {
  const lastTi=historicalTournaments.find(e=>e.kind==="ti" && e.year===2026)!;
  const firstGenerated=new Date(Date.parse(lastTi.end)+86400000).toISOString().slice(0,10);
  assert.equal(patchForSeason(2027,1).startsOn,firstGenerated);
  assert.equal(patchAtDate(firstGenerated).id,"2027.1");
  for (const year of [2027,2036,2040]) {
    const a=patchForSeason(year,1),b=patchForSeason(year,2);
    assert.deepEqual(a,patchById(a.id)); assert.notDeepEqual(a.axes,b.axes);
    assert.ok(a.generated && b.generated); assert.deepEqual(a.sources,[]);
    assert.equal(patchAtDate(`${year}-01-01`).id,`${year}.1`);
    assert.equal(patchAtDate(`${year}-06-01`).id,`${year}.2`);
    assert.equal(patchAtDate(`${year}-09-01`).id,`${year+1}.1`);
  }
  assert.equal(patchById("unknown"),undefined);
});

test("strong heroes gain draft priority without removing off-meta options, creativity softens it and no hero unlocks early", () => {
  const patch=patchForSeason(2011,2),chen=heroById("chen")!;
  const neutral={...patch,heroes:[],heroBalance:[]};
  assert.ok(draftWeight(chen,patch,20)>draftWeight(chen,neutral,20));
  assert.ok(draftWeight(chen,patch,99)<draftWeight(chen,patch,0));
  assert.ok(getHeroPool(2011).every(h=>draftWeight(h,patch,0)>0));
  let featured=0,baseline=0;
  for(let seed=1;seed<=250;seed++) {
    const cfg={...config(),seed,patchId:"2011.2"};
    featured+=new LaneBattle(cfg).units.filter(u=>u.hero?.id==="chen").length;
    baseline+=new LaneBattle({...cfg,patchId:undefined}).units.filter(u=>u.hero?.id==="chen").length;
  }
  assert.ok(featured>baseline,`Chen drafted ${featured} times with priority versus ${baseline} without`);
  for(const patch of historicalPatches) {
    const year=patch.year;
    const draft=new LaneBattle({...config(),year,patchId:patch.id,heroPoolThroughYear:year-1}).units.filter(u=>u.hero);
    assert.equal(new Set(draft.map(u=>u.hero!.id)).size,10);
    assert.ok(draft.every(u=>u.hero!.releasedYear==null || u.hero!.releasedYear<year));
  }
});

// Exercise actual combat operations while holding the player, hero, geometry
// and RNG constant. Each isolated axis must change a measured mechanic.
test("all seven axes change real combat mechanics and featured power changes both sides equally", () => {
  const neutral: SeasonPatch={...structuredClone(patchForSeason(2011,1)),id:"2098.1",year:2098,heroes:[],heroBalance:undefined,axes:Object.fromEntries(patchAxes.map(a=>[a.key,50])) as SeasonPatch["axes"]};
  historicalPatches.push(neutral);
  const build = (axis?:PatchAxis, value=100) => {
    const patch={...structuredClone(neutral),axes:{...neutral.axes,...(axis?{[axis]:value}:{})}};
    historicalPatches[historicalPatches.length-1]=patch;
    return new LaneBattle({...config(),patchId:patch.id});
  };
  try {
    const metric=(axis:PatchAxis,value:number)=>{
      const base=build(axis,value);
      const a=base.units.find(u=>u.player)!, e=base.units.find(u=>u.player&&u.team!==a.team)!, t=base.units.find(u=>u.kind==="tower"&&u.team!==a.team)!;
      const x=base as unknown as { attack:(source:typeof a,target:typeof a)=>void; cast:(source:typeof a,target:typeof a)=>void; damage:(source:typeof a,target:typeof a,n:number)=>void };
      if(axis==="tempo") return a.speed;
      if(axis==="economy"){base.step();return a.gold;}
      if(axis==="laning"){x.attack(a,e);return e.hp;}
      if(axis==="objectives"||axis==="splitpush"){if(axis==="splitpush"){a.x=400;a.y=400;}x.damage(a,t,100);return t.hp;}
      if(axis==="teamfight"){a.hero=heroById("storm_spirit")!;base.units.filter(u=>u.player&&u.team===a.team).forEach(u=>{u.x=a.x;u.y=a.y;});x.cast(a,e);return e.hp;}
      base.units=base.units.filter(u=>u===a||u===e);a.x=400;a.y=400;e.x=a.x+a.range+80;e.y=400;e.stun=100;a.abilityCd=100;base.step();return a.x;
    };
    for(const {key} of patchAxes.filter(a=>a.key!=="tempo")) assert.notEqual(metric(key,50),metric(key,100),key);
    const slow=build(),fast=build("tempo");assert.ok(fast.units.find(u=>u.player)!.speed>slow.units.find(u=>u.player)!.speed);
    const base=build(); const all=getHeroPool(2011).map(h=>({id:h.id,bonus:12,evidence:null}));
    historicalPatches[historicalPatches.length-1]={...structuredClone(neutral),heroes:all};
    const strong=new LaneBattle({...config(),patchId:neutral.id});
    const a=base.units.filter(u=>u.player),b=strong.units.filter(u=>u.player);
    for(let i=0;i<10;i++) assert.ok(Math.abs(b[i].power/a[i].power-1.12)<1e-10);
  } finally {historicalPatches.pop();}
});

test("both patch identities resolve genuine repeatable map results and persist their own patch metadata", () => {
  const cfg={...config(),year:2015,heroPoolThroughYear:2014};
  const a=simulateSeries({...cfg,patchId:"2015.1"}),b=simulateSeries({...cfg,patchId:"2015.2"});
  assert.notDeepEqual(a.summary.games,b.summary.games);
  assert.deepEqual(b.summary,simulateSeries({...cfg,patchId:"2015.2"}).summary);
  for(const result of [a,b]) {
    assert.equal(result.summary.games[0].ancientHealth[1-result.summary.games[0].winner],0);
    assert.ok(result.summary.patch?.id.startsWith("2015."));
    assert.equal(result.frames[0].length,0);
  }
  const old=simulateSeries({...config(),patchId:undefined});assert.equal(old.summary.patch,undefined);
});

test("tournaments pin one patch across both workers, date changes and reload, including compact AI scoreboards", () => {
  const c=enterHistoricalTournament(enableHistoricalCalendar(campaign()),ti1.id,512);
  const run=c.calendar!.runs[0]; assert.equal(run.patchId,"2011.2");
  const fixture=nextTournamentFixture(run)!;
  const cfg=tournamentBattleConfig(c,run,fixture,false);
  const later={...c,calendar:{...c.calendar!,now:"2012-06-01T00:00:00Z"}};
  assert.equal(tournamentBattleConfig(later,run,fixture,false).patchId,cfg.patchId);
  const templates=Object.fromEntries(run.teams.map(team=>[team.id,tournamentTeamTemplate(c,run,team.id)]));
  const batch=simulateOtherTournamentMatches({run,templates,year:2011,heroPoolThroughYear:2010,through:fixture.at});
  const direct=simulateSeries({...cfg,captureReplay:false});
  const first=batch.matches[0];assert.ok(first.performance?.patch);
  assert.throws(()=>recordTournamentSeries(run,fixture.id,{...direct.summary,patch:{...direct.summary.patch!,id:"2012.1"}}),/different tournament patch/);
  assert.deepEqual(first.performance?.games,direct.summary.games.map(({winner,duration,kills,players,draft})=>({winner,duration,kills,players,...(draft?{draft}:{})})));
  assert.deepEqual(tournamentScoreboard(ti1,batch,first)?.result.series?.patch,direct.summary.patch);
  const old=structuredClone(run);delete old.patchId;
  assert.equal(tournamentBattleConfig(c,old,fixture).patchId,run.patchId);
  const recorded=recordTournamentSeries(old,fixture.id,direct.summary);assert.equal(recorded.patchId,run.patchId);
  const oldStorage=globalThis.localStorage;
  try {globalThis.localStorage={getItem:(key:string)=>key===SAVE_KEY?JSON.stringify(c):null} as Storage;
    const loaded=readSave()!;assert.equal(loaded.calendar!.runs[0].patchId,run.patchId);
    assert.equal(loaded.cash,c.cash);assert.equal(loaded.calendar!.now,c.calendar!.now);assert.deepEqual(loaded.roster,c.roster);
  } finally {globalThis.localStorage=oldStorage;}
});
