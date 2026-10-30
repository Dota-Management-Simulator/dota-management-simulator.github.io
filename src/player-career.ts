import type { Campaign, Player } from './game';
import { getHeroPool } from './heroes';
import { campaignHeroPoolThrough, campaignPatch } from './patches';

/** Simulated development and preferences, not biographical judgments. */
export interface PlayerCareer {
  version: 1;
  paidWeeks: number;
  heroTraining: Record<string, number>;
  focusHeroId?: string;
}
export const careerHash = (s: string) => [...s].reduce((n, ch) => Math.imul(n ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
const clamp = (n: number, a = 0, b = 100) => Math.max(a, Math.min(b, n));
const round = (n: number) => Math.round(n * 100) / 100;
export function normalizeCareer(value: unknown): PlayerCareer {
  const row = value && typeof value === 'object' ? value as Partial<PlayerCareer> : {};
  const training = row.heroTraining && typeof row.heroTraining === 'object' && !Array.isArray(row.heroTraining) ? row.heroTraining : {};
  return { version: 1, paidWeeks: Number.isSafeInteger(row.paidWeeks) ? clamp(row.paidWeeks!, 0, 10000) : 0,
    heroTraining: Object.fromEntries(Object.entries(training).filter(([id, n]) => /^[a-z0-9_-]{1,60}$/.test(id) && Number.isFinite(n)).slice(0, 160).map(([id, n]) => [id, round(clamp(n, 0, 40))])),
    ...(typeof row.focusHeroId === 'string' && /^[a-z0-9_-]{1,60}$/.test(row.focusHeroId) ? { focusHeroId: row.focusHeroId } : {}) };
}
export function individualPlaystyles(id: string, template: Player['playstyles']): Player['playstyles'] {
  return Object.fromEntries(Object.entries(template).filter(([, n]) => n != null).map(([key, n]) =>
    [key, clamp(n! + (careerHash(`style:${id}:${key}`) % 61 - 30) / 10, 1, 10)])) as unknown as Player['playstyles'];
}
export function developmentProfile(p: Player) {
  const seed = careerHash(`career:${p.id}`);
  return { learning: .85 + seed % 31 / 100, ceiling: 65 + (seed >>> 6) % 26,
    leadership: 1 + (seed >>> 12) % 10, adaptability: 1 + (seed >>> 18) % 10 };
}
/** Full early gains, then diminishing returns toward an individual ceiling.
 * Existing ratings above their ceiling are retained; only future gains change. */
export function careerDeltas(p: Player, deltas: Player['stats']): Player['stats'] {
  const profile = developmentProfile(p);
  return Object.fromEntries(Object.entries(deltas).map(([key, n]) => {
    const current = p.stats[key as keyof Player['stats']];
    if (n <= 0 || current <= 45) return [key, n];
    const ceiling = Math.min(99, profile.ceiling + careerHash(`${p.id}:${key}:ceiling`) % 9 - 4);
    const multiplier = profile.learning * Math.pow(clamp((ceiling - current) / (ceiling - 45), 0, 1), 1.5);
    return [key, round(Math.min(Math.max(0, ceiling - current), n * multiplier))];
  })) as Player['stats'];
}
const experienceCache = new WeakMap<Campaign, { key: string; value: Map<string, Record<string, number>> }>();
const experienceKey = (c: Campaign) => `${c.results.map(r => `${r.eventId}:${r.series?.games.length ?? 0}`).join(',')}|${c.scrims?.sessions.map(s => `${s.status}:${s.series?.games.length ?? 0}`).join(',')}|${c.calendar?.runs.map(r => `${r.eventId}:${r.settled}:${r.matches.map(m => `${m.id}:${m.series?.games.length ?? m.performance?.games.length ?? 0}`).join(',')}`).join(';')}`;
export function careerExperience(c: Campaign) {
  const key = experienceKey(c), cached = experienceCache.get(c); if (cached?.key === key) return cached.value;
  const result = new Map<string, Record<string, number>>();
  const games = [...c.results.filter(r => !r.tournamentId).flatMap(r => r.series?.games ?? []),
    ...(c.scrims?.sessions ?? []).filter(s => s.status === 'complete').flatMap(s => s.series?.games ?? []),
    ...(c.calendar?.runs ?? []).flatMap(r => r.matches.flatMap(m => m.series?.games ?? m.performance?.games ?? []))];
  for (const game of games) for (const row of game.players) {
    const known = result.get(row.id) ?? {}; known[row.heroId] = (known[row.heroId] ?? 0) + 1; result.set(row.id, known);
  }
  experienceCache.set(c, { key, value: result }); return result;
}
const poolCache = new Map<string, ReturnType<typeof getHeroPool>>();
export function careerHeroPool(c: Campaign) {
  const patch = campaignPatch(c), through = campaignHeroPoolThrough(c), key = `${patch.id}:${through}`;
  let pool = poolCache.get(key); if (!pool) { pool = getHeroPool(c.year, through, patch); poolCache.set(key, pool); } return pool;
}
const masteryExperienceCache = new WeakMap<Campaign, { key: string; value: Map<string, Record<string, number>> }>();
function masteryExperience(c: Campaign) {
  const key = experienceKey(c), cached = masteryExperienceCache.get(c); if (cached?.key === key) return cached.value;
  const result = careerExperience({ ...c, calendar: c.calendar ? { ...c.calendar, runs: c.calendar.runs.filter(r => r.settled) } : undefined });
  masteryExperienceCache.set(c, { key, value: result }); return result;
}
/** Only eligible heroes appear. Historical signatures are not invented. */
export function heroMasteries(c: Campaign, p: Player, experience = masteryExperience(c).get(p.id) ?? {}) {
  const pool = careerHeroPool(c), role = ['Carry', 'Mid', 'Offlane', 'Soft support', 'Hard support'].indexOf(p.role);
  const favorites = new Set(pool.filter(h => h.roles.includes(role)).sort((a, b) => careerHash(`${p.id}:${a.id}:favorite`) - careerHash(`${p.id}:${b.id}:favorite`)).slice(0, 3).map(h => h.id));
  return Object.fromEntries(pool.map(h => [h.id, round(clamp(28 + careerHash(`${p.id}:${h.id}:comfort`) % 20 + p.stats.heroPool * .2
    + (favorites.has(h.id) ? 14 : 0) + Math.log2(1 + (experience[h.id] ?? 0)) * 5 + (p.career?.heroTraining[h.id] ?? 0)))]));
}
export function masterySkillBonus(mastery?: number) { return mastery == null || !Number.isFinite(mastery) ? 0 : round(clamp((mastery - 50) / 10, -2, 4)); }
export const masterySkills = new Set(['laning', 'teamfights', 'skirmish', 'farming']);
export function practiceHero(p: Player, hours: number, resting: boolean, readiness = 1) {
  p.career = normalizeCareer(p.career); p.career.paidWeeks++;
  const id = p.career.focusHeroId;
  if (id && !resting && hours >= 10) {
    const current = p.career.heroTraining[id] ?? 0;
    p.career.heroTraining[id] = round(Math.min(40, current + Math.min(2, hours / 20) * Math.max(.25, Math.min(1, readiness)) * (1 - current / 40)));
  }
}
