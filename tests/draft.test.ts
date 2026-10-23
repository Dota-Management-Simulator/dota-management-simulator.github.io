import {test} from "node:test";
import assert from "node:assert/strict";
import {autoDraftMap,createMapDraft,automaticDraftAction,draftCanFinish,draftSuggestions,normalizeDraftPreparation,takeDraftAction,withDraftKnowledge} from "../src/draft";
import {captainsRulesFor,draftSequence} from "../src/captains-mode";
import {getHeroPool} from "../src/heroes";
import type {Hero} from "../src/heroes";
import {heroRoleProfile} from "../src/hero-roles";
import {historicalPatches,patchForSeason} from "../src/patches";
import {LaneBattle,simulateSeries} from "../src/battle";
import {buildBattleConfig,createCampaign,DEFAULT_SETTINGS,events,readSave,SAVE_KEY} from "../src/game";

const campaign=()=>createCampaign(DEFAULT_SETTINGS);
const config=()=>({...buildBattleConfig(campaign(),events[0],42),captureReplay:false,captureTimeline:false});
test("observed roles evolve with the phase; modern Bounty is support, old Bounty can be offlane",()=>{
  assert.ok(heroRoleProfile("bounty_hunter",{year:2013,phase:2},[2,3]).roles.includes(2));
  assert.deepEqual(heroRoleProfile("bounty_hunter",{year:2015,phase:2},[2,3]).roles,[3]);
  assert.ok(!heroRoleProfile("bounty_hunter",{year:2026,phase:2},[2,3]).roles.includes(2));
  assert.deepEqual(heroRoleProfile("underlord",{year:2026,phase:2},[2]).roles,[2]);
  assert.deepEqual(heroRoleProfile("tinker",{year:2015,phase:2},[1]).roles,[1]);
  assert.ok(heroRoleProfile("tinker",{year:2024,phase:2},[1]).roles.every(r=>r>=3));
  for(const patch of historicalPatches)for(const h of getHeroPool(patch.year,patch.year-1,patch)){
    const p=heroRoleProfile(h.id,patch,h.roles);
    assert.ok(p.roles.length&&p.roles.every(r=>r>=0&&r<=4));
    assert.ok(!p.sourceYear||p.sourceYear<=patch.year-(patch.phase===1?1:0));
  }
});
test("historical Captain's Mode rules preserve ban counts, asymmetric phases and both first-pick orientations",()=>{
  for(const [year,phase,bans] of [[2011,2,4],[2012,2,5],[2013,1,5],[2013,2,5],[2018,1,6],[2020,1,6],[2020,2,7],[2026,2,7]]){
    const p=patchForSeason(year,phase as 1|2);
    for(const first of [0,1] as const){const sequence=draftSequence(p,first);for(const side of [0,1]){
      assert.equal(sequence.filter(s=>s.side===side&&s.kind==="pick").length,5);
      assert.equal(sequence.filter(s=>s.side===side&&s.kind==="ban").length,bans);
    }}
  }
  const modern=captainsRulesFor(patchForSeason(2023,2));
  assert.deepEqual(modern.phases[0].order,[0,1,1,0,1,1,0]);
  assert.equal(modern.phases[1].order.length,2);
  assert.equal(modern.phases[3].order.length,6);
});
test("every phase drafts a legal unique five with real bans, including negative tournament seeds",()=>{
  const base=config();
  for(const patch of [...historicalPatches,patchForSeason(2036,1)])for(const seed of [31,-41]){
    const cfg={...base,year:patch.year,patchId:patch.id,heroPoolThroughYear:Math.min(2026,patch.year-1),seed};
    const d=autoDraftMap(cfg),pool=getHeroPool(cfg.year,cfg.heroPoolThroughYear,patch),seq=draftSequence(patch,d.firstPick);
    assert.equal(d.actions.length,seq.length);
    assert.equal(new Set(d.actions.map(a=>a.heroId)).size,d.actions.length);
    assert.ok(d.actions.every((a,i)=>a.kind===seq[i].kind&&a.side===seq[i].side));
    assert.ok(d.heroes.every(side=>side.length===5&&side.every((id,r)=>pool.some(h=>h.id===id&&h.roles.includes(r)))));
    assert.deepEqual(autoDraftMap(cfg),d);
  }
});
test("completion checks protect both teams' scarce roles and flex picks",()=>{
  const hero=(id:string,roles:number[]):Hero=>({id,name:id,roles,attribute:"Strength",ranged:false,ability:"stun"});
  const pool=[...Array.from({length:4},(_,i)=>hero(`flex${i}`,[0,1])),...Array.from({length:6},(_,i)=>hero(`fixed${i}`,[2+i%3]))];
  assert.equal(draftCanFinish(pool,[["flex0","flex1"],["flex2"]],[]),true);
  assert.equal(draftCanFinish(pool,[["flex0","flex1"],["flex2"]],["flex3"]),false);
  assert.equal(draftCanFinish(pool,[["flex0","flex1","flex2"],[]],[]),false);
  assert.equal(draftCanFinish(pool,[["flex0"],["flex0"]],[]),false);
});
test("perfect attributes still make probabilistic choices; hidden power never enters the draft model",()=>{
  const base=config();for(const side of base.players)for(const p of side)for(const k of Object.keys(p.skills))p.skills[k]=99;
  const chosen=new Set<string>();for(let seed=1;seed<=40;seed++){const c={...base,seed};chosen.add(automaticDraftAction(c,createMapDraft(c)).actions[0].heroId);}
  assert.ok(chosen.size>5);
  // A ban evaluates the opposing lineup through the acting team's research.
  const a={...base,seed:42,patchObservers:[{teamKey:"Us",staffIds:[]},{teamKey:"Them",staffIds:[]}]} as typeof base;
  const b={...a,patchObservers:[a.patchObservers[0],{teamKey:"Private opponent research",staffIds:["analyst"]}]} as typeof base;
  assert.deepEqual(draftSuggestions(a,createMapDraft(a)),draftSuggestions(b,createMapDraft(b)));
  const secretPlan={...a,draftPreparations:[undefined,normalizeDraftPreparation({approach:"push",preferred:[["anti_mage"],["puck"],["beastmaster"],["chen"],["lich"]]})]} as typeof base;
  assert.deepEqual(draftSuggestions(a,createMapDraft(a)),draftSuggestions(secretPlan,createMapDraft(secretPlan)));
  const p=patchForSeason(2011,1),before=autoDraftMap({...base});
  try{for(const row of p.heroBalance!)row.power=75;assert.deepEqual(autoDraftMap({...base}),before);}
  finally{for(const row of p.heroBalance!)delete row.power;}
});
test("manual fixed drafts and automated engine drafts preserve actual pick/ban records and Ancient outcomes",()=>{
  const c=config(),draft=autoDraftMap(c);
  assert.throws(()=>takeDraftAction(c,createMapDraft(c),"kez"),/illegal|unavailable/);
  const manual=new LaneBattle({...c,draft:draft.heroes,draftRecord:draft}).run();
  const automatic=new LaneBattle(c).run();
  assert.deepEqual(manual,automatic);
  assert.equal(manual.ancientHealth[1-manual.winner],0);
  const series=simulateSeries({...c,seriesFormat:{bestOf:2}});
  assert.equal(series.summary.games.length,2);
  assert.ok(series.summary.games.every(g=>g.draft?.actions.length===18));
  assert.equal(series.summary.games[0].draft!.firstPick,1-series.summary.games[1].draft!.firstPick);
});
test("preparation persists safely and familiarity comes only from actual completed campaign games",()=>{
  const c=campaign(),cfg=config();
  c.draftPreparation=normalizeDraftPreparation({approach:"push",preferred:[["chen","unknown","chen"]],bans:["axe","unknown"]});
  assert.deepEqual(c.draftPreparation.preferred[0],["chen"]);
  const before=withDraftKnowledge(c,cfg);assert.ok(before.players.flat().every(p=>Object.keys(p.heroExperience!).length===0));
  const played=simulateSeries({...cfg,seriesFormat:{bestOf:1}}).summary;
  c.results.push({eventId:"open",event:"test",year:2011,week:3,won:true,prize:0,points:0,opponent:"other",score:"1–0",series:played});
  const after=withDraftKnowledge(c,cfg);const row=played.games[0].players[0];
  assert.equal(after.players[0][0].heroExperience![row.heroId],1);
  const old=globalThis.localStorage;
  try{globalThis.localStorage={getItem:(k:string)=>k===SAVE_KEY?JSON.stringify(c):null} as Storage;assert.deepEqual(readSave()!.draftPreparation,c.draftPreparation);}
  finally{globalThis.localStorage=old;}
});
