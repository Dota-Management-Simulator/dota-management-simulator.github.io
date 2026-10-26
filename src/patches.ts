import archive from "./data/patches.json";
import { getHeroPool, heroUnlockYear } from "./heroes";
import type { Hero } from "./heroes";
import { calibratedHeroBonus } from "./hero-balance";
import type { HeroBalance } from "./hero-balance";

export type PatchAxis = "tempo" | "economy" | "laning" | "teamfight" | "objectives" | "vision" | "splitpush";
export type SeasonPatch = Omit<(typeof archive.patches)[number], "heroBalance"> & { generated?: boolean; heroBalance?: HeroBalance[] };
export const historicalPatches: SeasonPatch[] = archive.patches;
export const patchAxes: { key: PatchAxis; name: string; low: string; high: string; effect: string }[] = [
  { key: "tempo", name: "Game tempo", low: "Patient", high: "Fast", effect: "Hero movement speed; named spells use their own historical cooldowns." },
  { key: "economy", name: "Farming economy", low: "Scarce", high: "Abundant", effect: "Passive gold, last-hit gold, experience and the value of accumulated farm." },
  { key: "laning", name: "Lane importance", low: "Forgiving", high: "Decisive", effect: "Laning skill changes early hero and creep attack damage." },
  { key: "teamfight", name: "Teamfight impact", low: "Pickoffs", high: "Group up", effect: "Nearby teammates amplify spell damage, control and healing." },
  { key: "objectives", name: "Objective pressure", low: "Durable", high: "Vulnerable", effect: "Hero damage to towers and Ancients, with extra value from pushing skill." },
  { key: "vision", name: "Vision advantage", low: "Close combat", high: "Find targets", effect: "Vision and intuition improve sight range. Shared sightings and approximate elevation gate targets; wards are not simulated." },
  { key: "splitpush", name: "Split-push viability", low: "Group up", high: "Spread out", effect: "Isolated heroes gain building damage, especially heroes tagged for pushing." },
];
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
export const axisFactor = (patch: SeasonPatch | undefined, key: PatchAxis, scale: number) => patch ? 1 + (patch.axes[key] - 50) / 50 * scale : 1;

/** Strategic tags are authored proxies; they do not reproduce exact spells. */
const pushers = new Set("chen,enchantress,natures_prophet,beastmaster,lycan,broodmother,death_prophet,shadow_shaman,leshrac,lone_druid,pugna,visage,dragon_knight,terrorblade,luna,phantom_lancer,naga_siren".split(","));
const mobile = new Set("storm_spirit,puck,queen_of_pain,ember_spirit,void_spirit,anti_mage,weaver,mirana,spirit_breaker,tusk,earth_spirit,monkey_king,bounty_hunter".split(","));
export function heroTags(hero: Hero): string[] {
  const tags = [hero.roles.includes(0) ? "Scaling" : hero.ability === "heal" ? "Sustain" : hero.ability === "stun" ? "Control" : hero.ability === "area" ? "Teamfight" : "Spell damage"];
  if (pushers.has(hero.id)) tags.push("Pushing");
  if (mobile.has(hero.id)) tags.push("Mobile");
  if (hero.attribute === "Strength") tags.push("Durable");
  return tags;
}
export const heroPatchBonus = calibratedHeroBonus;

/** Dates are proxy drops, deliberately independent from exact client releases.
 * The first phase starts after the previous TI; 2020 ends at New Year. */
export function patchAtDate(at: string): SeasonPatch {
  const date = at.slice(0, 10);
  const year = Number(date.slice(0, 4));
  if (!Number.isFinite(Date.parse(at))) throw new Error("Invalid patch date");
  if (date < "2011-01-01") return historicalPatches[0];
  const season = archive.seasons.find(s => s.year === year);
  const seasonYear = season ? date > season.endsOn ? year + 1 : year : year;
  if (seasonYear > 2026) {
    // Fictional future seasons retain two deterministic identities each year.
    const afterSeason = date > `${year}-08-31`;
    const futureYear = year > 2026 && afterSeason ? year + 1 : seasonYear;
    const phase = date < `${year}-05-15` || afterSeason || seasonYear > year ? 1 : 2;
    return patchForSeason(futureYear, phase);
  }
  const second = patchForSeason(seasonYear, 2);
  return patchForSeason(seasonYear, date >= second.startsOn ? 2 : 1);
}
export function patchForSeason(year: number, phase: 1 | 2): SeasonPatch {
  const found = historicalPatches.find(p => p.year === year && p.phase === phase);
  if (found) return found;
  const base = historicalPatches.at(-1)!;
  const axes = Object.fromEntries(patchAxes.map(({ key }, i) => [key, 35 + ((year * 17 + phase * 29 + i * 23) % 61)])) as SeasonPatch["axes"];
  const pool = getHeroPool(year, 2026);
  const heroes = [...pool].sort((a,b) => futureHash(`${year}.${phase}:${a.id}`) - futureHash(`${year}.${phase}:${b.id}`)).slice(0,6).map((hero,i) => ({ id: hero.id, bonus: [12,10,10,8,8,6][i], evidence: null }));
  const heroBalance = pool.map(hero => {
    const rank = heroes.findIndex(h => h.id === hero.id);
    const targetWinRate = rank >= 0 ? [58,57,56,55,54,53][rank] : 46 + futureHash(`${year}.${phase}:strength:${hero.id}`) % 9;
    return { id: hero.id, targetWinRate, priority: Math.max(0, targetWinRate - 50), basis: "generated" };
  });
  return { ...base, heroBalance, heroStatistics: null, id: `${year}.${phase}`, year, phase, name: phase === 1 ? "A new balance" : "A shifting advantage", versions: "Generated future patch", generated: true,
    startsOn: phase === 1 ? year === 2027 ? new Date(Date.parse(archive.seasons.at(-1)!.endsOn) + 86400000).toISOString().slice(0,10) : `${year - 1}-09-01` : `${year}-05-15`, axes, heroes,
    description: "A fictional balance cycle for your alternate timeline. Highlighted heroes and strategic priorities are generated deterministically.",
    evidence: "generated", sources: [], sourceCount: 0, limitations: ["Generated gameplay, with no claim of historical patch or hero-strength evidence."] };
}
function futureHash(text: string) { let n = 2166136261; for (const char of text) n = Math.imul(n ^ char.charCodeAt(0), 16777619); return n >>> 0; }
export function patchById(id?: string): SeasonPatch | undefined {
  if (!id) return undefined;
  const match = /^(\d{4})\.([12])$/.exec(id);
  return match && Number(match[1]) >= 2011 ? patchForSeason(Number(match[1]), Number(match[2]) as 1 | 2) : undefined;
}
/** Weekly prototype: phase two at week 9; the next opening follows the shuffle
 * at week 17, before the next season's first event. No save migration needed. */
export function campaignPatch(c: { year: number; week: number; calendar?: { now: string } }): SeasonPatch {
  return c.calendar ? patchAtDate(c.calendar.now) : c.week >= 17 ? patchForSeason(c.year + 1, 1) : patchForSeason(c.year, c.week >= 9 ? 2 : 1);
}
export function campaignHeroPoolThrough(c: { year: number; week: number; calendar?: { shuffledYears: number[] } }) {
  return c.calendar ? Math.min(2026, Math.max(2010, ...c.calendar.shuffledYears)) : heroUnlockYear(c.year, c.week);
}
/** Role preference + patch priority + strategic fit, with nonzero off-meta
 * probability. Creativity softens priority; both sides use identical weights. */
export function draftWeight(hero: Hero, patch: SeasonPatch | undefined, creativity: number): number {
  if (!patch) return 1;
  const tags = heroTags(hero);
  const fit = (tags.includes("Pushing") ? (patch.axes.objectives + patch.axes.splitpush - 100) / 200 : 0)
    + (tags.includes("Scaling") ? (patch.axes.economy - 50) / 100 : 0)
    + (tags.includes("Teamfight") || tags.includes("Sustain") ? (patch.axes.teamfight - 50) / 100 : 0)
    + (tags.includes("Mobile") ? (patch.axes.tempo + patch.axes.vision - 100) / 200 : 0);
  const priority = patch.heroBalance?.find(h => h.id === hero.id)?.priority ?? (patch.heroBalance ? 0 : (patch.heroes.find(h => h.id === hero.id)?.bonus ?? 0) / 2);
  return clamp(1 + priority / 2.5 * (1 - clamp(creativity, 0, 99) / 150) + fit, 0.35, 4);
}
