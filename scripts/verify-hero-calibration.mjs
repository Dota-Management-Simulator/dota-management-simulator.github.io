// Finish a long local run without keeping an assistant/model session active.
// Uses local files and child programs only; never calls network/model services.
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { correctPairedIntervals } from './calibration-stats.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const pidAt = args.indexOf('--wait-pid');
const pid = pidAt < 0 ? null : Number(args[pidAt + 1]);
if (pid != null && (!Number.isInteger(pid) || pid <= 0)) throw new Error('Expected the calibration process ID after --wait-pid');
const folder = resolve(root, '.local/hero-calibration');
await mkdir(folder, { recursive: true });
const statusFile = resolve(folder, 'status.json');
const runtimeFile = resolve(root, 'src/data/hero-calibration.json');
const backup = await readFile(runtimeFile, 'utf8');
const profile = JSON.parse(await readFile(resolve(root, 'src/data/patches.json'), 'utf8'));
const expected = profile.patches.length;
const update = async (status, detail = {}) => writeFile(statusFile, JSON.stringify({ status, updatedAt: new Date().toISOString(), expectedPatches: expected, ...detail }, null, 2) + '\n');
const alive = () => { if (pid == null) return false; try { process.kill(pid, 0); return true; } catch { return false; } };
const signature = patch => {
  let n = 2166136261;
  for (const char of JSON.stringify([patch.id, patch.axes, patch.heroBalance.map(h => [h.id, h.targetWinRate, h.priority])])) n = Math.imul(n ^ char.charCodeAt(0), 16777619);
  return (n >>> 0).toString(16);
};
const started = Date.now();
let runtime, checkpoint;
await update('waiting-for-calibration', { processId: pid, completedPatches: 0 });
while (true) {
  try { runtime = JSON.parse(await readFile(runtimeFile, 'utf8')); }
  catch { await new Promise(accept => setTimeout(accept, 1000)); continue; }
  try { checkpoint = JSON.parse(await readFile(resolve(folder, 'state.json'), 'utf8')); } catch { checkpoint = null; }
  const matching = profile.patches.every(p => runtime.patches[p.id]?.signature === signature(p));
  if (matching && runtime.summary?.patches === expected) break;
  const completedPatches = checkpoint?.options?.maps === 1024 && checkpoint?.options?.rounds === 3
    ? Object.keys(checkpoint.patches ?? {}).length : 0;
  await update('calibrating', { processId: pid, completedPatches, completedMaps: completedPatches * 5120,
    requestedMaps: expected * 5120, note: 'Completed phases only; in-flight fitting/validation maps are not counted yet.' });
  if (!alive() || Date.now() - started > 86400000) {
    await update('calibration-did-not-complete', { completedPatches, processId: pid });
    process.exitCode = 1; process.exit();
  }
  await new Promise(accept => setTimeout(accept, 15000));
}
const log = [];
async function command(label, argv) {
  await update('verifying', { step: label, completedPatches: expected, maps: runtime.summary.maps });
  const code = await new Promise((accept, reject) => {
    const child = spawn(process.execPath, argv, { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', chunk => log.push(chunk.toString())); child.stderr.on('data', chunk => log.push(chunk.toString()));
    child.on('error', reject); child.on('exit', accept);
  });
  await writeFile(resolve(folder, 'verification.log'), log.join(''));
  if (code !== 0) throw new Error(`${label} failed (${code})`);
}
try {
  // Also normalizes reports from an already-running older worker bundle.
  for (const [id, record] of Object.entries(runtime.patches)) runtime.patches[id] = correctPairedIntervals(record);
  runtime.summary.aboveCeiling = Object.values(runtime.patches).reduce((n, p) => n + p.statisticallyAboveCeiling.length, 0);
  await writeFile(runtimeFile, JSON.stringify(runtime, null, 2) + '\n');
  for (const p of profile.patches) {
    const result = runtime.patches[p.id];
    if (result.rows.length !== p.heroBalance.length || result.rows.some(h => !Number.isFinite(h.power) || h.played <= 0 || h.wins > h.played || h.targetWinRate > 58))
      throw new Error(`Invalid measured calibration for ${p.id}`);
  }
  const csv = ['patch,hero,target_win_rate,measured_win_rate,ci_low,ci_high,appearances,wins,power_coefficient,basis,observed_appearances,observed_wins'];
  for (const p of profile.patches) for (const row of runtime.patches[p.id].rows) {
    const target = p.heroBalance.find(h => h.id === row.id);
    csv.push([p.id, row.id, row.targetWinRate, row.winRate, row.low, row.high, row.played, row.wins, row.power, target.basis, target.observed?.played ?? '', target.observed?.wins ?? ''].join(','));
  }
  await writeFile(resolve(folder, 'results.csv'), csv.join('\n') + '\n');
  const balanceFlags = profile.patches.flatMap(p => runtime.patches[p.id].statisticallyAboveCeiling.map(id => `${p.id}:${id}`));
  if (balanceFlags.length) {
    await writeFile(runtimeFile, backup);
    await update('balance-rejected-calibration-restored', { completedPatches: expected, maps: runtime.summary.maps,
      aboveCeilingFlags: balanceFlags, resultsCsv: resolve(folder, 'results.csv'),
      note: 'Completed simulation evidence is retained. Coefficients with significant ceiling violations are not activated.' });
    console.log(`Calibration withheld: ${balanceFlags.length} hero/patch balance flags. Previous runtime coefficients restored.`);
    process.exitCode = 1;
    process.exit();
  }
  const tests = (await readdir(resolve(root, 'tests'))).filter(name => name.endsWith('.test.ts')).map(name => resolve(root, 'tests', name));
  await command('application tests', [resolve(root, 'node_modules/tsx/dist/cli.mjs'), '--test', ...tests]);
  await command('TypeScript build', [resolve(root, 'node_modules/typescript/bin/tsc'), '-b']);
  await command('production build', [resolve(root, 'node_modules/vite/bin/vite.js'), 'build']);
  const flagged = profile.patches.flatMap(p => runtime.patches[p.id].statisticallyAboveCeiling.map(id => `${p.id}:${id}`));
  await update(flagged.length ? 'complete-with-balance-flags' : 'complete', { completedPatches: expected, maps: runtime.summary.maps,
    tests: 'passed', build: 'passed', aboveCeilingFlags: flagged,
    note: 'Finite-sample diagnostics; a target ceiling is not a guarantee about every measured rate or campaign result.',
    resultsCsv: resolve(folder, 'results.csv'), verificationLog: resolve(folder, 'verification.log') });
  console.log(`Calibration applied and verified: ${runtime.summary.maps} maps; ${flagged.length} statistical balance flags. See .local/hero-calibration/status.json.`);
} catch (error) {
  await writeFile(runtimeFile, backup);
  await update('verification-failed-calibration-restored', { error: error.message, maps: runtime.summary?.maps });
  process.exitCode = 1;
}
