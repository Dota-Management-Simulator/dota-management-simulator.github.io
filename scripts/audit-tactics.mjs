import { build } from 'esbuild';
import { Worker } from 'node:worker_threads';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeCheckpoint } from './checkpoint.mjs';
import { createHash } from 'node:crypto';
import { combatInputs } from './combat-inputs.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),args=process.argv.slice(2);
const option=(k,f)=>args.includes(k)?args[args.indexOf(k)+1]:f;
const maps=Number(option('--maps',256)),workers=Number(option('--workers',4));
if(!Number.isInteger(maps)||maps<256||maps%2||!Number.isInteger(workers)||workers<1)throw Error('Use an even map count >=256 and positive workers');
const folder=resolve(root,option('--out','.local/tactics-audit'));await mkdir(folder,{recursive:true});
async function sourceFingerprint(){const d=createHash('sha256');for(const p of [...combatInputs,'scripts/tactical-audit-worker.ts'])d.update(await readFile(resolve(root,p)));return d.digest('hex');}
const fingerprint=await sourceFingerprint();
const workerFile=resolve(folder,'audit-worker.mjs');
await build({entryPoints:[resolve(root,'scripts/tactical-audit-worker.ts')],outfile:workerFile,bundle:true,platform:'node',format:'esm',logLevel:'silent'});
const patches=JSON.parse(await readFile(resolve(root,'src/data/patches.json'),'utf8')).patches.map(p=>p.id),pending=[...patches],results=[];
const update=()=>writeCheckpoint(resolve(folder,'status.json'),{status:results.length===patches.length?'complete-pilot-audit':'running',processId:process.pid,completedPatches:results.length,expectedPatches:patches.length,maps:results.reduce((n,r)=>n+r.maps+r.skillMaps,0),updatedAt:new Date().toISOString(),certifiesBalance:false});
await update();
async function consume(){while(pending.length){const patchId=pending.shift();const result=await new Promise((accept,reject)=>{const w=new Worker(workerFile,{workerData:{patchId,maps,seed:937131+patches.indexOf(patchId)*10000019}});let received=false;w.on('message',r=>{received=true;accept(r);});w.on('error',reject);w.on('exit',c=>{if(c||!received)reject(Error(`Audit worker ${patchId} exited ${c}`));});});results.push(result);await update();console.log(`${patchId}: ${result.maps} maps, side 0 ${result.sideZeroWinRate.toFixed(1)}%, error ${result.meanAbsoluteError.toFixed(2)}pp, ${result.ceilingFlags.length} conservative flags`);}}
await Promise.all(Array.from({length:Math.min(workers,patches.length)},consume));results.sort((a,b)=>a.patch.localeCompare(b.patch));
const summary={method:'Pilot only: equal players/staff, legal unique focal-hero drafts, side-swapped pairs, automatic tactics/builds. Independent 70-v-30 player-strength probes. Insufficient for final balance certification.',certifiesBalance:false,
  fingerprint,matchesCurrentEngine:await sourceFingerprint()===fingerprint,
  maps:results.reduce((n,r)=>n+r.maps+r.skillMaps,0),patches:results.length,sideZeroWinRate:results.reduce((n,r)=>n+r.sideZeroWins,0)/(maps*results.length)*100,
  meanAbsoluteError:results.reduce((n,r)=>n+r.meanAbsoluteError,0)/results.length,ceilingFlags:results.reduce((n,r)=>n+r.ceilingFlags.length,0),
  skillMaps:results.reduce((n,r)=>n+r.skillMaps,0),skillWins:results.reduce((n,r)=>n+r.skillWins,0),purchases:results.reduce((n,r)=>n+r.purchases,0),roshan:results.reduce((n,r)=>n+r.roshan,0),results};
await writeFile(resolve(folder,'summary.json'),JSON.stringify(summary,null,2)+'\n');
const csv=['patch,hero,played,wins,win_rate,target,low,high'];for(const r of results)for(const h of r.rows)csv.push([r.patch,h.id,h.played,h.wins,h.winRate,h.targetWinRate,h.low,h.high].join(','));await writeFile(resolve(folder,'hero-rates.csv'),csv.join('\n')+'\n');
console.log(JSON.stringify({...summary,results:undefined}));
