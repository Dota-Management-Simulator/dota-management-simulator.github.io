import type { BattlePlayer, Side } from "./battle";
import { buildStyles } from "./items";
import type { BuildStyle } from "./items";

export type GamePhase = "early" | "mid" | "late";
export const gamePhases: GamePhase[] = ["early", "mid", "late"];
export const phaseLabels = { early: "Early · 0–15 min", mid: "Mid · 15–40 min", late: "Late · 40+ min" };
export const phaseAt = (seconds: number): GamePhase => seconds < 900 ? "early" : seconds < 2400 ? "mid" : "late";
export interface Strategy {
  id: string; name: string; phases: GamePhase[]; kind: "gank" | "push" | "roshan" | "protect" | "item" | "defend" | "farm" | "disengage";
  description: string; roles: number[]; lane?: number; item?: "bkb" | "rapier";
  staff?: string; skill?: string; threshold?: number;
  /** Match-earned access is permanent; specialist access lasts while employed. */
  victory?: { teams: number; opponent?: string; opponentName?: string };
}
export const strategies: Strategy[] = [
  { id: "mid-top", name: "Mid ganks top", phases: ["early"], kind: "gank", roles: [1], lane: 0, description: "Mid leaves farm to look for a top-lane pickoff with the lane partners." },
  { id: "mid-bottom", name: "Mid ganks bottom", phases: ["early"], kind: "gank", roles: [1], lane: 2, description: "Mid rotates bottom. Travel and a failed opening cost lane time." },
  { id: "help-losing", name: "Mid helps the losing sidelane", phases: ["early"], kind: "gank", roles: [1], staff: "c1", skill: "intuition", threshold: 50, description: "Choose the sidelane under most pressure from your deaths and lost towers." },
  { id: "supports-mid", name: "Supports gank mid", phases: ["early"], kind: "gank", roles: [3, 4], lane: 1, description: "Both supports leave their lanes and seek a visible mid target." },
  ...([0, 1, 2] as const).map(lane => ({ id: `push-${lane}`, name: `Push ${["top", "mid", "bottom"][lane]}`, phases: ["mid", "late"] as GamePhase[], kind: "push" as const, roles: [1, 2, 3, 4], lane, description: "Group behind your wave and attack the next legal building, continuing through barracks and base defenses. Carry keeps farming." })),
  { id: "protect-carry", name: "Protect the carry", phases: ["mid", "late"], kind: "protect", roles: [3, 4], description: "Supports escort the carry for 90 seconds, sacrificing their own farm." },
  { id: "roshan", name: "Attempt Roshan", phases: ["mid", "late"], kind: "roshan", roles: [0, 1, 2, 3, 4], staff: "c4", skill: "intuition", threshold: 50, description: "Gather at the pit. Fight Roshan for gold and one expiring Aegis; enemies can contest." },
  { id: "high-ground", name: "Group for high ground", phases: ["late"], kind: "push", roles: [0, 1, 2, 3, 4], description: "Commit all five to an exposed lane and then the Ancient. Retreat rules still apply." },
  { id: "split-push", name: "Offlaner split pushes", phases: ["mid", "late"], kind: "push", roles: [2], staff: "c5", skill: "pushing", threshold: 50, description: "Offlaner pressures the least defended visible lane. Avoids a detected numerical disadvantage." },
  { id: "buy-bkb", name: "Prioritize Black King Bar", phases: ["mid", "late"], kind: "item", roles: [0], item: "bkb", description: "Selected player or all eligible teammates save match gold for BKB next, delaying the normal build." },
  { id: "buy-rapier", name: "Save for Divine Rapier", phases: ["late"], kind: "item", roles: [0], item: "rapier", staff: "c6", skill: "creativity", threshold: 55, description: "Selected player or all eligible teammates save for Rapier. It drops on death and opponents can pick it up." },
  ...([0, 1, 2] as const).map(lane => ({ id: `defend-${lane}`, name: `Defend ${["top", "mid", "bottom"][lane]}`, phases: ["early", "mid", "late"] as GamePhase[], kind: "defend" as const, roles: [1, 2, 3, 4], lane, description: "Mid, offlane and supports fall back to the next allied building in this lane. The carry keeps farming; defending costs their own farm time." })),
  ...([0, 1, 2] as const).map(lane => ({ id: `farm-${lane}`, name: `Secure ${["top", "mid", "bottom"][lane]} farm`, phases: ["early", "mid", "late"] as GamePhase[], kind: "farm" as const, roles: [0, 3, 4], lane, description: "The carry farms this lane while both supports escort. Avoid visible superior numbers and sacrifice support farm for safety." })),
  { id: "disengage", name: "Disengage & regroup", phases: ["early", "mid", "late"], kind: "disengage", roles: [0, 1, 2, 3, 4], description: "Cancel the current movement and pull living teammates toward your surviving defenses. Existing disables and travel still matter." },
  { id: "follow-up", name: "Five-player tower conversion", phases: ["mid", "late"], kind: "push", roles: [0, 1, 2, 3, 4], staff: "c1", victory: { teams: 1 }, description: "Commit all five to the next mid-lane building behind your wave. More siege pressure costs the carry's farming time.", lane: 1 },
  { id: "countergank-top", name: "Countergank top", phases: ["early", "mid"], kind: "gank", roles: [2, 3, 4], lane: 0, staff: "c1", victory: { teams: 2 }, description: "Offlaner and supports rotate top to punish a visible enemy commitment. Failed rotations sacrifice their lane resources." },
  { id: "countergank-bottom", name: "Countergank bottom", phases: ["early", "mid"], kind: "gank", roles: [2, 3, 4], lane: 2, staff: "c1", victory: { teams: 2 }, description: "Offlaner and supports rotate bottom to punish a visible enemy commitment. Failed rotations sacrifice their lane resources." },
  { id: "pincer-mid", name: "Collapse on mid", phases: ["mid", "late"], kind: "gank", roles: [1, 2, 3, 4], lane: 1, staff: "c5", victory: { teams: 3 }, description: "Four players converge on a visible mid-lane target while the carry farms. Gathering makes the attack slower and exposes other lanes." },
  { id: "split-support", name: "Support the split push", phases: ["mid", "late"], kind: "push", roles: [2, 3], lane: 2, staff: "c5", victory: { teams: 1, opponent: "alliance", opponentName: "Alliance" }, description: "Offlaner and soft support pressure bottom together. Their tower pressure draws two players away from the main group." },
  { id: "counter-initiate", name: "Hold behind the carry", phases: ["mid", "late"], kind: "protect", roles: [2, 3, 4], staff: "c1", victory: { teams: 5 }, description: "Offlaner and both supports escort the carry and fight nearby threats. Holding three players nearby sacrifices map coverage." },
  { id: "defend-together", name: "Five-player base defense", phases: ["mid", "late"], kind: "defend", roles: [0, 1, 2, 3, 4], staff: "c1", victory: { teams: 2 }, description: "All five regroup around the most threatened allied lane. The team gives up outside farm to defend together." },
];
export const strategyById = (id: string) => strategies.find(s => s.id === id);
export interface TacticalPreparation { slots: Record<GamePhase, string[]>; builds: BuildStyle[]; autoGlyph?: boolean }
export const defaultTactics = (): TacticalPreparation => ({ slots: { early: ["mid-bottom", "supports-mid", "mid-top"], mid: ["push-2", "protect-carry", "buy-bkb"], late: ["high-ground", "push-1", "buy-bkb"] }, builds: Array(5).fill("automatic") });
export function normalizeTactics(input: unknown): TacticalPreparation {
  const result = defaultTactics();
  if (!input || typeof input !== "object" || Array.isArray(input)) return result;
  const raw = input as Partial<TacticalPreparation>;
  if (typeof raw.autoGlyph === 'boolean') result.autoGlyph = raw.autoGlyph;
  for (const phase of gamePhases) if (Array.isArray(raw.slots?.[phase])) {
    const valid = [...new Set(raw.slots[phase].filter(id => typeof id === "string" && strategyById(id)?.phases.includes(phase)))].slice(0, 3);
    result.slots[phase] = [...valid, ...result.slots[phase].filter(id => !valid.includes(id))].slice(0, 3);
  }
  if (Array.isArray(raw.builds)) result.builds = Array.from({ length: 5 }, (_, r) => buildStyles.includes(raw.builds![r]) ? raw.builds![r] : "automatic");
  return result;
}
export function strategyUnlocked(strategy: Strategy, players: BattlePlayer[], staffIds: string[] = [], earnedIds: readonly string[] | null = []) {
  return (!strategy.staff && !strategy.victory) || (earnedIds ?? []).includes(strategy.id) || !!strategy.staff && staffIds.includes(strategy.staff) || !!strategy.skill && players.some(p => (p.skills[strategy.skill!] ?? 0) >= (strategy.threshold ?? 50));
}
export const staffTacticNames: Record<string,string> = {c1:"Head coach",c4:"Economy coach",c5:"Strategy scout",c6:"Hero specialist"};
export function unlockDescription(s: Strategy) {
  const routes = [s.staff ? `Employ a ${staffTacticNames[s.staff] ?? "specialist coach"}` : "", s.skill ? `a player with ${s.skill} ${s.threshold}+` : "", s.victory ? s.victory.opponent ? `defeat ${s.victory.opponentName} in a competitive series` : `defeat ${s.victory.teams} distinct ${s.victory.teams === 1 ? "team" : "teams"} in competitive series` : ""].filter(Boolean);
  return routes.length ? routes.join(" OR ") : "Available to every club";
}
export function automaticTactics(players: BattlePlayer[], staffIds: string[] = [], earnedIds: readonly string[] | null = []): TacticalPreparation {
  const prep = defaultTactics();
  if (strategyUnlocked(strategyById("help-losing")!, players, staffIds, earnedIds)) prep.slots.early[2] = "help-losing";
  if (strategyUnlocked(strategyById("roshan")!, players, staffIds, earnedIds)) { prep.slots.mid[1] = "roshan"; prep.slots.late[1] = "roshan"; }
  return prep;
}
/** targetPlayerId="all" applies purchase calls to eligible teammates; movement calls keep their roles. */
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
export const TACTICAL_ENGINE_VERSION = "combat-calls-v2-victory-unlocks";
