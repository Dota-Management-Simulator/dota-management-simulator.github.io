// Explicit offline refresh of Valve game files mirrored by Dotabuff/SteamTracking.
// Builds never fetch. SHA-addressed inputs and their dates stay in the cache.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';
const path = new URL('./data/combat-history.json.gz', import.meta.url);
const cache = existsSync(path) ? JSON.parse(gunzipSync(readFileSync(path))) : { snapshots: {}, files: {} };
const patches = JSON.parse(readFileSync(new URL('../src/data/patches.json', import.meta.url))).patches;
const heroNames = Object.values(JSON.parse(readFileSync(new URL('../src/data/hero-icons.json',import.meta.url))).heroes).map(h=>h.valveName);
async function json(url) { const r = await fetch(url); if (!r.ok) throw Error(`${r.status} ${url}`); return r.json(); }
async function file(url) {
  if (cache.files[url] !== undefined) return cache.files[url];
  const r = await fetch(url); if (r.status === 404) return '';
  if (!r.ok) throw Error(`${r.status} ${url}`);
  return cache.files[url] = await r.text();
}
for (const p of patches) {
  if (cache.snapshots[p.id] && cache.files[cache.snapshots[p.id].base+'npc_heroes.txt'] && (p.year < 2022 || (p.year < 2024 ? cache.snapshots[p.id].expanded : cache.snapshots[p.id].expanded===2))) continue;
  const next = patches[patches.indexOf(p) + 1];
  // Composites intentionally combine all changes up to the following phase.
  const cutoff = next?.startsOn ?? '2026-10-24';
  const until = cutoff < '2013-09-01' ? '2013-09-01' : cutoff;
  const repo = until < '2015-09-01' ? 'dotabuff/d2vpk' : 'dotabuff/d2vpkr';
  const commits = await json(`https://api.github.com/repos/${repo}/commits?until=${until}T00:00:00Z&per_page=1`);
  if (!commits.length) throw Error(`No snapshot ${p.id}`);
  const sha = commits[0].sha, date = commits[0].commit.committer.date.slice(0, 10);
  const prefix = repo.endsWith('/d2vpk') ? 'dota_pak01' : repo.endsWith('/d2vpkr') ? 'dota' : 'game/dota/pak01_dir';
  let base = `https://raw.githubusercontent.com/${repo}/${sha}/${prefix}/scripts/npc/`;
  if (!await file(base+'npc_heroes.txt')) base = `https://raw.githubusercontent.com/${repo}/${sha}/game/dota/scripts/npc/`;
  if (!await file(base+'npc_heroes.txt')) throw Error(`Missing hero files ${p.id}`);
  const pending = ['npc_heroes.txt', 'npc_abilities.txt', 'items.txt', ...(p.year >= 2022 ? ['npc_heroes.json','npc_abilities.json','items.json'] : []),...(p.year>=2024?heroNames.map(h=>`heroes/${h}.txt`):[])];
  const visited = new Set();
  while (pending.length) {
    const batch = pending.splice(0, 12).filter(x => !visited.has(x));
    await Promise.all(batch.map(async name => {
      visited.add(name);
      const content = await file(base + name);
      for (const m of content.matchAll(/^\s*#(?:base|include)\s+"([^"]+)"/gm)) {
        const relative = new URL(m[1], base + name).href.slice(base.length);
        if (!visited.has(relative)) pending.push(relative);
      }
    }));
  }
  cache.snapshots[p.id] = { repo, sha, date, cutoff, base, files: [...visited], provisional: date >= cutoff, expanded: 2 };
  writeFileSync(path, gzipSync(JSON.stringify(cache)));
  console.log(`${p.id}: ${date}, ${visited.size} game files${date >= cutoff ? ' (later reference; unverified early values)' : ''}`);
}
const abilityUrl = 'https://www.dota2.com/datafeed/abilitylist?language=english';
const itemUrl = 'https://www.dota2.com/datafeed/itemlist?language=english';
cache.labels = { abilities: await json(abilityUrl), items: await json(itemUrl), sources: [abilityUrl, itemUrl] };
writeFileSync(path, gzipSync(JSON.stringify(cache)));
