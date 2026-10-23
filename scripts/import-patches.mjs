// Offline-first source refresh. Never runs during builds or gameplay.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { gzipSync, gunzipSync } from 'node:zlib';
const file = new URL('./data/patch-sources.json.gz', import.meta.url);
let cache;
try { cache = JSON.parse(gunzipSync(await readFile(file))); }
catch { cache = { retrievedOn: '2026-10-22', sources: {} }; }
async function get(url, valid) {
  if (cache.sources[url]) return cache.sources[url];
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Source returned ${response.status}: ${url}`);
  const body = await response.json();
  if (!valid(body)) throw new Error(`Source validation failed: ${url}`);
  cache.sources[url] = body;
  await writeFile(file, gzipSync(JSON.stringify(cache)));
  return body;
}
await mkdir(new URL('./data/', import.meta.url), { recursive: true });
const list = await get('https://www.dota2.com/datafeed/patchnoteslist?language=english', x => x.success && x.patches?.length);
await get('https://www.dota2.com/datafeed/herolist?language=english', x => x.result?.data?.heroes?.length);
const cutoff = Date.parse('2026-10-23T00:00:00Z') / 1000;
for (const patch of list.patches.filter(p => p.patch_timestamp < cutoff)) {
  const url = `https://www.dota2.com/datafeed/patchnotes?version=${patch.patch_number}&language=english`;
  await get(url, x => x.success && x.patch_number === patch.patch_number);
}
// Valve's Steam announcements preserve the early client balance updates.
// Limit feed results to Valve's own patch/news feeds, excluding third-party press.
for (let year = 2011; year <= 2017; year++) {
  const end = Date.UTC(year + 1, 0, 1) / 1000;
  const url = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=570&count=1000&maxlength=0&enddate=${end}&feeds=steam_community_announcements,steam_updates`;
  await get(url, x => Array.isArray(x.appnews?.newsitems));
}
console.log(`Cached ${Object.keys(cache.sources).length} Valve source responses in scripts/data/patch-sources.json.gz`);
