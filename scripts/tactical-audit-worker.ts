import { parentPort, workerData } from "node:worker_threads";
import { LaneBattle, seededRandom } from "../src/battle";
import type { BattleConfig } from "../src/battle";
import { getHeroPool } from "../src/heroes";
import { patchById } from "../src/patches";
import { heroBalanceSignature } from "../src/hero-balance";
import { pairedWilson } from "./calibration-stats.mjs";

const job=workerData as {patchId:string;maps:number;seed:number};
const patch=patchById(job.patchId)!,pool=getHeroPool(patch.year,patch.year-1,patch);
const skills=Object.fromEntries("creativity stability confidence stamina heroPool laning teamfights farming skirmish vision intuition pushing".split(" ").map(k=>[k,50]));
const players=[0,1].map(side=>Array.from({length:5},(_,role)=>({id:`${side}:${role}`,name:`Position ${role+1}`,role,skills:{...skills},energy:100,happiness:100}))) as BattleConfig["players"];
const observer={teamKey:"benchmark",staffIds:["c1","c2","c4","c5","c6"]};
const base:BattleConfig={seed:1,year:patch.year,heroPoolThroughYear:patch.year-1,patchId:patch.id,teams:["Benchmark A","Benchmark B"],players,bonuses:[0,0],patchObservers:[observer,observer],captureReplay:false,captureTimeline:false};
const counts=Object.fromEntries(pool.map(h=>[h.id,{played:0,wins:0}]));
let sideZeroWins=0,purchases=0,roshan=0,calls=0,converted=0,overtime=0,duration=0,skillWins=0,skillMaps=0;
function draftFor(pair:number):[string[],string[]] {
  const random=seededRandom(job.seed+pair*7919),focus=pool[pair%pool.length],role=focus.roles[Math.floor(random()*focus.roles.length)];
  const draft:[string[],string[]]=[Array(5),Array(5)],used=new Set([focus.id]);draft[0][role]=focus.id;
  for(const side of [0,1])for(let r=0;r<5;r++)if(!draft[side][r]){
    const choices=pool.filter(h=>h.roles.includes(r)&&!used.has(h.id));
    if(!choices.length)throw Error("No legal audit draft");const h=choices[Math.floor(random()*choices.length)];draft[side][r]=h.id;used.add(h.id);
  }
  return draft;
}
for(let pair=0;pair<job.maps/2;pair++) {
  const draft=draftFor(pair);
  for(const flip of [false,true]){
    const fixed:[string[],string[]]=flip?[draft[1],draft[0]]:draft;
    const result=new LaneBattle({...base,seed:job.seed+pair*104729,draft:fixed}).run();
    sideZeroWins+=result.winner===0?1:0;duration+=result.duration;overtime+=result.overtime?1:0;
    purchases+=result.itemEvents!.filter(e=>e.kind==="purchase").length;roshan+=result.roshanKills!.reduce((a,b)=>a+b,0);
    calls+=result.tacticalEvents!.filter(e=>e.status==="called").length;converted+=result.tacticalEvents!.filter(e=>e.status==="completed").length;
    for(const side of [0,1])for(const id of fixed[side]){counts[id].played++;counts[id].wins+=side===result.winner?1:0;}
  }
}
// Independent seeds/fixed drafts isolate player development from draft choice.
if(["2011.2","2015.2","2023.1","2026.2"].includes(patch.id))for(let pair=0;pair<8;pair++){
  const draft=draftFor(pair+10000);
  for(const strongSide of [0,1]){
    const stronger=players.map((side,t)=>side.map(p=>({...p,skills:Object.fromEntries(Object.keys(p.skills).map(k=>[k,t===strongSide?70:30]))}))) as BattleConfig["players"];
    const result=new LaneBattle({...base,players:stronger,seed:job.seed+1800000000+pair*104729,draft}).run();
    skillMaps++;skillWins+=result.winner===strongSide?1:0;
  }
}
const rows=pool.map(h=>{const c=counts[h.id],target=patch.heroBalance!.find(r=>r.id===h.id)!.targetWinRate;return {id:h.id,...c,winRate:c.wins/c.played*100,targetWinRate:target,...pairedWilson(c.wins,c.played)};});
parentPort!.postMessage({patch:patch.id,signature:heroBalanceSignature(patch),maps:job.maps,sideZeroWins,sideZeroWinRate:sideZeroWins/job.maps*100,
  meanAbsoluteError:rows.reduce((n,r)=>n+Math.abs(r.winRate-r.targetWinRate),0)/rows.length,ceilingFlags:rows.filter(r=>r.low>58).map(r=>r.id),
  purchases,roshan,calls,converted,overtime,averageDuration:duration/job.maps,skillMaps,skillWins,rows});
