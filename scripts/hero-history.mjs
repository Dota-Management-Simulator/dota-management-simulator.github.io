// Factual observations, authored priors and balance targets remain separate.
export const normalizeHeroName = text => text.toLowerCase().replace(/[^a-z0-9]/g, '');
const aliases = { antimage: 'anti_mage', naturesprophet: 'natures_prophet', outworlddevourer: 'outworld_destroyer' };
export function parseHeroSnapshot(source, catalog) {
  const byName = new Map(catalog.map(h => [normalizeHeroName(h.name), h.id]));
  return source.body.trim().split(/\r?\n/).map(line => {
    const match = /^(.+?)\s+Matches\s+(\d+)\s+(\d+)\s+(\d+)\s*$/.exec(line);
    if (!match) throw new Error(`Unrecognized historical row: ${line}`);
    const [, name, played, wins, losses] = match;
    const id = aliases[normalizeHeroName(name)] ?? byName.get(normalizeHeroName(name));
    if (!id || Number(wins) + Number(losses) !== Number(played)) throw new Error(`Invalid hero counts: ${name}`);
    return { id, played: Number(played), wins: Number(wins), losses: Number(losses) };
  });
}
export function selectMetaSource(patchId, sources = []) {
  // Never carry strength through a different composite. A substantial complete
  // pick/ban sample is preferred; tiny cached fragments do not replace TI data.
  const samePhase = sources.filter(s => s.patchId === patchId && s.matches >= 80);
  return samePhase.sort((a, b) => Number(!!b.representativeEvent) - Number(!!a.representativeEvent) || Number(b.completeBans) - Number(a.completeBans) || b.matches - a.matches)[0];
}

export function buildHeroBalance(patch, catalog, cache, meta = { sources: [] }) {
  const source = cache.sources.find(s => s.patchId === patch.id);
  const sample = source ? parseHeroSnapshot(source, catalog) : [];
  const eligible = catalog.filter(h => h.releasedYear == null || h.releasedYear < patch.year);
  const tracked = selectMetaSource(patch.id, meta.sources);
  if (tracked) {
    const counts = eligible.map(h => tracked.rows.find(row => row.id === h.id) ?? { id: h.id, picks: 0, bans: tracked.completeBans ? 0 : null, wins: 0, winSample: 0 });
    const demand = counts.map(h => h.picks + (h.bans ?? 0));
    const rows = eligible.map((hero, index) => {
      const h = counts[index];
      // Tied demand gets a shared mid-rank. A high-ban/low-pick hero can be
      // meta-defining, while a 3–0 niche pick cannot dominate on raw win rate.
      const percentile = (demand.filter(n => n < demand[index]).length + demand.filter(n => n === demand[index]).length / 2) / demand.length;
      const demandSignal = 8 * (percentile * demand[index] / (demand[index] + 12) - .5);
      const result = ((h.wins + 20) / (h.winSample + 40) * 100 - 50) * .5;
      const evidenceWeight = tracked.matches / (tracked.matches + 40);
      const targetWinRate = Math.round(Math.min(58, Math.max(42, 50 + evidenceWeight * (demandSignal + Math.min(4, Math.max(-4, result)))))*100)/100;
      const legacy = sample.find(row => row.id === hero.id);
      return { id: hero.id, targetWinRate,
        priority: Math.round(Math.max(0, targetWinRate - 50) * 100) / 100,
        basis: tracked.completeBans ? 'observed-pro-meta' : 'observed-event-picks',
        meta: { picks: h.picks, bans: h.bans, matches: tracked.matches, winSample: h.winSample, wins: h.wins,
          rawWinRate: h.winSample ? Math.round(h.wins / h.winSample * 10000) / 100 : null,
          pickRate: Math.round(h.picks / tracked.matches * 10000) / 100,
          contestRate: tracked.completeBans ? Math.round((h.picks + h.bans) / tracked.matches * 10000) / 100 : null,
          sourceUrl: tracked.url, sourceLabel: tracked.label, sourceKey: tracked.key },
        // Preserve the earlier raw snapshots independently, even where their
        // coverage differs from the new event/patch evidence.
        ...(legacy ? { observed: { ...legacy, rawWinRate: Math.round(legacy.wins / legacy.played * 10000) / 100, sourceUrl: source.url } } : {}) };
    });
    return { rows, source: { label: tracked.label, url: tracked.url, from: tracked.from ?? null, through: tracked.through ?? null,
      note: `${tracked.note} Internal 42–58% targets blend relative field demand and sample-shrunk results; they are game estimates, not observed win rates.`,
      matches: tracked.matches, bansAvailable: tracked.completeBans, population: tracked.population } };
  }
  const rows = eligible.map(hero => {
    const rank = patch.heroes.findIndex(h => h.id === hero.id);
    const a = patch.axes;
    const pushers = new Set('chen,enchantress,natures_prophet,beastmaster,lycan,broodmother,death_prophet,shadow_shaman,leshrac,lone_druid,pugna,visage,dragon_knight,terrorblade,luna,phantom_lancer,naga_siren'.split(','));
    const mobile = new Set('storm_spirit,puck,queen_of_pain,ember_spirit,void_spirit,anti_mage,weaver,mirana,spirit_breaker,tusk,earth_spirit,monkey_king,bounty_hunter'.split(','));
    const fit = (hero.roles.includes(0) ? (a.economy - 50) / 50 * 1.5 : 0)
      + (hero.ability === 'heal' || hero.ability === 'area' ? (a.teamfight - 50) / 50 * 1.2 : 0)
      + (pushers.has(hero.id) ? (a.objectives + a.splitpush - 100) / 100 * 1.5 : 0)
      + (mobile.has(hero.id) ? (a.tempo + a.vision - 100) / 100 : 0);
    const prior = rank < 0 ? 50 + Math.min(2.5, Math.max(-2.5, fit)) : [57.5, 56.5, 55.5, 54.5, 53.5, 52.5][rank];
    const observed = sample.find(h => h.id === hero.id);
    // A 40-game neutral prior prevents a 3–0 event hero becoming unbeatable.
    // 58 is a game-balance ceiling, never a rewritten historical observation.
    const posterior = observed ? (observed.wins + 20) / (observed.played + 40) * 100 : null;
    const targetWinRate = Math.round(Math.min(58, Math.max(42, posterior ?? prior)) * 100) / 100;
    const priority = posterior == null ? Math.max(0, prior - 50) : Math.max(0, targetWinRate - 50) + Math.min(2, observed.played / 40);
    return { id: hero.id, targetWinRate, priority: Math.round(priority * 100) / 100,
      basis: observed ? 'observed-snapshot' : rank >= 0 ? 'authored-era-prior' : 'strategic-era-prior',
      ...(observed ? { observed: { ...observed, rawWinRate: Math.round(observed.wins / observed.played * 10000) / 100, sourceUrl: source.url } } : {}) };
  });
  return { rows, source: source ? { label: source.label, url: source.url, from: source.from, through: source.through, note: 'Community snapshot; event completeness and ban counts are unverified. Used only for this composite phase.' } : null };
}
