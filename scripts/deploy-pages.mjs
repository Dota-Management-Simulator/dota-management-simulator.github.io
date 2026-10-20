import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readdirSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// An explicit destination prevents the local parent repository's remote from
// accidentally receiving this standalone application's deployment.
const repository = 'https://github.com/Dota-Team-Manager/dota-team-manager.github.io.git';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
if (!existsSync(join(dist, 'index.html'))) throw new Error('Build the app before deploying.');
const temporaryRoot = realpathSync(tmpdir());
const checkout = mkdtempSync(join(temporaryRoot, 'aegis-pages-'));
const git = (args, capture = false) => execFileSync('git', args, { cwd: checkout, encoding: 'utf8', stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit' });

try {
  const existing = git(['ls-remote', '--heads', repository, 'gh-pages'], true).trim();
  git(['init', '--initial-branch=gh-pages']);
  git(['remote', 'add', 'origin', repository]);
  if (existing) {
    git(['fetch', '--depth=1', 'origin', 'gh-pages']);
    git(['update-ref', 'refs/heads/gh-pages', 'FETCH_HEAD']);
  }
  // Start with an empty index and worktree; keep the previous deployment as
  // the commit parent while excluding stale assets from the next build.
  git(['read-tree', '--empty']);
  for (const entry of readdirSync(dist)) cpSync(join(dist, entry), join(checkout, entry), { recursive: true });
  git(['add', '--all']);
  const changes = git(['diff', '--cached', '--name-only'], true).trim();
  if (!changes) {
    console.log('GitHub Pages already has this build.');
  } else {
    git(['commit', '-m', 'Deploy Aegis Manager to GitHub Pages']);
    git(['push', 'origin', 'gh-pages']);
    console.log('Build pushed. GitHub Pages URL: https://dota-team-manager.github.io/');
  }
} finally {
  // Only remove the dedicated temporary checkout that this invocation created.
  const target = realpathSync(checkout);
  if (dirname(target) !== temporaryRoot || !basename(target).startsWith('aegis-pages-')) throw new Error('Refusing to clean an unexpected path.');
  rmSync(target, { recursive: true, force: true });
}
