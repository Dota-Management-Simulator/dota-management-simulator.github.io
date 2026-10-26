import calibration from "./data/hero-calibration.json";
import type { SeasonPatch } from "./patches";
import { getHeroPool } from "./heroes";
import { TACTICAL_ENGINE_VERSION, strategies } from "./tactics";
import { MAP_PATHS_VERSION } from "./map-paths";
import { itemCatalog } from "./items";
import { COMBAT_MODEL_VERSION, combatCatalogue } from "./combat-model";
import { MATCH_RULES_VERSION, matchRules } from './match-rules';

export interface HeroBalance {
  id: string;
  /** Neutral-team design target, not a guaranteed campaign or historical rate. */
  targetWinRate: number;
  priority: number;
  basis: string;
  observed?: { played: number; wins: number; losses: number; rawWinRate: number; sourceUrl: string };
  meta?: { picks: number; bans: number | null; matches: number; winSample: number; wins: number;
    rawWinRate: number | null; pickRate: number; contestRate: number | null;
    sourceUrl: string; sourceLabel: string; sourceKey: string };
  /** Used only by the offline optimizer in its isolated process. */
  power?: number;
}
export interface HeroCalibration {
  signature: string;
  trainMaps: number;
  validationMaps: number;
  rows: { id: string; power: number; played: number; wins: number; winRate: number; low: number; high: number; targetWinRate: number }[];
}
const table = calibration as { version: number; patches: Record<string, HeroCalibration> };
export function heroBalanceSignature(patch: SeasonPatch): string {
  const inputs: unknown[] = [patch.id, patch.axes, patch.heroBalance?.map(h => [h.id, h.targetWinRate, h.priority])];
  inputs.push(TACTICAL_ENGINE_VERSION,itemCatalog,strategies,MAP_PATHS_VERSION);
  inputs.push(COMBAT_MODEL_VERSION,combatCatalogue(patch)?.signature);
  inputs.push(MATCH_RULES_VERSION, matchRules(patch));
  inputs.push("historical-roles-v1", getHeroPool(patch.year,Math.min(2026,patch.year-1),patch).map(h=>[h.id,h.roles]));
  // Modern-era combat now has different rules. A frozen earlier CPU batch can
  // finish, but its records must not certify the new engine on activation.
  if (patch.year >= 2017) inputs.push(patch.year >= 2023 ? "player-talents-v1/frontier-camps-v1" : "player-talents-v1");
  const text = JSON.stringify(inputs);
  let hash = 2166136261;
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16);
}
export function calibrationForPatch(patch: SeasonPatch): HeroCalibration | undefined {
  const record = table.patches[patch.id];
  return record && record.signature === heroBalanceSignature(patch) ? record : undefined;
}
export function heroTargetWinRate(patch: SeasonPatch, id: string): number {
  return patch.heroBalance?.find(h => h.id === id)?.targetWinRate ?? 50 + (patch.heroes.find(h => h.id === id)?.bonus ?? 0) / 1.5;
}
export function calibratedHeroBonus(patch: SeasonPatch | undefined, id: string): number {
  if (!patch) return 0;
  const row = patch.heroBalance?.find(h => h.id === id);
  if (!row) return patch.heroBalance ? 0 : patch.heroes.find(h => h.id === id)?.bonus ?? 0;
  if (row.power != null) return row.power;
  const measured = calibrationForPatch(patch)?.rows.find(h => h.id === id);
  return row.power ?? measured?.power ?? (row.targetWinRate - 50) * 1.2;
}
