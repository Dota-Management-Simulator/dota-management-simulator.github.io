/** Reproducible disposable campaign checks. Never reads browser saves or applies calibration. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { advanceCalendarTo, advanceWeek, buildBattleConfig, createCampaign, DEFAULT_SETTINGS, events, rating, settleEvent, signPlayer, weeklyIncome, weeklyWages } from '../src/game';
import type { Campaign } from '../src/game';
import { enableHistoricalCalendar } from '../src/historical-game';
import { simulateSeries } from '../src/battle';
import { initialSponsorOffer, negotiateSponsor, sponsorBenefits, sponsorBlocker, sponsors } from '../src/sponsors';
import { talkToPlayer, welfarePreferences } from '../src/player-welfare';
import { setTrainingSchedule } from '../src/training';
import { heroMasteries, normalizeCareer } from '../src/player-career';
import { exportCampaign, importCampaign } from '../src/campaign-library';
import { askingWage, signingFee } from '../src/player-market';
import { combatInputs } from './combat-inputs.mjs';

const option = (name: string, fallback: string) => { const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1]; };
const year=Number(option('--year','2011')), seed=Number(option('--seed','281027'));
if(!Number.isSafeInteger(year)||year<2011||year>2026||!Number.isSafeInteger(seed))throw Error('Invalid audit year or seed');
const folder=resolve(option('--out','.local/player-career-quality'));await mkdir(folder,{recursive:true});
const inputs=[...new Set([...combatInputs,'src/game.ts','src/history.ts','src/development.ts','src/training.ts','src/contracts.ts','src/player-market.ts','src/ai-club-economy.ts','src/sponsors.ts','src/campaign-library.ts','scripts/audit-campaign.ts','package-lock.json'])];
async function fingerprint(){const hash=createHash('sha256');for(const path of inputs){hash.update(path);hash.update(await readFile(resolve(path)));}return hash.digest('hex');}
const sourceFingerprint=await fingerprint();
const started=performance.now(), matches: {event:string;duration:number;winner:number}[]=[], failures:string[]=[];
function prepare(c:Campaign) {
  for(const brand of sponsors.slice().sort((a,b)=>b.weekly-a.weekly)){
    if(weeklyIncome(c)>=weeklyWages(c)+1000)break;
    if(sponsorBlocker(c,brand))continue;
    let result=negotiateSponsor(c,brand.id,initialSponsorOffer(c,brand));
    if(result.status==='counter'&&result.counter)result=negotiateSponsor(c,brand.id,result.counter);
    if(result.status==='accepted')c=result.campaign;
  }
  for(const role of ['Carry','Mid','Offlane','Soft support','Hard support'])if(!c.roster.some(id=>c.players.find(p=>p.id===id)?.role===role)){
    const replacement=c.players.filter(p=>p.role===role&&!c.roster.includes(p.id)&&signingFee(c,p)<=c.cash&&askingWage(c,p)<=Math.max(600,(weeklyIncome(c)-weeklyWages(c))*.8)).sort((a,b)=>rating(b)-rating(a))[0];
    if(replacement)c=signPlayer(c,replacement.id);
  }
  const media=sponsorBenefits(c).mediaHours;
  for(const id of [...c.roster]){
    const p=c.players.find(p=>p.id===id)!, preferences=welfarePreferences(c,p);
    const days=7-preferences.restDays,hours=Math.max(10,Math.min(20,preferences.maxHours-media));
    c=setTrainingSchedule(c,id,{intensity:'Normal',daysPerWeek:days,hoursPerDay:hours/days});
    c.training[id]=p.energy<60?'Rest':'Balanced';
    const row=c.players.find(p=>p.id===id)!;row.career=normalizeCareer(row.career);
    row.career.focusHeroId??=Object.entries(heroMasteries(c,row)).sort((a,b)=>b[1]-a[1])[0]?.[0];
    if((c.welfare?.players[id]?.unhappyWeeks??0)>=2)c=talkToPlayer(c,id);
  }
  return c;
}
function roundTrip(c:Campaign){const imported=importCampaign(exportCampaign(c));if(imported.cash!==c.cash||imported.year!==c.year||imported.week!==c.week||JSON.stringify(imported.roster)!==JSON.stringify(c.roster)||imported.calendar?.now!==c.calendar?.now)throw Error('Portable save changed campaign identity, date or cash');}
let c=createCampaign({...DEFAULT_SETTINGS,year}), steps=0, minCash=c.cash;
const initialPlayers=new Set(c.roster);
while(c.year===year&&steps++<24){
  c=prepare(c); const event=events.find(e=>e.week===c.week&&(e.kind!=='ti'||c.qualified));
  if(event&&c.roster.length===5){
    const cfg={...buildBattleConfig(c,event,seed^steps),captureReplay:false,captureTimeline:false};
    try{const series=simulateSeries(cfg).summary;c=settleEvent(c,event,series);for(const map of series.games)matches.push({event:event.id,duration:map.duration,winner:map.winner});}
    catch(error){failures.push(`${event.id}: ${error instanceof Error?error.message:String(error)}`);c=advanceWeek(c);}
  }else c=advanceWeek(c);
  minCash=Math.min(minCash,c.cash);roundTrip(c);
  console.log(JSON.stringify({year,mode:'legacy',week:c.week,maps:matches.length,cash:c.cash,roster:c.roster.length}));
}
const legacy={yearCompleted:c.year>year,steps,maps:matches.length,events:c.results.filter(r=>r.year===year&&!r.skipped).length,missedTi:!c.results.some(r=>r.year===year&&r.eventId==='ti'&&!r.skipped),closingCash:c.cash,minCash:c.cash<minCash?c.cash:minCash,retainedStarters:c.roster.filter(id=>initialPlayers.has(id)).length,departures:c.welfare?.departures.length??0};
let dated=enableHistoricalCalendar(createCampaign({...DEFAULT_SETTINGS,year}));
const origin=Date.parse(dated.calendar!.now);let paidWeeks=0;
for(let week=1;week<=52;week++){
  dated=prepare(dated);dated=advanceCalendarTo(dated,new Date(origin+week*604800000).toISOString());roundTrip(dated);paidWeeks=dated.calendar!.paidWeeks;
}
const durations=matches.map(m=>m.duration).sort((a,b)=>a-b);
const sourceUnchanged=sourceFingerprint===await fingerprint();
const report={year,seed,engine:'current local source',sourceFingerprint,sourceUnchanged,legacy,dated:{paidWeeks,closingCash:dated.cash,roster:dated.roster.length,departures:dated.welfare?.departures.length??0,aiClubs:Object.keys(dated.aiEconomy?.clubs??{}).length,aiTransfers:dated.aiEconomy?.transfers.length??0},
  medianDuration:durations[Math.floor(durations.length/2)]??null,maxDuration:durations.at(-1)??null,matches,failures,elapsedSeconds:Math.round((performance.now()-started)/1000),
  scope:'One seeded legacy season with real series and 52 dated management weeks. Dated tournaments are not played by this policy. This is a campaign smoke audit, not all-hero or all-era statistical balance certification.'};
await writeFile(resolve(folder,`${year}-${seed}.json`),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
if(failures.length||!legacy.yearCompleted||paidWeeks!==52||!sourceUnchanged)process.exitCode=1;
