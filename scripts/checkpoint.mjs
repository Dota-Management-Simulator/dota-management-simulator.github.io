// OneDrive can briefly lock the destination of an otherwise atomic rename.
// Keep a recoverable JSON snapshot if the lock persists beyond the retry window.
import { readFile, writeFile, rename, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

export async function writeCheckpoint(path, value, { renameFile = rename, pause = delay } = {}) {
  const body = JSON.stringify(value, null, 2) + '\n';
  const temp = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temp, body, { flag: 'wx' });
  for (let attempt = 0; attempt < 10; attempt++) {
    try { await renameFile(temp, path); return path; }
    catch (error) {
      if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code)) throw error;
      if (attempt < 9) await pause(Math.min(1000, 100 * 2 ** attempt));
    }
  }
  const recovery = `${path}.recovery.json`;
  await writeFile(recovery, body);
  console.warn(`Checkpoint destination remains locked; completed work saved to ${recovery}`);
  return recovery;
}

export async function readCheckpoint(path) {
  const files = await Promise.all([path, `${path}.recovery.json`].map(async file => {
    try { return { file, time: (await stat(file)).mtimeMs, value: JSON.parse(await readFile(file, 'utf8')) }; }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }));
  const latest = files.filter(Boolean).sort((a, b) => b.time - a.time)[0];
  if (!latest) throw Object.assign(Error(`No checkpoint at ${path}`), { code: 'ENOENT' });
  if (latest.file !== path) console.warn(`Resuming completed work from ${latest.file}`);
  return latest.value;
}
