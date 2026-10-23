// Unattended local CPU work. No network, model calls, campaign reads or clocks.
import { build } from 'esbuild';
import { Worker } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { readFile, writeFile, mkdir, rename, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const option = (key, fallback) => { const i = args.indexOf(key); return i < 0 ? fallback : args[i + 1]; };
const positive = (key, fallback) => { const n = +option(key, fallback); if (!Number.isInteger(n) || n < 1) throw Error(`Invalid ${key}`); return n; };
const options = { rounds: positive('--rounds', 4), maps: positive('--maps', 1024), validation: positive('--validation', 4096),
  passes: positive('--passes', 3), seed: positive('--seed', 184721) };
if (options.maps % 2 || options.validation % 2) throw Error('Map counts must be even');
const workers = Math.min(positive('--workers', 12), availableParallelism());
const folder = resolve(root, '.local/hero-balance-rounds');
await mkdir(folder, { recursive: true });
const profiles = JSON.parse(await readFile(resolve(root, 'src/data/patches.json'), 'utf8')).patches;
const selected = option('--patches', 'all') === 'all' ? profiles : option('--patches', '').split(',').map(id => {
  const p = profiles.find(p => p.id === id); if (!p) throw Error(`Unknown patch ${id}`); return p;
});
if (new Set(selected.map(p => p.id)).size !== selected.length) throw Error('Duplicate patches');
if (selected.some(p => options.maps < p.heroBalance.length * 2 || options.validation < p.heroBalance.length * 2)) throw Error('Not enough maps for every hero');
let baseline;
try { baseline = JSON.parse(await readFile(resolve(folder, 'baseline.json'), 'utf8')); }
catch {
  try {
    baseline = JSON.parse(await readFile(resolve(root, '.local/hero-calibration/state.json'), 'utf8'));
    await writeFile(resolve(folder, 'baseline.json'), JSON.stringify(baseline, null, 2) + '\n');
  } catch { throw Error('Run npm run calibrate:heroes first; a completed first-run checkpoint is required for comparison.'); }
}
if (selected.some(p => !baseline.patches[p.id]?.rows || !Number.isFinite(baseline.patches[p.id]?.meanAbsoluteError)))
  throw Error('Baseline is incomplete: finish a calibration record for every requested patch first.');
const workerFile = resolve(folder, 'iterative-worker.mjs');
await build({ entryPoints: [resolve(root, 'scripts/iterative-hero-worker.ts')], outfile: workerFile, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
const digest = createHash('sha256');
for (const path of ['src/battle.ts','src/patches.ts','src/heroes.ts','src/hero-balance.ts','src/patch-knowledge.ts','src/data/patches.json','scripts/iterative-hero-worker.ts']) digest.update(await readFile(resolve(root, path)));
const fingerprint = digest.digest('hex');
const stateFile = resolve(folder, 'state.json'), statusFile = resolve(folder, 'status.json');
let state = { version: 2, options, fingerprint, baselineMaps: baseline.summary.maps, patches: {}, experiments: {}, completedMaps: 0 };
if (args.includes('--resume')) {
  state = JSON.parse(await readFile(stateFile, 'utf8'));
  if (state.fingerprint !== fingerprint || JSON.stringify(state.options) !== JSON.stringify(options)) throw Error('Inputs changed; do not mix checkpoints');
}
let journal = Promise.resolve();
async function status(stage, detail = {}) {
  await writeFile(statusFile, JSON.stringify({ status: stage, updatedAt: new Date().toISOString(), processId: process.pid,
    expectedPatches: selected.length, completedMaps: state.completedMaps, completedPatches: Object.keys(state.patches).length,
    ...detail }, null, 2) + '\n');
}
const save = () => { journal = journal.then(async () => {
  const temp = stateFile + '.tmp'; await writeFile(temp, JSON.stringify(state, null, 2) + '\n'); await rename(temp, stateFile);
}); return journal; };
const good = (p, id) => p.statisticallyAboveCeiling.length === 0 && p.meanAbsoluteError < baseline.patches[id].meanAbsoluteError;
const quality = p => p.ceilingExcess + p.meanAbsoluteError * 5 + p.statisticallyAboveCeiling.length * 15;
await status('fitting', { pass: 1 });
for (let pass = 0; pass < options.passes; pass++) {
  const pending = selected.filter(p => !state.patches[p.id] || !good(state.patches[p.id], p.id))
    .filter(p => !state.experiments[p.id]?.some(e => e.pass === pass + 1));
  console.log(`Pass ${pass + 1}: ${pending.length} patches, ${workers} workers, ${options.rounds} further fitting rounds per phase.`);
  async function consume() {
    while (pending.length) {
      const patch = pending.shift();
      const initial = state.patches[patch.id] ?? baseline.patches[patch.id];
      await new Promise((accept, reject) => {
        const worker = new Worker(workerFile, { workerData: { patchId: patch.id, ...options,
          seed: options.seed + pass * 30000001, initial } });
        let done = false;
        worker.on('message', message => {
          if (message.type === 'progress') console.log(`${patch.id}: pass ${pass + 1}, round ${message.round}, fit error ${message.meanAbsoluteError}pp`);
          else if (message.type === 'complete') {
            done = true;
            const result = { ...message.result, pass: pass + 1 };
            (state.experiments[patch.id] ??= []).push(result);
            state.completedMaps += result.trainMaps + result.validationMaps;
            const previous = state.patches[patch.id];
            if (!previous || quality(result) < quality(previous)) state.patches[patch.id] = result;
            console.log(`${patch.id}: validation ${result.meanAbsoluteError}pp, ${result.statisticallyAboveCeiling.length} flags; previous experiment ${baseline.patches[patch.id].meanAbsoluteError}pp.`);
            save().then(() => status('fitting', { pass: pass + 1, lastPatch: patch.id,
              acceptedPatches: selected.filter(p => state.patches[p.id] && good(state.patches[p.id], p.id)).length })).then(accept, reject);
          }
        });
        worker.on('error', reject);
        worker.on('exit', code => { if (code || !done) reject(Error(`Worker ${patch.id} exited ${code}`)); });
      });
    }
  }
  await Promise.all(Array.from({ length: Math.min(workers, pending.length) }, consume));
}
await journal;
const accepted = selected.filter(p => state.patches[p.id] && good(state.patches[p.id], p.id));
state.summary = { patches: Object.keys(state.patches).length, maps: state.completedMaps,
  acceptedPatches: accepted.map(p => p.id), remainingPatches: selected.filter(p => !accepted.includes(p)).map(p => p.id),
  aboveCeiling: Object.values(state.patches).reduce((n, p) => n + p.statisticallyAboveCeiling.length, 0),
  meanAbsoluteError: Object.values(state.patches).reduce((n, p) => n + p.meanAbsoluteError, 0) / Object.keys(state.patches).length };
await save();
// Retain the full candidate even if activation is rejected; rankings/reporting
// can distinguish measured candidate strength from active runtime truth.
const candidate = { version: 2, fingerprint, options, summary: { ...state.summary, patches: selected.length },
  method: 'Warm-started equal-player full combat; side-swapped unique legal drafts; separate validation seeds; selected across tuning passes.', patches: state.patches };
await writeFile(resolve(folder, 'candidate.json'), JSON.stringify(candidate, null, 2) + '\n');
const report = ['patch,baseline_error,candidate_error,ceiling_flags,accepted'];
for (const p of selected) report.push([p.id, baseline.patches[p.id].meanAbsoluteError, state.patches[p.id].meanAbsoluteError,
  state.patches[p.id].statisticallyAboveCeiling.length, good(state.patches[p.id], p.id)].join(','));
await writeFile(resolve(folder, 'comparison.csv'), report.join('\n') + '\n');
await new Promise((accept, reject) => {
  const c = spawn(process.execPath, [resolve(root, 'scripts/export-hero-rankings.mjs'), '--candidate', resolve(folder, 'candidate.json')], { cwd: root, windowsHide: true, stdio: 'inherit' });
  c.on('error', reject); c.on('exit', code => code ? reject(Error('Ranking export failed')) : accept());
});
// Activation is deliberately all-or-nothing across the requested phases.
if (args.includes('--apply') && accepted.length === selected.length) {
  const destination = resolve(root, 'src/data/hero-calibration.json');
  const previous = await readFile(destination, 'utf8');
  await writeFile(destination, JSON.stringify({ ...JSON.parse(previous), ...candidate,
    patches: { ...JSON.parse(previous).patches, ...candidate.patches } }, null, 2) + '\n');
  const logs = [];
  try {
    await writeFile(resolve(folder, 'previous-runtime.json'), previous);
    const tests = (await readdir(resolve(root, 'tests'))).filter(n => n.endsWith('.test.ts')).map(n => resolve(root, 'tests', n));
    for (const [label, argv] of [
      ['tests', [resolve(root, 'node_modules/tsx/dist/cli.mjs'), '--test', ...tests]],
      ['TypeScript', [resolve(root, 'node_modules/typescript/bin/tsc'), '-b']],
      ['build', [resolve(root, 'node_modules/vite/bin/vite.js'), 'build']],
    ]) {
      await status('verifying', { step: label, summary: state.summary });
      await new Promise((accept, reject) => {
        const c = spawn(process.execPath, argv, { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
        c.stdout.on('data', chunk => logs.push(chunk.toString())); c.stderr.on('data', chunk => logs.push(chunk.toString()));
        c.on('error', reject); c.on('exit', code => code ? reject(Error(`${label} failed`)) : accept());
      });
    }
    await writeFile(resolve(folder, 'verification.log'), logs.join(''));
    await new Promise((accept, reject) => {
      const c = spawn(process.execPath, [resolve(root, 'scripts/export-hero-rankings.mjs')], { cwd: root, windowsHide: true, stdio: 'inherit' });
      c.on('error', reject); c.on('exit', code => code ? reject(Error('Active ranking export failed')) : accept());
    });
    await status('complete', { summary: state.summary, runtimeApplied: true, tests: 'passed', build: 'passed' });
  } catch (error) {
    await writeFile(destination, previous);
    await writeFile(resolve(folder, 'verification.log'), logs.join(''));
    await status('verification-failed-calibration-restored', { error: error.message, summary: state.summary, runtimeApplied: false });
    process.exitCode = 1;
  }
} else {
  await status('complete-with-balance-flags', { summary: state.summary, runtimeApplied: false });
}
console.log(JSON.stringify(state.summary));
