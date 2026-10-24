// One-shot continuation of authorized local CPU calibration. Never stops an
// existing job, changes a campaign, contacts a service or publishes a release.
import { readFile, mkdir, open } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { combatInputs } from './combat-inputs.mjs';
import { writeCheckpoint } from './checkpoint.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),args=process.argv.slice(2);
const option=(k,f)=>args.includes(k)?args[args.indexOf(k)+1]:f;
const pids=option('--wait-pids','').split(',').filter(Boolean).map(Number),workers=Number(option('--workers',6));
if(pids.some(p=>!Number.isSafeInteger(p)||p<=0)||!Number.isSafeInteger(workers)||workers<1)throw Error('Invalid process IDs or worker count');
const folder=resolve(root,option('--out','.local/tactical-hero-balance'));await mkdir(folder,{recursive:true});
const statusFile=resolve(root,'.local/tactical-balance-queue.json');
const fingerprintPaths=[...combatInputs,'scripts/combat-inputs.mjs','scripts/iterative-hero-worker.ts','scripts/iterate-hero-balance.mjs'];
async function fingerprint(){const d=createHash('sha256');for(const f of fingerprintPaths)d.update(await readFile(resolve(root,f)));return d.digest('hex');}
const frozen=await fingerprint();
const alive=pid=>{try{process.kill(pid,0);return true;}catch{return false;}};
const status=(state,detail={})=>writeCheckpoint(statusFile,{status:state,processId:process.pid,waitPids:pids,output:folder,fingerprint:frozen,updatedAt:new Date().toISOString(),...detail});
try {
await status('waiting-for-existing-jobs');
while(pids.some(alive))await new Promise(r=>setTimeout(r,15000));
if(await fingerprint()!==frozen){await status('blocked-changed-inputs',{reason:'Combat inputs changed after the continuation was queued. Re-run the queue against the reviewed source.'});process.exitCode=1;}
else {
  const profile=JSON.parse(await readFile(resolve(root,'src/data/patches.json'),'utf8')).patches;
  let baseline;
  for(const candidate of ['.local/hero-balance-rounds/candidate.json','.local/hero-balance-rounds/baseline.json']){
    try {const table=JSON.parse(await readFile(resolve(root,candidate),'utf8'));if(profile.every(p=>table.patches?.[p.id]?.rows&&Number.isFinite(table.patches[p.id].meanAbsoluteError))){baseline=resolve(root,candidate);break;}}catch{}
  }
  if(!baseline)throw Error('No complete prior batch was found. It is needed only for warm-start coefficients; fresh baselines are measured again.');
  const log=await open(resolve(folder,'run.log'),'a'),errors=await open(resolve(folder,'run.err.log'),'a');
  const child=spawn(process.execPath,[resolve(root,'scripts/iterate-hero-balance.mjs'),'--out',folder,'--baseline',baseline,
    '--workers',String(workers),'--rounds','4','--maps','1024','--validation','4096','--passes','3','--apply'],{cwd:root,windowsHide:true,stdio:['ignore',log.fd,errors.fd]});
  await new Promise((accept,reject)=>{child.once('spawn',accept);child.once('error',reject);});
  const watchLog=await open(resolve(folder,'watch.log'),'a'),watchErrors=await open(resolve(folder,'watch.err.log'),'a');
  const watcher=spawn(process.execPath,[resolve(root,'scripts/watch-hero-rounds.mjs'),String(child.pid),'--out',folder],{cwd:root,windowsHide:true,stdio:['ignore',watchLog.fd,watchErrors.fd]});
  watcher.on('error',error=>console.error(`Progress watcher failed: ${error.message}`));
  await status('running-current-tactical-engine',{balanceProcessId:child.pid,watcherProcessId:watcher.pid,baseline});
  const code=await new Promise((accept,reject)=>{child.once('exit',accept);child.once('error',reject);});
  await log.close();await errors.close();await watchLog.close();await watchErrors.close();
  const result=JSON.parse(await readFile(resolve(folder,'status.json'),'utf8'));
  await status('finished',{balanceProcessId:child.pid,exitCode:code,resultStatus:result.status,runtimeApplied:result.runtimeApplied??false});
}

} catch(error) { await status('failed',{error:error.message}); throw error; }
