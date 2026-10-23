// Explicit, cached source import. No requests occur in application/build code.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const destination = new URL('./data/hero-history-sources.json', import.meta.url);
let cache;
try { cache = JSON.parse(await readFile(destination, 'utf8')); }
catch { cache = { retrievedOn: '2026-10-23', attribution: 'Chris Arena, dota2stats historical DatDota/Dotabuff table snapshots. Raw factual counts; snapshot completeness is unverified.', sources: [] }; }
const sources = [
  { key: 'ti5', patchId: '2015.2', eventId: 'the-international-2015', label: 'TI2015 community statistics snapshot', from: '2015-07-26', through: '2015-08-08' },
  { key: 'shanghai', patchId: '2016.1', eventId: 'shanghai-major-2016', label: 'Shanghai Major 2016 community statistics snapshot', from: '2016-02-25', through: '2016-03-06' },
];
await mkdir(new URL('./data/', import.meta.url), { recursive: true });
for (const source of sources) {
  if (cache.sources.some(s => s.key === source.key)) continue;
  const url = `https://raw.githubusercontent.com/chrisarena/dota2stats/master/${source.key}.txt`;
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Historical source returned ${response.status}; stopped: ${source.key}`);
  const body = await response.text();
  if (!body.includes('Matches')) throw new Error(`Invalid historical source: ${source.key}`);
  cache.sources.push({ ...source, url, body });
  await writeFile(destination, JSON.stringify(cache, null, 2) + '\n');
}
console.log(`Retained ${cache.sources.length} historical hero-count snapshots. No completeness claim.`);
