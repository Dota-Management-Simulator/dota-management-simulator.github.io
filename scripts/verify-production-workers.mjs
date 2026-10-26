import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Vite only recognizes the literal new Worker(new URL(...)) form. A successful
// build must not silently replace a worker with a raw TypeScript asset URL.
const assets = join(process.cwd(), 'dist', 'assets');
const files = readdirSync(assets);
for (const worker of ['battle', 'tournament']) {
  const file = files.find(name => name.startsWith(`${worker}.worker-`) && name.endsWith('.js'));
  if (!file) throw new Error(`Production ${worker} worker was not bundled as JavaScript.`);
  const check = spawnSync(process.execPath, ['--check', join(assets, file)], { encoding: 'utf8' });
  if (check.status !== 0) throw new Error(`Production ${worker} worker is invalid JavaScript: ${check.stderr}`);
}
for (const file of files.filter(name => /^index-.*\.js$/.test(name))) {
  if (/data:(?:video\/mp2t|application\/typescript)[;,]/.test(readFileSync(join(assets, file), 'utf8'))) {
    throw new Error('Production entry contains an uncompiled TypeScript asset.');
  }
}
console.log('Both production simulation workers are bundled JavaScript.');
