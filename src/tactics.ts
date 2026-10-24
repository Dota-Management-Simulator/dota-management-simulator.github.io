import type { BattlePlayer, Side } from "./battle";
import { buildStyles } from "./items";
import type { BuildStyle } from "./items";

export type GamePhase = "early" | "mid" | "late";
export const gamePhases: GamePhase[] = ["early", "mid", "late"];
export const phaseLabels = { early: "Early · 0–15 min", mid: "Mid · 15–40 min", late: "Late · 40+ min" };
export const phaseAt = (seconds: number): GamePhase => seconds < 900 ? "early" : seconds < 2400 ? "mid" : "late";
export interface Strategy {
  id: string; name: string; phases: GamePhase[]; kind: "gank" | "push" | "roshan" | "protect" | "item";
  description: string; roles: number[]; lane?: number; item?: "bkb" | "rapier";
  staff?: string; skill?: string; threshold?: number;
}
export const strategies: Strategy[] = [
  { id: "mid-top", name: "Mid ganks top", phases: ["early"], kind: "gank", roles: [1], lane: 0, description: "Mid leaves farm to look for a top-lane pickoff with the lane partners." },
  { id: "mid-bottom", name: "Mid ganks bottom", phases: ["early"], kind: "gank", roles: [1], lane: 2, description: "Mid rotates bottom. Travel and a failed opening cost lane time." },
  { id: "help-losing", name: "Mid helps the losing sidelane", phases: ["early"], kind: "gank", roles: [1], staff: "c1", skill: "intuition", threshold: 50, description: "Choose the sidelane under most pressure from your deaths and lost towers." },
  { id: "supports-mid", name: "Supports gank mid", phases: ["early"], kind: "gank", roles: [3, 4], lane: 1, description: "Both supports leave their lanes and seek a visible mid target." },
  ...([0, 1, 2] as const).map(lane => ({ id: `push-${lane}`, name: `Take ${["top", "mid", "bottom"][lane]} tower`, phases: ["mid", "late"] as GamePhase[], kind: "push" as const, roles: [1, 2, 3, 4], lane, description: "Group behind your wave and attack the next standing tower. Carry keeps farming." })),
  { id: "protect-carry", name: "Protect the carry", phases: ["mid", "late"], kind: "protect", roles: [3, 4], description: "Supports escort the carry for 90 seconds, sacrificing their own farm." },
  { id: "roshan", name: "Attempt Roshan", phases: ["mid", "late"], kind: "roshan", roles: [0, 1, 2, 3, 4], staff: "c4", skill: "intuition", threshold: 50, description: "Gather at the pit. Fight Roshan for gold and one expiring Aegis; enemies can contest." },
  { id: "high-ground", name: "Group for high ground", phases: ["late"], kind: "push", roles: [0, 1, 2, 3, 4], description: "Commit all five to an exposed lane and then the Ancient. Retreat rules still apply." },
  { id: "split-push", name: "Offlaner split pushes", phases: ["mid", "late"], kind: "push", roles: [2], staff: "c5", skill: "pushing", threshold: 50, description: "Offlaner pressures the least defended visible lane. Avoids a detected numerical disadvantage." },
  { id: "buy-bkb", name: "Prioritize Black King Bar", phases: ["mid", "late"], kind: "item", roles: [0], item: "bkb", description: "Selected player saves match gold for BKB next, delaying the normal build." },
  { id: "buy-rapier", name: "Save for Divine Rapier", phases: ["late"], kind: "item", roles: [0], item: "rapier", staff: "c6", skill: "creativity", threshold: 55, description: "Selected player saves for Rapier. It drops on death and opponents can pick it up." },
];
export const strategyById = (id: string) => strategies.find(s => s.id === id);
export interface TacticalPreparation { slots: Record<GamePhase, string[]>; builds: BuildStyle[] }
export const defaultTactics = (): TacticalPreparation => ({ slots: { early: ["mid-bottom", "supports-mid", "mid-top"], mid: ["push-2", "protect-carry", "buy-bkb"], late: ["high-ground", "push-1", "buy-bkb"] }, builds: Array(5).fill("automatic") });
export function normalizeTactics(input: unknown): TacticalPreparation {
  const result = defaultTactics();
  if (!input || typeof input !== "object" || Array.isArray(input)) return result;
  const raw = input as Partial<TacticalPreparation>;
  for (const phase of gamePhases) if (Array.isArray(raw.slots?.[phase])) {
    const valid = [...new Set(raw.slots[phase].filter(id => typeof id === "string" && strategyById(id)?.phases.includes(phase)))].slice(0, 3);
    result.slots[phase] = [...valid, ...result.slots[phase].filter(id => !valid.includes(id))].slice(0, 3);
  }
  if (Array.isArray(raw.builds)) result.builds = Array.from({ length: 5 }, (_, r) => buildStyles.includes(raw.builds![r]) ? raw.builds![r] : "automatic");
  return result;
}
export function strategyUnlocked(strategy: Strategy, players: BattlePlayer[], staffIds: string[] = []) {
  return !strategy.staff || staffIds.includes(strategy.staff) || players.some(p => (p.skills[strategy.skill!] ?? 0) >= (strategy.threshold ?? 50));
}
export const unlockDescription = (s: Strategy) => !s.staff ? "Basic playbook" : `${({c1:"Head coach",c4:"Economy coach",c5:"Strategy scout",c6:"Hero specialist"} as Record<string,string>)[s.staff]} or a player with ${s.skill} ${s.threshold}+`;
export function automaticTactics(players: BattlePlayer[], staffIds: string[] = []): TacticalPreparation {
  const prep = defaultTactics();
  if (strategyUnlocked(strategyById("help-losing")!, players, staffIds)) prep.slots.early[2] = "help-losing";
  if (strategyUnlocked(strategyById("roshan")!, players, staffIds)) { prep.slots.mid[1] = "roshan"; prep.slots.late[1] = "roshan"; }
  return prep;
}
export interface TacticalOrder { strategyId: string; targetPlayerId?: string }
export interface ActivePlay {
  id: number; strategyId: string; side: Side; source: "manager" | "bot";
  participants: number[]; targetLane: number; targetUnit?: number;
  stage: "assembling" | "moving" | "engaging"; startedAt: number; expiresAt: number;
  baselineInvolvement: number; rally: {x:number;y:number};
}
export interface TacticalEvent { time: number; side: Side; strategyId: string; source: "manager" | "bot"; status: "called" | "moving" | "engaging" | "completed" | "abandoned" | "cancelled"; message: string }
export interface StrategyStatus { strategyId: string; reason: string | null }
export interface TacticalSnapshot { phase: GamePhase; slots: StrategyStatus[]; active?: ActivePlay; events: TacticalEvent[]; itemTargets: { playerId: string; item: string }[] }
export interface RoshanState { x: number; y: number; hp: number; max: number; respawnAt: number; kills: [number,number] }
export interface DroppedItem { id: number; x: number; y: number; item: "rapier" }
/** Included in calibration signatures and source fingerprints. */
export const TACTICAL_ENGINE_VERSION = "live-tactics-items-roshan-v1";
