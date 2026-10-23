// Read-only progress plus report refresh; no model/API/network calls.
import { readFile } from 'node:fs/promises';
import { readCheckpoint, writeCheckpoint } from './checkpoint.mjs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const folder = resolve(root, '.local/hero-balance-rounds');
const pid = Number(process.argv[2]);
if (!Number.isInteger(pid) || pid <= 0) throw Error('Expected the iterative process ID');
const read = async name => { try { return await readCheckpoint(resolve(folder, name)); } catch { return null; } };
const alive = () => { try { process.kill(pid, 0); return true; } catch { return false; } };
const exportActive = () => new Promise((accept, reject) => {
  const c = spawn(process.execPath, [resolve(root, 'scripts/export-hero-rankings.mjs')], { cwd: root, windowsHide: true, stdio: 'inherit' });
  c.on('error', reject); c.on('exit', code => code ? reject(Error('Could not refresh active rankings')) : accept());
});
while (true) {
  const saved = await read('state.json'), status = await read('status.json');
  // A fresh run may not have finished its first phase yet. Never report the
  // previous run's checkpoint as progress for the new process.
  const state = status?.completedPatches === 0 ? null : saved;
  let log = ''; try { log = await readFile(resolve(folder, 'run.log'), 'utf8'); } catch {}
  const completed = [...log.matchAll(/(\d{4}\.[12]): pass (\d+), round (\d+), fit error ([\d.]+)pp/g)];
  const fitting = completed.filter(row => +row[3] > 0);
  const baselineMaps = completed.filter(row => +row[3] === 0).length * (state?.options.validation ?? 4096);
  const fitMaps = fitting.length * (state?.options.maps ?? 1024);
  const validationMaps = Object.values(state?.experiments ?? {}).flat().reduce((n, e) => n + e.validationMaps, 0);
  const running = alive();
  const progress = { updatedAt: new Date().toISOString(), status: status?.status ?? 'starting', processId: pid, running,
    completedFittingRounds: fitting.length, completedFittingMaps: fitMaps, completedBaselineMaps: baselineMaps, completedValidationMaps: validationMaps,
    completedMaps: fitMaps + validationMaps + baselineMaps, completedPatches: Object.keys(state?.patches ?? {}).length,
    expectedPatches: status?.expectedPatches ?? 32, acceptedPatches: status?.acceptedPatches ?? state?.summary?.acceptedPatches.length ?? 0,
    latestFit: completed.at(-1) ? { patchId: completed.at(-1)[1], pass: +completed.at(-1)[2], round: +completed.at(-1)[3], error: +completed.at(-1)[4] } : null,
    note: 'Completed maps only; in-flight simulations are not counted. Fit errors are training diagnostics, not held-out balance proof.' };
  await writeCheckpoint(resolve(folder, 'progress.json'), progress);
  if (['complete', 'complete-with-balance-flags', 'verification-failed-calibration-restored', 'complete-stale-inputs'].includes(status?.status)) {
    await exportActive();
    console.log(`Iterative run finished: ${status.status}. Active role rankings refreshed.`);
    break;
  }
  if (!running) {
    await writeCheckpoint(resolve(folder, 'progress.json'), { ...progress, status: 'process-stopped-before-completion' });
    process.exitCode = 1; break;
  }
  await new Promise(accept => setTimeout(accept, 15000));
}
