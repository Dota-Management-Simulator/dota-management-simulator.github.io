import era from "./data/heroes-2011.json";
import releases from "./data/hero-releases.json";
import { heroRoleProfile } from "./hero-roles";
import type { RoleEra } from "./hero-roles";
export interface Hero {
  id: string;
  name: string;
  attribute: string;
  roles: number[];
  ability: string;
  ranged: boolean;
  releasedYear?: number;
}
export const heroEra = era;
export const heroReleases = releases;
export const LAST_HERO_YEAR = 2026;
const catalog: Hero[] = [...era.heroes, ...releases.batches.flatMap((b) => b.heroes)];
// The TI1 opening 46 are always present. Calendar-year additions arrive only
// in that year's shuffle; a later start includes already completed shuffles.
export const heroUnlockYear = (year: number, week = 1) => Math.min(LAST_HERO_YEAR, year - (week <= 16 ? 1 : 0));
export const getHeroPool = (year: number, throughYear = heroUnlockYear(year), era: RoleEra = { year, phase: 1 }): Hero[] =>
  catalog.filter((h) => h.releasedYear == null || h.releasedYear <= throughYear)
    .map(h => ({ ...h, roles: heroRoleProfile(h.id, era, h.roles).roles }));
export const heroById = (id: string) => catalog.find((h) => h.id === id);
export const heroesArrivingIn = (year: number): Hero[] => releases.batches.find((b) => b.year === year)?.heroes ?? [];
export const heroRoles = [
  "Carry",
  "Mid",
  "Offlane",
  "Soft support",
  "Hard support",
];
