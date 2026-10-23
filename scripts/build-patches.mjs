// Compile small runtime profiles from curated estimates and cached Valve evidence.
// No network access. Run import-patches.mjs explicitly to fetch sources.
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { buildHeroBalance } from './hero-history.mjs';
const read = p => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const cache = JSON.parse(gunzipSync(readFileSync(new URL('./data/patch-sources.json.gz', import.meta.url))));
const authored = read('./data/patch-profiles.json');
const tournaments = read('../src/data/tournaments.json').events;
const heroes = [...read('../src/data/heroes-2011.json').heroes, ...read('../src/data/hero-releases.json').batches.flatMap(b => b.heroes)];
const icons = read('../src/data/hero-icons.json').heroes;
const valveHeroes = cache.sources['https://www.dota2.com/datafeed/herolist?language=english'].result.data.heroes;
const news = [...new Map(Object.values(cache.sources).flatMap(x => x.appnews?.newsitems ?? []).map(n => [n.gid, n])).values()];
const tiEnd = year => tournaments.find(t => t.kind === 'ti' && t.year === year)?.end ?? `${year}-12-31`;
const after = date => new Date(Date.parse(date) + 86400000).toISOString().slice(0,10);
const plain = text => text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const keys = ['tempo','economy','laning','teamfight','objectives','vision','splitpush'];
const history = read('./data/hero-history-sources.json');
const meta = JSON.parse(gunzipSync(readFileSync(new URL('./data/hero-meta-sources.json.gz', import.meta.url))));
const patches = authored.profiles.map(([year,phase,versions,secondDrop,name,values,description,ids]) => {
  const firstDrop = year === 2011 ? '2011-01-01' : after(tiEnd(year - 1));
  const from = phase === 1 ? firstDrop : secondDrop;
  const to = phase === 1 ? authored.profiles.find(p => p[0] === year && p[1] === 2)[3] : after(tiEnd(year));
  const modern = Object.entries(cache.sources).filter(([url,x]) => url.includes('/patchnotes?') && x.patch_timestamp * 1000 >= Date.parse(phase === 1 ? firstDrop : from) && x.patch_timestamp * 1000 < Date.parse(to));
  const old = news.filter(n => n.date * 1000 >= Date.parse(from) && n.date * 1000 < Date.parse(to) && /GAMEPLAY|balance|gameplay|6\.[78]\d|7\.0\d/.test(n.contents));
  const sources = modern.map(([url,x]) => ({ label: `Valve ${x.patch_number}`, url, date: new Date(x.patch_timestamp * 1000).toISOString().slice(0,10) }));
  // Keep early announcement URLs stable and on Valve's own domain.
  for (const n of old) sources.push({ label: n.title, url: `https://store.steampowered.com/news/app/570/view/${n.gid}`, date: new Date(n.date*1000).toISOString().slice(0,10) });
  // Primary early archive has no pre-TI1 notes. Keep that gap visible.
  const evidence = phase === 1 && year === 2011 ? 'limited' : sources.length ? 'valve-notes' : 'limited';
  const selected = ids.split(',').map((id, i) => {
    if (!heroes.some(h => h.id === id)) throw new Error(`Unknown hero ${id}`);
    const numeric = valveHeroes.find(h => h.name === icons[id]?.valveName)?.id;
    const changes = modern.flatMap(([url,x]) => {
      const hero = x.heroes?.find(h => h.hero_id === numeric);
      const notes = [...(hero?.hero_notes ?? []), ...(hero?.abilities ?? []).flatMap(a => a.ability_notes ?? [])];
      return notes.filter(n => n.note && !n.hide_dot).map(n => ({ version: x.patch_number, note: plain(n.note), url }));
    });
    return { id, bonus: [12,10,10,8,8,6][i], evidence: changes.length ? changes.at(-1) : null };
  });
  const profile = { id: `${year}.${phase}`, year, phase, name, versions, startsOn: from,
    description, axes: Object.fromEntries(keys.map((key,i) => [key,values[i]])), heroes: selected,
    evidence, sourceCount: sources.length, sources,
    limitations: [
      'Composite timing, seven axis values and hero bonuses are game design estimates, not exact Dota balance or verified professional pick/win rankings.',
      ...(year <= 2012 ? ['Early client parity and DotA versions differ. Two phases can share a balance version; their distinct gameplay identities are proxy estimates.'] : []),
      ...(year === 2020 ? ['There was no TI in 2020; the next opening phase begins at the annual boundary.'] : []),
      ...(evidence === 'limited' ? ['No primary patch notes recovered for this phase; version lineage is a provisional reference.'] : []),
    ] };
  const balance = buildHeroBalance(profile, heroes, history, meta);
  profile.heroBalance = balance.rows;
  profile.heroStatistics = balance.source;
  if (balance.source) {
    // Reveal the six highest supported priorities, rather than a permanent list.
    profile.heroes = [...balance.rows].sort((a,b) => b.priority - a.priority || a.id.localeCompare(b.id)).slice(0,6)
      .map((row,i) => ({ id: row.id, bonus: [12,10,10,8,8,6][i], evidence: selected.find(h => h.id === row.id)?.evidence ?? null }));
  }
  return profile;
});
writeFileSync(new URL('../src/data/patches.json', import.meta.url), JSON.stringify({ reviewedOn: '2026-10-23', note: authored.note, seasons: Array.from({length:16},(_,i)=>({year:2011+i, endsOn:tiEnd(2011+i)})), patches }, null, 2) + '\n');
console.log(`Compiled ${patches.length} season patches; ${patches.filter(p=>p.evidence==='limited').length} have limited source coverage.`);
