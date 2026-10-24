// CPU-only simulation harness. No model calls, API requests or campaign access.
import { build } from 'esbuild';
import { Worker } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { correctPairedIntervals } from './calibration-stats.mjs';
import { readCheckpoint, writeCheckpoint } from './checkpoint.mjs';
import { combatInputs } from './combat-inputs.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const value = (key, fallback) => { const i = args.indexOf(key); return i < 0 ? fallback : args[i + 1]; };
const positive = (key, fallback, even = false) => {
  const n = Number(value(key, fallback));
  if (!Number.isInteger(n) || n < 1 || (even && n % 2)) throw new Error(`${key} must be a positive ${even ? 'even ' : ''}integer`);
  return n;
};
if (args.includes('--help')) {
  console.log('node scripts/calibrate-heroes.mjs [--patches 2011.2,2015.2|all] [--rounds 3] [--maps 1024] [--validation 2048] [--workers 8] [--seed 72631] [--resume] [--apply]\nMaps are actual lane-engine games per patch per fitting round. Validation uses disjoint seeds. Without --apply, output stays in .local/hero-calibration/.');
  process.exit(0);
}
const options = { rounds: positive('--rounds', 3), maps: positive('--maps', 1024, true), validation: positive('--validation', 2048, true), seed: positive('--seed', 72631) };
const workers = Math.min(positive('--workers', Math.min(8, Math.max(1, availableParallelism() - 2))), availableParallelism());
const input = JSON.parse(await readFile(resolve(root, 'src/data/patches.json'), 'utf8'));
const wanted = value('--patches', 'all');
const selected = wanted === 'all' ? input.patches : wanted.split(',').map(id => {
  const patch = input.patches.find(p => p.id === id); if (!patch) throw new Error(`Unknown patch ${id}`); return patch;
});
if (new Set(selected.map(p => p.id)).size !== selected.length) throw new Error('Duplicate patch IDs');
for (const patch of selected) {
  const minimum = patch.heroBalance.length * 2;
  if (options.maps < minimum || options.validation < minimum) throw new Error(`${patch.id} needs at least ${minimum} maps in each fitting/validation batch to include every eligible hero in a side-swapped focal pair.`);
}
const folder = resolve(root, '.local/hero-calibration');
await mkdir(folder, { recursive: true });
const workerFile = resolve(folder, 'worker.mjs');
await build({ entryPoints: [resolve(root, 'scripts/hero-calibration-worker.ts')], outfile: workerFile, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
async function currentFingerprint() {
  const digest = createHash('sha256');
  for (const file of [...combatInputs, 'scripts/combat-inputs.mjs', 'scripts/hero-calibration-worker.ts']) digest.update(await readFile(resolve(root, file)));
  return digest.digest('hex');
}
const fingerprint = await currentFingerprint();
const statePath = resolve(folder, 'state.json');
let state = { fingerprint, options, version: 1, method: 'Equal-player, role-legal, unique drafts; full lane combat with side-swapped pairs and separate holdout seeds.', patches: {} };
if (args.includes('--resume')) {
  const saved = await readCheckpoint(statePath);
  if (saved.fingerprint !== fingerprint || JSON.stringify(saved.options) !== JSON.stringify(options)) throw new Error('Checkpoint inputs changed; start a new run instead of mixing experiments.');
  state = saved;
}
const pending = selected.filter(p => !state.patches[p.id]);
let journal = Promise.resolve();
const save = () => { journal = journal.then(async () => {
  await writeCheckpoint(statePath, state);
}); return journal; };
const started = Date.now();
console.log(`Calibrating ${pending.length} patches with ${workers} CPU workers; ${options.rounds * options.maps + options.validation} real maps per patch. No network/model calls.`);
async function consume() {
  while (pending.length) {
    const patch = pending.shift();
    await new Promise((accept, reject) => {
      const worker = new Worker(workerFile, { workerData: { patchId: patch.id, ...options } });
      let complete = false;
      worker.on('message', message => {
        if (message.type === 'progress') console.log(`${patch.id}: fit ${message.round}/${options.rounds}, mean error ${message.meanAbsoluteError.toFixed(2)}pp`);
        else if (message.type === 'complete') {
          complete = true; message.result = correctPairedIntervals(message.result); state.patches[patch.id] = message.result;
          console.log(`${patch.id}: ${message.result.trainMaps + message.result.validationMaps} maps complete; holdout mean error ${message.result.meanAbsoluteError.toFixed(2)}pp; ${message.result.statisticallyAboveCeiling.length} heroes statistically above 58%.`);
          save().then(accept, reject);
        }
      });
      worker.on('error', reject);
      worker.on('exit', code => { if (code || !complete) reject(new Error(`Worker for ${patch.id} stopped with ${code}`)); });
    });
  }
}
await Promise.all(Array.from({ length: Math.min(workers, pending.length) }, consume));
await journal;
for (const [id, record] of Object.entries(state.patches)) state.patches[id] = correctPairedIntervals(record);
const records = Object.values(state.patches);
state.summary = { patches: records.length, maps: records.reduce((n, p) => n + p.trainMaps + p.validationMaps, 0), elapsedSeconds: Math.round((Date.now() - started) / 1000),
  aboveCeiling: records.reduce((n, p) => n + p.statisticallyAboveCeiling.length, 0) };
await save();
if (args.includes('--apply') && await currentFingerprint() !== fingerprint) {
  console.error('Calibration not applied: combat inputs changed during the frozen run. Results are retained as a warm start only.');
  process.exitCode = 1;
} else if (args.includes('--apply') && state.summary.aboveCeiling > 0) {
  console.error(`Calibration not applied: ${state.summary.aboveCeiling} significant hero/patch ceiling violations. Completed results remain in ${statePath}.`);
  process.exitCode = 1;
} else if (args.includes('--apply')) {
  const destination = resolve(root, 'src/data/hero-calibration.json');
  let previous = JSON.parse(await readFile(destination, 'utf8'));
  const result = { ...previous, version: 1, method: state.method, fingerprint, options, summary: state.summary, patches: { ...previous.patches, ...state.patches } };
  await writeFile(destination, JSON.stringify(result, null, 2) + '\n');
  console.log('Applied complete calibration records to src/data/hero-calibration.json. Statistical flags remain visible in the report.');
}
console.log(JSON.stringify(state.summary));
