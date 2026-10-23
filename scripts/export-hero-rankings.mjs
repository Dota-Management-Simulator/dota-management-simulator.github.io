import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const at = process.argv.indexOf('--candidate');
const candidate = at < 0 ? null : JSON.parse(await readFile(resolve(process.argv[at + 1]), 'utf8'));
const folder = resolve(root, '.local/hero-balance-rounds');
await mkdir(folder, { recursive: true });
const bundle = resolve(folder, 'rankings-export.mjs');
await build({ stdin: { contents: `export { historicalPatches, patchForSeason } from './src/patches'; export { heroRoles } from './src/heroes'; export { rankHeroesForRole } from './src/hero-rankings';`,
  resolveDir: root, loader: 'ts' }, outfile: bundle, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
const { historicalPatches, heroRoles, rankHeroesForRole } = await import(pathToFileURL(bundle).href + `?t=${Date.now()}`);
const patches = Object.fromEntries(historicalPatches.map(p => [p.id, {
  patchId: p.id, roles: heroRoles.map((name, role) => ({ role, name, heroes: rankHeroesForRole(p, role, candidate?.patches[p.id]) }))
}]));
const report = { version: 1, mode: candidate ? 'candidate-simulation' : 'active-runtime',
  note: 'Internal truth only. Gold rows mark the top ten per legal role. Observed role rates are shrunk toward phase targets for ranking, never replaced. No scouting reveal.', patches };
const json = resolve(folder, candidate ? 'candidate-role-rankings.json' : 'active-role-rankings.json');
await writeFile(json, JSON.stringify(report, null, 2) + '\n');
const csv = ['patch,role,rank,highlighted,hero,target_win_rate,strength_score,benchmark_win_rate,appearances,basis'];
for (const p of Object.values(patches)) for (const role of p.roles) for (const h of role.heroes)
  csv.push([p.patchId, role.name, h.rank, h.highlighted, h.id, h.targetWinRate, h.strengthScore, h.benchmark?.winRate ?? '', h.benchmark?.played ?? '', h.basis].join(','));
await writeFile(resolve(folder, candidate ? 'candidate-role-rankings.csv' : 'active-role-rankings.csv'), csv.join('\n') + '\n');
// A local developer report; no navigation link or hidden truth added to gameplay.
const safe = JSON.stringify(report).replace(/</g, '\\u003c');
await writeFile(resolve(folder, candidate ? 'candidate-rankings.html' : 'rankings.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Internal patch strength</title><style>
body{font:15px system-ui;background:#f6f2e8;color:#243a31;margin:0;padding:30px;max-width:1100px}h1{font:36px Georgia;margin:0 0 12px}p{line-height:1.6;max-width:850px}select{font:inherit;padding:9px;margin:0 12px 18px 0;border:1px solid #9aa79d;border-radius:5px;background:#fff}table{border-collapse:collapse;width:100%;background:#fff}td,th{padding:10px 14px;border-bottom:1px solid #e2e3da;text-align:left}th{background:#203d32;color:white}tr.top{background:#f7e8b7}small{color:#64756d}td:first-child{font-weight:700}@media(max-width:650px){body{padding:15px}td,th{padding:8px 5px;font-size:12px}}</style>
<h1>Internal patch strength</h1><p>Top ten heroes for each role are highlighted in gold. ${candidate ? 'These are candidate simulation results, which may not be active in the game.' : 'These are the active runtime rankings; uncalibrated phases use design targets.'} This report is separate from team scouting knowledge.</p><select id="patch" aria-label="Patch"></select><select id="role" aria-label="Role"></select><p id="note"></p><table><thead><tr><th>Rank</th><th>Hero</th><th>Strength score</th><th>Target</th><th>Measured rate</th><th>Role appearances</th></tr></thead><tbody id="rows"></tbody></table><p><small>Scores blend role observations with a 64-game phase-target prior. Raw measured rates remain unchanged. Rankings estimate relative engine strength; they are not verified historical role statistics.</small></p><script>
const data=${safe};const p=document.querySelector('#patch'),r=document.querySelector('#role');for(const id of Object.keys(data.patches).sort())p.add(new Option(id,id));for(const role of data.patches[p.value].roles)r.add(new Option(role.name,role.role));function draw(){const hs=data.patches[p.value].roles[+r.value].heroes;document.querySelector('#note').textContent=hs.length+' eligible heroes · '+data.mode;document.querySelector('#rows').replaceChildren(...hs.map(h=>{const tr=document.createElement('tr');tr.className=h.highlighted?'top':'';for(const value of [h.rank,h.name,h.strengthScore.toFixed(2)+'%',h.targetWinRate.toFixed(2)+'%',h.benchmark?h.benchmark.winRate.toFixed(2)+'%':'Unmeasured',h.benchmark?.played??'—']){const td=document.createElement('td');td.textContent=value;tr.append(td)}return tr}))}p.onchange=r.onchange=draw;draw();</script></html>`);
console.log(`Internal role rankings exported: ${json}`);
