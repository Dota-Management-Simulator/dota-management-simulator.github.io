import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {patchForSeason} from '../src/patches';

test('real balance CLI audits side-swapped maps, reports completion and refuses audit activation even with --apply',()=>{
  mkdirSync('.local',{recursive:true});
  const folder=mkdtempSync(resolve('.local/balance-runner-test-')),p=patchForSeason(2011,2);
  const baseline=resolve(folder,'baseline.json');
  writeFileSync(baseline,JSON.stringify({summary:{maps:0},patches:{[p.id]:{meanAbsoluteError:0,rows:p.heroBalance!.map(h=>({id:h.id,power:0}))}}}));
  const runtime=readFileSync('src/data/hero-calibration.json','utf8');
  execFileSync(process.execPath,['scripts/iterate-hero-balance.mjs','--audit','--fresh','--apply','--patches',p.id,
    '--out',folder,'--baseline',baseline,'--maps','2','--validation','2','--rounds','1','--passes','1','--workers','1'],
    {cwd:process.cwd(),windowsHide:true,timeout:90000,stdio:'pipe'});
  const status=JSON.parse(readFileSync(resolve(folder,'status.json'),'utf8'));
  assert.equal(status.status,'audit-complete');assert.equal(status.runtimeApplied,false);
  assert.equal(status.actualCompletedMaps,2);assert.equal(status.failedMaps,0);
  const result=JSON.parse(readFileSync(resolve(folder,'candidate.json'),'utf8')).patches[p.id];
  assert.equal(result.matchMetrics.completedMaps,2);
  assert.equal(result.rows.reduce((n:number,r:{played:number})=>n+r.played,0),20);
  assert.equal(result.rows.reduce((n:number,r:{wins:number})=>n+r.wins,0),10);
  assert.equal(readFileSync('src/data/hero-calibration.json','utf8'),runtime);
});
