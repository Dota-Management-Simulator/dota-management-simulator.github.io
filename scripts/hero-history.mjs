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
export function buildHeroBalance(patch, catalog, cache) {
  const source = cache.sources.find(s => s.patchId === patch.id);
  const sample = source ? parseHeroSnapshot(source, catalog) : [];
  const eligible = catalog.filter(h => h.releasedYear == null || h.releasedYear < patch.year);
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
