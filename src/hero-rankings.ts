import { getHeroPool, heroRoles } from "./heroes";
import { calibrationForPatch, heroBalanceSignature, heroTargetWinRate } from "./hero-balance";
import type { HeroBalance, HeroCalibration } from "./hero-balance";
import type { SeasonPatch } from "./patches";
import { heroRoleProfile } from "./hero-roles";

export interface RankedHero {
  id: string;
  name: string;
  role: number;
  rank: number;
  highlighted: boolean;
  targetWinRate: number;
  strengthScore: number;
  benchmark: { played: number; wins: number; winRate: number; low: number; high: number } | null;
  basis: "design-target" | "role-benchmark" | "historical-meta-target";
  roleEvidence: string;
  historical: HeroBalance["meta"] | null;
}
/** Internal truth/reporting API. Never feed the full list to a team's draft
 * model or scouting UI: those must keep using perceivedPatch/patchReport.
 * Power coefficients compensate for archetypes and are not strength ranks.
 */
export function rankHeroesForRole(patch: SeasonPatch, role: number, measured = calibrationForPatch(patch)): RankedHero[] {
  if (!Number.isInteger(role) || role < 0 || role >= heroRoles.length) return [];
  const record = measured?.signature === heroBalanceSignature(patch) ? measured : undefined;
  const pool = getHeroPool(patch.year, Math.min(2026, patch.year - 1), patch);
  return pool.filter(h => h.roles.includes(role)).map(hero => {
    const targetWinRate = heroTargetWinRate(patch, hero.id);
    const historical = patch.heroBalance?.find(h => h.id === hero.id)?.meta ?? null;
    const sample = (record as RoleCalibration | undefined)?.rows.find(h => h.id === hero.id)?.roles?.find(v => v.role === role && v.played > 0);
    // Shrink sparse role samples toward their phase target. Report observed
    // counts/rates unchanged; the score is only an uncertainty-aware ranking.
    // Historical meta truth defines its intended ranking. Keep measured engine
    // results visible as a separate audit rather than allowing calibration
    // error to relabel an unplayed historical hero as meta-defining.
    const strengthScore = !historical && sample ? (sample.wins + targetWinRate / 100 * 64) / (sample.played + 64) * 100 : targetWinRate;
    const profile=heroRoleProfile(hero.id,patch,hero.roles);
    return { id: hero.id, name: hero.name, role, rank: 0, highlighted: false, targetWinRate,
      roleEvidence:profile.sourceYear?`TI${profile.sourceYear} role sample`:"Reviewed era estimate",
      historical,
      strengthScore: Math.round(strengthScore * 10000) / 10000,
      benchmark: sample ? { played: sample.played, wins: sample.wins, winRate: sample.winRate, low: sample.low, high: sample.high } : null,
      basis: historical ? "historical-meta-target" as const : sample ? "role-benchmark" as const : "design-target" as const };
  }).sort((a, b) => b.strengthScore - a.strengthScore || b.targetWinRate - a.targetWinRate || a.id.localeCompare(b.id))
    .map((hero, i) => ({ ...hero, rank: i + 1, highlighted: i < 10 }));
}
export function strongestHeroesForRole(patch: SeasonPatch, role: number): RankedHero[] {
  return rankHeroesForRole(patch, role).slice(0, 10);
}
export interface RoleCalibration extends HeroCalibration {
  rows: (HeroCalibration["rows"][number] & {
    roles?: { role: number; played: number; wins: number; winRate: number; low: number; high: number }[];
  })[];
}
