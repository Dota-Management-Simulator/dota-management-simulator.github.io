// Continue CPU calibration after a preserved frozen batch. No model/network
// calls, notifications, campaign access, process termination or deployment.
import { readFile, mkdir, readdir, copyFile, open } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { readCheckpoint, writeCheckpoint } from './checkpoint.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const folder = resolve(root, '.local/hero-balance-rounds');
const queueFile = resolve(root, '.local/hero-meta-balance-queue.json');
const waitIds = process.argv.slice(2).map(Number);
if (!waitIds.length || waitIds.some(id => !Number.isInteger(id) || id < 1 || id === process.pid)) throw Error('Pass the existing balance and watcher process IDs');
const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
await writeCheckpoint(queueFile, { status: 'waiting-for-preserved-run', processId: process.pid, waitIds,
  note: 'Current batch uses superseded targets. New phase-scoped historical targets require fresh calibration.', updatedAt: new Date().toISOString() });
while (waitIds.some(alive)) await delay(15000);
const archive = join(folder, `pre-meta-${new Date().toISOString().replace(/[:.]/g, '-')}`);
await mkdir(archive);
for (const entry of await readdir(folder, { withFileTypes: true })) {
  if (entry.isFile()) await copyFile(join(folder, entry.name), join(archive, entry.name));
}
// Resume recovery files can be newer than the primary checkpoint.
const previous = await readCheckpoint(join(folder, 'state.json'));
const warmPath = join(archive, 'warm-start.json');
await writeCheckpoint(warmPath, previous);
const log = await open(join(folder, 'run.log'), 'w');
const errors = await open(join(folder, 'run.err.log'), 'w');
const args = [resolve(root, 'scripts/iterate-hero-balance.mjs'), '--workers', '8', '--rounds', '4', '--maps', '1024', '--validation', '4096', '--passes', '3', '--warm-start', warmPath, '--apply'];
const child = spawn(process.execPath, args, { cwd: root, windowsHide: true, stdio: ['ignore', log.fd, errors.fd] });
const finished = new Promise(accept => {
  child.on('exit', accept);
  child.on('error', error => { console.error(error); accept(1); });
});
await writeCheckpoint(queueFile, { status: 'running-current-meta-targets', processId: process.pid, balanceProcessId: child.pid,
  archive, updatedAt: new Date().toISOString() });
const watchLog = await open(join(folder, 'watch.log'), 'w');
const watchErrors = await open(join(folder, 'watch.err.log'), 'w');
const watcher = spawn(process.execPath, [resolve(root, 'scripts/watch-hero-rounds.mjs'), String(child.pid)], {
  cwd: root, windowsHide: true, stdio: ['ignore', watchLog.fd, watchErrors.fd] });
watcher.on('error', error => console.error(error));
const exitCode = await finished;
let result = null;
try { result = JSON.parse(await readFile(join(folder, 'status.json'), 'utf8')); } catch {}
await writeCheckpoint(queueFile, { status: exitCode === 0 ? 'current-meta-run-finished' : 'current-meta-run-failed',
  processId: process.pid, balanceProcessId: child.pid, exitCode, result, updatedAt: new Date().toISOString() });
await Promise.all([log.close(), errors.close(), watchLog.close(), watchErrors.close()]);
