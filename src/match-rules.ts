import type { SeasonPatch } from './patches';
import type { MapEra } from './map-eras';
import { geometryForEra } from './map-geometry';

/** Composite-era rules, with scaled map/health values documented in match-rules.md. */
export const MATCH_RULES_VERSION = 'complete-base-vision-wards-v3';
export type CreepType = 'melee' | 'ranged' | 'siege';
export interface GlyphState { auto: boolean; activeUntil: number; creepsUntil: number; readyAt: number; uses: number }
export interface SiegeEvent { time: number; team: 0 | 1; kind: 'glyph' | 'glyph-refresh' | 'buyback'; message: string; playerId?: string; automatic?: boolean }
export function matchRules(patch?: Pick<SeasonPatch, 'year' | 'phase'>) {
  const era = patch ? patch.year * 10 + patch.phase : 0;
  return {
    enabled: !!patch,
    // Two season composites select these documented historical transitions.
    // Pre-7.07 item mana regen is a percentage, not flat mana per second.
    regenFormula: era >= 20191 ? 'additive' : era >= 20181 ? 'attribute-amplified' : 'legacy-percent',
    strengthRegen: era >= 20191 ? .1 : era >= 20172 ? .06 : .03,
    intelligenceRegen: era >= 20191 ? .05 : .04,
    strengthRegenAmp: era >= 20181 && era < 20191 ? .007 : 0,
    intelligenceRegenAmp: era >= 20181 && era < 20191 ? .02 : 0,
    towerHealthRegen: era >= 20201 ? [1, 3] : [0, 0],
    uphillMiss: .25,
    glyphDuration: era >= 20201 ? 7 : era >= 20181 ? 6 : era >= 20131 ? 5 : 4,
    glyphCreepDuration: era >= 20251 ? 3 : era >= 20201 ? 4 : era >= 20181 ? 6 : 0,
    glyphCooldown: 300,
    glyphStartsAt: era >= 20191 ? 180 : 0,
    glyphRefresh: era >= 20242 ? 'barracks' : era >= 20222 ? 'tiers' : era >= 20151 ? 'tier1' : 'none',
    glyphExtraTargets: era >= 20231 ? 5 : era >= 20201 ? 4 : era >= 20192 ? 2 : 0,
    backdoorReduction: era >= 20211 ? .5 : era >= 20181 ? .4 : era >= 20132 ? .25 : 0,
    backdoorHeal: 90,
    ancientBackdoorHeal: era >= 20222 ? 180 : 90,
    backdoorGrace: 15,
    siegeInterval: era >= 20172 ? 300 : 210,
    siegeMultiplier: era >= 20172 ? 2.5 : 1.5,
    siegeHealth: era >= 20181 ? 350 : era >= 20172 ? 330 : era >= 20132 ? 220 : 200,
    extraSiegeAt: era >= 20192 ? 2100 : era >= 20181 ? 1800 : era >= 20172 ? 2400 : 2700,
    extraRangedAt: era >= 20172 ? 2400 : 2700,
    meleeInterval: era >= 20152 ? 900 : 1050,
    denyEnemyXp: era >= 20201 ? .5 : era >= 20192 ? .4 : era >= 20191 ? .35 : era >= 20181 ? .25 : era >= 20172 ? .7 : .5,
    denyOwnXp: era >= 20191 ? 0 : era >= 20181 ? .25 : era >= 20172 ? .3 : 0,
    denyGold: era >= 20191 && era < 20201 ? .2 : 0,
    // Pre-6.82 denied XP was a flat amount and differed for ranged heroes.
    flatDenyXp: era < 20151,
    buybackCooldown: era >= 20172 ? 480 : era >= 20151 ? 420 : era >= 20132 ? 360 : 300,
    buybackDivisor: era >= 20211 ? 13 : era >= 20201 ? 12 : era >= 20181 ? 13 : 0,
    buybackBase: era >= 20201 ? 200 : 100,
    buybackPenalty: era >= 20191 ? 'flat' : era >= 20141 ? 'remaining' : 'none',
    buybackGoldPenalty: era >= 20181 ? 'none' : era >= 20152 ? 'all' : era >= 20141 ? 'farm' : 'none',
  } as const;
}

export function buybackCost(rules: ReturnType<typeof matchRules>, level: number, netWorth: number, clock: number) {
  return rules.buybackDivisor ? Math.floor(rules.buybackBase + netWorth / rules.buybackDivisor)
    : Math.floor((100 + level * level * 1.5 + clock * .25) / 50) * 50;
}

/** The 2D art has no Valve height grid. Base plateaus and river banks are
 * explicit, conservative approximations; paths remain independently walkable. */
export function terrainHeight(era: MapEra | undefined, x: number, y: number): number {
  if (!era) return 1;
  const px = (x - era.box[0]) / era.box[2] * 100, py = (y - era.box[1]) / era.box[3] * 100;
  if (px < 29 && py > 65 && py - px > 55 || px > 67 && py < 32 && px - py > 55) return 2;
  const river = geometryForEra(era).river;
  for (let i = 1; i < river.length; i++) {
    const [ax, ay] = river[i - 1], [bx, by] = river[i];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    if (Math.hypot(x - ax - t * dx, y - ay - t * dy) < 19) return 0;
  }
  return 1;
}

export function terrainSight(era: MapEra | undefined, observer: {x: number; y: number}, target: {x: number; y: number}) {
  if (!era) return true;
  const high = terrainHeight(era, target.x, target.y), low = terrainHeight(era, observer.x, observer.y);
  // A unit can see up its immediate ramp, not reveal a whole plateau from below.
  if (high > low && Math.hypot(target.x - observer.x, target.y - observer.y) > 48) return false;
  for (let i = 1; i < 4; i++) {
    if (terrainHeight(era, observer.x + (target.x - observer.x) * i / 4, observer.y + (target.y - observer.y) * i / 4) > Math.max(low, high)) return false;
  }
  return true;
}
