import type { Campaign, Player } from "./game";
import { marketValue, playerPersona } from "./player-market";
import { effectivePlayerAttributes } from "./player-innate-skills";
import { scaledCost } from "./economy-scale";

/** Pay mix: guaranteed wage against a cut of prize money. Game rules built
 * from simulated attributes, not claims about real players' finances. */
export const MAX_PRIZE_SHARE = 20; // per player; five starters can take 100%
/** Largest pressure effect, in decision-skill points (synergy's cap is 5). */
export const PRESSURE_POINTS = 6;

const hash = (s: string) => [...s].reduce((n, ch) => Math.imul(n ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const own = (c: Campaign, p: Player) => { const s = Object.values(effectivePlayerAttributes(c, p)); return s.reduce((a, b) => a + b, 0) / s.length; };

export interface PayProfile {
  /** 0 wants security, 1 bets on results. */
  appetite: number; appetiteLabel: string;
  /** −1 tightens up with money on the line, +1 thrives on it. */
  pressure: number; pressureLabel: string;
}
export function payProfile(c: Campaign, p: Player): PayProfile {
  const stats = effectivePlayerAttributes(c, p), base = own(c, p), ego = playerPersona(c, p).ego;
  const appetite = clamp(0.1 + hash(`risk:${p.id}`) % 71 / 100 + (ego - 5) * 0.03 + (stats.confidence - base) / 200, 0.05, 0.95);
  const pressure = clamp((hash(`pressure:${p.id}`) % 161 - 80) / 100 + (stats.stability - base) / 40, -1, 1);
  return { appetite, pressure,
    appetiteLabel: appetite < 0.35 ? "Wants security" : appetite > 0.65 ? "Bets on results" : "Balanced",
    pressureLabel: pressure >= 0.35 ? "Thrives under pressure" : pressure <= -0.35 ? "Tightens under pressure" : "Steady" };
}

/** Gross prize money the club can expect per week: its last two calendar years
 * of results, never below an era baseline. An estimate, not a forecast. */
export function expectedWeeklyPrize(c: Campaign) {
  const recent = c.results.filter(r => !r.skipped && r.year >= c.year - 1).reduce((n, r) => n + (r.prize ?? 0), 0);
  return Math.max(scaledCost(c.year, 2500), Math.round(recent / 104));
}
/** What a prize share is worth to this player per week, bent by their appetite. */
export function shareValue(c: Campaign, p: Player, share: number) {
  return Math.round(expectedWeeklyPrize(c) * share / 100 * (0.4 + 1.2 * payProfile(c, p).appetite));
}
/** Lowest guaranteed wage the player accepts, as a share of their ask:
 * 70% for the most security-minded, nothing for appetite 0.75 or more. */
export const guaranteeFloor = (c: Campaign, p: Player) => Math.round(Math.max(0, 0.75 - payProfile(c, p).appetite) * 100) / 100;
/** Guaranteed pay against market value, 0–1. */
export function guarantee(c: Campaign, p: Player, wage = p.wage) {
  const market = marketValue(c, p).wage;
  return market > 0 ? clamp(wage / market) : 1;
}
/** Weekly happiness from pay. Fair total value helps; for security-minded
 * players, thin guarantees hurt regardless of the prize upside. */
export function payMorale(c: Campaign, p: Player, wage: number, share: number, marketWage: number) {
  const value = (wage + shareValue(c, p, share)) / Math.max(1, marketWage);
  const fairness = Math.max(-3, Math.min(2, Math.round((value - 1) * 5)));
  const insecurity = Math.round((1 - payProfile(c, p).appetite) * (1 - Math.min(1, wage / Math.max(1, marketWage))) * 4);
  return fairness - insecurity;
}
/** Decision-skill points in competitive matches. Only contracted players with
 * thin guarantees feel it; their temperament sets the direction. */
export function pressurePoints(c: Campaign, p: Player) {
  const contract = c.contracts?.[p.id];
  if (!contract || !c.roster.includes(p.id)) return 0;
  // Against the market wage recorded at signing, so form during a running
  // tournament can't move it between fixtures.
  const guaranteed = contract.marketWage > 0 ? clamp(contract.wage / contract.marketWage) : 1;
  return Math.round(payProfile(c, p).pressure * (1 - guaranteed) * PRESSURE_POINTS * 10) / 10 || 0;
}
/** Org's cut of gross prize money for the current lineup's contracts. */
export const clubPrizeShare = (c: Campaign) => 100 - c.roster.reduce((n, id) => n + (c.contracts?.[id]?.prizeShare ?? 0), 0);
