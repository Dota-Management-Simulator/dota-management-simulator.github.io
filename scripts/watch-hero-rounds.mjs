// Read-only progress plus report refresh; no model/API/network calls.
import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const folder = resolve(root, '.local/hero-balance-rounds');
const pid = Number(process.argv[2]);
if (!Number.isInteger(pid) || pid <= 0) throw Error('Expected the iterative process ID');
const read = async name => { try { return JSON.parse(await readFile(resolve(folder, name), 'utf8')); } catch { return null; } };
const alive = () => { try { process.kill(pid, 0); return true; } catch { return false; } };
const exportActive = () => new Promise((accept, reject) => {
  const c = spawn(process.execPath, [resolve(root, 'scripts/export-hero-rankings.mjs')], { cwd: root, windowsHide: true, stdio: 'inherit' });
  c.on('error', reject); c.on('exit', code => code ? reject(Error('Could not refresh active rankings')) : accept());
});
while (true) {
  const state = await read('state.json'), status = await read('status.json');
  let log = ''; try { log = await readFile(resolve(folder, 'run.log'), 'utf8'); } catch {}
  const completed = [...log.matchAll(/(\d{4}\.[12]): pass (\d+), round (\d+), fit error ([\d.]+)pp/g)];
  const fitMaps = completed.length * (state?.options.maps ?? 1024);
  const validationMaps = Object.values(state?.experiments ?? {}).flat().reduce((n, e) => n + e.validationMaps, 0);
  const running = alive();
  const progress = { updatedAt: new Date().toISOString(), status: status?.status ?? 'starting', processId: pid, running,
    completedFittingRounds: completed.length, completedFittingMaps: fitMaps, completedValidationMaps: validationMaps,
    completedMaps: fitMaps + validationMaps, completedPatches: Object.keys(state?.patches ?? {}).length,
    expectedPatches: status?.expectedPatches ?? 32, acceptedPatches: status?.acceptedPatches ?? state?.summary?.acceptedPatches.length ?? 0,
    latestFit: completed.at(-1) ? { patchId: completed.at(-1)[1], pass: +completed.at(-1)[2], round: +completed.at(-1)[3], error: +completed.at(-1)[4] } : null,
    note: 'Completed maps only; in-flight simulations are not counted. Fit errors are training diagnostics, not held-out balance proof.' };
  await writeFile(resolve(folder, 'progress.json'), JSON.stringify(progress, null, 2) + '\n');
  if (status?.status === 'complete' || status?.status === 'complete-with-balance-flags' || status?.status === 'verification-failed-calibration-restored') {
    await exportActive();
    console.log(`Iterative run finished: ${status.status}. Active role rankings refreshed.`);
    break;
  }
  if (!running) {
    await writeFile(resolve(folder, 'progress.json'), JSON.stringify({ ...progress, status: 'process-stopped-before-completion' }, null, 2) + '\n');
    process.exitCode = 1; break;
  }
  await new Promise(accept => setTimeout(accept, 15000));
}
